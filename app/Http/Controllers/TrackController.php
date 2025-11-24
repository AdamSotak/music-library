<?php

namespace App\Http\Controllers;

use App\Models\Track;
use App\Services\MusicBarcodeService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TrackController extends Controller
{
    protected $barcodeService;

    public function __construct(MusicBarcodeService $barcodeService)
    {
        $this->barcodeService = $barcodeService;
    }

    public function index()
    {
        return Inertia::render('tracks/index', [
            'tracks' => Track::with(['artist', 'album'])->get(),
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
        $barcode = $this->barcodeService->generateBarcode((string) $track->id);

        return response()->json([
            'barcode' => $barcode,
            'track_id' => $track->id,
            'track_name' => $track->name,
        ]);
    }

    public function scan(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:20480',
        ]);

        $numericId = $this->barcodeService->decodeBarcode($request->file('image'));

        if (! $numericId) {
            return response()->json([
                'success' => false,
                'error' => 'Could not decode barcode',
            ], 404);
        }

        $trackId = $this->numericToUuid($numericId);

        if (! $trackId) {
            return response()->json([
                'success' => false,
                'error' => 'Track not found',
            ], 404);
        }

        $track = Track::find($trackId);

        if (! $track) {
            return response()->json([
                'success' => false,
                'error' => 'Track not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'track_id' => $track->id,
            'name' => $track->name,
            'url' => url('/tracks/'.$track->id),
        ]);
    }
}
