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
        private MetadataScorer $metadataScorer = new MetadataScorer(),
    ) {
    }

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

        $query = Track::with(['artist', 'album', 'embedding'])
            ->whereNotNull('audio_url')
            ->whereNotIn('id', array_filter($excluded));

        // Prefer same category when available to keep the pool smaller and more relevant.
        if ($this->shouldFilterByCategory($seed->categorySlug())) {
            $query->where('category_slug', $seed->categorySlug());
        }

        // Cap pool size to keep radio responsive on large catalogs.
        $pool = $query->inRandomOrder()->limit(600)->get();

        // Fallback: if the filtered pool is too small, widen to all tracks (still capped).
        if ($pool->count() < $ctx->limit) {
            $fallback = Track::with(['artist', 'album', 'embedding'])
                ->whereNotNull('audio_url')
                ->whereNotIn('id', array_filter($excluded))
                ->inRandomOrder();

            if ($this->shouldFilterByCategory($seed->categorySlug())) {
                $fallback->where('category_slug', $seed->categorySlug());
            }

            $pool = $fallback->limit(800)->get();
        }

        $scored = $pool->map(function (Track $track) use ($seed, $ctx) {
            $metaScore = $this->metadataScorer->score($track, $seed, $ctx->seedType);
            $embedScore = $this->embeddingScore($seed, $track);
            $score = $embedScore !== null
                ? (0.6 * $metaScore) + (0.4 * $embedScore)
                : $metaScore;

            return [
                'track' => $track,
                'score' => $score,
            ];
        });

        $sorted = $scored->sortByDesc('score')->values();

        $final = collect();
        $recentArtists = [];
        $artistCounts = [];
        $maxSequential = $ctx->seedType === 'artist' ? 1 : 2;
        $maxPerArtist = $ctx->seedType === 'artist' ? 3 : null;

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
}
