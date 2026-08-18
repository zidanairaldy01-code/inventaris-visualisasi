<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Visualisasi extends Model
{
    protected $fillable = ['id_ruangan', 'nama_visualisasi', 'gambar', 'lebar_gambar', 'tinggi_gambar', 'deskripsi'];

    public function ruangan()
    {
        return $this->belongsTo(Ruangan::class, 'id_ruangan');
    }
}
