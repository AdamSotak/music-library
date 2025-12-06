<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JamParticipant extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $primaryKey = null;

    protected $table = 'jam_participants';

    public $timestamps = false;

    protected $fillable = [
        'jam_id',
        'user_id',
        'role',
        'joined_at',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
