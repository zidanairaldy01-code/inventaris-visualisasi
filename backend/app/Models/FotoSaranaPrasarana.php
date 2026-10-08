<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class FotoSaranaPrasarana extends Model
{
    protected $table = 'foto_sarana_prasaranas';

    protected $fillable = [
        'id_sarana_prasarana',
        'nama_barang_ref',
        'nama_file',
        'path_file',
        'keterangan',
        'is_thumbnail',
        'urutan',
    ];

    protected $appends = ['url_foto'];

    public function getUrlFotoAttribute(): string
    {
        // Jika path_file sudah berupa URL lengkap, return as-is
        if (filter_var($this->path_file, FILTER_VALIDATE_URL)) {
            return $this->path_file;
        }
        
        // Gunakan full URL dengan APP_URL untuk cross-origin requests
        $baseUrl = rtrim(config('app.url'), '/');
        $storagePath = Storage::url($this->path_file);
        
        return $baseUrl . $storagePath;
    }

    public function saranaPrasarana()
    {
        return $this->belongsTo(SaranaPrasarana::class, 'id_sarana_prasarana');
    }
}
