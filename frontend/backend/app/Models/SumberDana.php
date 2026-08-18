<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SumberDana extends Model
{
    protected $fillable = ['nama_sumber', 'jenis_sumber', 'keterangan'];

    public function asets()
    {
        return $this->hasMany(Aset::class, 'id_sumber_dana');
    }
}
