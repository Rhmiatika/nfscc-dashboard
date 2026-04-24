<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kegiatan extends Model
{
    use HasFactory;

    protected $table = 'kegiatans';

    protected $fillable = [
        'nama_kegiatan',
        'deskripsi',
        'tanggal',
        'lokasi',
        'pic',
        'event_id',
        'foto_kegiatan',
        'notulensi_link',
        'hidden_from_kegiatan_page',
        'page_removed_at',
        'page_removed_by',
        'periode',
    ];

    protected $casts = [
        'hidden_from_kegiatan_page' => 'boolean',
        'page_removed_at' => 'datetime',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function presensis()
    {
        return $this->hasMany(Presensi::class);
    }
}