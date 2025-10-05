<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
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

        $playlists = \App\Models\Playlist::select('id', 'name', 'description', 'is_default')
            ->orderBy('created_at', 'desc')
            ->limit(20)
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
                ];
            });

        return [
            ...parent::share($request),
            'playlists' => $playlists,
        ];
    }
}
