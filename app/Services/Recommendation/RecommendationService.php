<?php

namespace App\Services\Recommendation;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Track;
use Illuminate\Support\Collection;

class RecommendationService
{
    private array $genericCategories = ['pop', 'unknown', 'misc', 'other'];

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

        $pool = $this->buildCandidatePool($seed, array_filter($excluded), $ctx->limit);

        $scored = $pool->map(function (Track $track) use ($seed, $ctx) {
            $metaScore = $this->metadataScorer->score($track, $seed, $ctx->seedType);
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

        return new SeedProfile(album: $album, artist: $album->artist);
    }

    private function seedFromArtist(string $id): ?SeedProfile
    {
        $artist = Artist::find($id);
        if (! $artist) {
            return null;
        }

        return new SeedProfile(artist: $artist);
    }

    private function buildCandidatePool(SeedProfile $seed, array $excluded, int $limit): Collection
    {
        $baseQuery = fn () => Track::with(['artist', 'album', 'embedding'])
            ->whereNotNull('audio_url')
            ->whereNotIn('id', $excluded);

        $seedCategory = $this->resolveSeedCategory($seed);
        $seedGenre = $seed->genreId() ?? $seedCategory;
        $pool = collect();

        // Tier 1: same artist
        if ($seed->artistId()) {
            $tier1 = $baseQuery()
                ->where('artist_id', $seed->artistId())
                ->limit(300)
                ->get();
            $pool = $pool->merge($tier1);
        }

        // Tier 2: same category/genre slug (when not generic)
        if ($this->shouldFilterByCategory($seedCategory)) {
            $tier2 = $baseQuery()
                ->where('category_slug', $seedCategory)
                ->limit(300)
                ->get();
            $pool = $pool->merge($tier2);
        }

        // Tier 3: neighbour genres
        if ($seedGenre) {
            $similarGenres = $this->similarGenres($seedGenre, 0.2);
            if (count($similarGenres)) {
                $tier3 = $baseQuery()
                    ->whereIn('category_slug', $similarGenres)
                    ->limit(300)
                    ->get();
                $pool = $pool->merge($tier3);
            }
        }

        // Fallback: general pool capped to keep responsiveness
        if ($pool->isEmpty()) {
            $pool = $baseQuery()
                ->inRandomOrder()
                ->limit(800)
                ->get();
        } else {
            // Deduplicate and cap total size
            $pool = $pool->unique('id');
            if ($pool->count() < $limit) {
                $extra = $baseQuery()
                    ->inRandomOrder()
                    ->limit(400)
                    ->get();
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

        // 3) Fallback: first non-generic category for this artist.
        $artistId = $seed->artistId();
        if ($artistId) {
            $candidateSlug = Track::where('artist_id', $artistId)
                ->whereNotNull('category_slug')
                ->get()
                ->pluck('category_slug')
                ->filter(function ($s) {
                    $s = strtolower((string) $s);

                    return $s && ! in_array($s, $this->genericCategories, true);
                })
                ->first();

            if ($candidateSlug) {
                return $candidateSlug;
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
        $seedVec = $seed->track?->embedding?->embedding;
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
}
