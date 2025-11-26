<?php

namespace App\Services\Recommendation;

use App\Models\Track;

class MetadataScorer
{
    private array $genericCategories = ['pop', 'unknown', 'misc', 'other'];

    public function __construct(
        private float $artistWeight = 0.5,
        private float $albumWeight = 0.2,
        private float $categoryWeight = 0.2,
        private float $yearWeight = 0.1,
        private float $durationWeight = 0.05,
    ) {
    }

    public function score(Track $candidate, SeedProfile $seed, string $seedType = 'track'): float
    {
        $score = $this->randomJitter();

        $artistWeight = $seedType === 'artist'
            ? $this->artistWeight * 0.3
            : $this->artistWeight;

        if ($seed->artistId() && $candidate->artist_id === $seed->artistId()) {
            $score += $artistWeight;
        }

        if ($seed->albumId() && $candidate->album_id === $seed->albumId()) {
            $score += $this->albumWeight;
        }

        if ($this->shouldUseCategory($seed->categorySlug()) && $candidate->category_slug === $seed->categorySlug()) {
            $score += $this->categoryWeight;
        }

        $yearScore = $this->yearSimilarity($candidate, $seed);
        if ($yearScore > 0) {
            $score += $this->yearWeight * $yearScore;
        }

        $durationScore = $this->durationSimilarity($candidate, $seed);
        if ($durationScore > 0) {
            $score += $this->durationWeight * $durationScore;
        }

        return $score;
    }

    private function yearSimilarity(Track $candidate, SeedProfile $seed): float
    {
        $seedYear = $seed->releaseYear();
        $candidateYear = $this->yearFromAlbum($candidate);

        if (! $seedYear || ! $candidateYear) {
            return 0.0;
        }

        $diff = abs($seedYear - $candidateYear);

        // Linearly decay over a 20 year window.
        return max(0, 1 - ($diff / 20));
    }

    private function durationSimilarity(Track $candidate, SeedProfile $seed): float
    {
        $seedDuration = $seed->durationSeconds();
        $candDuration = $candidate->duration;

        if (! $seedDuration || ! $candDuration) {
            return 0.0;
        }

        $diff = abs($seedDuration - $candDuration);

        // Prefer within +/- 3 minutes.
        $band = 180;
        $score = max(0, 1 - ($diff / $band));

        return $score;
    }

    private function yearFromAlbum(Track $track): ?int
    {
        $date = $track->album?->release_date;
        if (! $date) {
            return null;
        }

        try {
            return (int) date('Y', strtotime((string) $date));
        } catch (\Throwable) {
            return null;
        }
    }

    private function randomJitter(): float
    {
        return mt_rand(0, 1000) / 1000000; // 0 - 0.001
    }

    private function shouldUseCategory(?string $slug): bool
    {
        if (! $slug) {
            return false;
        }

        return ! in_array(strtolower($slug), $this->genericCategories, true);
    }
}
