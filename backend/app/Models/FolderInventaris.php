<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FolderInventaris extends Model
{
    use SoftDeletes;

    protected $table = 'folder_inventaris';

    protected $fillable = [
        'nama_folder',
        'keterangan',
        'warna',
        'jenis',
        'id_sumber_dana',
    ];

    protected $casts = [
        'deleted_at' => 'datetime',
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
