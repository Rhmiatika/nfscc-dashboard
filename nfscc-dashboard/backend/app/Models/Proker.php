<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Proker extends Model
{
    use HasFactory;

    protected $table = 'prokers';

    protected $fillable = [
        'nama',
        'divisi',
        'deskripsi',
        'tanggal_mulai',
        'tanggal_selesai',
        'pic',
        'anggaran',
        'status',
        'proposal_link',
        'doc_link',
        'notulensi_link',
        'hidden_from_proker_page',
        'archived',
        'page_removed_at',
        'page_removed_by',
        'periode',
    ];

    protected $casts = [
        'hidden_from_proker_page' => 'boolean',
        'archived' => 'boolean',
        'page_removed_at' => 'datetime',
    ];
}