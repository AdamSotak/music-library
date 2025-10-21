<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeezerService
{
    private const BASE_URL = 'https://api.deezer.com';

    private const TIMEOUT = 10; // seconds

    /**
     * Fetch fresh preview URL for a track
     *
     * @param  string  $trackId  Deezer track ID
     * @return string|null Preview URL or null on failure
     */
    public function getFreshPreviewUrl(string $trackId): ?string
    {
        try {
            $startTime = microtime(true);

            $response = Http::timeout(self::TIMEOUT)
                ->get(self::BASE_URL."/track/{$trackId}");

            $duration = round((microtime(true) - $startTime) * 1000, 2);

            if ($response->successful()) {
                $data = $response->json();
                $previewUrl = $data['preview'] ?? null;

                Log::info('Deezer API: Fresh preview URL fetched', [
                    'track_id' => $trackId,
                    'duration_ms' => $duration,
                    'has_preview' => ! is_null($previewUrl),
                ]);

                return $previewUrl;
            }

            Log::warning('Deezer API: Failed to fetch track', [
                'track_id' => $trackId,
                'status' => $response->status(),
                'duration_ms' => $duration,
            ]);

            return null;

        } catch (\Exception $e) {
            Log::error('Deezer API: Exception occurred', [
                'track_id' => $trackId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Fetch track metadata including preview URL
     *
     * @param  string  $trackId  Deezer track ID
     * @return array|null Track data or null on failure
     */
    public function getTrack(string $trackId): ?array
    {
        try {
            $response = Http::timeout(self::TIMEOUT)
                ->get(self::BASE_URL."/track/{$trackId}");

            if ($response->successful()) {
                return $response->json();
            }

            return null;

        } catch (\Exception $e) {
            Log::error('Deezer API: Failed to fetch track metadata', [
                'track_id' => $trackId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Check if a Deezer preview URL has expired
     *
     * @param  string  $url  Deezer preview URL
     * @return bool True if expired or about to expire (within 5 minutes)
     */
    public function isPreviewUrlExpired(string $url): bool
    {
        // Parse the exp parameter from URL
        // Format: ?hdnea=exp=1759396870~acl=...
        if (preg_match('/[?&]hdnea=exp=(\d+)/', $url, $matches)) {
            $expirationTimestamp = (int) $matches[1];
            $currentTimestamp = time();

            // Consider expired if within 5 minutes of expiration
            return $currentTimestamp >= ($expirationTimestamp - 300);
        }

        // If we can't parse expiration, assume it might be expired
        return true;
    }
}
