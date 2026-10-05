<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Peminjaman extends Model
{
    protected $table = 'peminjamans';

    protected $fillable = [
        'id_aset',
        'sarana_prasarana_id',
        'nama_peminjam',
        'role_peminjam',
        'jumlah',
        'tanggal_pinjam',
        'tanggal_kembali_rencana',
        'tanggal_kembali_aktual',
        'keperluan',
        'status',
    ];

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }

    public function saranaPrasarana()
    {
        return $this->belongsTo(SaranaPrasarana::class, 'sarana_prasarana_id');
    }
}
