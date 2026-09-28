<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Workshop extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama_workshop',
        'deskripsi',
        'kategori',
        'icon',
        'foto_workshop',
        'fasilitas',
        'is_active',
    ];

    protected $casts = [
        'fasilitas' => 'array',
        'is_active' => 'boolean',
    ];

    // Accessor untuk URL foto
    public function getFotoUrlAttribute()
    {
        if ($this->foto_workshop) {
            return url('storage/' . $this->foto_workshop);
        }
        return null;
    }
}
