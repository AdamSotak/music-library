<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use Inertia\Inertia;

class ArtistController extends Controller
{
    public function show(string $id)
    {
        $artist = Artist::with(['albums', 'tracks.album'])->findOrFail($id);

        return Inertia::render('artist/id', [
            'artist' => [
                'id' => $artist->id,
                'name' => $artist->name,
                'image' => $artist->image_url,
                'monthly_listeners' => $artist->monthly_listeners,
                'is_verified' => $artist->is_verified,
                'albums' => $artist->albums->map(fn ($album) => [
                    'id' => $album->id,
                    'name' => $album->name,
                    'cover' => $album->image_url,
                ]),
            ],
            'tracks' => $artist->tracks->map(fn ($track) => [
                'id' => $track->id,
                'artist' => $track->artist->name,
                'artist_id' => $track->artist->id,
                'name' => $track->name,
                'album' => $track->album->name,
                'album_id' => $track->album->id,
                'album_cover' => $track->album->image_url,
                'duration' => $track->duration,
                'audio' => $track->audio_url,
            ]),
            'albums' => $artist->albums->map(fn ($album) => [
                'id' => $album->id,
                'name' => $album->name,
                'cover' => $album->image_url,
                'year' => $album->release_date?->year ?? 2024,
            ]),
        ]);
    }
}
