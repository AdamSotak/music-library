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

        $playlists = Auth::check()
            ? \App\Models\Playlist::select('id', 'name', 'description', 'is_default', 'created_at', 'updated_at')
                ->where('user_id', Auth::id())
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($playlist) {
                // Get the first track's album cover for this playlist (if any)
                $firstTrack = DB::table('playlist_tracks')
                    ->join('tracks', 'playlist_tracks.track_id', '=', 'tracks.id')
                    ->join('albums', 'tracks.album_id', '=', 'albums.id')
                    ->where('playlist_tracks.playlist_id', $playlist->id)
                    ->select('albums.image_url')
                    ->first();

                return [
                    'id' => $playlist->id,
                    'name' => $playlist->name,
                    'description' => $playlist->description,
                    'is_default' => $playlist->is_default,
                    'image' => $firstTrack->image_url ?? null,
                    'tracks' => $playlist->tracks,
                    'created_at' => $playlist->created_at,
                    'updated_at' => $playlist->updated_at,
                ];
            })
            : [];

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

        $user = Auth::user();

        return [
            ...parent::share($request),
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'createdAt' => $user->created_at,
            ] : null,
            'playlists' => $playlists,
            'savedAlbums' => $savedAlbums,
            'followedArtists' => $followedArtists,
        ];
    }
}
