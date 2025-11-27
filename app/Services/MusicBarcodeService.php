<?php

namespace App\Services;

use Picqer\Barcode\BarcodeGeneratorSVG;

class MusicBarcodeService
{
    public function generateBarcode(string $trackId): string
    {
        $generator = new BarcodeGeneratorSVG();

        $svg = $generator->getBarcode($trackId, $generator::TYPE_CODE_128, 2, 80);

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}