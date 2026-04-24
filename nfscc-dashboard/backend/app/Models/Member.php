<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    protected $table = 'anggotas';

    protected $fillable = [
        'nama',
        'email',
        'divisi',
        'jabatan',
        'tahun_angkatan',
        'foto',
        'password',
        'is_ec',
        'periode',
        'archived',
        'archived_at',
        'archived_by',
        'archive_reason',
    ];

    protected $casts = [
        'is_ec' => 'boolean',
        'archived' => 'boolean',
        'archived_at' => 'datetime',
    ];

    protected $hidden = [
        'password',
    ];

    protected static function booted(): void
    {
        static::deleting(function ($member) {
            if (!empty($member->email)) {
                User::whereRaw('LOWER(email) = ?', [strtolower(trim($member->email))])->delete();
            }
        });
    }
}