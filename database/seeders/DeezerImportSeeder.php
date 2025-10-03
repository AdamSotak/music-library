<?php

namespace Database\Seeders;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Playlist;
use App\Models\Track;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DeezerImportSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = base_path('data.json');

        if (! file_exists($jsonPath)) {
            $this->command->error('data.json not found! Please run the Deezer scraper first.');

            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);

        $this->command->info('Starting Deezer data import...');

        DB::beginTransaction();

        try {
            // Clear existing data
            DB::table('playlist_track')->delete();
            Track::query()->delete();
            Album::query()->delete();
            Artist::query()->delete();
            Playlist::where('is_curated', true)->delete();

            $artistMap = [];
            $albumMap = [];
            $allTracks = [];

            foreach ($data['artists'] as $artistData) {
                if (isset($artistData['error'])) {
                    continue;
                }

                $artistInfo = $artistData['artist'];

                // Create artist
                $artist = Artist::create([
                    'jamendo_id' => $artistInfo['id'],
                    'name' => $artistInfo['name'],
                    'image' => $artistInfo['image'],
                ]);

                $artistMap[$artistInfo['id']] = $artist->id;

                // Create albums first
                foreach ($artistData['albums'] as $albumData) {
                    $album = Album::create([
                        'jamendo_id' => $albumData['id'],
                        'name' => $albumData['name'],
                        'artist_id' => $artist->id,
                        'cover' => $albumData['image'],
                        'release_date' => $albumData['releasedate'] ?? null,
                    ]);

                    $albumMap[$albumData['id']] = $album->id;
                }

                // Also create albums from track data if they don't exist
                foreach ($artistData['tracks'] as $trackData) {
                    if (isset($trackData['album_id']) && ! isset($albumMap[$trackData['album_id']])) {
                        $album = Album::create([
                            'jamendo_id' => $trackData['album_id'],
                            'name' => $trackData['album_name'] ?? 'Unknown Album',
                            'artist_id' => $artist->id,
                            'cover' => 'https://placehold.co/600x600/333333/white?text='.urlencode($trackData['album_name'] ?? 'Album'),
                            'release_date' => null,
                        ]);

                        $albumMap[$trackData['album_id']] = $album->id;
                    }
                }

                // Now create tracks with guaranteed album_id
                foreach ($artistData['tracks'] as $trackData) {
                    $albumId = isset($trackData['album_id']) && isset($albumMap[$trackData['album_id']])
                        ? $albumMap[$trackData['album_id']]
                        : null;

                    if (! $albumId) {
                        // Skip tracks without albums (shouldn't happen now)
                        continue;
                    }

                    $track = Track::create([
                        'jamendo_id' => $trackData['id'],
                        'name' => $trackData['name'],
                        'artist_id' => $artist->id,
                        'album_id' => $albumId,
                        'duration' => $trackData['duration'],
                        'audio_url' => $trackData['audio'],
                        'position' => 0,
                    ]);

                    $allTracks[] = $track;
                }
            }

            // Create curated playlists (reload tracks with album relationships)
            $trackIds = collect($allTracks)->pluck('id')->toArray();
            $tracksWithAlbums = Track::with('album')->whereIn('id', $trackIds)->get()->all();
            $this->createCuratedPlaylists($tracksWithAlbums);

            DB::commit();

            $this->command->info('✅ Import complete!');
            $this->command->info('   Artists: '.Artist::count());
            $this->command->info('   Albums: '.Album::count());
            $this->command->info('   Tracks: '.Track::count());
            $this->command->info('   Playlists: '.Playlist::where('is_curated', true)->count());

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Import failed: '.$e->getMessage());
            throw $e;
        }
    }

    private function createCuratedPlaylists(array $allTracks): void
    {
        $playlists = [
            [
                'name' => 'Top Hits',
                'description' => 'The biggest hits right now',
                'track_count' => 20,
            ],
            [
                'name' => 'Daily Mix 1',
                'description' => 'Your personalized mix',
                'track_count' => 15,
            ],
            [
                'name' => 'Discover Weekly',
                'description' => 'Fresh finds just for you',
                'track_count' => 25,
            ],
            [
                'name' => 'Chill Vibes',
                'description' => 'Relax and unwind',
                'track_count' => 18,
            ],
        ];

        // Separate tracks by whether they have real album covers
        $tracksWithCovers = collect($allTracks)->filter(function ($track) {
            return $track->album && $track->album->cover && ! str_contains($track->album->cover, 'placehold');
        })->shuffle()->values()->all();

        $tracksWithoutCovers = collect($allTracks)->filter(function ($track) {
            return ! $track->album || ! $track->album->cover || str_contains($track->album->cover, 'placehold');
        })->shuffle()->values()->all();

        // Merge: prioritize tracks with covers, then add tracks without
        $sortedTracks = array_merge($tracksWithCovers, $tracksWithoutCovers);
        $trackIndex = 0;

        foreach ($playlists as $playlistData) {
            // Use the album cover of the first track for the playlist image
            $firstTrack = $sortedTracks[$trackIndex] ?? null;
            $playlistImage = $firstTrack?->album?->cover
                ?? 'https://placehold.co/600x600/333/white?text='.urlencode($playlistData['name']);

            $playlist = Playlist::create([
                'name' => $playlistData['name'],
                'description' => $playlistData['description'],
                'image' => $playlistImage,
                'is_curated' => true,
            ]);

            $trackCount = min($playlistData['track_count'], count($sortedTracks) - $trackIndex);

            for ($i = 0; $i < $trackCount; $i++) {
                if ($trackIndex >= count($sortedTracks)) {
                    break;
                }

                $playlist->tracks()->attach($sortedTracks[$trackIndex]->id, [
                    'position' => $i + 1,
                ]);

                $trackIndex++;
            }
        }
    }
}
