<?php

namespace App\Services\Recommendation;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Track;
use Illuminate\Support\Collection;

class RecommendationService
{
    private array $genericCategories = ['unknown', 'misc', 'other', 'music', 'various', 'various-artists'];

    private float $neighbourGenreThreshold = 0.45;

    private float $hardGenreFloor = 0.35;

    public function __construct(
        private MetadataScorer $metadataScorer = new MetadataScorer,
        private GenreGraph $genreGraph = new GenreGraph,
    ) {}

    /**
     * @return Collection<int, Track>
     */
    public function recommend(RecommendationContext $ctx): Collection
    {
        $seed = $this->buildSeedProfile($ctx);

        if (! $seed) {
            return collect();
        }

        $excluded = $ctx->excludeTrackIds;
        if ($ctx->seedType === 'track') {
            $excluded[] = $seed->track?->id;
        }

        $seedCategory = $this->resolveSeedCategory($seed);
        $allowedGenres = $this->allowedGenres($seedCategory);

        $pool = $this->buildCandidatePool($seed, array_filter($excluded), $ctx->limit);

        $scored = $pool->map(function (Track $track) use ($seed, $ctx, $seedCategory) {
            $metaScore = $this->metadataScorer->score($track, $seed, $ctx->seedType, $seedCategory);
            $embedScore = $this->embeddingScore($seed, $track);

            return [
                'track' => $track,
                'meta' => $metaScore,
                'embed' => $embedScore,
            ];
        });

        $metaNorm = $this->normalizeScores($scored->pluck('meta')->all());
        $embedNorm = $this->normalizeScores(
            $scored->pluck('embed')->map(fn ($v) => $v === null ? null : $v)->all(),
        );

        $combined = $scored->values()->map(function ($item, $idx) use ($metaNorm, $embedNorm) {
            $meta = $metaNorm[$idx] ?? 0.0;
            $embed = $embedNorm[$idx] ?? 0.0;
            $score = (0.6 * $meta) + (0.4 * $embed);

            return [
                'track' => $item['track'],
                'score' => $score,
            ];
        });

        $sorted = $combined->sortByDesc('score')->values();

        $final = collect();
        $recentArtists = [];
        $artistCounts = [];
        $uniqueArtists = $pool->pluck('artist_id')->filter()->unique()->count();
        $maxSequential = $ctx->seedType === 'artist' ? 1 : 2;
        $maxPerArtist = 5;

        // If pool is effectively single-artist, don't over-constrain diversity.
        if ($uniqueArtists <= 1) {
            $maxSequential = 0;
            $maxPerArtist = null;
        }

        foreach ($sorted as $item) {
            /** @var Track $track */
            $track = $item['track'];

            if (! $this->passesGenreGate($seedCategory, $allowedGenres, $seed, $track, $final->count())) {
                continue;
            }

            $recentRun = array_slice($recentArtists, -$maxSequential);
            if ($maxSequential > 0 && count($recentRun) === $maxSequential && count(array_unique(array_merge($recentRun, [$track->artist_id]))) === 1) {
                continue;
            }

            if ($maxPerArtist && ($artistCounts[$track->artist_id] ?? 0) >= $maxPerArtist) {
                continue;
            }

            $final->push($track);
            $recentArtists[] = $track->artist_id;
            $artistCounts[$track->artist_id] = ($artistCounts[$track->artist_id] ?? 0) + 1;

            if ($final->count() >= $ctx->limit) {
                break;
            }
        }

        return $final;
    }

    private function buildSeedProfile(RecommendationContext $ctx): ?SeedProfile
    {
        return match ($ctx->seedType) {
            'track' => $this->seedFromTrack($ctx->seedId),
            'album' => $this->seedFromAlbum($ctx->seedId),
            'artist' => $this->seedFromArtist($ctx->seedId),
            default => null,
        };
    }

    private function seedFromTrack(string $id): ?SeedProfile
    {
        $track = Track::with(['album', 'artist', 'embedding'])->find($id);
        if (! $track) {
            return null;
        }

        return new SeedProfile(track: $track, album: $track->album, artist: $track->artist);
    }

    private function seedFromAlbum(string $id): ?SeedProfile
    {
        $album = Album::with('artist')->find($id);
        if (! $album) {
            return null;
        }

        $embedding = $this->seedEmbeddingFromAlbum($album->id);

        return new SeedProfile(album: $album, artist: $album->artist, embedding: $embedding);
    }

    private function seedFromArtist(string $id): ?SeedProfile
    {
        $artist = Artist::find($id);
        if (! $artist) {
            return null;
        }

        $embedding = $this->seedEmbeddingFromArtist($artist->id);

        return new SeedProfile(artist: $artist, embedding: $embedding);
    }

