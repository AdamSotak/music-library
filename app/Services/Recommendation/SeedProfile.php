<?php

namespace App\Services\Recommendation;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Track;

class SeedProfile
{
    public function __construct(
        public ?Track $track = null,
        public ?Album $album = null,
        public ?Artist $artist = null,
    ) {
    }

    public function artistId(): ?string
    {
        return $this->track?->artist_id ?? $this->album?->artist_id ?? $this->artist?->id;
    }

    public function albumId(): ?string
    {
        return $this->track?->album_id ?? $this->album?->id;
    }

    public function categorySlug(): ?string
    {
        return $this->track?->category_slug;
    }

    public function durationSeconds(): ?int
    {
        return $this->track?->duration;
    }

    public function releaseYear(): ?int
    {
        $date = $this->track?->album?->release_date ?? $this->album?->release_date;
        if (! $date) {
            return null;
        }

        try {
            return (int) date('Y', strtotime((string) $date));
        } catch (\Throwable) {
            return null;
        }
    }
}
