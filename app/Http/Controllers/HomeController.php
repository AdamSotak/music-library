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
        $tracks = Track::all()->map(fn ($track) => [
            'id' => $track->id,
            'name' => $track->name,
            'artist' => $track->artist->name,
            'album' => $track->album->name,
            'album_cover' => $track->album->cover,
        ]);

        $albums = Album::all()->map(fn ($album) => [
            'id' => $album->id,
            'name' => $album->name,
            'artist' => $album->artist->name,
            'cover' => $album->cover,
        ]);

        $artists = Artist::all()->map(fn ($artist) => [
            'id' => $artist->id,
            'name' => $artist->name,
            'image' => $artist->image,
        ]);

        return Inertia::render('index', [
            'albums' => $albums,
            'artists' => $artists,
            'tracks' => $tracks,
        ]);
    }
}
