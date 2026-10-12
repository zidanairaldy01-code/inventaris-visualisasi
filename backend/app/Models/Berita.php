<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Berita extends Model
{
    use HasFactory;

    protected $table = 'beritas';

    protected $fillable = [
        'judul',
        'slug',
        'ringkasan',
        'konten',
        'gambar',
        'tanggal',
        'penulis',
        'is_active',
        'urutan',
        'id_user',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'tanggal'   => 'date:Y-m-d',
        'urutan'    => 'integer',
    ];

    protected $appends = ['gambar_url'];

    public static function boot()
    {
        parent::boot();

        static::creating(function ($berita) {
            if (empty($berita->slug)) {
                $berita->slug = Str::slug($berita->judul) . '-' . Str::random(5);
            }
        });
    }

    public function getGambarUrlAttribute(): ?string
    {
        if (empty($this->gambar)) {
            return null;
        }

        // Jika URL absolut eksternal (Unsplash, CDN, dll)
        if (str_starts_with($this->gambar, 'http://') || str_starts_with($this->gambar, 'https://')) {
            return $this->gambar;
        }

        // Jika disimpan di local public disk
        return Storage::disk('public')->url($this->gambar);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }
}
