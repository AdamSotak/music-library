<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function show()
    {
        $categories = Category::all()->map(fn ($category) => [
            'id' => $category->slug,
            'name' => $category->name,
            'image' => $category->image,
            'color' => $category->color,
        ]);

        return Inertia::render('categories/all', ['categories' => $categories]);
    }

    public function showById($id)
    {
        $category = Category::where('slug', $id)
            ->with(['tracks.artist', 'tracks.album'])
            ->firstOrFail();

        // Get unique albums from tracks in this category
        $albums = $category->tracks
            ->pluck('album')
            ->unique('id')
            ->take(12)
            ->map(fn ($album) => [
                'id' => $album->id,
                'name' => $album->name,
                'artist' => $album->artist->name,
                'cover' => $album->cover,
                'year' => $album->release_date?->year ?? 2024,
            ]);

        // Get playlists (for now, just return curated ones)
        $playlists = \App\Models\Playlist::where('is_curated', true)
            ->take(8)
            ->get()
            ->map(fn ($playlist) => [
                'id' => $playlist->id,
                'name' => $playlist->name,
                'description' => $playlist->description,
                'image' => $playlist->image,
            ]);

        return Inertia::render('categories/id', [
            'category' => [
                'id' => $category->slug,
                'name' => $category->name,
                'image' => $category->image,
                'color' => $category->color,
                'albums' => $albums,
                'playlists' => $playlists,
                'tracks' => $category->tracks->take(20)->map(fn ($track) => [
                    'id' => $track->id,
                    'name' => $track->name,
                    'artist' => $track->artist->name,
                    'album' => $track->album->name,
                    'album_cover' => $track->album->cover,
                    'duration' => $track->duration,
                    'audio' => $track->audio_url,
                ]),
            ],
        ]);
    }
}
