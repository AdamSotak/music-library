<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class JamendoClient
{
    private string $baseUrl = 'https://api.jamendo.com/v3.0';

    private string $clientId;

    public function __construct()
    {
        $this->clientId = config('services.jamendo.client_id', 'YOUR_CLIENT_ID');
    }

    public function getPopularAlbums(int $limit = 50): array
    {
        $response = Http::get("{$this->baseUrl}/albums", [
            'client_id' => $this->clientId,
            'format' => 'json',
            'limit' => $limit,
            'order' => 'popularity_total',
            'imagesize' => 600,
            'include' => 'musicinfo',
        ]);

        return $response->json()['results'] ?? [];
    }

    public function getAlbumTracks(string $albumId): array
    {
        $response = Http::get("{$this->baseUrl}/tracks", [
            'client_id' => $this->clientId,
            'format' => 'json',
            'album_id' => $albumId,
            'include' => 'musicinfo',
            'audioformat' => 'mp32',
            'audiodlformat' => 'mp32',
        ]);

        return $response->json()['results'] ?? [];
    }

    public function searchArtist(string $artistName): ?array
    {
        $response = Http::get("{$this->baseUrl}/artists", [
            'client_id' => $this->clientId,
            'format' => 'json',
            'namesearch' => $artistName,
            'imagesize' => 600,
            'limit' => 1,
        ]);

        $results = $response->json()['results'] ?? [];

        return $results[0] ?? null;
    }

    public function getArtistAlbums(string $artistId, int $limit = 5): array
    {
        $response = Http::get("{$this->baseUrl}/albums", [
            'client_id' => $this->clientId,
            'format' => 'json',
            'artist_id' => $artistId,
            'limit' => $limit,
            'imagesize' => 600,
            'include' => 'musicinfo',
        ]);

        return $response->json()['results'] ?? [];
    }

    public function getArtist(string $artistId): ?array
    {
        $response = Http::get("{$this->baseUrl}/artists", [
            'client_id' => $this->clientId,
            'format' => 'json',
            'id' => $artistId,
            'imagesize' => 600,
        ]);

        $results = $response->json()['results'] ?? [];

        return $results[0] ?? null;
    }

    public function getAlbumsByGenre(string $genre, int $limit = 10): array
    {
        $response = Http::get("{$this->baseUrl}/albums", [
            'client_id' => $this->clientId,
            'format' => 'json',
            'limit' => $limit,
            'tags' => $genre,
            'order' => 'popularity_week',
            'imagesize' => 600,
            'include' => 'musicinfo',
        ]);

        return $response->json()['results'] ?? [];
    }
}
