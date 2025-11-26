<?php

namespace App\Http\Controllers;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Track;
use App\Services\Recommendation\RecommendationContext;
use App\Services\Recommendation\RecommendationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RadioController extends Controller
{
    public function __construct(private RecommendationService $recommender)
    {
    }

    public function show(Request $request)
    {
        $ctx = RecommendationContext::fromArray([
            'seed_type' => $request->query('seed_type', 'track'),
            'seed_id' => $request->query('seed_id'),
            'exclude' => [],
            'limit' => (int) $request->query('limit', 30),
        ]);

        if (! $ctx->seedId) {
            return redirect('/')->withErrors(['radio' => 'Missing seed.']);
        }

        $tracks = $this->formatTracks($this->recommender->recommend($ctx));

        return Inertia::render('radio/show', [
            'seed_type' => $ctx->seedType,
            'seed_id' => $ctx->seedId,
            'tracks' => $tracks,
            'seed_meta' => $this->resolveSeedMeta($ctx),
        ]);
    }

    public function start(Request $request)
    {
        $ctx = RecommendationContext::fromArray([
            'seed_type' => $request->input('seed_type', 'track'),
            'seed_id' => $request->input('seed_id'),
            'exclude' => $request->input('exclude', []),
            'limit' => (int) $request->input('limit', 30),
        ]);

        if (! $ctx->seedId) {
            return response()->json(['error' => 'seed_id is required'], 422);
        }

        $tracks = $this->formatTracks($this->recommender->recommend($ctx));

        return response()->json([
            'seed_type' => $ctx->seedType,
            'seed_id' => $ctx->seedId,
            'tracks' => $tracks,
            'seed_meta' => $this->resolveSeedMeta($ctx),
        ]);
    }

    public function next(Request $request)
    {
        $ctx = RecommendationContext::fromArray([
            'seed_type' => $request->input('seed_type', 'track'),
            'seed_id' => $request->input('seed_id'),
            'exclude' => $request->input('exclude', []),
            'limit' => (int) $request->input('limit', 20),
        ]);

        if (! $ctx->seedId) {
            return response()->json(['error' => 'seed_id is required'], 422);
        }

        $tracks = $this->formatTracks($this->recommender->recommend($ctx));

        return response()->json([
            'tracks' => $tracks,
            'seed_meta' => $this->resolveSeedMeta($ctx),
        ]);
    }

    private function formatTracks($collection)
    {
        return $collection->map(function (Track $track) {
            return [
                'id' => $track->id,
                'name' => $track->name,
                'artist' => $track->artist?->name,
                'artist_id' => $track->artist_id,
                'album' => $track->album?->name,
                'album_id' => $track->album_id,
                'album_cover' => $track->album?->image_url,
                'duration' => $track->duration,
                'audio' => $track->audio_url,
            ];
        });
    }

    private function resolveSeedMeta(RecommendationContext $ctx): ?array
    {
        return match ($ctx->seedType) {
            'track' => $this->trackSeedMeta($ctx->seedId),
            'album' => $this->albumSeedMeta($ctx->seedId),
            'artist' => $this->artistSeedMeta($ctx->seedId),
            default => null,
        };
    }

    private function trackSeedMeta(string $id): ?array
    {
        $track = Track::with(['artist', 'album'])->find($id);
        if (! $track) {
            return null;
        }

        return [
            'title' => $track->name,
            'subtitle' => $track->artist?->name,
            'image' => $track->album?->image_url,
        ];
    }

    private function albumSeedMeta(string $id): ?array
    {
        $album = Album::with('artist')->find($id);
        if (! $album) {
            return null;
        }

        return [
            'title' => $album->name,
            'subtitle' => $album->artist?->name,
            'image' => $album->image_url,
        ];
    }

    private function artistSeedMeta(string $id): ?array
    {
        $artist = Artist::find($id);
        if (! $artist) {
            return null;
        }

        return [
            'title' => $artist->name,
            'subtitle' => 'Artist',
            'image' => $artist->image_url,
        ];
    }
}
