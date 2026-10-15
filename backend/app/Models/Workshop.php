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
        if (!$this->foto_workshop) {
            return null;
        }
        if (str_starts_with($this->foto_workshop, 'http')) {
            return $this->foto_workshop;
        }
        return url('storage/' . ltrim(str_replace('/storage/', '', $this->foto_workshop), '/'));
    }
}
