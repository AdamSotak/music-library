<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JamSession extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $casts = [
        'host_user_id' => 'integer',
        'allow_controls' => 'boolean',
        'queue_version' => 'integer',
    ];

    protected $fillable = [
        'id',
        'host_user_id',
        'seed_type',
        'seed_id',
        'allow_controls',
        'queue_version',
    ];

    public function participants(): HasMany
    {
        return $this->hasMany(JamParticipant::class, 'jam_id');
    }

    public function queueItems(): HasMany
    {
        return $this->hasMany(JamQueueItem::class, 'jam_id')->orderBy('position');
    }

    public function playbackState(): HasOne
    {
        return $this->hasOne(JamPlaybackState::class, 'jam_id');
    }
}
