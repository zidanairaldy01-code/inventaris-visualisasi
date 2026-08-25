<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jurusan extends Model
{
    protected $fillable = ['kode_jurusan', 'nama_jurusan', 'deskripsi'];

    public function kelas()
    {
        return $this->hasMany(Kelas::class, 'id_jurusan');
    }

    // Helper method untuk count aset per jurusan
    public function getTotalAsetAttribute()
    {
        return Aset::whereHas('ruangan.kelas', function ($query) {
            $query->where('id_jurusan', $this->id);
        })->count();
    }
}
