<?php

namespace App\Services;

use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class MusicBarcodeService
{
    private const BAR_WIDTH = 16;

    private const BASE_HEIGHT = 600;

    private const PADDING = 120;

    private const TOTAL_BYTES = 22;

    private const TOTAL_BITS = self::TOTAL_BYTES * 8;

    protected $imageManager;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver);
    }

    public function generateBarcode(string $trackId): string
    {
        $uuidHex = $this->normalizeUuid($trackId);

        if ($uuidHex === null) {
            throw new \InvalidArgumentException('Invalid track id format for barcode generation.');
        }

        $payloadBytes = $this->createPayloadBytes($uuidHex);
        $bitString = $this->bytesToBitString($payloadBytes);

        $bitCount = strlen($bitString);
        $width = ($bitCount * self::BAR_WIDTH) + (self::PADDING * 2);
        $height = self::BASE_HEIGHT + (self::PADDING * 2);

        $image = $this->imageManager->create($width, $height)->fill('#ffffff');

        $x = self::PADDING;
        for ($i = 0; $i < $bitCount; $i++) {
            if ($bitString[$i] === '1') {
                $image->drawRectangle($x, self::PADDING, function ($rectangle) {
                    $rectangle->size(self::BAR_WIDTH - 2, self::BASE_HEIGHT);
                    $rectangle->background('#000000');
                });
            }
            $x += self::BAR_WIDTH;
        }

        return $image->toPng()->toDataUri();
    }

    public function decodeBarcode($imagePath): ?string
    {
        $path = $imagePath instanceof \Illuminate\Http\UploadedFile
            ? $imagePath->getRealPath()
            : $imagePath;

        $image = $this->imageManager->read($path);

        $bitString = $this->scanBitString($image);
        if ($bitString === null) {
            return null;
        }

        $uuid = $this->decodeBitStringToUuid($bitString);
        if ($uuid !== null) {
            return $uuid;
        }

        $reversed = strrev($bitString);

        return $this->decodeBitStringToUuid($reversed);
    }

    private function normalizeUuid(string $uuid): ?string
    {
        $hex = preg_replace('/[^0-9a-f]/i', '', $uuid);
        if ($hex === null) {
            return null;
        }

        if (strlen($hex) !== 32) {
            return null;
        }

        return strtolower($hex);
    }

    private function createPayloadBytes(string $uuidHex): string
    {
        $payload = hex2bin($uuidHex);
        if ($payload === false || strlen($payload) !== 16) {
            throw new \RuntimeException('Invalid UUID hex payload.');
        }

        $sum = 0;
        $len = strlen($payload);
        for ($i = 0; $i < $len; $i++) {
            $sum = ($sum + ord($payload[$i])) & 0xFFFF;
        }

        $header = chr(0xAA).chr(0x55);
        $checksum = chr(($sum >> 8) & 0xFF).chr($sum & 0xFF);
        $footer = chr(0x55).chr(0xAA);

        return $header.$payload.$checksum.$footer;
    }

    private function bytesToBitString(string $bytes): string
    {
        $bits = '';
        $len = strlen($bytes);
        for ($i = 0; $i < $len; $i++) {
            $bits .= str_pad(decbin(ord($bytes[$i])), 8, '0', STR_PAD_LEFT);
        }

        return $bits;
    }

    private function bitStringToBytes(string $bits): ?string
    {
        $bits = preg_replace('/[^01]/', '', $bits);
        if ($bits === null) {
            return null;
        }

        $length = strlen($bits);
        if ($length % 8 !== 0) {
            return null;
        }

        $bytes = '';
        for ($i = 0; $i < $length; $i += 8) {
            $chunk = substr($bits, $i, 8);
            $bytes .= chr(bindec($chunk));
        }

        return $bytes;
    }

    private function scanBitString($image): ?string
    {
        $width = $image->width();
        $height = $image->height();

        if ($width <= 0 || $height <= 0) {
            return null;
        }

        $margin = (int) floor($width * 0.05);
        if ($margin < 2) {
            $margin = 2;
        }

        $contentWidth = $width - 2 * $margin;
        if ($contentWidth <= 0) {
            return null;
        }

        $expectedBits = self::TOTAL_BITS;

        $segmentWidth = $contentWidth / $expectedBits;
        if ($segmentWidth < 1) {
            return null;
        }

        $brightnessValues = [];

        for ($i = 0; $i < $expectedBits; $i++) {
            $cx = (int) round($margin + ($i + 0.5) * $segmentWidth);
            if ($cx < 0) {
                $cx = 0;
            }
            if ($cx >= $width) {
                $cx = $width - 1;
            }

            $sum = 0;
            $count = 0;

            $startY = (int) floor($height * 0.2);
            $endY = (int) ceil($height * 0.8);
            if ($startY < 0) {
                $startY = 0;
            }
            if ($endY > $height) {
                $endY = $height;
            }

            $stepY = max(1, (int) floor(($endY - $startY) / 40));

            for ($y = $startY; $y < $endY; $y += $stepY) {
                $color = $image->pickColor($cx, $y);
                $r = $color->red()->toInt();
                $g = $color->green()->toInt();
                $b = $color->blue()->toInt();

                $sum += ($r + $g + $b) / 3;
                $count++;
            }

            if ($count === 0) {
                $brightnessValues[] = 255.0;
            } else {
                $brightnessValues[] = $sum / $count;
            }
        }

        $min = min($brightnessValues);
        $max = max($brightnessValues);

        if ($max - $min < 10) {
            return null;
        }

        $threshold = ($min + $max) / 2.0;

        $bits = '';
        foreach ($brightnessValues as $value) {
            $bits .= $value < $threshold ? '1' : '0';
        }

        return $bits;
    }

    private function decodeBitStringToUuid(string $bits): ?string
    {
        $bits = preg_replace('/[^01]/', '', $bits);
        if ($bits === null) {
            return null;
        }

        if (strlen($bits) !== self::TOTAL_BITS) {
            return null;
        }

        $bytes = $this->bitStringToBytes($bits);
        if ($bytes === null || strlen($bytes) !== self::TOTAL_BYTES) {
            return null;
        }

        if (
            ord($bytes[0]) !== 0xAA ||
            ord($bytes[1]) !== 0x55 ||
            ord($bytes[20]) !== 0x55 ||
            ord($bytes[21]) !== 0xAA
        ) {
            return null;
        }

        $payload = substr($bytes, 2, 16);
        $checksumHigh = ord($bytes[18]);
        $checksumLow = ord($bytes[19]);
        $checksum = ($checksumHigh << 8) | $checksumLow;

        $calc = 0;
        $len = strlen($payload);
        for ($i = 0; $i < $len; $i++) {
            $calc = ($calc + ord($payload[$i])) & 0xFFFF;
        }

        if ($checksum !== $calc) {
            return null;
        }

        $hex = bin2hex($payload);
        if (strlen($hex) !== 32) {
            return null;
        }

        $uuid =
            substr($hex, 0, 8).'-'.
            substr($hex, 8, 4).'-'.
            substr($hex, 12, 4).'-'.
            substr($hex, 16, 4).'-'.
            substr($hex, 20, 12);

        return $uuid;
    }
}
