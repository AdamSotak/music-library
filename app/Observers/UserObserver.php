<?php

namespace App\Observers;

use App\Models\Playlist;
use App\Models\User;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Don't create default playlists for guest users
        if ($user->is_guest) {
            return;
        }

        // Automatically create a "Liked Songs" playlist for new users
        Playlist::create([
            'name' => 'Liked Songs',
            'description' => 'Your liked songs',
            'is_default' => true,
            'user_id' => $user->id,
        ]);
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        //
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        //
    }

    /**
     * Handle the User "restored" event.
     */
    public function restored(User $user): void
    {
        //
    }

    /**
     * Handle the User "force deleted" event.
     */
    public function forceDeleted(User $user): void
    {
        //
    }
}
