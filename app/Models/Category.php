<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Category extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'image',
        'color',
    ];

    public function tracks(): BelongsToMany
    {
        return $this->belongsToMany(Track::class, 'category_track')
            ->withTimestamps();
    }
}
