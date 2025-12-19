<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JamQueueItem extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $primaryKey = 'id';

    protected $table = 'jam_queue_items';

    protected $fillable = [
        'id',
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
