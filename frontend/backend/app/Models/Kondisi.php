<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kondisi extends Model
{
    protected $fillable = ['nama_kondisi', 'keterangan'];

    public function asets()
    {
        return $this->hasMany(Aset::class, 'id_kondisi');
    }
}
