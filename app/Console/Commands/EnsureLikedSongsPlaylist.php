<?php

namespace App\Console\Commands;

use App\Models\Playlist;
use App\Models\User;
use Illuminate\Console\Command;

class EnsureLikedSongsPlaylist extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'playlists:ensure-liked-songs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ensure all users have a default "Liked Songs" playlist';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking all users for "Liked Songs" playlist...');

        $users = User::all();
        $created = 0;

        foreach ($users as $user) {
            // Check if user already has a default "Liked Songs" playlist
            $hasLikedSongs = $user->playlists()
                ->where('is_default', true)
                ->exists();

            if (! $hasLikedSongs) {
                Playlist::create([
                    'name' => 'Liked Songs',
                    'description' => 'Your liked songs',
                    'is_default' => true,
                    'user_id' => $user->id,
                ]);

                $this->info("Created 'Liked Songs' for user: {$user->name} ({$user->email})");
                $created++;
            } else {
                $this->comment("- User {$user->name} already has a 'Liked Songs' playlist");
            }
        }

        if ($created > 0) {
            $this->info("Success! Created {$created} 'Liked Songs' playlist(s)");
        } else {
            $this->info('All users already have their "Liked Songs" playlist');
        }

        return Command::SUCCESS;
    }
}
