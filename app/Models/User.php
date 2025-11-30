<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

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

    public function collaborativePlaylists(): BelongsToMany
    {
        return $this->belongsToMany(Playlist::class, 'playlist_users', 'user_id', 'playlist_id')
            ->withPivot('role')
            ->withTimestamps();
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
}
