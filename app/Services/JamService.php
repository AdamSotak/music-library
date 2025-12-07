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
        // If 'artist' is an array, use it; otherwise valid if we have ID
        
        if ($artistId) {
             // If $artistName is an array (nested case), pick name
             if (is_array($artistName)) $artistName = $artistName['name'] ?? 'Unknown Artist';

            \App\Models\Artist::updateOrCreate(
                ['id' => $artistId],
                [
                    'name' => $artistName,
                    'image_url' => $trackData['artist']['image_url'] ?? null, // Best effort
                ]
            );
        }

        // 2. Resolve Album ID and Name
        $albumId = $trackData['album_id'] ?? $trackData['album']['id'] ?? null;
        $albumName = $trackData['album'] ?? $trackData['album']['name'] ?? 'Unknown Album';
        $albumCover = $trackData['album_cover'] ?? $trackData['album']['cover'] ?? $trackData['album']['image_url'] ?? null;

        if ($albumId) {
             if (is_array($albumName)) $albumName = $albumName['name'] ?? 'Unknown Album';
             
            \App\Models\Album::updateOrCreate(
                ['id' => $albumId],
                [
                    'name' => $albumName,
                    'artist_id' => $artistId,
                    'cover' => $albumCover,
                ]
            );
        }

        // 3. Sync Track
        if ($artistId && $albumId) {
             \App\Models\Track::updateOrCreate(
                ['id' => $trackData['id']],
                [
                    'name' => $trackData['name'],
                    'artist_id' => $artistId,
                    'album_id' => $albumId,
                    'duration' => $trackData['duration'] ?? 0,
                    'audio' => $trackData['audio'] ?? $trackData['audio_url'] ?? null,
                    // 'deezer_track_id' => ... // if available
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
}
