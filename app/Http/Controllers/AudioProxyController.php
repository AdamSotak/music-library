<?php

namespace App\Http\Controllers;

use App\Services\DeezerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AudioProxyController extends Controller
{
    public function __construct(private DeezerService $deezer) {}

    public function stream(Request $request)
    {
        $deezerId = $request->query('deezer_id');
        $audioUrlEncoded = $request->query('audio_url');
        $audioUrl = $audioUrlEncoded ? urldecode((string) $audioUrlEncoded) : null;
        $q = $request->query('q');
        $redirect = $request->boolean('redirect', true);

        if (! $deezerId && ! $audioUrl && ! $q) {
            return response()->json(['error' => 'deezer_id, audio_url or q is required'], 400);
        }

        if ($deezerId && ! preg_match('/^\d+$/', (string) $deezerId)) {
            return response()->json(['error' => 'deezer_id must be numeric'], 400);
        }

        // Highest priority: explicit audio URL if provided (and looks like http/https).
        if ($audioUrl) {
            if (! filter_var($audioUrl, FILTER_VALIDATE_URL)) {
                return response()->json(['error' => 'audio_url must be a valid URL'], 400);
            }
            $url = $audioUrl;
        } else {
            $url = $deezerId
                ? $this->deezer->getPreviewUrl((string) $deezerId)
                : $this->deezer->searchPreviewUrl((string) $q);
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
