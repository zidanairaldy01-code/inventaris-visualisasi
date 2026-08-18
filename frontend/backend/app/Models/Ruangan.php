<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ruangan extends Model
{
    protected $fillable = ['id_gedung', 'nama_ruangan', 'kode_ruangan', 'lantai', 'luas_ruangan', 'deskripsi'];

    public function gedung()
    {
        return $this->belongsTo(Gedung::class, 'id_gedung');
    }

    public function visualisasis()
    {
        return $this->hasMany(Visualisasi::class, 'id_ruangan');
    }

    public function asets()
    {
        return $this->hasMany(Aset::class, 'id_ruangan');
    }
}
