<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $primaryKey = 'slug';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'slug',
        'name',
        'color',
        'image_url',
    ];

    public function tracks(): HasMany
    {
        return $this->hasMany(Track::class, 'category_slug', 'slug');
    }
}
