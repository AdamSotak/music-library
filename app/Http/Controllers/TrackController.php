<?php

namespace App\Http\Controllers;

use App\Models\Track;
use Inertia\Inertia;

class TrackController extends Controller
{
    public function show(string $id)
    {
        $track = Track::with(['artist', 'album'])->findOrFail($id);

        return Inertia::render('tracks/show', [
            'track' => [
                'id' => $track->id,
                'name' => $track->name,
                'artist' => $track->artist->name,
                'album' => $track->album->name,
                'album_cover' => $track->album->cover,
                'duration' => $track->duration,
                'audio' => $track->audio_url,
            ],
        ]);
    }
}
