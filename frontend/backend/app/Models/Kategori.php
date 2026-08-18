<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kategori extends Model
{
    protected $fillable = ['nama_kategori', 'deskripsi'];

    public function asets()
    {
        return $this->hasMany(Aset::class, 'id_kategori');
    }
}
