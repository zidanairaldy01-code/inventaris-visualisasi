<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class Inventaris extends Model
{
    protected $table = 'inventaris';

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
        'id_jurusan',
        'id_folder',
    ];

    protected $casts = [
        'tanggal_pengambilan' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class, 'id_jurusan');
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

    /**
     * Fallback table name check jika migration rename belum berjalan
     */
    public function getTable()
    {
        if (parent::getTable() === 'inventaris' && !Schema::hasTable('inventaris') && Schema::hasTable('sarana_prasaranas')) {
            return 'sarana_prasaranas';
        }
        return parent::getTable();
    }
}
