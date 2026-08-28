<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventarisGudang extends Model
{
    protected $table = 'inventaris_gudangs';

    protected $fillable = [
        'tanggal_pengambilan',
        'kode',
        'nama_barang',
        'satuan',
        'stok_awal',
        'stok_masuk',
        'stok_keluar',
        'stok_akhir',
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
            $item->stok_akhir = (int)$item->stok_awal + (int)$item->stok_masuk - (int)$item->stok_keluar;
        });
    }
}
