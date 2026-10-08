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
        $appUrl = config('app.url');
        if (!app()->runningInConsole() && (empty($appUrl) || str_contains($appUrl, 'localhost') || str_contains($appUrl, '127.0.0.1'))) {
            $root = request()->getSchemeAndHttpHost();
            return rtrim($root, '/') . '/storage/' . ltrim($this->path_file, '/');
        }
        return Storage::disk('public')->url($this->path_file);
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }
}
