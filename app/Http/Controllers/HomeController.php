<?php

namespace App\Http\Controllers;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Playlist;
use App\Models\Track;
use Illuminate\Support\Facades\Auth;
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

        // Get a random friend and their liked songs
        $friendRecommendation = null;
        $currentUser = Auth::user();
        $friends = $currentUser->getFriends();

        if ($friends->isNotEmpty()) {
            // Pick a random friend
            $randomFriend = $friends->random();

            // Get the friend's "Liked Songs" playlist (is_default = true)
            $likedSongsPlaylist = Playlist::where('user_id', $randomFriend->id)
                ->where('is_default', true)
                ->first();

            if ($likedSongsPlaylist) {
                // Get random tracks from the liked songs playlist (max 10)
                $friendTracks = Track::with(['artist', 'album'])
                    ->join('playlist_tracks', 'tracks.id', '=', 'playlist_tracks.track_id')
                    ->where('playlist_tracks.playlist_id', $likedSongsPlaylist->id)
                    ->select('tracks.*')
                    ->inRandomOrder()
                    ->limit(10)
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

                if ($friendTracks->isNotEmpty()) {
                    $friendRecommendation = [
                        'friend_name' => $randomFriend->name,
                        'friend_id' => $randomFriend->id,
                        'tracks' => $friendTracks,
                    ];
                }
            }
        }

        return Inertia::render('index', [
            'albums' => $albums,
            'artists' => $artists,
            'tracks' => $tracks,
            'friendRecommendation' => $friendRecommendation,
        ]);
    }
}
