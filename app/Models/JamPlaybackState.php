<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JamPlaybackState extends Model
{
    use HasFactory;

    protected $primaryKey = 'jam_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'jam_id',
        'position',
        'offset_ms',
        'is_playing',
    ];
}
