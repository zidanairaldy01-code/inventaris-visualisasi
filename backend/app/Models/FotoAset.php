<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FotoAset extends Model
{
    protected $fillable = ['id_aset', 'nama_file', 'path_file', 'keterangan', 'is_thumbnail', 'urutan'];

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }
}
