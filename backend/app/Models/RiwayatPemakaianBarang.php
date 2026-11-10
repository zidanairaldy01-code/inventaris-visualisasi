<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RiwayatPemakaianBarang extends Model
{
    use HasFactory;

    protected $table = 'riwayat_pemakaian_barangs';

    protected $fillable = [
        'distribusi_aset_id',
        'user_id',
        'jumlah_pakai',
        'sisa_sebelumnya',
        'sisa_setelahnya',
        'tanggal_pemakaian',
        'keperluan',
    ];

    protected $casts = [
        'jumlah_pakai'      => 'integer',
        'sisa_sebelumnya'   => 'integer',
        'sisa_setelahnya'   => 'integer',
        'tanggal_pemakaian' => 'date',
    ];

    public function distribusiAset()
    {
        return $this->belongsTo(DistribusiAset::class, 'distribusi_aset_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

