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
        'nomor_bast',
        'sarana_prasarana_id',
        'ruangan_tujuan_id',
        'petugas_pengirim_id',
        'wakapro_penerima_id',
        'jumlah',
        'tanggal_kirim',
        'tanggal_terima',
        'status',
        'catatan_pengiriman',
        'catatan_penerimaan',
    ];

    protected $casts = [
        'tanggal_kirim' => 'date',
        'tanggal_terima' => 'datetime',
        'jumlah' => 'integer',
    ];

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