    private function buildCandidatePool(SeedProfile $seed, array $excluded, int $limit): Collection
    {
        $baseQuery = fn () => Track::with(['artist', 'album', 'embedding'])
            ->whereNotNull('audio_url')
            ->whereNotIn('id', $excluded);

        $seedCategory = $this->resolveSeedCategory($seed);
        $allowedGenres = $this->allowedGenres($seedCategory);
        $pool = collect();

        // Tier 1: same artist
        if ($seed->artistId()) {
            $tier1 = $baseQuery()
                ->where('artist_id', $seed->artistId())
                ->limit(250)
                ->get();
            $pool = $pool->merge($tier1);
        }

        // Tier 2: same category/genre slug (when not generic)
        if ($this->shouldFilterByCategory($seedCategory)) {
            $tier2 = $baseQuery()
                ->where('radio_genre_key', $seedCategory)
                ->limit(450)
                ->get();
            $pool = $pool->merge($tier2);
        }

        // Tier 3: neighbour genres
        if (count($allowedGenres)) {
            $neighbours = array_values(array_filter(
                $allowedGenres,
                fn ($g) => strtolower((string) $g) !== strtolower((string) $seedCategory),
            ));
            if (count($neighbours)) {
                $tier3 = $baseQuery()->whereIn('radio_genre_key', $neighbours)->limit(450)->get();
                $pool = $pool->merge($tier3);
            }
        }

        // Deduplicate and cap total size (avoid ORDER BY RANDOM() on SQLite).
        $pool = $pool->unique('id');

        // If genre is unknown, last-resort fallback so radio still returns something.
        if ($pool->isEmpty()) {
            if (count($allowedGenres)) {
                $pool = $baseQuery()->whereIn('radio_genre_key', $allowedGenres)->limit(800)->get();
            } else {
                $pool = $baseQuery()->whereNotNull('radio_genre_key')->limit(800)->get();
            }
        } else {
            $desiredPoolSize = max($limit * 25, 300);
            if ($pool->count() < $desiredPoolSize) {
                $extraQuery = $baseQuery();
                if (count($allowedGenres)) {
                    $extraQuery->whereIn('radio_genre_key', $allowedGenres);
                } else {
                    $extraQuery->whereNotNull('radio_genre_key');
                }
                $extra = $extraQuery->limit(600)->get();
                $pool = $pool->merge($extra)->unique('id');
            }
        }

        return $pool;
    }

    private function similarGenres(string $seedGenre, float $threshold): array
    {
        $genres = [];
        foreach ($this->genreGraph->keys() as $g) {
            if ($this->genreGraph->similarity($seedGenre, $g) >= $threshold) {
                $genres[] = $g;
            }
        }

        return $genres;
    }

    private function resolveSeedCategory(SeedProfile $seed): ?string
    {
        // 0) Prefer backfilled radio key when available.
        $radio = $seed->radioGenreKey();
        if ($this->shouldFilterByCategory($radio) && ! $this->isUntrustedRadioKey($seed, $radio)) {
            return $radio;
        }

        // 1) Use track category if it's not generic.
        $slug = $seed->categorySlug();
        if ($this->shouldFilterByCategory($slug)) {
            return $slug;
        }

        // 2) Use album.genre if present and not generic.
        $albumGenre = $seed->track?->album?->genre ?? $seed->album?->genre;
        if ($this->shouldFilterByCategory($albumGenre)) {
            return $albumGenre;
        }

        // 3) Fallback: dominant album radio key.
        $albumId = $seed->albumId();
        if ($albumId) {
            $albumKey = Track::where('album_id', $albumId)
                ->whereNotNull('radio_genre_key')
                ->selectRaw('radio_genre_key, COUNT(*) as c')
                ->groupBy('radio_genre_key')
                ->orderByDesc('c')
                ->value('radio_genre_key');

            if ($this->shouldFilterByCategory($albumKey)) {
                return $albumKey;
            }
        }

        // 4) Fallback: dominant artist radio key.
        $artistId = $seed->artistId();
        if ($artistId) {
            $artistKey = Track::where('artist_id', $artistId)
                ->whereNotNull('radio_genre_key')
                ->selectRaw('radio_genre_key, COUNT(*) as c')
                ->groupBy('radio_genre_key')
                ->orderByDesc('c')
                ->value('radio_genre_key');

            if ($this->shouldFilterByCategory($artistKey)) {
                return $artistKey;
            }
        }

        return null;
    }

    private function shouldFilterByCategory(?string $slug): bool
    {
        if (! $slug) {
            return false;
        }

        return ! in_array(strtolower($slug), $this->genericCategories, true);
    }

    private function embeddingScore(SeedProfile $seed, Track $candidate): ?float
    {
        $seedVec = $seed->embeddingVector();
        $candVec = $candidate->embedding?->embedding;

        if (! is_array($seedVec) || ! is_array($candVec)) {
            return null;
        }

        $dot = 0.0;
        $aNorm = 0.0;
        $bNorm = 0.0;
        $len = min(count($seedVec), count($candVec));
        for ($i = 0; $i < $len; $i++) {
            $a = (float) $seedVec[$i];
            $b = (float) $candVec[$i];
            $dot += $a * $b;
            $aNorm += $a * $a;
            $bNorm += $b * $b;
        }

        $denom = sqrt($aNorm) * sqrt($bNorm);
        if ($denom == 0.0) {
            return null;
        }

        return $dot / $denom;
    }

