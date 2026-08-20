<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Servis extends Model
{
    protected $table = 'servises';

    protected $fillable = [
        'id_aset',
        'jenis_perbaikan',
        'tanggal_servis',
        'biaya_servis',
        'teknisi_bengkel',
        'deskripsi_kerusakan',
        'status',
    ];

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }
}
