<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Aset extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'id_kategori', 'id_ruangan', 'id_sumber_dana', 'id_kondisi', 'id_user',
        'kode_aset', 'nama_aset', 'merek', 'tipe', 'warna', 'jumlah', 'satuan',
        'tahun_perolehan', 'harga_perolehan', 'nomor_seri', 'tanggal_perolehan', 'deskripsi', 'status_aset'
    ];

    public function kategori() { return $this->belongsTo(Kategori::class, 'id_kategori'); }
    public function ruangan() { return $this->belongsTo(Ruangan::class, 'id_ruangan'); }
    public function sumberDana() { return $this->belongsTo(SumberDana::class, 'id_sumber_dana'); }
    public function kondisi() { return $this->belongsTo(Kondisi::class, 'id_kondisi'); }
    public function user() { return $this->belongsTo(User::class, 'id_user'); }
    public function fotos() { return $this->hasMany(FotoAset::class, 'id_aset'); }
    public function histories() { return $this->hasMany(History::class, 'id_aset'); }
}
