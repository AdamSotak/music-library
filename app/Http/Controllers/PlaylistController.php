<?php

namespace App\Http\Controllers;

use App\Models\Playlist;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PlaylistController extends Controller
{
    public function index()
    {
        $playlists = Playlist::all()->map(fn ($playlist) => [
            'id' => $playlist->id,
            'name' => $playlist->name,
            'description' => $playlist->description,
            'image' => $playlist->image,
        ]);

        return Inertia::render('playlists/index', ['playlists' => $playlists]);
    }

    public function show(string $id)
    {
        $playlist = Playlist::with(['tracks.artist', 'tracks.album'])
            ->findOrFail($id);

        return Inertia::render('playlists/show', [
            'playlist' => [
                'id' => $playlist->id,
                'name' => $playlist->name,
                'description' => $playlist->description,
                'image' => $playlist->image,
                'tracks' => $playlist->tracks->map(fn ($track) => [
                    'id' => $track->id,
                    'name' => $track->name,
                    'artist' => $track->artist->name,
                    'album' => $track->album->name,
                    'album_id' => $track->album->id,
                    'album_cover' => $track->album->cover,
                    'duration' => $track->duration,
                    'audio' => $track->audio_url,
                ]),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $playlist = Playlist::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'image' => 'https://placehold.co/600x600/1a1a1a/white?text=Playlist',
            'is_curated' => false,
        ]);

        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $playlist = Playlist::findOrFail($id);
        $playlist->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
        ]);

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $playlist = Playlist::findOrFail($id);
        $playlist->delete();

        return redirect()->route('collection.playlists');
    }

    public function addTracks(Request $request, string $id)
    {
        $validated = $request->validate([
            'track_ids' => 'required|array',
            'track_ids.*' => 'exists:tracks,id',
        ]);

        $playlist = Playlist::findOrFail($id);

        // Get the max position in the playlist
        $maxPosition = $playlist->tracks()->max('position') ?? 0;

        // Attach tracks with incremented positions
        foreach ($validated['track_ids'] as $index => $trackId) {
            // Check if track is already in the playlist
            if (! $playlist->tracks()->where('track_id', $trackId)->exists()) {
                $playlist->tracks()->attach($trackId, [
                    'position' => $maxPosition + $index + 1,
                ]);
            }
        }

        return redirect()->back();
    }

    public function removeTrack(string $playlistId, string $trackId)
    {
        $playlist = Playlist::findOrFail($playlistId);
        $playlist->tracks()->detach($trackId);

        return redirect()->back();
    }
}
