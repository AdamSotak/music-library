<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Playlist extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'name',
        'description',
        'is_default',
        'is_shared',
        'user_id',
        'is_collaborative',
        'invite_token',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_collaborative' => 'boolean',
        'is_shared' => 'boolean',
    ];

    public function tracks(): BelongsToMany
    {
        return $this->belongsToMany(Track::class, 'playlist_tracks', 'playlist_id', 'track_id');
    }

    public function collaborators(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'playlist_users', 'playlist_id', 'user_id')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sharedWith(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'shared_playlist_users', 'playlist_id', 'user_id')
            ->withPivot('added_at', 'added_by')
            ->orderByPivot('added_at', 'desc');
    }

    public function isOwner(User $user): bool
    {
        return $this->user_id === $user->id;
    }

    public function isSharedWithUser(User $user): bool
    {
        if (! $this->is_shared) {
            return false;
        }

        return $this->sharedWith()->where('user_id', $user->id)->exists();
    }

    public function canUserEdit(User $user): bool
    {
        return $this->isOwner($user) || $this->isSharedWithUser($user);
    }

    public function canUserManageSharing(User $user): bool
    {
        return $this->isOwner($user);
    }
}
