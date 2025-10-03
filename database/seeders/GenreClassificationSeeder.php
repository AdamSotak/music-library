<?php

namespace Database\Seeders;

use App\Services\GenreClassificationService;
use Illuminate\Database\Seeder;

class GenreClassificationSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Classifying tracks by genre...');

        $service = new GenreClassificationService();
        $classified = $service->classifyAllTracks();

        $this->command->info("✅ {$classified} track-genre associations created!");
    }
}
