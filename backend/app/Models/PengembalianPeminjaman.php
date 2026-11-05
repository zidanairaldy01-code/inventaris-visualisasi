<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PengembalianPeminjaman extends Model
{
    protected $table = 'pengembalian_peminjamans';

    protected $fillable = [
        'peminjaman_id',
        'jumlah_kembali',
        'tanggal_kembali',
        'kondisi',
        'keterangan',
        'id_user',
    ];

    protected $casts = [
        'tanggal_kembali' => 'date',
        'jumlah_kembali'  => 'integer',
    ];

    public function peminjaman()
    {
        return $this->belongsTo(Peminjaman::class, 'peminjaman_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }
}

