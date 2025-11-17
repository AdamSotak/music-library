<?php

namespace App\Http\Controllers;

use App\Models\Track;
use App\Services\MusicBarcodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class TrackController extends Controller
{
    public function __construct(
        private MusicBarcodeService $barcodeService
    ) {}

    public function index()
    {
        $tracks = Track::with(['artist', 'album'])->get();

        return Inertia::render('tracks/index', [
            'tracks' => $tracks,
        ]);
    }

    public function show(string $id)
    {
        $track = Track::with(['artist', 'album'])->findOrFail($id);

        return Inertia::render('tracks/show', [
            'track' => [
                'id' => $track->id,
                'name' => $track->name,
                'artist' => $track->artist->name,
                'artist_id' => $track->artist_id,
                'album' => $track->album->name,
                'album_cover' => $track->album->image_url,
                'duration' => $track->duration,
                'audio' => $track->audio_url,
            ],
        ]);
    }

    public function generateBarcode(Track $track)
    {
        try {
            // Convert UUID to a positive integer
            $numericId = abs(crc32($track->id));

            Log::info("Generating barcode for track {$track->id} with numeric ID {$numericId}");

            $barcodeDataUri = $this->barcodeService->generateBarcode($numericId);

            return response()->json([
                'barcode' => $barcodeDataUri,
                'track_id' => $track->id,
                'track_name' => $track->name,
                'numeric_id' => $numericId,
            ]);
        } catch (\Exception $e) {
            Log::error("Barcode generation failed for track {$track->id}: ".$e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to generate barcode',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    public function scanBarcode(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:5120',
        ]);

        try {
            $imagePath = $request->file('image')->store('temp', 'local');
            $fullPath = storage_path('app/'.$imagePath);

            Log::info("Scanning barcode from image: {$fullPath}");

            $numericId = $this->barcodeService->decodeBarcode($fullPath);

            // Clean up the temp file
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }

            if ($numericId === null) {
                Log::warning('Could not decode barcode from image');

                return response()->json(['error' => 'Could not decode barcode'], 400);
            }

            Log::info("Decoded barcode numeric ID: {$numericId}");

            // Find the matching track
            $tracks = Track::all();
            $matchedTrack = null;

            foreach ($tracks as $track) {
                if (abs(crc32($track->id)) === $numericId) {
                    $matchedTrack = $track;
                    break;
                }
            }

            if (! $matchedTrack) {
                Log::warning("No track found matching numeric ID: {$numericId}");

                return response()->json(['error' => 'Track not found'], 404);
            }

            Log::info("Found matching track: {$matchedTrack->id}");

            return response()->json([
                'track_id' => $matchedTrack->id,
                'track' => $matchedTrack->load(['artist', 'album']),
            ]);
        } catch (\Exception $e) {
            Log::error('Barcode scanning failed: '.$e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);

            // Clean up temp file on error
            if (isset($fullPath) && file_exists($fullPath)) {
                unlink($fullPath);
            }

            return response()->json([
                'error' => 'Failed to scan barcode',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }
}
