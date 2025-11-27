<?php

namespace Database\Seeders;

use App\Services\GenreClassificationService;
use Illuminate\Database\Seeder;

class GenreClassificationSeeder extends Seeder
{
    public function run(): void
    {
        // DEPRECATED: legacy Jamendo-era genre classifier. Not used by current Deezer flow.
        $this->command->info('Classifying tracks by genre...');

        $service = new GenreClassificationService;
        $classified = $service->classifyAllTracks();

        $this->command->info("✅ {$classified} track-genre associations created!");
    }
}
