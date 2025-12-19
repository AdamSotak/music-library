<?php

use App\Models\Album;
use App\Models\Artist;
use App\Models\Category;
use App\Models\Track;
use App\Models\TrackEmbedding;
use App\Services\Recommendation\MetadataScorer;
use App\Services\Recommendation\RecommendationContext;
use App\Services\Recommendation\RecommendationService;
use App\Services\Recommendation\SeedProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function zeroMetaScorer(): MetadataScorer
{
    return new class extends MetadataScorer
    {
        public function __construct() {}

        public function score(Track $candidate, SeedProfile $seed, string $seedType = 'track', ?string $seedGenreKey = null): float
        {
            return 0.0;
        }
    };
}

it('uses album seed embeddings to rank candidates', function () {
    Category::create([
        'slug' => 'test',
        'name' => 'Test',
        'color' => '#000000',
        'image_url' => 'https://example.test/category.png',
    ]);

    $artist = Artist::create([
        'id' => '1',
        'name' => 'Seed Artist',
        'image_url' => 'https://example.test/artist.png',
        'monthly_listeners' => 1,
        'is_verified' => false,
    ]);

    $seedAlbum = Album::create([
        'id' => '10',
        'name' => 'Seed Album',
        'artist_id' => $artist->id,
        'image_url' => 'https://example.test/album.png',
        'release_date' => '2000-01-01',
        'genre' => 'Unknown',
    ]);

    $otherAlbum = Album::create([
        'id' => '11',
        'name' => 'Other Album',
        'artist_id' => $artist->id,
        'image_url' => 'https://example.test/album2.png',
        'release_date' => '2000-01-01',
        'genre' => 'Unknown',
    ]);

    $seed1 = Track::create([
        'id' => 'seed-1',
        'name' => 'Seed One',
        'artist_id' => $artist->id,
        'album_id' => $seedAlbum->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/a.mp3',
        'category_slug' => 'test',
        'radio_genre_key' => 'metal',
        'deezer_genre_id' => '152',
    ]);

    $seed2 = Track::create([
        'id' => 'seed-2',
        'name' => 'Seed Two',
        'artist_id' => $artist->id,
        'album_id' => $seedAlbum->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/b.mp3',
        'category_slug' => 'test',
        'radio_genre_key' => 'metal',
        'deezer_genre_id' => '152',
    ]);

    $candidateGood = Track::create([
        'id' => 'cand-good',
        'name' => 'Candidate Good',
        'artist_id' => $artist->id,
        'album_id' => $otherAlbum->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/c.mp3',
        'category_slug' => 'test',
        'radio_genre_key' => 'metal',
        'deezer_genre_id' => '152',
    ]);

    $candidateBad = Track::create([
        'id' => 'cand-bad',
        'name' => 'Candidate Bad',
        'artist_id' => $artist->id,
        'album_id' => $otherAlbum->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/d.mp3',
        'category_slug' => 'test',
        'radio_genre_key' => 'metal',
        'deezer_genre_id' => '152',
    ]);

    TrackEmbedding::create(['track_id' => $seed1->id, 'embedding' => [1.0, 0.0]]);
    TrackEmbedding::create(['track_id' => $seed2->id, 'embedding' => [1.0, 0.0]]);
    TrackEmbedding::create(['track_id' => $candidateGood->id, 'embedding' => [1.0, 0.0]]);
    TrackEmbedding::create(['track_id' => $candidateBad->id, 'embedding' => [0.0, 1.0]]);

    $svc = new RecommendationService(metadataScorer: zeroMetaScorer());

    $ctx = RecommendationContext::fromArray([
        'seed_type' => 'album',
        'seed_id' => $seedAlbum->id,
        'exclude' => [$seed1->id, $seed2->id],
        'limit' => 2,
    ]);

    $recs = $svc->recommend($ctx);

    expect($recs)->toHaveCount(2);
    expect($recs->first()->id)->toBe($candidateGood->id);
});

