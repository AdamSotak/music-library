<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use Inertia\Inertia;

class ArtistController extends Controller
{
    public function show(string $id)
    {
        $artist = Artist::with(['albums', 'tracks'])->findOrFail($id);

        return Inertia::render('artist/id', [
            'artist' => [
                'id' => $artist->id,
                'name' => $artist->name,
                'image' => $artist->image,
                'albums' => $artist->albums->map(fn ($album) => [
                    'id' => $album->id,
                    'name' => $album->name,
                    'cover' => $album->cover,
                ]),
            ],
            'tracks' => $artist->tracks->map(fn ($track) => [
                'id' => $track->id,
                'artist' => $track->artist->name,
                'artist_id' => $track->artist->id,
                'name' => $track->name,
                'album' => $track->album->name,
                'album_cover' => $track->album->cover,
                'duration' => $track->duration,
            ]),
            'albums' => $artist->albums->map(fn ($album) => [
                'id' => $album->id,
                'name' => $album->name,
                'cover' => $album->cover,
            ]),
        ]);
    }
}
