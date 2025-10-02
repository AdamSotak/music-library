<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Playlist extends Model
{
    protected $fillable = [
        'name',
        'description',
        'image',
        'is_curated',
    ];

    protected $casts = [
        'is_curated' => 'boolean',
    ];

    public function tracks(): BelongsToMany
    {
        return $this->belongsToMany(Track::class, 'playlist_track')
            ->withPivot('position')
            ->orderByPivot('position')
            ->withTimestamps();
    }
}
