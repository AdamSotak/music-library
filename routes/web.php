<?php

use App\Http\Controllers\AlbumController;
use App\Http\Controllers\ArtistController;
use App\Http\Controllers\AudioProxyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\PlaylistController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\TrackController;
use Illuminate\Support\Facades\Route;

Route::controller(AuthController::class)->group(function () {
    Route::get('/login', 'login')->name('login');
    Route::get('/signup', 'signup')->name('signup');

    Route::post('/login', 'storeLogin');
    Route::post('/signup', 'storeSignup');
});

// Protected routes
Route::middleware('auth')->group(function () {
    Route::controller(HomeController::class)->group(function () {
        Route::get('/', 'index');
    });

    Route::controller(AuthController::class)->group(function () {
        Route::post('/logout', 'logout');
        Route::get('/account', 'account');
        Route::post('/delete-account', 'destroy');
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
    Route::get('/playlist/{id}', [PlaylistController::class, 'show'])->name('playlists.show');
    Route::get('/tracks/{id}', [TrackController::class, 'show'])->name('tracks.show');

    // Playlist management
    Route::post('/playlist', [PlaylistController::class, 'store'])->name('playlists.store');
    Route::put('/playlist/{id}', [PlaylistController::class, 'update'])->name('playlists.update');
    Route::delete('/playlist/{id}', [PlaylistController::class, 'destroy'])->name('playlists.destroy');
    Route::post('/playlist/{id}/tracks', [PlaylistController::class, 'addTracks'])->name('playlists.addTracks');
    Route::delete('/playlist/{playlistId}/tracks/{trackId}', [PlaylistController::class, 'removeTrack'])->name('playlists.removeTrack');

    Route::get('/search', [SearchController::class, 'index'])->name('search.index');
    Route::get('/api/search/tracks', [SearchController::class, 'searchTracks'])->name('api.search.tracks');

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
});
