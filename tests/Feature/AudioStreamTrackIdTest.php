<?php

use App\Models\Album;
use App\Models\Artist;
use App\Models\Category;
use App\Models\Track;
use App\Services\DeezerService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('streams the correct preview when track_id is provided', function () {
    $category = Category::create([
        'slug' => 'test',
        'name' => 'Test',
        'color' => '#000000',
        'image_url' => 'https://example.test/category.png',
    ]);

    $artistA = Artist::create([
        'id' => '1',
        'name' => 'Sepultura',
        'image_url' => 'https://example.test/artist-a.png',
        'monthly_listeners' => 1,
        'is_verified' => false,
    ]);

    $albumA = Album::create([
        'id' => '10',
        'name' => 'Roots',
        'artist_id' => $artistA->id,
        'image_url' => 'https://example.test/album-a.png',
        'release_date' => '1996-01-01',
        'genre' => 'metal',
    ]);

    $artistB = Artist::create([
        'id' => '2',
        'name' => 'Kittie',
        'image_url' => 'https://example.test/artist-b.png',
        'monthly_listeners' => 1,
        'is_verified' => false,
    ]);

    $albumB = Album::create([
        'id' => '20',
        'name' => 'Spit',
        'artist_id' => $artistB->id,
        'image_url' => 'https://example.test/album-b.png',
        'release_date' => '1999-01-01',
        'genre' => 'metal',
    ]);

    $trackA = Track::create([
        'id' => 'track-a',
        'deezer_track_id' => '717575',
        'name' => 'Spit',
        'artist_id' => $artistA->id,
        'album_id' => $albumA->id,
        'duration' => 145,
        'audio_url' => 'https://example.test/expired-a.mp3',
        'category_slug' => $category->slug,
    ]);

    Track::create([
        'id' => 'track-b',
        'deezer_track_id' => '64970881',
        'name' => 'Spit',
        'artist_id' => $artistB->id,
        'album_id' => $albumB->id,
        'duration' => 165,
        'audio_url' => 'https://example.test/expired-b.mp3',
        'category_slug' => $category->slug,
    ]);

    $this->mock(DeezerService::class, function ($mock) {
        $mock
            ->shouldReceive('getPreviewUrl')
            ->once()
            ->with('717575')
            ->andReturn('https://example.test/correct.mp3');

        $mock->shouldReceive('searchPreviewUrl')->never();
        $mock->shouldReceive('searchTrackPreviewUrl')->never();
    });

    $resp = $this->get('/api/audio/stream?track_id='.$trackA->id.'&q=Spit');
    $resp->assertRedirect('https://example.test/correct.mp3');
});
