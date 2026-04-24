<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Presensi extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'type',
        'date',
        'location',
        'hadir',
        'izin',
        'izin_reasons',
        'created_by',
        'periode',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'hadir' => 'array',
        'izin' => 'array',
        'izin_reasons' => 'array',
    ];
}