<?php

namespace Database\Seeders;

use App\Constants\Constants;
use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding categories...');

        foreach (Constants::CATEGORIES as $categoryData) {
            Category::create([
                'slug' => $categoryData['id'],
                'name' => $categoryData['name'],
                'color' => $categoryData['color'],
                'image' => $categoryData['image'],
            ]);
        }

        $this->command->info('✅ '.count(Constants::CATEGORIES).' categories seeded!');
    }
}
