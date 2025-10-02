<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class SearchController extends Controller
{
    public function index()
    {
        return Inertia::render('search/index', [
            'recentSearches' => [
                ['term' => 'Focus playlists', 'type' => 'playlist'],
                ['term' => 'Neo Skyline', 'type' => 'album'],
            ],
            'trending' => [
                ['label' => 'Mood boosters'],
                ['label' => 'Indie summer'],
            ],
        ]);
    }
}
