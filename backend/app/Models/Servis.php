<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Servis extends Model
{
    protected $table = 'servises';

    protected $fillable = [
        'id_aset',
        'sarana_prasarana_id',
        'jenis_perbaikan',
        'tanggal_servis',
        'biaya_servis',
        'teknisi_bengkel',
        'deskripsi_kerusakan',
        'foto_kerusakan',
        'status',
    ];

    protected $appends = ['foto_kerusakan_url'];

    public function getFotoKerusakanUrlAttribute(): ?string
    {
        if (!$this->foto_kerusakan) {
            return null;
        }
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->foto_kerusakan);
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }

    public function saranaPrasarana()
    {
        return $this->belongsTo(SaranaPrasarana::class, 'sarana_prasarana_id');
    }
}
