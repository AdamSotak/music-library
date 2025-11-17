<?php

// filepath: c:\Users\vladi\Desktop\web_dev\app\Services\MusicBarcodeService.php

namespace App\Services;

use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class MusicBarcodeService
{
    private const BAR_WIDTH = 40;

    private const BASE_HEIGHT = 300;

    private const PADDING = 60;

    private const MARKER_SIZE = 20;

    public function generateBarcode(int $songId): string
    {
        $digits = str_split((string) $songId);
        $checksum = $this->calculateChecksum($songId);
        $digits[] = $checksum;

        $width = (count($digits) * self::BAR_WIDTH) + (self::PADDING * 2) + (self::MARKER_SIZE * 4);
        $height = self::BASE_HEIGHT + (self::PADDING * 2);

        $manager = new ImageManager(new Driver);
        $image = $manager->create($width, $height)->fill('#ffffff');

        // Draw alignment markers at corners
        $this->drawAlignmentMarkers($image, $width, $height);

        // Draw metadata bars
        $this->drawMetadataBars($image, count($digits));

        // Draw the digit bars
        $x = self::PADDING + (self::MARKER_SIZE * 2);
        foreach ($digits as $digit) {
            $barHeight = $this->digitToBarHeight((int) $digit);
            $barY = (self::BASE_HEIGHT - $barHeight) / 2 + self::PADDING;

            // Draw green bar
            $image->drawRectangle($x, $barY, function ($rectangle) use ($barHeight) {
                $rectangle->size(self::BAR_WIDTH - 10, $barHeight);
                $rectangle->background('#00ff00');
            });

            $x += self::BAR_WIDTH;
        }

        // Encode to base64 data URI
        $encoded = $image->toPng()->toDataUri();

        return $encoded;
    }

    private function digitToBarHeight(int $digit): int
    {
        // Map digits 0-9 to different bar heights
        $heights = [
            0 => 50,
            1 => 75,
            2 => 100,
            3 => 125,
            4 => 150,
            5 => 175,
            6 => 200,
            7 => 225,
            8 => 250,
            9 => 275,
        ];

        return $heights[$digit] ?? 150;
    }

    private function drawAlignmentMarkers($image, int $width, int $height): void
    {
        $markerPositions = [
            [self::PADDING, self::PADDING], // Top-left
            [$width - self::PADDING - self::MARKER_SIZE, self::PADDING], // Top-right
            [self::PADDING, $height - self::PADDING - self::MARKER_SIZE], // Bottom-left
            [$width - self::PADDING - self::MARKER_SIZE, $height - self::PADDING - self::MARKER_SIZE], // Bottom-right
        ];

        foreach ($markerPositions as [$x, $y]) {
            $image->drawRectangle($x, $y, function ($rectangle) {
                $rectangle->size(self::MARKER_SIZE, self::MARKER_SIZE);
                $rectangle->background('#ff0000');
            });
        }
    }

    private function drawMetadataBars($image, int $barCount): void
    {
        // Draw metadata indicator bars at the top
        $x = self::PADDING + (self::MARKER_SIZE * 2);
        $y = self::PADDING - 10;

        for ($i = 0; $i < $barCount; $i++) {
            $image->drawRectangle($x, $y, function ($rectangle) {
                $rectangle->size(self::BAR_WIDTH - 10, 5);
                $rectangle->background('#0000ff');
            });
            $x += self::BAR_WIDTH;
        }
    }

    private function calculateChecksum(int $songId): int
    {
        $sum = array_sum(str_split((string) $songId));

        return $sum % 10;
    }

    public function decodeBarcode(string $imagePath): ?int
    {
        $manager = new ImageManager(new Driver);
        $image = $manager->read($imagePath);

        // Detect alignment markers
        $markers = $this->detectMarkers($image);

        if (count($markers) < 4) {
            return null;
        }

        // Scan bars between markers
        $bars = $this->scanBars($image, $markers);

        if (empty($bars)) {
            return null;
        }

        // Convert bar heights back to digits
        $digits = array_map(fn ($height) => $this->barHeightToDigit($height), $bars);

        // Remove checksum digit
        $checksum = array_pop($digits);
        $songId = (int) implode('', $digits);

        // Verify checksum
        if ($this->calculateChecksum($songId) !== $checksum) {
            return null;
        }

        return $songId;
    }

    private function detectMarkers($image): array
    {
        $markers = [];
        $width = $image->width();
        $height = $image->height();

        // Scan for red markers in corners
        $scanPositions = [
            [self::PADDING, self::PADDING],
            [$width - self::PADDING - self::MARKER_SIZE, self::PADDING],
            [self::PADDING, $height - self::PADDING - self::MARKER_SIZE],
            [$width - self::PADDING - self::MARKER_SIZE, $height - self::PADDING - self::MARKER_SIZE],
        ];

        foreach ($scanPositions as $pos) {
            if ($this->isMarkerPresent($image, $pos[0], $pos[1])) {
                $markers[] = $pos;
            }
        }

        return $markers;
    }

    private function isMarkerPresent($image, int $x, int $y): bool
    {
        try {
            $color = $image->pickColor($x + self::MARKER_SIZE / 2, $y + self::MARKER_SIZE / 2);
            $r = $color->red()->toInt();
            $g = $color->green()->toInt();
            $b = $color->blue()->toInt();

            // Check if it's red (high R, low G and B)
            return $r > 200 && $g < 100 && $b < 100;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function scanBars($image, array $markers): array
    {
        $bars = [];
        $startX = self::PADDING + (self::MARKER_SIZE * 2);
        $centerY = $image->height() / 2;

        // Scan horizontally for green bars
        $x = $startX;
        while ($x < $image->width() - self::PADDING - (self::MARKER_SIZE * 2)) {
            $height = $this->measureBarHeight($image, $x, (int) $centerY);
            if ($height !== null) {
                $bars[] = $height;
            }
            $x += self::BAR_WIDTH;
        }

        return $bars;
    }

    private function measureBarHeight($image, int $x, int $centerY): ?int
    {
        // Check if there's a green pixel at this position
        if (! $this->isGreenPixel($image, $x, $centerY)) {
            return null;
        }

        // Measure bar height by scanning up and down
        $topY = $centerY;
        $bottomY = $centerY;

        while ($topY > 0 && $this->isGreenPixel($image, $x, $topY)) {
            $topY--;
        }

        while ($bottomY < $image->height() && $this->isGreenPixel($image, $x, $bottomY)) {
            $bottomY++;
        }

        return $bottomY - $topY;
    }

    private function isGreenPixel($image, int $x, int $y): bool
    {
        try {
            $color = $image->pickColor($x, $y);
            $r = $color->red()->toInt();
            $g = $color->green()->toInt();
            $b = $color->blue()->toInt();

            // Check if it's green (low R, high G, low B)
            return $r < 100 && $g > 200 && $b < 100;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function barHeightToDigit(int $height): int
    {
        $heights = [
            50 => 0,
            75 => 1,
            100 => 2,
            125 => 3,
            150 => 4,
            175 => 5,
            200 => 6,
            225 => 7,
            250 => 8,
            275 => 9,
        ];

        // Find closest matching height
        $closest = null;
        $minDiff = PHP_INT_MAX;

        foreach ($heights as $h => $digit) {
            $diff = abs($height - $h);
            if ($diff < $minDiff) {
                $minDiff = $diff;
                $closest = $digit;
            }
        }

        return $closest ?? 0;
    }
}
