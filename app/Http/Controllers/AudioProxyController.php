<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AudioProxyController extends Controller
{
    public function stream(Request $request)
    {
        $url = $request->query('url');

        if (!$url) {
            return response()->json(['error' => 'URL parameter is required'], 400);
        }

        // Validate it's a Deezer URL
        if (!str_contains($url, 'dzcdn.net')) {
            return response()->json(['error' => 'Invalid audio URL'], 400);
        }

        try {
            // Fetch the audio file from Deezer with streaming
            $response = Http::timeout(30)->get($url);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch audio'], 500);
            }

            return response($response->body())
                ->header('Content-Type', 'audio/mpeg')
                ->header('Accept-Ranges', 'bytes')
                ->header('Access-Control-Allow-Origin', '*');
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to stream audio: ' . $e->getMessage()], 500);
        }
    }
}
