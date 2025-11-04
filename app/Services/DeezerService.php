<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class DeezerService
{
    private string $base = 'https://api.deezer.com';

    private function get(string $path, array $query = []): ?array
    {
        $r = Http::withoutVerifying()->timeout(10)->get(rtrim($this->base, '/') . '/' . ltrim($path, '/'), $query);
        if (!$r->ok()) return null;
        $data = $r->json();
        return is_array($data) ? $data : null;
    }

    public function getPreviewUrl(string $deezerId): ?string
    {
        $data = $this->get('track/' . $deezerId);
        if (!$data || isset($data['error'])) return null;
        $url = $data['preview'] ?? null;
        return $url ?: null;
    }

    public function searchPreviewUrl(string $q): ?string
    {
        $data = $this->get('search', ['q' => $q]);
        if (!$data) return null;
        $list = $data['data'] ?? null;
        if (!is_array($list) || !count($list)) return null;

        foreach ($list as $item) {
            if (is_array($item) && !empty($item['preview'])) return $item['preview'];
        }

        $first = $list[0] ?? null;
        $id = is_array($first) ? ($first['id'] ?? null) : null;
        if (!$id) return null;
        return $this->getPreviewUrl((string)$id);
    }
}
