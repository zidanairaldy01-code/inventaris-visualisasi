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
        return Storage::disk('public')->url($this->path_file);
    }

    public function saranaPrasarana()
    {
        return $this->belongsTo(SaranaPrasarana::class, 'id_sarana_prasarana');
    }
}
