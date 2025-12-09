<?php

namespace App\Services;

use App\Models\JamParticipant;
use App\Models\JamPlaybackState;
use App\Models\JamQueueItem;
use App\Models\JamSession;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class JamService
{
    protected string $broadcastUrl;

    public function __construct()
    {
        $port = env('JAM_WS_PORT', 3002);
        // We assume the Node server runs on localhost relative to Laravel
        $this->broadcastUrl = "http://localhost:{$port}/broadcast";
    }

    /**
     * Broadcast an event to the Node.js WebSocket server.
     */
    protected function broadcast(string $jamId, array $payload): void
    {
        try {
            Http::timeout(1)->post($this->broadcastUrl, array_merge(
                ['jamId' => $jamId],
                $payload
            ));
        } catch (\Exception $e) {
            // Log error but don't fail the request if broadcast fails
            // In a production app, we might want to queue this or handle it more robustly
            logger()->error('Jam broadcast failed: '.$e->getMessage());
        }
    }

    protected function syncTrack(array $trackData): void
    {
        // Handle both flat (frontend) and nested (backend/API) structures

        // 1. Resolve Artist ID and Name
        $artistId = $trackData['artist_id'] ?? $trackData['artist']['id'] ?? null;
        $artistName = $trackData['artist'] ?? $trackData['artist']['name'] ?? 'Unknown Artist';

        // Handle array name case
        if (is_array($artistName)) {
            $artistName = $artistName['name'] ?? 'Unknown Artist';
        }

        if ($artistId) {
            \App\Models\Artist::updateOrCreate(
                ['id' => $artistId],
                [
                    'name' => $artistName,
                    'image_url' => $trackData['artist']['image_url'] ?? '', // Required string
                    'monthly_listeners' => $trackData['artist']['monthly_listeners'] ?? 0, // Required integer
                    'is_verified' => $trackData['artist']['is_verified'] ?? false, // Required boolean
                ]
            );
        } else {
            // Fallback: Find or create by name
            $artist = \App\Models\Artist::firstOrCreate(
                ['name' => $artistName],
                [
                    'id' => (string) Str::uuid(),
                    'image_url' => '',
                    'monthly_listeners' => 0,
                    'is_verified' => false,
                ]
            );
            $artistId = $artist->id;
        }

        // 2. Resolve Album ID
        $albumId = $trackData['album_id'] ?? $trackData['album']['id'] ?? null;
        $albumName = $trackData['album'] ?? $trackData['album']['name'] ?? 'Unknown Album';
        $albumCover = $trackData['album_cover'] ?? $trackData['album']['cover'] ?? $trackData['album']['image_url'] ?? '';

        if (is_array($albumName)) {
            $albumName = $albumName['name'] ?? 'Unknown Album';
        }

        if ($albumId) {
            \App\Models\Album::updateOrCreate(
                ['id' => $albumId],
                [
                    'name' => $albumName,
                    'artist_id' => $artistId,
                    'image_url' => $albumCover, // Use correct column name
                    'release_date' => $trackData['album']['release_date'] ?? now(), // Required date
                    'genre' => $trackData['album']['genre'] ?? 'Unknown', // Required string
                ]
            );
        } else {
             // Fallback: Find or create by name + artist
             $album = \App\Models\Album::firstOrCreate(
                ['name' => $albumName, 'artist_id' => $artistId],
                [
                    'id' => (string) Str::uuid(), 
                    'image_url' => $albumCover,
                    'release_date' => now(), 
                    'genre' => 'Unknown'
                ]
            );
            $albumId = $album->id;
        }

        // 3. Sync Track
        // Now we should always have artistId and albumId
        // 3. Sync Track
        // Now we should always have artistId and albumId
        if ($artistId && $albumId) {
            // Ensure default category exists to prevent FK violation
            \App\Models\Category::firstOrCreate(
                ['slug' => 'music'],
                [
                    'name' => 'Music',
                    'color' => '#1DB954',
                    'image_url' => '',
                ]
            );

            \App\Models\Track::updateOrCreate(
                ['id' => $trackData['id']],
                [
                    'name' => $trackData['name'] ?? 'Unknown Track',
                    'artist_id' => $artistId,
                    'album_id' => $albumId,
                    'duration' => $trackData['duration'] ?? 0,
                    'audio_url' => $trackData['audio'] ?? $trackData['audio_url'] ?? '', 
                    'category_slug' => 'music',
                ]
            );
        }
    }

    public function createJam(string $userId, array $data): JamSession
    {
        return DB::transaction(function () use ($userId, $data) {
            $jam = JamSession::create([
                'id' => (string) Str::uuid(),
                'host_user_id' => $userId,
                'seed_type' => $data['seed_type'],
                'seed_id' => $data['seed_id'],
                'allow_controls' => $data['allow_controls'] ?? true,
            ]);

            JamParticipant::create([
                'jam_id' => $jam->id,
                'user_id' => $userId,
                'role' => 'host',
                'joined_at' => now(),
            ]);

            foreach ($data['tracks'] as $index => $trackData) {
                $this->syncTrack($trackData);
                JamQueueItem::create([
                    'jam_id' => $jam->id,
                    'position' => $index,
                    'track_id' => $trackData['id'],
                    'added_by' => $userId,
                    'source' => $data['seed_type'],
                ]);
            }

            JamPlaybackState::create([
                'jam_id' => $jam->id,
                'position' => 0,
                'offset_ms' => 0,
                'is_playing' => false,
            ]);

            return $jam;
        });
    }

    public function joinJam(string $jamId, string $userId, string $role = 'guest'): void
    {
        $jam = JamSession::findOrFail($jamId);

        $participant = JamParticipant::updateOrCreate(
            ['jam_id' => $jam->id, 'user_id' => $userId],
            ['role' => $role, 'joined_at' => now()]
        );

        // Broadcast new participant
        // Note: The WS server also handles "announce", but this ensures
        // that if a user joins via API without connecting WS immediately,
        // the state is consistent if they do connect.
        // However, the WS server's "announce" is usually the trigger for
        // "participant_joined" type events in a pure WS setup.
        // For now, we rely on the client connecting WS to announce themselves.
    }

    public function updateQueue(JamSession $jam, array $tracks, string $userId): void
    {
        DB::transaction(function () use ($jam, $tracks, $userId) {
            JamQueueItem::where('jam_id', $jam->id)->delete();

            $newItems = [];
            foreach ($tracks as $index => $trackData) {
                $this->syncTrack($trackData);
                $item = JamQueueItem::create([
                    'jam_id' => $jam->id,
                    'position' => $index,
                    'track_id' => $trackData['id'],
                    'added_by' => $userId,
                    'source' => $jam->seed_type,
                ]);
                $newItems[] = $item;
            }

            // Fetch full track data to broadcast
            $jam->load(['queueItems.track.artist', 'queueItems.track.album']);
            $queue = $jam->queueItems->map(fn ($item) => $item->track);

            $this->broadcast($jam->id, [
                'type' => 'queue_snapshot',
                'tracks' => $queue,
            ]);
        });
    }

    public function addToQueue(JamSession $jam, array $tracks, string $userId): void
    {
        DB::transaction(function () use ($jam, $tracks, $userId) {
            $currentMax = JamQueueItem::where('jam_id', $jam->id)->max('position');
            $position = is_numeric($currentMax) ? ((int) $currentMax) + 1 : 0;

            $addedItems = [];
            foreach ($tracks as $trackData) {
                $this->syncTrack($trackData);
                $item = JamQueueItem::create([
                    'jam_id' => $jam->id,
                    'position' => $position++,
                    'track_id' => $trackData['id'],
                    'added_by' => $userId,
                    'source' => $jam->seed_type,
                ]);
                $addedItems[] = $item;
            }

            // We need to reload relation to get track details for broadcast
            // A bit inefficient but simplest handling for now
            $jam->load(['queueItems.track.artist', 'queueItems.track.album']);

            // Filter out just the added ones or send full snapshot?
            // "queue_add" optimization:
            $broadcastItems = collect($addedItems)->map(function ($item) {
                $item->load(['track.artist', 'track.album']);

                return ['track' => $item->track];
            })->toArray();

            $this->broadcast($jam->id, [
                'type' => 'queue_add',
                'items' => $broadcastItems,
            ]);
        });
    }

    public function updatePlayback(JamSession $jam, array $data): void
    {
        JamPlaybackState::updateOrCreate(
            ['jam_id' => $jam->id],
            array_merge(
                [
                    'position' => 0,
                    'offset_ms' => 0,
                    'is_playing' => false,
                ],
                $data,
            )
        );

        $this->broadcast($jam->id, array_merge(
            ['type' => 'playback_state'],
            $data
        ));
    }

    public function removeFromQueue(JamSession $jam, string $trackId, string $userId): void
    {
        DB::transaction(function () use ($jam, $trackId) {
            // Find the item to remove (first occurrence or specific?)
            // For now, let's remove the *first* occurrence of this track in the queue
            // A better UI would pass the specific queue_item_id or position, but trackId is what we have for now.
            $item = JamQueueItem::where('jam_id', $jam->id)
                ->where('track_id', $trackId)
                ->orderBy('position', 'asc')
                ->first();

            if ($item) {
                $item->delete();

                // Re-index subsequent items?
                // Not strictly necessary if frontend sorts by position, but cleaner.
                // Let's just broadcast the new snapshot for simplicity and correctness.

                $jam->load(['queueItems.track.artist', 'queueItems.track.album']);
                $queue = $jam->queueItems->sortBy('position')->values()->map(fn ($item) => $item->track);

                $this->broadcast($jam->id, [
                    'type' => 'queue_snapshot',
                    'tracks' => $queue,
                ]);
            }
        });
    }
}
