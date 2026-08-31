<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FolderInventaris extends Model
{
    protected $table = 'folder_inventaris';

    protected $fillable = [
        'nama_folder',
        'keterangan',
        'warna',
        'jenis',
        'id_sumber_dana',
    ];

    /**
     * Relasi dengan Sumber Dana
     */
    public function sumberDana()
    {
        return $this->belongsTo(SumberDana::class, 'id_sumber_dana');
    }

    public function items()
    {
        return $this->hasMany(Inventaris::class, 'id_folder');
    }

    public function daftarBelanjas()
    {
        return $this->hasMany(DaftarBelanja::class, 'id_folder');
    }

    public function saranaPrasaranas()
    {
        return $this->hasMany(SaranaPrasarana::class, 'id_folder');
    }

    public function inventarisGudangs()
    {
        return $this->hasMany(InventarisGudang::class, 'id_folder');
    }
}
