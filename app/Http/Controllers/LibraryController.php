<?php

namespace App\Http\Controllers;

use App\Models\Album;
use App\Models\Artist;
use Illuminate\Http\Request;

class LibraryController extends Controller
{
    // Save/Unsave Album
    public function saveAlbum(Request $request, string $albumId)
    {
        $album = Album::findOrFail($albumId);
        $user = auth()->user();

        // Check if already saved
        if ($user->savedAlbums()->where('album_id', $albumId)->exists()) {
            // Unsave
            $user->savedAlbums()->detach($albumId);
        } else {
            // Save
            $user->savedAlbums()->attach($albumId);
        }

        // Return back to the previous page - Inertia will automatically update shared props
        return redirect()->back();
    }

    // Follow/Unfollow Artist
    public function followArtist(Request $request, string $artistId)
    {
        $artist = Artist::findOrFail($artistId);
        $user = auth()->user();

        // Check if already following
        if ($user->followedArtists()->where('artist_id', $artistId)->exists()) {
            // Unfollow
            $user->followedArtists()->detach($artistId);
        } else {
            // Follow
            $user->followedArtists()->attach($artistId);
        }

        // Return back to the previous page - Inertia will automatically update shared props
        return redirect()->back();
    }

    // Check if album is saved
    public function checkAlbumSaved(string $albumId)
    {
        $isSaved = auth()->user()->savedAlbums()->where('album_id', $albumId)->exists();

        return response()->json(['is_saved' => $isSaved]);
    }

    // Check if artist is followed
    public function checkArtistFollowed(string $artistId)
    {
        $isFollowing = auth()->user()->followedArtists()->where('artist_id', $artistId)->exists();

        return response()->json(['is_following' => $isFollowing]);
    }
}
