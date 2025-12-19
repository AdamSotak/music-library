<?php

namespace App\Services;

use App\Models\Artist;
use App\Models\Category;
use App\Models\Track;

class GenreClassificationService
{
    // DEPRECATED: legacy classifier. Not used by current Deezer-based ingestion.
    /**
     * Map artist names to genre slugs based on common knowledge
     */
    private const ARTIST_GENRE_MAP = [
        'Drake' => ['hip-hop', 'pop'],
        'Kendrick Lamar' => ['hip-hop'],
        'Kanye West' => ['hip-hop'],
        'Metallica' => ['metal', 'rock'],
        'Taylor Swift' => ['pop', 'country'],
        'Ed Sheeran' => ['pop', 'folk-and-acoustic'],
        'Beyoncé' => ['pop', 'soul'],
        'Billie Eilish' => ['pop', 'dance-electronic'],
        'The Weeknd' => ['pop', 'soul'],
        'Adele' => ['pop', 'soul'],
        'Coldplay' => ['rock', 'pop'],
        'Eminem' => ['hip-hop'],
        'Rihanna' => ['pop', 'dance-electronic'],
        'Imagine Dragons' => ['rock', 'pop'],
        'Dua Lipa' => ['pop', 'dance-electronic'],
    ];

    /**
     * Auto-classify all tracks by their artist
     */
    public function classifyAllTracks(): int
    {
        $classified = 0;

        foreach (self::ARTIST_GENRE_MAP as $artistName => $genreSlugs) {
            $artist = Artist::where('name', $artistName)->first();

            if (! $artist) {
                continue;
            }

            $categories = Category::whereIn('slug', $genreSlugs)->get();

            if ($categories->isEmpty()) {
                continue;
            }

            $tracks = Track::where('artist_id', $artist->id)->get();

            foreach ($tracks as $track) {
                foreach ($categories as $category) {
                    // Attach category if not already attached
                    if (! $track->categories()->where('category_id', $category->id)->exists()) {
                        $track->categories()->attach($category->id);
                        $classified++;
                    }
                }
            }
        }

        return $classified;
    }

    /**
     * Classify a single track based on its artist
     */
    public function classifyTrack(Track $track): int
    {
        $artist = $track->artist;

        if (! $artist) {
            return 0;
        }

        $genreSlugs = self::ARTIST_GENRE_MAP[$artist->name] ?? [];

        if (empty($genreSlugs)) {
            return 0;
        }

        $categories = Category::whereIn('slug', $genreSlugs)->get();
        $attached = 0;

        foreach ($categories as $category) {
            if (! $track->categories()->where('category_id', $category->id)->exists()) {
                $track->categories()->attach($category->id);
                $attached++;
            }
        }

        return $attached;
    }
}
