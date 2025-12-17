<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {

        $playlists = [];
        if (Auth::check()) {
            $userId = Auth::id();
            $playlists = \App\Models\Playlist::with([
                'tracks:id',
                'user:id,name',
                'collaborators:id,name',
            ])
                ->where(function ($q) use ($userId) {
                    $q->where('user_id', $userId)
                        ->orWhereHas('collaborators', fn ($c) => $c->where('users.id', $userId));
                })
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($playlist) use ($userId) {
                    $firstTrack = DB::table('playlist_tracks')
                        ->join('tracks', 'playlist_tracks.track_id', '=', 'tracks.id')
                        ->leftJoin('albums', 'tracks.album_id', '=', 'albums.id')
                        ->where('playlist_tracks.playlist_id', $playlist->id)
                        ->select('albums.image_url')
                        ->first();

                    $currentPivot = $playlist->collaborators
                        ->firstWhere('id', $userId)?->pivot;

                    return [
                        'id' => $playlist->id,
                        'name' => $playlist->name,
                        'description' => $playlist->description ?: null,
                        'is_default' => $playlist->is_default,
                        'is_collaborative' => $playlist->is_collaborative,
                        'is_shared' => $playlist->is_shared,
                        'owner_name' => $playlist->user?->name,
                        'current_role' => $currentPivot->role ?? ($playlist->user_id === $userId ? 'owner' : null),
                        'image' => $firstTrack->image_url ?? null,
                        'tracks' => $playlist->tracks
                            ->map(fn ($track) => ['id' => $track->id])
                            ->values(),
                        'created_at' => $playlist->created_at,
                        'updated_at' => $playlist->updated_at,
                    ];
                })
                ->values();
        }

        $savedAlbums = Auth::check()
            ? Auth::user()->savedAlbums()->with('artist')->get()->map(function ($album) {
                return [
                    'id' => $album->id,
                    'name' => $album->name,
                    'artist' => $album->artist->name,
                    'artist_id' => $album->artist->id,
                    'cover' => $album->image_url,
                    'year' => $album->release_date ? $album->release_date->format('Y') : null,
                    'saved_at' => $album->pivot->saved_at,
                ];
            })
            : [];

        $followedArtists = Auth::check()
            ? Auth::user()->followedArtists()->get()->map(function ($artist) {
                return [
                    'id' => $artist->id,
                    'name' => $artist->name,
                    'image' => $artist->image_url,
                    'monthly_listeners' => $artist->monthly_listeners,
                    'is_verified' => $artist->is_verified,
                    'followed_at' => $artist->pivot->followed_at,
                ];
            })
            : [];

        $friends = Auth::check()
            ? Auth::user()->getFriends()->map(function ($friend) {
                return [
                    'id' => $friend->id,
                    'name' => $friend->name,
                    'email' => $friend->email,
                    'created_at' => $friend->created_at,
                ];
            })
            : [];

        $sentFriendRequests = Auth::check()
            ? Auth::user()->sentFriendRequests()->get()->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'requested_at' => $user->pivot->created_at,
                ];
            })
            : [];

        $receivedFriendRequests = Auth::check()
            ? Auth::user()->receivedFriendRequests()->get()->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'requested_at' => $user->pivot->created_at,
                ];
            })
            : [];

        $sharedPlaylists = Auth::check()
            ? Auth::user()->sharedPlaylists()->with([
                'tracks:id',
                'user:id,name',
            ])
                ->get()
                ->map(function ($playlist) {
                    $firstTrack = DB::table('playlist_tracks')
                        ->join('tracks', 'playlist_tracks.track_id', '=', 'tracks.id')
                        ->leftJoin('albums', 'tracks.album_id', '=', 'albums.id')
                        ->where('playlist_tracks.playlist_id', $playlist->id)
                        ->select('albums.image_url')
                        ->first();

                    return [
                        'id' => $playlist->id,
                        'name' => $playlist->name,
                        'description' => $playlist->description ?: null,
                        'is_default' => $playlist->is_default,
                        'is_shared' => $playlist->is_shared,
                        'owner_id' => $playlist->user_id,
                        'owner_name' => $playlist->user?->name,
                        'image' => $firstTrack->image_url ?? null,
                        'tracks' => $playlist->tracks
                            ->map(fn ($track) => ['id' => $track->id])
                            ->values(),
                        'created_at' => $playlist->created_at,
                        'updated_at' => $playlist->updated_at,
                    ];
                })
                ->values()
            : [];

        $user = Auth::user();

        return [
            ...parent::share($request),
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'createdAt' => $user->created_at,
                'twoFactorEnabled' => $user->two_factor_enabled,
            ] : null,
            'playlists' => $playlists,
            'sharedPlaylists' => $sharedPlaylists,
            'savedAlbums' => $savedAlbums,
            'followedArtists' => $followedArtists,
            'friends' => $friends,
            'sentFriendRequests' => $sentFriendRequests,
            'receivedFriendRequests' => $receivedFriendRequests,
        ];
    }
}
