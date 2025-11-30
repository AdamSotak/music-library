<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function playlists(): HasMany
    {
        return $this->hasMany(Playlist::class);
    }

    public function savedAlbums(): BelongsToMany
    {
        return $this->belongsToMany(Album::class, 'user_albums', 'user_id', 'album_id')
            ->withPivot('saved_at')
            ->orderByPivot('saved_at', 'desc');
    }

    public function followedArtists(): BelongsToMany
    {
        return $this->belongsToMany(Artist::class, 'user_artists', 'user_id', 'artist_id')
            ->withPivot('followed_at')
            ->orderByPivot('followed_at', 'desc');
    }

    // friends relationship
    public function getFriends()
    {
        $friendIds = DB::table('user_friends')
            ->where('status', 'accepted')
            ->where(function ($query) {
                $query->where('user_id', $this->id)
                    ->orWhere('friend_id', $this->id);
            })
            ->pluck('user_id', 'friend_id')
            ->map(function ($userId, $friendId) {
                return $userId == $this->id ? $friendId : $userId;
            })
            ->unique()
            ->values();

        return User::whereIn('id', $friendIds)->get();
    }

    public function sentFriendRequests(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_friends', 'user_id', 'friend_id')
            ->wherePivot('status', 'pending')
            ->withPivot('created_at');
    }

    public function receivedFriendRequests(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_friends', 'friend_id', 'user_id')
            ->wherePivot('status', 'pending')
            ->withPivot('created_at');
    }

    public function sharedPlaylists(): BelongsToMany
    {
        return $this->belongsToMany(Playlist::class, 'shared_playlist_users', 'user_id', 'playlist_id')
            ->where('is_shared', true)
            ->withPivot('added_at', 'added_by')
            ->orderByPivot('added_at', 'desc');
    }
}
