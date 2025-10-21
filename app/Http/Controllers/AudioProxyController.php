<?php

namespace App\Http\Controllers;

use App\Models\Track;
use App\Services\DeezerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AudioProxyController extends Controller
{
    public function __construct(
        private DeezerService $deezerService
    ) {}

    public function stream(Request $request)
    {
        $trackId = $request->query('track_id');
        $url = $request->query('url'); // Backward compatibility

        // New approach: use track_id
        if ($trackId) {
            return $this->streamByTrackId($trackId);
        }

        // Old approach: use url (backward compatibility)
        if ($url) {
            return $this->streamByUrl($url);
        }

        return response()->json(['error' => 'Either track_id or url parameter is required'], 400);
    }

    /**
     * Stream audio by track ID with smart refresh
     */
    private function streamByTrackId(string $trackId)
    {
        try {
            $track = Track::find($trackId);

            if (!$track) {
                return response()->json(['error' => 'Track not found'], 404);
            }

            $audioUrl = $track->audio_url;

            // Check if URL is expired
            if ($this->deezerService->isPreviewUrlExpired($audioUrl)) {
                Log::info("Audio URL expired for track {$track->id}, refreshing...", [
                    'track_name' => $track->name,
                    'deezer_track_id' => $track->deezer_track_id
                ]);

                // Attempt to refresh URL
                if ($track->deezer_track_id) {
                    $freshUrl = $this->deezerService->getFreshPreviewUrl($track->deezer_track_id);

                    if ($freshUrl) {
                        // Update database with fresh URL
                        $track->audio_url = $freshUrl;
                        $track->save();

                        $audioUrl = $freshUrl;

                        Log::info("Successfully refreshed audio URL", [
                            'track_id' => $track->id,
                            'track_name' => $track->name
                        ]);
                    } else {
                        Log::error("Failed to refresh audio URL from Deezer API", [
                            'track_id' => $track->id,
                            'deezer_track_id' => $track->deezer_track_id
                        ]);
                        return response()->json(['error' => 'Failed to refresh audio URL'], 500);
                    }
                } else {
                    Log::warning("Track missing deezer_track_id, cannot refresh", [
                        'track_id' => $track->id,
                        'track_name' => $track->name
                    ]);
                    return response()->json(['error' => 'Track missing Deezer ID, cannot refresh URL'], 500);
                }
            }

            // Stream the audio
            return $this->streamAudio($audioUrl);

        } catch (\Exception $e) {
            Log::error("Error streaming audio by track ID", [
                'track_id' => $trackId,
                'error' => $e->getMessage()
            ]);
            return response()->json(['error' => 'Failed to stream audio: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Stream audio by URL (backward compatibility)
     */
    private function streamByUrl(string $url)
    {
        // Validate it's a Deezer URL
        if (!str_contains($url, 'dzcdn.net')) {
            return response()->json(['error' => 'Invalid audio URL'], 400);
        }

        return $this->streamAudio($url);
    }

    /**
     * Stream audio from URL
     */
    private function streamAudio(string $url)
    {
        try {
            $response = Http::timeout(30)->get($url);

            if (!$response->successful()) {
                return response()->json([
                    'error' => 'Failed to fetch audio',
                    'status' => $response->status()
                ], 500);
            }

            return response($response->body())
                ->header('Content-Type', 'audio/mpeg')
                ->header('Accept-Ranges', 'bytes')
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Cache-Control', 'public, max-age=3600');

        } catch (\Exception $e) {
            Log::error("Error streaming audio", [
                'url' => $url,
                'error' => $e->getMessage()
            ]);
            return response()->json(['error' => 'Failed to stream audio: ' . $e->getMessage()], 500);
        }
    }
}
