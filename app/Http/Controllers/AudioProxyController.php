<?php

namespace App\Http\Controllers;

use App\Models\Track;
use App\Services\DeezerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AudioProxyController extends Controller
{
    public function __construct(private DeezerService $deezer) {}

    public function stream(Request $request)
    {
        $trackId = $request->query('track_id');
        $deezerId = $request->query('deezer_id');
        $audioUrlEncoded = $request->query('audio_url');
        $audioUrl = $audioUrlEncoded ? urldecode((string) $audioUrlEncoded) : null;
        $q = $request->query('q');
        $redirect = $request->boolean('redirect', true);

        if (! $trackId && ! $deezerId && ! $audioUrl && ! $q) {
            return response()->json(['error' => 'track_id, deezer_id, audio_url or q is required'], 400);
        }

        if ($deezerId && ! preg_match('/^\d+$/', (string) $deezerId)) {
            return response()->json(['error' => 'deezer_id must be numeric'], 400);
        }

        // Highest priority: canonical track id from our database (unambiguous).
        if ($trackId) {
            $track = Track::with('artist')->find((string) $trackId);
            if (! $track) {
                return response()->json(['error' => 'track not found'], 404);
            }

            $stableDeezerId = $track->deezer_track_id;
            if ($stableDeezerId && preg_match('/^\d+$/', (string) $stableDeezerId)) {
                $url = $this->deezer->getPreviewUrl((string) $stableDeezerId);
            } else {
                $artist = $track->artist?->name;
                $url = $this->deezer->searchTrackPreviewUrl((string) $track->name, $artist, (int) $track->duration);

                // Last resort: use whatever cached URL exists (may be stale/expired).
                if (! $url && $track->audio_url && filter_var($track->audio_url, FILTER_VALIDATE_URL)) {
                    $url = $track->audio_url;
                }
            }
        } elseif ($deezerId) {
            $url = $this->deezer->getPreviewUrl((string) $deezerId);
        } elseif ($audioUrl) {
            if (! filter_var($audioUrl, FILTER_VALIDATE_URL)) {
                return response()->json(['error' => 'audio_url must be a valid URL'], 400);
            }
            $url = $audioUrl;
        } else {
            // Legacy fallback: freeform search (may return mismatches for ambiguous titles).
            $url = $this->deezer->searchPreviewUrl((string) $q);
        }

        if (! $url) {
            return response()->json(['error' => 'preview not found'], 404);
        }

        if ($redirect) {
            return redirect()->away($url, 302);
        }

        $up = Http::withOptions(['stream' => true, 'timeout' => 30])->get($url);
        if ($up->failed()) {
            return response()->json(['error' => 'upstream failed'], 502);
        }

        $resp = new StreamedResponse(function () use ($up) {
            foreach ($up->getBody() as $chunk) {
                echo $chunk;
                flush();
            }
        });
        $resp->headers->set('Content-Type', 'audio/mpeg');
        $resp->headers->set('Cache-Control', 'no-store');

        return $resp;
    }
}
