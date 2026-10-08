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
        // Jika path_file sudah berupa URL lengkap, return as-is
        if (filter_var($this->path_file, FILTER_VALIDATE_URL)) {
            return $this->path_file;
        }
        
        // Generate URL menggunakan APP_URL dari config
        $appUrl = rtrim(config('app.url'), '/');
        $storagePath = ltrim($this->path_file, '/');
        
        return "{$appUrl}/storage/{$storagePath}";
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }
}
