<?php

namespace App\Http\Controllers;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Playlist;
use App\Models\Track;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->query('q');

        if (! $query) {
            return Inertia::render('search/index', [
                'query' => '',
                'results' => null,
            ]);
        }

        $results = $this->search($query);

        return Inertia::render('search/index', [
            'query' => $query,
            'results' => $results,
        ]);
    }

    public function searchTracks(Request $request)
    {
        $query = $request->query('q');

        if (! $query) {
            return response()->json(['tracks' => []]);
        }

        $searchTerm = "%{$query}%";

        $tracks = Track::with(['artist', 'album'])
            ->where('name', 'LIKE', $searchTerm)
            ->limit(20)
            ->get()
            ->map(fn ($track) => [
                'id' => $track->id,
                'name' => $track->name,
                'artist' => $track->artist->name,
                'album' => $track->album->name,
                'album_cover' => $track->album->image_url,
                'duration' => $track->duration,
            ]);

        return response()->json(['tracks' => $tracks]);
    }

    private function search(string $query): array
    {
        $searchTerm = "%{$query}%";

        // Search tracks
        $tracks = Track::with(['artist', 'album'])
            ->where('name', 'LIKE', $searchTerm)
            ->limit(10)
            ->get()
            ->map(fn ($track) => [
                'type' => 'track',
                'id' => $track->id,
                'name' => $track->name,
                'artist' => $track->artist->name,
                'album' => $track->album->name,
                'album_cover' => $track->album->image_url,
                'duration' => $track->duration,
                'audio' => $track->audio_url,
            ]);

        // Search artists
        $artists = Artist::where('name', 'LIKE', $searchTerm)
            ->limit(5)
            ->get()
            ->map(fn ($artist) => [
                'type' => 'artist',
                'id' => $artist->id,
                'name' => $artist->name,
                'image' => $artist->image_url,
            ]);

        // Search albums
        $albums = Album::with('artist')
            ->where('name', 'LIKE', $searchTerm)
            ->limit(8)
            ->get()
            ->map(fn ($album) => [
                'type' => 'album',
                'id' => $album->id,
                'name' => $album->name,
                'artist' => $album->artist->name,
                'cover' => $album->image_url,
            ]);

        // Search playlists
        $playlists = Playlist::where('name', 'LIKE', $searchTerm)
            ->limit(5)
            ->get()
            ->map(fn ($playlist) => [
                'type' => 'playlist',
                'id' => $playlist->id,
                'name' => $playlist->name,
                'description' => $playlist->description,
                'image' => $playlist->image_url,
            ]);

        return [
            'tracks' => $tracks,
            'artists' => $artists,
            'albums' => $albums,
            'playlists' => $playlists,
            'total' => $tracks->count() + $artists->count() + $albums->count() + $playlists->count(),
        ];
    }
}
