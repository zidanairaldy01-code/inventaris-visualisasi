<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\FolderInventaris;

class SaranaPrasarana extends Model
{
    protected $table = 'sarana_prasaranas';

    protected $fillable = [
        'tanggal_pengambilan',
        'kode',
        'nama_barang',
        'satuan',
        'luas_jumlah',
        'stok_awal',
        'stok_masuk',
        'stok_keluar',
        'stok_akhir',
        'nilai_harga_pembelian',
        'nilai_harga_sekarang',
        'kondisi',
        'keterangan',
        'id_user',
        'id_folder',
    ];

    protected $casts = [
        'tanggal_pengambilan' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function folder()
    {
        return $this->belongsTo(FolderInventaris::class, 'id_folder');
    }

    // Auto calculate stok_akhir before saving
    protected static function booted()
    {
        static::saving(function ($item) {
            $item->stok_akhir = $item->stok_awal + $item->stok_masuk - $item->stok_keluar;
        });
    }
}