    /**
     * Compute an album-level seed embedding as the mean of its track embeddings.
     *
     * @return array<int, float>|null
     */
    private function seedEmbeddingFromAlbum(string $albumId): ?array
    {
        $tracks = Track::with('embedding')
            ->where('album_id', $albumId)
            ->whereNotNull('audio_url')
            ->limit(60)
            ->get();

        return $this->meanEmbeddingFromTracks($tracks);
    }

    /**
     * Compute an artist-level seed embedding as the mean of its track embeddings.
     *
     * @return array<int, float>|null
     */
    private function seedEmbeddingFromArtist(string $artistId): ?array
    {
        $tracks = Track::with('embedding')
            ->where('artist_id', $artistId)
            ->whereNotNull('audio_url')
            ->limit(120)
            ->get();

        return $this->meanEmbeddingFromTracks($tracks);
    }

    /**
     * @param  Collection<int, Track>  $tracks
     * @return array<int, float>|null
     */
    private function meanEmbeddingFromTracks(Collection $tracks): ?array
    {
        $vectors = [];
        $len = null;

        foreach ($tracks as $track) {
            $vec = $track->embedding?->embedding;
            if (! is_array($vec) || empty($vec)) {
                continue;
            }
            $len = $len === null ? count($vec) : min($len, count($vec));
            $vectors[] = $vec;
        }

        if ($len === null || empty($vectors)) {
            return null;
        }

        $avg = array_fill(0, $len, 0.0);
        foreach ($vectors as $vec) {
            for ($i = 0; $i < $len; $i++) {
                $avg[$i] += (float) $vec[$i];
            }
        }

        $count = (float) count($vectors);
        for ($i = 0; $i < $len; $i++) {
            $avg[$i] /= $count;
        }

        // Unit-normalize to preserve cosine similarity semantics.
        $norm = 0.0;
        for ($i = 0; $i < $len; $i++) {
            $norm += $avg[$i] * $avg[$i];
        }
        $norm = sqrt($norm);
        if ($norm <= 0.0) {
            return null;
        }

        for ($i = 0; $i < $len; $i++) {
            $avg[$i] /= $norm;
        }

        return $avg;
    }

    /**
     * Min-max normalize scores to 0-1 range. Nulls become 0.
     *
     * @param  array<int, float|null>  $values
     * @return array<int, float>
     */
    private function normalizeScores(array $values): array
    {
        $numeric = array_values(array_filter($values, fn ($v) => $v !== null));
        if (empty($numeric)) {
            return array_fill(0, count($values), 0.0);
        }

        $min = min($numeric);
        $max = max($numeric);
        $range = $max - $min;
        if ($range <= 0) {
            return array_fill(0, count($values), 0.5);
        }

        $normalized = [];
        foreach ($values as $idx => $val) {
            if ($val === null) {
                $normalized[$idx] = 0.0;

                continue;
            }
            $normalized[$idx] = ($val - $min) / $range;
        }

        return $normalized;
    }

    /**
     * @return array<int, string>
     */
    private function allowedGenres(?string $seedCategory): array
    {
        if (! $this->shouldFilterByCategory($seedCategory)) {
            return [];
        }

        $genres = $this->similarGenres($seedCategory, $this->neighbourGenreThreshold);
        $genres[] = strtolower((string) $seedCategory);

        return array_values(array_unique(array_filter($genres)));
    }

    private function passesGenreGate(?string $seedCategory, array $allowedGenres, SeedProfile $seed, Track $track, int $alreadySelected): bool
    {
        if (! $this->shouldFilterByCategory($seedCategory)) {
            return true;
        }

        // Always allow same-artist tracks (even if metadata is messy).
        if ($seed->artistId() && $track->artist_id === $seed->artistId()) {
            return true;
        }

        $candidateKey = $track->radio_genre_key ?: ((string) $track->deezer_genre_id ?: null);
        if ($candidateKey === '132') {
            $candidateKey = null;
        }
        if (! $candidateKey) {
            return false;
        }

        // If we have an explicit allowlist, use it (fast).
        if (count($allowedGenres)) {
            $key = strtolower((string) $candidateKey);
            if (in_array($key, $allowedGenres, true)) {
                return true;
            }
        }

        // Otherwise, fall back to a similarity floor to prevent teleports.
        $minSim = $alreadySelected < 25 ? max($this->hardGenreFloor, 0.45) : $this->hardGenreFloor;
        $sim = $this->genreGraph->similarity((string) $seedCategory, (string) $candidateKey);

        return $sim >= $minSim;
    }

    private function isUntrustedRadioKey(SeedProfile $seed, string $radioKey): bool
    {
        $radio = strtolower($radioKey);
        if ($radio !== 'pop') {
            return false;
        }

        // If the only evidence is a placeholder slug + Deezer "pop" (132),
        // treat it as a poisoned default and let album/artist context decide.
        $slug = strtolower((string) ($seed->categorySlug() ?? ''));
        $genreId = (string) ($seed->genreId() ?? '');

        return $genreId === '132' && ($slug === '' || in_array($slug, $this->genericCategories, true));
    }
}
