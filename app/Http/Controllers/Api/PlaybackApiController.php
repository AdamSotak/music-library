<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Track;
use App\Models\UserTrackPlay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PlaybackApiController extends Controller
{
    public function storePlay(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        if (! $userId) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        $validated = $request->validate([
            'track_id' => 'required|string|exists:tracks,id',
            'offset_ms' => 'sometimes|integer|min:0',
            'context' => 'sometimes|nullable|string|max:80',
        ]);

        // Ensure track exists (validated) and record the play.
        // This is intentionally lightweight; deduping/aggregation can be done offline later.
        UserTrackPlay::create([
            'user_id' => $userId,
            'track_id' => $validated['track_id'],
            'offset_ms' => (int) ($validated['offset_ms'] ?? 0),
            'context' => $validated['context'] ?? null,
            'played_at' => now(),
        ]);

        // Touch track existence for clarity (no-op read).
        Track::select('id')->where('id', $validated['track_id'])->first();

        return response()->json(['ok' => true]);
    }
}
