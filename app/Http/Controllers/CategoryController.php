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
            'image' => $category->image_url,
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
                'cover' => $album->image_url,
                'year' => $album->release_date?->year ?? 2024,
            ]);

        // Get playlists (for now, just return default ones)
        $playlists = \App\Models\Playlist::where('is_default', true)
            ->take(8)
            ->get()
            ->map(function ($playlist) {
                // Get the first track in the playlist
                $firstTrack = $playlist->tracks()->with('album')->first();
                $image = $firstTrack && $firstTrack->album ? $firstTrack->album->image_url : null;

                return [
                    'id' => $playlist->id,
                    'name' => $playlist->name,
                    'is_default' => $playlist->is_default,
                    'description' => $playlist->description,
                    'image' => $image,
                ];
            });

        return Inertia::render('categories/id', [
            'category' => [
                'id' => $category->slug,
                'name' => $category->name,
                'image' => $category->image_url,
                'color' => $category->color,
                'albums' => $albums,
                'playlists' => $playlists,
                'tracks' => $category->tracks->take(20)->map(fn ($track) => [
                    'id' => $track->id,
                    'name' => $track->name,
                    'artist' => $track->artist->name,
                    'album' => $track->album->name,
                    'album_cover' => $track->album->image_url,
                    'duration' => $track->duration,
                    'audio' => $track->audio_url,
                ]),
            ],
        ]);
    }
}
