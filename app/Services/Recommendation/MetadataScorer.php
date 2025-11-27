<?php

namespace App\Services\Recommendation;

use App\Models\Track;

class MetadataScorer
{
    private array $genericCategories = ['pop', 'unknown', 'misc', 'other'];

    public function __construct(
        private GenreGraph $genreGraph = new GenreGraph,
        private float $artistWeight = 0.5,
        private float $albumWeight = 0.2,
        private float $genreWeight = 0.25,
        private float $yearWeight = 0.1,
        private float $durationWeight = 0.05,
    ) {}

    public function score(Track $candidate, SeedProfile $seed, string $seedType = 'track'): float
    {
        $score = $this->randomJitter();

        $artistWeight = $seedType === 'artist'
            ? $this->artistWeight * 0.35
            : $this->artistWeight;

        if ($seed->artistId() && $candidate->artist_id === $seed->artistId()) {
            $score += $artistWeight;
        }

        if ($seed->albumId() && $candidate->album_id === $seed->albumId()) {
            $score += $this->albumWeight;
        }

        $genreSim = $this->genreGraph->similarity(
            $this->genreKey($seed),
            $candidate->category_slug ?? $candidate->deezer_genre_id,
        );

        if ($genreSim > 0) {
            $score += $this->genreWeight * $genreSim;
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

    private function genreKey(SeedProfile $seed): ?string
    {
        $slug = $seed->categorySlug();
        if ($slug && ! in_array(strtolower($slug), $this->genericCategories, true)) {
            return $slug;
        }

        return $seed->genreId();
    }
}
