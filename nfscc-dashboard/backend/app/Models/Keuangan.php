<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Keuangan extends Model
{
    protected $fillable = [
        'keterangan',
        'jenis',
        'jumlah',
        'tanggal',
        'periode',
        'kind',
        'member_id',
        'member_name',
        'member_divisi',
        'divisi',
        'tipe',
        'kategori',
        'catatan',
        'bukti_nama',
        'bukti_tipe',
        'bukti_path',
        'bukti_url',
        'dibuat_oleh',
        'start_month',
        'end_month',
        'months_count',
        'nominal_per_bulan',
    ];
}