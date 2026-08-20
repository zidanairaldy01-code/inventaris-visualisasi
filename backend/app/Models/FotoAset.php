<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class FotoAset extends Model
{
    protected $fillable = ['id_aset', 'nama_file', 'path_file', 'keterangan', 'is_thumbnail', 'urutan'];

    protected $appends = ['url_foto'];

    public function getUrlFotoAttribute(): string
    {
        return Storage::disk('public')->url($this->path_file);
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }
}
