<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrackEmbedding extends Model
{
    protected $table = 'track_embeddings';

    protected $primaryKey = 'track_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'track_id',
        'embedding',
    ];

    protected $casts = [
        'embedding' => 'array',
    ];

    public function track(): BelongsTo
    {
        return $this->belongsTo(Track::class);
    }
}
