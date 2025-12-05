<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JamParticipant;
use App\Models\JamPlaybackState;
use App\Models\JamQueueItem;
use App\Models\JamSession;
use App\Models\Track;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class JamApiController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'seed_type' => 'required|string',
            'seed_id' => 'required|string',
            'allow_controls' => 'sometimes|boolean',
            'tracks' => 'required|array|min:1',
            'tracks.*.id' => 'required|string|exists:tracks,id',
        ]);

        $jam = DB::transaction(function () use ($validated, $request) {
            $jam = JamSession::create([
                'id' => (string) Str::uuid(),
                'host_user_id' => $request->user()->id,
                'seed_type' => $validated['seed_type'],
                'seed_id' => $validated['seed_id'],
                'allow_controls' => $validated['allow_controls'] ?? true,
            ]);

            JamParticipant::updateOrCreate(
                ['jam_id' => $jam->id, 'user_id' => $request->user()->id],
                ['role' => 'host', 'joined_at' => now()],
            );

            foreach ($validated['tracks'] as $index => $trackData) {
                JamQueueItem::create([
                    'jam_id' => $jam->id,
                    'position' => $index,
                    'track_id' => $trackData['id'],
                    'added_by' => $request->user()->id,
                    'source' => $validated['seed_type'],
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

        return $this->formatJamResponse($jam->id, $request->user()->id);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        return $this->formatJamResponse($id, optional($request->user())->id);
    }

    public function join(string $id, Request $request): JsonResponse
    {
        $jam = JamSession::findOrFail($id);

        JamParticipant::updateOrCreate(
            ['jam_id' => $jam->id, 'user_id' => $request->user()->id],
            ['role' => $request->input('role', 'guest'), 'joined_at' => now()],
        );

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
            return [
                'position' => $item->position,
                'track' => [
                    'id' => $track->id,
                    'name' => $track->name,
                    'artist' => $track->artist->name ?? $track->artist?->name ?? $track->artist_id,
                    'artist_id' => $track->artist_id,
                    'album' => $track->album->name ?? $track->album?->name ?? $track->album_id,
                    'album_id' => $track->album_id,
                    'album_cover' => $track->album->cover ?? $track->album?->cover ?? null,
                    'duration' => $track->duration,
                    'audio' => $track->audio_url ?? $track->audio,
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
