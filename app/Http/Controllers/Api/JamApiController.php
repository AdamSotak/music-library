<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JamParticipant;
use App\Models\JamQueueItem;
use App\Models\JamSession;
use App\Services\JamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class JamApiController extends Controller
{
    protected JamService $jamService;

    public function __construct(JamService $jamService)
    {
        $this->jamService = $jamService;
    }

    /**
     * Ensure the current user is allowed to mutate the Jam state.
     */
    protected function assertCanControlJam(JamSession $jam, Request $request): void
    {
        $userId = $request->user()->id ?? null;
        if (! $userId) {
            abort(Response::HTTP_UNAUTHORIZED);
        }
        if ($jam->host_user_id === $userId) {
            return;
        }
        if ($jam->allow_controls) {
            return;
        }
        abort(Response::HTTP_FORBIDDEN, 'You are not allowed to control this Jam.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'seed_type' => 'required|string',
            'seed_id' => 'required|string',
            'allow_controls' => 'sometimes|boolean',
            'tracks' => 'required|array|min:1',
            'tracks.*.id' => 'required|string',
        ]);

        $data = $validated;
        $data['tracks'] = $request->input('tracks');

        $jam = $this->jamService->createJam($request->user()->id, $data);

        return $this->formatJamResponse($jam->id, $request->user()->id);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        return $this->formatJamResponse($id, optional($request->user())->id);
    }

    public function join(string $id, Request $request): JsonResponse
    {
        $this->jamService->joinJam(
            $id,
            $request->user()->id,
            $request->input('role', 'guest')
        );

        return $this->formatJamResponse($id, $request->user()->id);
    }

    /**
     * Replace the Jam queue with the provided ordered list of tracks.
     */
    public function updateQueue(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tracks' => 'required|array|min:1',
            'tracks.*.id' => 'required|string',
        ]);

        $jam = JamSession::findOrFail($id);
        $this->assertCanControlJam($jam, $request);

        $this->jamService->updateQueue($jam, $request->input('tracks'), $request->user()->id);

        return $this->formatJamResponse($jam->id, $request->user()->id);
    }

    /**
     * Append one or more tracks to the Jam queue.
     */
    public function addToQueue(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tracks' => 'required|array|min:1',
            'tracks.*.id' => 'required|string',
        ]);

        $jam = JamSession::findOrFail($id);
        $this->assertCanControlJam($jam, $request);

        $this->jamService->addToQueue($jam, $request->input('tracks'), $request->user()->id);

        return $this->formatJamResponse($jam->id, $request->user()->id);
    }

    /**
     * Update the canonical playback state for a Jam.
     */
    public function updatePlayback(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'position' => 'sometimes|integer|min:0',
            'offset_ms' => 'sometimes|integer|min:0',
            'is_playing' => 'sometimes|boolean',
        ]);

        $jam = JamSession::findOrFail($id);
        $this->assertCanControlJam($jam, $request);

        $this->jamService->updatePlayback($jam, $validated);

        return $this->formatJamResponse($jam->id, $request->user()->id);
    }

    /**
     * Remove a track from the Jam queue.
     */
    public function removeFromQueue(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            // We only need a well‑formed string here – the service layer
            // will no‑op gracefully if the track does not exist in the
            // current Jam queue. Using exists:tracks,id caused 500s
            // when DB state drifted from the in‑memory Jam queue.
            'track_id' => 'required|string',
        ]);

        $jam = JamSession::findOrFail($id);
        $this->assertCanControlJam($jam, $request);

        $this->jamService->removeFromQueue($jam, $validated['track_id'], $request->user()->id);

        return $this->formatJamResponse($jam->id, $request->user()->id);
    }

    protected function formatJamResponse(string $jamId, ?int $requestingUserId): JsonResponse
    {
        $jam = JamSession::with([
            'participants.user',
            'queueItems.track.artist',
            'queueItems.track.album',
            'playbackState',
        ])->findOrFail($jamId);

        $queue = $jam->queueItems->map(function (JamQueueItem $item) {
            $track = $item->track;
            // It is possible for a JamQueueItem to outlive its track (or the
            // relations to be temporarily missing). In that case we still want
            // to return a sane placeholder object instead of throwing.
            if (! $track) {
                return [
                    'position' => $item->position,
                    'queue_item_id' => $item->id,
                    'track' => [
                        'id' => $item->track_id,
                        'name' => 'Unknown Track',
                        'artist' => 'Unknown Artist',
                        'artist_id' => '',
                        'album' => 'Unknown Album',
                        'album_id' => null,
                        'album_cover' => null,
                        'duration' => 0,
                        'audio' => null,
                        'deezer_track_id' => null,
                    ],
                ];
            }

            $artist = $track->artist;
            $album = $track->album;

            $artistName = $artist?->name ?: ($track->artist_id ?: 'Unknown Artist');
            $albumName = $album?->name ?: ($track->album_id ?: 'Unknown Album');

            return [
                'position' => $item->position,
                'queue_item_id' => $item->id,
                'track' => [
                    'id' => $track->id,
                    'name' => $track->name ?? 'Unknown Track',
                    'artist' => $artistName,
                    'artist_id' => $track->artist_id,
                    'album' => $albumName,
                    'album_id' => $track->album_id,
                    // Use album image_url as cover for Jam tracks when available
                    'album_cover' => $album?->image_url ?? null,
                    'duration' => $track->duration,
                    'audio' => $track->audio_url ?? $track->audio,
                    'deezer_track_id' => $track->deezer_track_id ?? null,
                ],
            ];
        });

        return response()->json([
            'jam' => [
                'id' => $jam->id,
                'seed_type' => $jam->seed_type,
                'seed_id' => $jam->seed_id,
                'allow_controls' => $jam->allow_controls,
                'host_user_id' => $jam->host_user_id,
                'queue_version' => $jam->queue_version,
            ],
            'participants' => $jam->participants->map(fn (JamParticipant $p) => [
                'id' => $p->user_id,
                'name' => $p->user->name ?? "User {$p->user_id}",
                'role' => $p->role,
                'is_self' => $requestingUserId === $p->user_id,
            ]),
            'queue' => $queue,
            'playback' => $jam->playbackState
                ? [
                    'position' => $jam->playbackState->position,
                    'offset_ms' => $jam->playbackState->offset_ms,
                    'is_playing' => $jam->playbackState->is_playing,
                ]
                : null,
        ]);
    }
}
