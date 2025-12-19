<?php

namespace App\Services\Recommendation;

class GenreGraph
{
    /**
     * Weighted, mostly symmetric adjacency of genres.
     * Keys should align with category_slug or deezer_genre_id mapping.
     */
    private array $graph = [
        'metal' => ['metal' => 1.0, 'rock' => 0.85, 'punk' => 0.6],
        'rock' => ['rock' => 1.0, 'metal' => 0.85, 'punk' => 0.7, 'pop' => 0.3],
        'punk' => ['punk' => 1.0, 'rock' => 0.7, 'metal' => 0.6],
        'pop' => ['pop' => 1.0, 'dance-electronic' => 0.6, 'soul' => 0.5, 'rock' => 0.3],
        'dance-electronic' => ['dance-electronic' => 1.0, 'pop' => 0.6],
        'rnb' => ['rnb' => 1.0, 'soul' => 0.8, 'pop' => 0.4],
        'soul' => ['soul' => 1.0, 'rnb' => 0.8, 'pop' => 0.5],
        'jazz' => ['jazz' => 1.0, 'blues' => 0.8],
        'blues' => ['blues' => 1.0, 'jazz' => 0.8, 'rock' => 0.3],
        'hip-hop' => ['hip-hop' => 1.0, 'rnb' => 0.6, 'pop' => 0.4],
        'classical' => ['classical' => 1.0, 'instrumental' => 0.6],
        'instrumental' => ['instrumental' => 1.0, 'classical' => 0.6, 'ambient' => 0.5],
        'ambient' => ['ambient' => 1.0, 'instrumental' => 0.5, 'electronic' => 0.4],
        'electronic' => ['electronic' => 1.0, 'dance-electronic' => 0.7, 'ambient' => 0.4],
    ];

    public function similarity(?string $a, ?string $b): float
    {
        if (! $a || ! $b) {
            return 0.0;
        }

        $aKey = $this->normalizeKey($a);
        $bKey = $this->normalizeKey($b);

        if ($aKey === $bKey) {
            return 1.0;
        }

        $fromA = $this->graph[$aKey][$bKey] ?? null;
        $fromB = $this->graph[$bKey][$aKey] ?? null;

        if ($fromA !== null && $fromB !== null) {
            return max($fromA, $fromB);
        }

        return $fromA ?? $fromB ?? 0.0;
    }

    public function keys(): array
    {
        return array_keys($this->graph);
    }

    private function normalizeKey(string $raw): string
    {
        $k = strtolower($raw);

        // Handle common Deezer numeric IDs mapped to our slugs.
        $idMap = [
            '132' => 'pop',
            '116' => 'hip-hop',
            '152' => 'metal',
            '85' => 'rock',
            '98' => 'folk-and-acoustic',
            '173' => 'classical',
            '169' => 'jazz',
            '113' => 'dance-electronic',
            '165' => 'soul',
            '4642' => 'latin',
            '75' => 'reggae',
            '1324' => 'country',
            '84' => 'punk',
        ];

        if (isset($idMap[$k])) {
            return $idMap[$k];
        }

        return $k;
    }
}
