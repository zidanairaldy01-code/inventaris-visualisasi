<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kelas extends Model
{
    protected $fillable = [
        'id_jurusan',
        'tingkat',
        'nama_kelas',
        'tahun_ajaran',
        'wali_kelas',
        'jumlah_siswa'
    ];

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class, 'id_jurusan');
    }

    public function ruangans()
    {
        return $this->hasMany(Ruangan::class, 'id_kelas');
    }

    // Helper method untuk get aset via ruangan
    public function asets()
    {
        return Aset::whereHas('ruangan', function ($query) {
            $query->where('id_kelas', $this->id);
        });
    }

    public function getTotalAsetAttribute()
    {
        return $this->asets()->count();
    }
}
