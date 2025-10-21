<?php

namespace App\Http\Controllers;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Track;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        $tracks = Track::with(['artist', 'album'])
            ->inRandomOrder()
            ->limit(20)
            ->get()
            ->map(fn ($track) => [
                'id' => $track->id,
                'name' => $track->name,
                'artist' => $track->artist->name,
                'artist_id' => $track->artist->id,
                'album' => $track->album->name,
                'album_id' => $track->album->id,
                'album_cover' => $track->album->image_url,
                'duration' => $track->duration,
                'audio' => $track->audio_url,
            ]);

        $albums = Album::all()->shuffle()->map(fn ($album) => [
            'id' => $album->id,
            'name' => $album->name,
            'artist' => $album->artist->name,
            'cover' => $album->image_url,
        ]);

        $artists = Artist::all()->shuffle()->map(fn ($artist) => [
            'id' => $artist->id,
            'name' => $artist->name,
            'image' => $artist->image_url,
        ]);

        return Inertia::render('index', [
            'albums' => $albums,
            'artists' => $artists,
            'tracks' => $tracks,
        ]);
    }
}
