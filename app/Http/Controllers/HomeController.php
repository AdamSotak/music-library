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

        // Get a random friend and their liked songs (optimized single query)
        $friendRecommendation = null;
        if (Auth::user()) {
            $friends = Auth::user()->getFriends();
    
            if ($friends->isNotEmpty()) {
                $friendIds = $friends->pluck('id');
    
                // Single query: Get all friends' playlists that have tracks, then pick one randomly
                $playlistWithTracks = Playlist::whereIn('user_id', $friendIds)
                    ->where('is_default', true)
                    ->whereHas('tracks') // Only playlists that have tracks
                    ->with('user:id,name')
                    ->inRandomOrder()
                    ->first();
    
                if ($playlistWithTracks) {
                    // Get random tracks from the selected friend's liked songs playlist
                    $friendTracks = Track::with(['artist', 'album'])
                        ->join('playlist_tracks', 'tracks.id', '=', 'playlist_tracks.track_id')
                        ->where('playlist_tracks.playlist_id', $playlistWithTracks->id)
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
    
                    $friendRecommendation = [
                        'friend_name' => $playlistWithTracks->user->name,
                        'friend_id' => $playlistWithTracks->user->id,
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
