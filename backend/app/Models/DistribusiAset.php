<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DistribusiAset extends Model
{
    use HasFactory;

    protected $table = 'distribusi_asets';

    protected $fillable = [
        'nomor_surat_jalan',
        'nomor_pengiriman',
        'nomor_bast',
        'sarana_prasarana_id',
        'ruangan_tujuan_id',
        'petugas_pengirim_id',
        'wakapro_penerima_id',
        'jumlah',
        'harga_satuan',
        'total_harga',
        'tanggal_kirim',
        'tanggal_terima',
        'status',
        'catatan_pengiriman',
        'catatan_penerimaan',
        'foto_kerusakan',
    ];

    protected $casts = [
        'tanggal_kirim' => 'date',
        'tanggal_terima' => 'datetime',
        'jumlah' => 'integer',
        'harga_satuan' => 'float',
        'total_harga' => 'float',
    ];

    protected $appends = ['foto_kerusakan_url'];

    public function getFotoKerusakanUrlAttribute(): ?string
    {
        if (!$this->foto_kerusakan) {
            return null;
        }
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->foto_kerusakan);
    }

    public function saranaPrasarana()
    {
        return $this->belongsTo(SaranaPrasarana::class, 'sarana_prasarana_id');
    }

    public function ruanganTujuan()
    {
        return $this->belongsTo(Ruangan::class, 'ruangan_tujuan_id');
    }

    public function petugasPengirim()
    {
        return $this->belongsTo(User::class, 'petugas_pengirim_id');
    }

    public function wakaproPenerima()
    {
        return $this->belongsTo(User::class, 'wakapro_penerima_id');
    }
}
