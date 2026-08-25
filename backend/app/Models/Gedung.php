<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gedung extends Model
{
    protected $fillable = ['id_sekolah', 'nama_gedung', 'kode_gedung', 'jumlah_lantai', 'deskripsi', 'foto_gedung'];

    public function ruangans()
    {
        return $this->hasMany(Ruangan::class, 'id_gedung');
    }
}
