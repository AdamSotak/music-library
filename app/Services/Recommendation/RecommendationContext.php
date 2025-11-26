<?php

namespace App\Services\Recommendation;

class RecommendationContext
{
    public function __construct(
        public string $seedType,
        public string $seedId,
        /** @var array<int, string> */
        public array $excludeTrackIds = [],
        public int $limit = 30,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            seedType: (string) ($data['seed_type'] ?? 'track'),
            seedId: (string) ($data['seed_id'] ?? ''),
            excludeTrackIds: array_values($data['exclude'] ?? []),
            limit: (int) ($data['limit'] ?? 30),
        );
    }
}
