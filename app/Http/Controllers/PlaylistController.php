<?php

namespace App\Http\Controllers;

use App\Models\Playlist;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PlaylistController extends Controller
{
    public function show(string $id)
    {
        $playlist = Playlist::with(['tracks.artist', 'tracks.album', 'user', 'sharedWith'])
            ->findOrFail($id);

        $user = auth()->user();

        if ($playlist->user_id !== $user->id && ! $playlist->isSharedWithUser($user)) {
            abort(403, 'Unauthorized action.');
        }

        return Inertia::render('playlists/show', [
            'playlist' => [
                'id' => $playlist->id,
                'name' => $playlist->name,
                'description' => $playlist->description,
                'image' => $playlist->image_url,
                'is_default' => $playlist->is_default,
                'is_shared' => $playlist->is_shared,
                'is_owner' => $playlist->user_id === $user->id,
                'owner_id' => $playlist->user_id,
                'owner_name' => $playlist->user->name,
                'shared_with' => $playlist->sharedWith->map(fn ($sharedUser) => [
                    'id' => $sharedUser->id,
                    'name' => $sharedUser->name,
                    'email' => $sharedUser->email,
                    'added_at' => $sharedUser->pivot->added_at,
                ]),
                'tracks' => $playlist->tracks->map(fn ($track) => [
                    'id' => $track->id,
                    'name' => $track->name,
                    'artist' => $track->artist->name,
                    'artist_id' => $track->artist->id,
                    'album' => $track->album->name,
                    'album_id' => $track->album->id,
                    'album_cover' => $track->album->image_url,
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
            'is_default' => false,
            'is_shared' => false,
            'user_id' => auth()->id(),
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

        if ($playlist->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action');
        }

        $playlist->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
        ]);

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $playlist = Playlist::findOrFail($id);

        // only owner can delete playlist
        if ($playlist->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        $playlist->delete();

        return redirect('/');
    }

    public function addTracks(Request $request, string $id)
    {
        $validated = $request->validate([
            'track_ids' => 'required|array',
            'track_ids.*' => 'exists:tracks,id',
        ]);

        $playlist = Playlist::findOrFail($id);
        $user = auth()->user();

        // Authorization: Owner or shared users can add tracks
        if (! $playlist->canUserEdit($user)) {
            abort(403, 'Unauthorized action.');
        }

        // Attach tracks
        foreach ($validated['track_ids'] as $trackId) {
            // Check if track is already in the playlist
            if (! $playlist->tracks()->where('track_id', $trackId)->exists()) {
                $playlist->tracks()->attach($trackId);
            }
        }

        return redirect()->back();
    }

    public function removeTrack(string $playlistId, string $trackId)
    {
        $playlist = Playlist::findOrFail($playlistId);
        $user = auth()->user();

        // Authorization: Owner or shared users can remove tracks
        if (! $playlist->canUserEdit($user)) {
            abort(403, 'Unauthorized action.');
        }

        $playlist->tracks()->detach($trackId);

        return redirect()->back();
    }

    /**
     * Toggle sharing on a playlist and optionally add/remove users
     */
    public function share(Request $request, string $id)
    {
        $validated = $request->validate([
            'is_shared' => 'required|boolean',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $playlist = Playlist::findOrFail($id);
        $user = auth()->user();

        if (! $playlist->canUserManageSharing($user)) {
            abort(403, 'Only the playlist owner can manage sharing.');
        }

        if ($playlist->is_default) {
            abort(400, 'Cannot share the Liked Songs playlist.');
        }

        $playlist->update(['is_shared' => $validated['is_shared']]);

        // remove all shared users if sharing is dsabled
        if (! $validated['is_shared']) {
            $playlist->sharedWith()->detach();

            return redirect()->back();
        }

        if (isset($validated['user_ids'])) {
            $friends = $user->getFriends()->pluck('id')->toArray();
            $validUserIds = array_intersect($validated['user_ids'], $friends);

            $syncData = [];
            foreach ($validUserIds as $userId) {
                $syncData[$userId] = [
                    'added_by' => $user->id,
                    'added_at' => now(),
                ];
            }

            $playlist->sharedWith()->sync($syncData);
        }

        return redirect()->back();
    }

    // add users to a shared playlist
    public function addSharedUsers(Request $request, string $id)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $playlist = Playlist::findOrFail($id);
        $user = auth()->user();

        // only owner can add users
        if (! $playlist->canUserManageSharing($user)) {
            abort(403, 'Only the playlist owner can add users.');
        }

        if (! $playlist->is_shared) {
            abort(400, 'Playlist is not shared. Enable sharing first.');
        }

        $friends = $user->getFriends()->pluck('id')->toArray();
        $validUserIds = array_intersect($validated['user_ids'], $friends);

        foreach ($validUserIds as $userId) {
            if (! $playlist->sharedWith()->where('user_id', $userId)->exists()) {
                $playlist->sharedWith()->attach($userId, [
                    'added_by' => $user->id,
                    'added_at' => now(),
                ]);
            }
        }

        return redirect()->back();
    }

    // remove user from shared playlist

    public function removeSharedUser(string $playlistId, int $userId)
    {
        $playlist = Playlist::findOrFail($playlistId);
        $user = auth()->user();

        // only owner can remove users
        if (! $playlist->canUserManageSharing($user)) {
            abort(403, 'Only the playlist owner can remove users.');
        }

        $playlist->sharedWith()->detach($userId);

        return redirect()->back();
    }

    // leave shared playlist

    public function leaveSharedPlaylist(string $id)
    {
        $playlist = Playlist::findOrFail($id);
        $user = auth()->user();

        if ($playlist->isOwner($user)) {
            abort(400, 'You cannot leave your own playlist.');
        }

        if (! $playlist->isSharedWithUser($user)) {
            abort(403, 'You are not a member of this shared playlist.');
        }

        $playlist->sharedWith()->detach($user->id);

        return redirect('/');
    }

    // list users with whom the playlist is sharedd
    public function getSharedUsers(string $id)
    {
        $playlist = Playlist::with('sharedWith')->findOrFail($id);
        $user = auth()->user();

        if (! $playlist->canUserEdit($user)) {
            abort(403, 'Unauthorized action.');
        }

        return response()->json([
            'shared_users' => $playlist->sharedWith->map(fn ($sharedUser) => [
                'id' => $sharedUser->id,
                'name' => $sharedUser->name,
                'email' => $sharedUser->email,
                'added_at' => $sharedUser->pivot->added_at,
            ]),
        ]);
    }
}
