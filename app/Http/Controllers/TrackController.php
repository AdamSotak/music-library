<?php

namespace App\Http\Controllers;

use App\Models\Track;
use App\Services\MusicBarcodeService;
use Inertia\Inertia;

class TrackController extends Controller
{
    protected MusicBarcodeService $barcodeService;

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

    public function scan()
    {
        return Inertia::render('scan');
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
}