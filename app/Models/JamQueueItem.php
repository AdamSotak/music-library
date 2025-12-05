<?php

namespace App\Models;

use App\Models\Track;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JamQueueItem extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $primaryKey = null;
    protected $table = 'jam_queue_items';
    protected $fillable = [
        'jam_id',
        'position',
        'track_id',
        'added_by',
        'source',
    ];

    public function track(): BelongsTo
    {
        return $this->belongsTo(Track::class, 'track_id');
    }
}
