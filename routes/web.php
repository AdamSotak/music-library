<?php

use App\Http\Controllers\AlbumController;
use App\Http\Controllers\ArtistController;
use App\Http\Controllers\AudioProxyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\FriendController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\PlaylistController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\TrackController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::controller(AuthController::class)->group(function () {
    Route::get('/login', 'login')->name('login');
    Route::get('/signup', 'signup')->name('signup');

    Route::post('/login', 'storeLogin');
    Route::post('/signup', 'storeSignup');

    // 2FA verification route (must be accessible without 2fa middleware)
    Route::middleware('auth')->group(function () {
        Route::get('/verify-2fa', 'showTwoFactorVerify')->name('2fa.verify');
        Route::post('/verifyTwoFactorLogin', 'verifyTwoFactorLogin');
    });
});

Route::controller(HomeController::class)->group(function () {
    Route::get('/', 'index');
});

Route::controller(CategoryController::class)->group(function () {
    Route::get('/categories', 'show');
    Route::get('/categories/{id}', 'showById');
});

// Canonical Spotify routing structure
Route::prefix('collection')->group(function () {
    Route::get('/albums', [AlbumController::class, 'index'])->name('collection.albums');
    Route::get('/tracks', [TrackController::class, 'index'])->name('collection.tracks');
});

// Artist routes
Route::get('/artist/{id}', [ArtistController::class, 'show'])->name('artists.show');

// Album routes
Route::get('/albums/{id}', [AlbumController::class, 'show'])->name('albums.show');
Route::get('/tracks/{id}', [TrackController::class, 'show'])->name('tracks.show');

Route::get('/search', [SearchController::class, 'index'])->name('search.index');
Route::get('/api/search/tracks', [SearchController::class, 'searchTracks'])->name('api.search.tracks');

Route::get('/scan', [TrackController::class, 'scan'])->name('scan');
Route::get('/api/barcode/{track}', [TrackController::class, 'generateBarcode'])->name('api.barcode');

// Audio proxy with smart URL refresh
Route::get('/api/audio/stream', [AudioProxyController::class, 'stream'])->name('api.audio.stream');

// Debug API endpoint
Route::get('/api/debug/data', function () {
    return response()->json([
        'artists' => \App\Models\Artist::with('albums')->get(),
        'albums' => \App\Models\Album::with(['artist', 'tracks'])->get(),
        'tracks' => \App\Models\Track::with(['artist', 'album'])->get(),
        'playlists' => \App\Models\Playlist::with('tracks')->get(),
    ]);
});

// Auth-only routes (no 2FA verification required - users can access these immediately after login)
Route::middleware(['auth'])->group(function () {
    Route::controller(AuthController::class)->group(function () {
        Route::post('/logout', 'logout');
        Route::get('/account', 'account');
        Route::post('/delete-account', 'destroy');
        Route::get('/setupTwoFactor', 'setupTwoFactor');
        Route::post('/verifyTwoFactor', 'verifyTwoFactor');
        Route::post('/disableTwoFactor', 'disableTwoFactor');
    });
});

// Protected routes (require both auth and 2FA verification if enabled)
Route::middleware(['auth', '2fa'])->group(function () {
    // Playlist management
    Route::post('/playlist', [PlaylistController::class, 'store'])->name('playlists.store');
    Route::get('/playlist/{id}', [PlaylistController::class, 'show'])->name('playlists.show');
    Route::put('/playlist/{id}', [PlaylistController::class, 'update'])->name('playlists.update');
    Route::delete('/playlist/{id}', [PlaylistController::class, 'destroy'])->name('playlists.destroy');
    Route::post('/playlist/{id}/tracks', [PlaylistController::class, 'addTracks'])->name('playlists.addTracks');
    Route::delete('/playlist/{playlistId}/tracks/{trackId}', [PlaylistController::class, 'removeTrack'])->name('playlists.removeTrack');

    // Shared playlist management
    Route::post('/playlist/{id}/share', [PlaylistController::class, 'share'])->name('playlists.share');
    Route::post('/playlist/{id}/share/users', [PlaylistController::class, 'addSharedUsers'])->name('playlists.addSharedUsers');
    Route::delete('/playlist/{playlistId}/share/users/{userId}', [PlaylistController::class, 'removeSharedUser'])->name('playlists.removeSharedUser');
    Route::post('/playlist/{id}/leave', [PlaylistController::class, 'leaveSharedPlaylist'])->name('playlists.leave');
    Route::get('/api/playlist/{id}/share/users', [PlaylistController::class, 'getSharedUsers'])->name('api.playlists.sharedUsers');

    // Library management (save albums, follow artists)
    Route::post('/library/albums/{albumId}', [LibraryController::class, 'saveAlbum'])->name('library.saveAlbum');
    Route::post('/library/artists/{artistId}', [LibraryController::class, 'followArtist'])->name('library.followArtist');
    Route::get('/library/albums/{albumId}/check', [LibraryController::class, 'checkAlbumSaved'])->name('library.checkAlbumSaved');
    Route::get('/library/artists/{artistId}/check', [LibraryController::class, 'checkArtistFollowed'])->name('library.checkArtistFollowed');

    // Friend management
    Route::post('/friends/{userId}', [FriendController::class, 'sendFriendRequest'])->name('friends.sendRequest');
    Route::post('/friends/{userId}/accept', [FriendController::class, 'acceptFriendRequest'])->name('friends.acceptRequest');
    Route::post('/friends/{userId}/remove', [FriendController::class, 'removeFriend'])->name('friends.remove');
    Route::get('/friends/{userId}/status', [FriendController::class, 'checkFriendStatus'])->name('friends.checkStatus');
    Route::get('/api/friends/search', [FriendController::class, 'searchUsers'])->name('api.friends.search');

    // Friends page
    Route::get('/friends', [FriendController::class, 'index'])->name('friends.index');
});
