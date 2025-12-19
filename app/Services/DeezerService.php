<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class DeezerService
{
    private string $base = 'https://api.deezer.com';

    private function get(string $path, array $query = []): ?array
    {
        $r = Http::withoutVerifying()->timeout(10)->get(rtrim($this->base, '/').'/'.ltrim($path, '/'), $query);
        if (! $r->ok()) {
            return null;
        }
        $data = $r->json();

        return is_array($data) ? $data : null;
    }

    private function similarity(string $a, string $b): float
    {
        $a = mb_strtolower(trim($a));
        $b = mb_strtolower(trim($b));
        if ($a === '' || $b === '') {
            return 0.0;
        }
        if ($a === $b) {
            return 1.0;
        }

        similar_text($a, $b, $pct);

        return max(0.0, min(1.0, $pct / 100.0));
    }

    public function getPreviewUrl(string $deezerId): ?string
    {
        $data = $this->get('track/'.$deezerId);
        if (! $data || isset($data['error'])) {
            return null;
        }
        $url = $data['preview'] ?? null;

        return $url ?: null;
    }

    /**
     * Search Deezer for the best matching track preview using title (+ optional artist/duration).
     * Returns a preview URL when a high-confidence match is found; otherwise null.
     */
    public function searchTrackPreviewUrl(string $title, ?string $artist = null, ?int $durationSeconds = null): ?string
    {
        $query = trim(($artist ? $artist.' ' : '').$title);
        if ($query === '') {
            return null;
        }

        $data = $this->get('search/track', ['q' => $query, 'limit' => 10]);
        if (! $data) {
            return null;
        }
        $list = $data['data'] ?? null;
        if (! is_array($list) || ! count($list)) {
            return null;
        }

        $best = null;
        $bestScore = 0.0;

        foreach ($list as $item) {
            if (! is_array($item) || empty($item['preview'])) {
                continue;
            }

            $titleScore = $this->similarity($title, (string) ($item['title'] ?? ''));

            $artistScore = 0.0;
            if ($artist) {
                $artistScore = $this->similarity($artist, (string) (($item['artist']['name'] ?? '') ?: ''));
            }

            $durScore = 0.0;
            if ($durationSeconds !== null && is_numeric($item['duration'] ?? null)) {
                $diff = abs(((int) $item['duration']) - $durationSeconds);
                // Strong preference for close durations; decay over 20s window.
                $durScore = max(0.0, 1.0 - ($diff / 20.0));
            }

            // Weighted blend; artist and duration are boosters when available.
            $score = (0.65 * $titleScore) + (0.25 * $artistScore) + (0.10 * $durScore);

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $item;
            }
        }

        // Conservative threshold to avoid mismatches on ambiguous titles.
        if ($best && $bestScore >= 0.78) {
            return (string) $best['preview'];
        }

        return null;
    }

    /**
     * Legacy freeform search: returns the first result with a preview.
     * Prefer searchTrackPreviewUrl() when you have metadata.
     */
    public function searchPreviewUrl(string $q): ?string
    {
        $data = $this->get('search', ['q' => $q]);
        if (! $data) {
            return null;
        }
        $list = $data['data'] ?? null;
        if (! is_array($list) || ! count($list)) {
            return null;
        }

        foreach ($list as $item) {
            if (is_array($item) && ! empty($item['preview'])) {
                return $item['preview'];
            }
        }

        $first = $list[0] ?? null;
        $id = is_array($first) ? ($first['id'] ?? null) : null;
        if (! $id) {
            return null;
        }

        return $this->getPreviewUrl((string) $id);
    }
}
