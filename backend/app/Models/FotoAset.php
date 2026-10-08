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
        // Jika path_file sudah berupa URL lengkap (Supabase), return as-is
        if (filter_var($this->path_file, FILTER_VALIDATE_URL)) {
            return $this->path_file;
        }
        
        // Fallback untuk foto lama yang masih di local storage
        $baseUrl = config('app.env') === 'production' 
            ? rtrim(config('app.url'), '/')
            : 'https://inventaris-visualisasi-production.up.railway.app';
        
        $storagePath = Storage::url($this->path_file);
        
        return $baseUrl . $storagePath;
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }
}
