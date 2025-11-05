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
        'is_guest',
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
            'is_guest' => 'boolean',
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

    /**
     * Check if the user is a guest user.
     */
    public function isGuest(): bool
    {
        return $this->is_guest;
    }

    /**
     * Check if the user is a registered user.
     */
    public function isRegistered(): bool
    {
        return !$this->is_guest;
    }

    /**
     * Create a new guest user.
     */
    public static function createGuest(): self
    {
        return self::create([
            'name' => 'Guest User',
            'email' => null,
            'password' => null,
            'is_guest' => true,
        ]);
    }
}
