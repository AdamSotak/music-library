<?php

namespace App\Http\Controllers;

use App\Models\Playlist;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PlaylistController extends Controller
{
    public function show(string $id)
    {
        $playlist = Playlist::with(['tracks.artist', 'tracks.album', 'collaborators', 'user'])
            ->findOrFail($id);

        $collaborators = $playlist->collaborators->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->pivot->role,
        ]);

        $currentUserId = auth()->id();
        $currentRole = null;
        if ($currentUserId) {
            $current = $playlist->collaborators->firstWhere('id', $currentUserId);
            if ($current) {
                $currentRole = $current->pivot->role;
            }
        }

        $owner = $playlist->collaborators->firstWhere('pivot.role', 'owner') ?? $playlist->user;
        $ownerName = $owner?->name;

        return Inertia::render('playlists/show', [
            'playlist' => [
                'id' => $playlist->id,
                'name' => $playlist->name,
                'description' => $playlist->description,
                'image' => $playlist->image_url,
                'is_default' => $playlist->is_default,
                'is_collaborative' => $playlist->is_collaborative,
                'invite_token' => $playlist->invite_token,
                'owner_name' => $ownerName,
                'current_role' => $currentRole,
                'collaborators' => $collaborators,
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
            'user_id' => auth()->id(),
            'is_collaborative' => (bool) $request->input('is_collaborative', false),
        ]);

        $playlist->collaborators()->syncWithoutDetaching([auth()->id() => ['role' => 'owner']]);

        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $playlist = Playlist::findOrFail($id);

        if (! $this->canManage($playlist)) {
            abort(403, 'Unauthorized action.');
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

        if (! $this->isOwner($playlist)) {
            abort(403, 'Unauthorized action.');
        }

        $playlist->delete();

        // Send the user to a safe page (home) to avoid 404 if they were on the playlist page
        return redirect('/');
    }

    public function addTracks(Request $request, string $id)
    {
        $validated = $request->validate([
            'track_ids' => 'required|array',
            'track_ids.*' => 'exists:tracks,id',
        ]);

        $playlist = Playlist::findOrFail($id);

        if (! $this->canEditTracks($playlist)) {
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

        if (! $this->canEditTracks($playlist)) {
            abort(403, 'Unauthorized action.');
        }

        $playlist->tracks()->detach($trackId);

        return redirect()->back();
    }

    public function invite(string $id)
    {
        $playlist = Playlist::findOrFail($id);
        if (! $this->isOwner($playlist)) {
            abort(403, 'Unauthorized action.');
        }

        if (! $playlist->invite_token) {
            $playlist->invite_token = Str::random(32);
            $playlist->is_collaborative = true;
            $playlist->save();
        }

        $url = url("/playlist/join/{$playlist->invite_token}");

        return response()->json(['invite_url' => $url]);
    }

    public function joinByToken(string $token)
    {
        $playlist = Playlist::where('invite_token', $token)->firstOrFail();
        $userId = auth()->id();
        if (! $userId) {
            return redirect('/login');
        }

        $playlist->collaborators()->syncWithoutDetaching([$userId => ['role' => 'collaborator']]);
        $playlist->is_collaborative = true;
        $playlist->save();

        return redirect()->route('playlists.show', ['id' => $playlist->id]);
    }

    public function collaborators(string $id)
    {
        $playlist = Playlist::with('collaborators')->findOrFail($id);
        if (! $this->canManage($playlist)) {
            abort(403, 'Unauthorized action.');
        }

        return response()->json(
            $playlist->collaborators->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->pivot->role,
            ])
        );
    }

    public function updateCollaborator(Request $request, string $id, string $userId)
    {
        $playlist = Playlist::with('collaborators')->findOrFail($id);
        if (! $this->isOwner($playlist)) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'role' => 'required|in:owner,collaborator,viewer',
        ]);

        // prevent removing last owner
        if ($validated['role'] !== 'owner') {
            $ownerCount = $playlist->collaborators->where('pivot.role', 'owner')->count();
            $targetIsOwner = $playlist->collaborators->where('id', $userId)->where('pivot.role', 'owner')->count() > 0;
            if ($targetIsOwner && $ownerCount <= 1) {
                return response()->json(['error' => 'Cannot remove the last owner'], 422);
            }
        }

        $playlist->collaborators()->updateExistingPivot($userId, ['role' => $validated['role']]);

        return response()->json(['status' => 'ok']);
    }

    public function removeCollaborator(string $id, string $userId)
    {
        $playlist = Playlist::with('collaborators')->findOrFail($id);
        if (! $this->isOwner($playlist)) {
            abort(403, 'Unauthorized action.');
        }

        $ownerCount = $playlist->collaborators->where('pivot.role', 'owner')->count();
        $target = $playlist->collaborators->firstWhere('id', $userId);
        if ($target && $target->pivot->role === 'owner' && $ownerCount <= 1) {
            return response()->json(['error' => 'Cannot remove the last owner'], 422);
        }

        $playlist->collaborators()->detach($userId);

        return response()->json(['status' => 'ok']);
    }

    private function isOwner(Playlist $playlist): bool
    {
        $userId = auth()->id();
        return (bool) $playlist->collaborators()->wherePivot('role', 'owner')->where('user_id', $userId)->exists();
    }

    private function canManage(Playlist $playlist): bool
    {
        return $this->isOwner($playlist);
    }

    private function canEditTracks(Playlist $playlist): bool
    {
        $userId = auth()->id();
        if (! $userId) {
            return false;
        }

        // owners or collaborators can edit when collaborative, owners always can.
        if ($this->isOwner($playlist)) {
            return true;
        }

        if ($playlist->is_collaborative) {
            return $playlist->collaborators()
                ->where('user_id', $userId)
                ->whereIn('role', ['owner', 'collaborator'])
                ->exists();
        }

        return false;
    }
}
