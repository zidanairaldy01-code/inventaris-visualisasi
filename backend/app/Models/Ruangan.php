<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ruangan extends Model
{
    protected $fillable = ['id_gedung', 'id_kelas', 'nama_ruangan', 'kode_ruangan', 'lantai', 'luas_ruangan', 'deskripsi', 'foto_ruangan'];

    public function gedung()
    {
        return $this->belongsTo(Gedung::class, 'id_gedung');
    }

    public function kelas()
    {
        return $this->belongsTo(Kelas::class, 'id_kelas');
    }

    public function asets()
    {
        return $this->hasMany(Aset::class, 'id_ruangan');
    }
}
