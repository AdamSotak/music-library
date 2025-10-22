<?php

namespace App\Http\Controllers;

use App\Models\Album;
use Inertia\Inertia;

class AlbumController extends Controller
{
    public function index()
    {
        $albums = Album::with('artist')
            ->get()
            ->map(fn ($album) => [
                'id' => $album->id,
                'name' => $album->name,
                'artist' => $album->artist->name,
                'cover' => $album->image_url,
            ]);

        return Inertia::render('albums/index', ['albums' => $albums]);
    }

    public function show(string $id)
    {
        $album = Album::with(['artist', 'tracks.artist'])
            ->findOrFail($id);

        return Inertia::render('albums/show', [
            'album' => [
                'id' => $album->id,
                'name' => $album->name,
                'artist' => $album->artist->name,
                'artist_id' => $album->artist->id,
                'cover' => $album->image_url,
                'year' => $album->release_date?->year ?? 2024,
                'tracks' => $album->tracks->map(fn ($track) => [
                    'id' => $track->id,
                    'name' => $track->name,
                    'artist' => $track->artist->name,
                    'artist_id' => $track->artist->id,
                    'album' => $album->name,
                    'album_id' => $album->id,
                    'album_cover' => $album->image_url,
                    'duration' => $track->duration,
                    'audio' => $track->audio_url,
                ]),
            ],
        ]);
    }
}
