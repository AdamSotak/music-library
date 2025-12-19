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
        /** @var array<int, float>|null */
        public ?array $embedding = null,
    ) {}

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

    public function radioGenreKey(): ?string
    {
        return $this->track?->radio_genre_key;
    }

    public function genreId(): ?string
    {
        return $this->track?->deezer_genre_id;
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

    /**
     * @return array<int, float>|null
     */
    public function embeddingVector(): ?array
    {
        if (is_array($this->embedding)) {
            return $this->embedding;
        }

        $trackVec = $this->track?->embedding?->embedding;
        if (is_array($trackVec)) {
            return $trackVec;
        }

        return null;
    }
}
