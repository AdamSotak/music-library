<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserTrackPlay extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'track_id',
        'offset_ms',
        'context',
        'played_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'offset_ms' => 'integer',
        'played_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function track(): BelongsTo
    {
        return $this->belongsTo(Track::class);
    }
}