it('uses artist seed embeddings to rank candidates', function () {
    Category::create([
        'slug' => 'test',
        'name' => 'Test',
        'color' => '#000000',
        'image_url' => 'https://example.test/category.png',
    ]);

    $seedArtist = Artist::create([
        'id' => '1',
        'name' => 'Seed Artist',
        'image_url' => 'https://example.test/artist.png',
        'monthly_listeners' => 1,
        'is_verified' => false,
    ]);

    $seedAlbum = Album::create([
        'id' => '10',
        'name' => 'Seed Album',
        'artist_id' => $seedArtist->id,
        'image_url' => 'https://example.test/album.png',
        'release_date' => '2000-01-01',
        'genre' => 'Unknown',
    ]);

    $seed1 = Track::create([
        'id' => 'seed-1',
        'name' => 'Seed One',
        'artist_id' => $seedArtist->id,
        'album_id' => $seedAlbum->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/a.mp3',
        'category_slug' => 'test',
        'radio_genre_key' => 'metal',
        'deezer_genre_id' => '152',
    ]);

    $seed2 = Track::create([
        'id' => 'seed-2',
        'name' => 'Seed Two',
        'artist_id' => $seedArtist->id,
        'album_id' => $seedAlbum->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/b.mp3',
        'category_slug' => 'test',
        'radio_genre_key' => 'metal',
        'deezer_genre_id' => '152',
    ]);

    $artistB = Artist::create([
        'id' => '2',
        'name' => 'Artist B',
        'image_url' => 'https://example.test/artist-b.png',
        'monthly_listeners' => 1,
        'is_verified' => false,
    ]);

    $artistC = Artist::create([
        'id' => '3',
        'name' => 'Artist C',
        'image_url' => 'https://example.test/artist-c.png',
        'monthly_listeners' => 1,
        'is_verified' => false,
    ]);

    $albumB = Album::create([
        'id' => '20',
        'name' => 'Album B',
        'artist_id' => $artistB->id,
        'image_url' => 'https://example.test/album-b.png',
        'release_date' => '2000-01-01',
        'genre' => 'Unknown',
    ]);

    $albumC = Album::create([
        'id' => '30',
        'name' => 'Album C',
        'artist_id' => $artistC->id,
        'image_url' => 'https://example.test/album-c.png',
        'release_date' => '2000-01-01',
        'genre' => 'Unknown',
    ]);

    $candidateGood = Track::create([
        'id' => 'cand-good',
        'name' => 'Candidate Good',
        'artist_id' => $artistB->id,
        'album_id' => $albumB->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/c.mp3',
        'category_slug' => 'test',
        'radio_genre_key' => 'metal',
        'deezer_genre_id' => '152',
    ]);

    $candidateBad = Track::create([
        'id' => 'cand-bad',
        'name' => 'Candidate Bad',
        'artist_id' => $artistC->id,
        'album_id' => $albumC->id,
        'duration' => 200,
        'audio_url' => 'https://example.test/d.mp3',
        'category_slug' => 'test',
        'radio_genre_key' => 'metal',
        'deezer_genre_id' => '152',
    ]);

    TrackEmbedding::create(['track_id' => $seed1->id, 'embedding' => [1.0, 0.0]]);
    TrackEmbedding::create(['track_id' => $seed2->id, 'embedding' => [1.0, 0.0]]);
    TrackEmbedding::create(['track_id' => $candidateGood->id, 'embedding' => [1.0, 0.0]]);
    TrackEmbedding::create(['track_id' => $candidateBad->id, 'embedding' => [0.0, 1.0]]);

    $svc = new RecommendationService(metadataScorer: zeroMetaScorer());

    $ctx = RecommendationContext::fromArray([
        'seed_type' => 'artist',
        'seed_id' => $seedArtist->id,
        'exclude' => [$seed1->id, $seed2->id],
        'limit' => 2,
    ]);

    $recs = $svc->recommend($ctx);

    expect($recs)->toHaveCount(2);
    expect($recs->first()->id)->toBe($candidateGood->id);
});
