<?php

namespace App\Console\Commands;

use App\Models\Track;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class BackfillDeezerTrackIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tracks:backfill-deezer-ids {file?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill deezer_track_id from scraped data.json file';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('file') ?? base_path('scrapers/data.json');

        if (! File::exists($filePath)) {
            $this->error("File not found: {$filePath}");

            return 1;
        }

        $this->info("Reading data from: {$filePath}");

        $data = json_decode(File::get($filePath), true);

        if (! $data || ! isset($data['artists'])) {
            $this->error('Invalid JSON structure');

            return 1;
        }

        $updated = 0;
        $notFound = 0;
        $alreadySet = 0;

        foreach ($data['artists'] as $artistData) {
            if (isset($artistData['error'])) {
                continue;
            }

            $artistName = $artistData['artist']['name'] ?? null;

            foreach ($artistData['tracks'] ?? [] as $trackData) {
                $deezerId = $trackData['id'] ?? null;
                $trackName = $trackData['name'] ?? null;
                $trackArtistName = $trackData['artist_name'] ?? $artistName;

                if (! $deezerId || ! $trackName) {
                    continue;
                }

                // Find track by name and artist name
                $track = Track::whereHas('artist', function ($query) use ($trackArtistName) {
                    $query->where('name', $trackArtistName);
                })
                    ->where('name', $trackName)
                    ->first();

                if (! $track) {
                    $this->warn("Track not found in DB: {$trackName} by {$trackArtistName}");
                    $notFound++;

                    continue;
                }

                if ($track->deezer_track_id) {
                    $alreadySet++;

                    continue;
                }

                $track->deezer_track_id = (string) $deezerId;
                $track->save();

                $this->line("Updated: {$trackName} -> Deezer ID: {$deezerId}");
                $updated++;
            }
        }

        $this->newLine();
        $this->info('Backfill complete!');
        $this->table(
            ['Status', 'Count'],
            [
                ['Updated', $updated],
                ['Already set', $alreadySet],
                ['Not found in DB', $notFound],
            ]
        );

        return 0;
    }
}
