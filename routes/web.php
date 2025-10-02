<?php

use App\Http\Controllers\AlbumController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\PlaylistController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\TrackController;

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('index'));

Route::controller(AuthController::class)->group(function () {
    Route::get('/login', 'login');
    Route::get('/signup', 'signup');
});

Route::controller(CategoryController::class)->group(function () {
    Route::get('/categories', 'show');
    Route::get('/categories/{id}', 'showById');
});


// Canonical Spotify routing structure
Route::prefix('collection')->group(function () {
    Route::get('/albums', [AlbumController::class, 'index'])->name('collection.albums');
    Route::get('/playlists', [PlaylistController::class, 'index'])->name('collection.playlists');
    Route::get('/tracks', [TrackController::class, 'index'])->name('collection.tracks');
});

Route::get('/album/{id}', [AlbumController::class, 'show'])->name('albums.show');
Route::get('/playlist/{id}', [PlaylistController::class, 'show'])->name('playlists.show');
Route::get('/track/{id}', [TrackController::class, 'show'])->name('tracks.show');

// Playlist management
Route::post('/playlist', [PlaylistController::class, 'store'])->name('playlists.store');
Route::put('/playlist/{id}', [PlaylistController::class, 'update'])->name('playlists.update');
Route::delete('/playlist/{id}', [PlaylistController::class, 'destroy'])->name('playlists.destroy');
Route::post('/playlist/{id}/tracks', [PlaylistController::class, 'addTracks'])->name('playlists.addTracks');
Route::delete('/playlist/{playlistId}/tracks/{trackId}', [PlaylistController::class, 'removeTrack'])->name('playlists.removeTrack');

Route::get('/search', [SearchController::class, 'index'])->name('search.index');



// Debug API endpoint
Route::get('/api/debug/data', function () {
    return response()->json([
        'artists' => \App\Models\Artist::with('albums')->get(),
        'albums' => \App\Models\Album::with(['artist', 'tracks'])->get(),
        'tracks' => \App\Models\Track::with(['artist', 'album'])->get(),
        'playlists' => \App\Models\Playlist::with('tracks')->get(),
    ]);
});

