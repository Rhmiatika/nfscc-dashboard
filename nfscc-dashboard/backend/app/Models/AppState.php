<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppState extends Model
{
    protected $fillable = [
        'periode',
        'data',
    ];

    protected $casts = [
        'data' => 'array',
    ];
}