<?php

use App\Models\Album;
use App\Models\Artist;
use App\Models\Category;
use App\Models\Track;
use App\Models\User;
use App\Models\UserTrackPlay;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('records a play for the authenticated user', function () {
    $user = User::factory()->create([
        'two_factor_enabled' => false,
    ]);

    Category::create([
        'slug' => 'test',
        'name' => 'Test',
        'color' => '#000000',
        'image_url' => 'https://example.test/category.png',
    ]);

    $artist = Artist::create([
        'id' => '1',
        'name' => 'Artist',
        'image_url' => 'https://example.test/artist.png',
        'monthly_listeners' => 1,
        'is_verified' => false,
    ]);

    $album = Album::create([
        'id' => '10',
        'name' => 'Album',
        'artist_id' => $artist->id,
        'image_url' => 'https://example.test/album.png',
        'release_date' => '2000-01-01',
        'genre' => 'Unknown',
    ]);

    $track = Track::create([
        'id' => 'track-1',
        'name' => 'Track',
        'artist_id' => $artist->id,
        'album_id' => $album->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/audio.mp3',
        'category_slug' => 'test',
    ]);

    $this->actingAs($user)
        ->postJson('/api/me/plays', [
            'track_id' => $track->id,
            'offset_ms' => 1234,
            'context' => 'player',
        ])
        ->assertOk()
        ->assertJson(['ok' => true]);

    expect(UserTrackPlay::count())->toBe(1);
    $row = UserTrackPlay::first();
    expect($row->user_id)->toBe($user->id);
    expect($row->track_id)->toBe($track->id);
    expect($row->offset_ms)->toBe(1234);
});
