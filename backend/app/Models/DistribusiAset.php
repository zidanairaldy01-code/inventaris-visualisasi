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
        'inventaris_gudang_id',
        'ruangan_tujuan_id',
        'petugas_pengirim_id',
        'wakapro_penerima_id',
        'jenis_barang',
        'jumlah',
        'sisa_unit',
        'harga_satuan',
        'total_harga',
        'tanggal_kirim',
        'tanggal_terima',
        'status',
        'catatan_pengiriman',
        'catatan_penerimaan',
        'foto_kerusakan',
        'foto_kondisi_wakapro',
    ];

    protected $casts = [
        'tanggal_kirim' => 'date',
        'tanggal_terima' => 'datetime',
        'jumlah' => 'integer',
        'sisa_unit' => 'integer',
        'harga_satuan' => 'float',
        'total_harga' => 'float',
    ];

    protected $appends = ['foto_kerusakan_url', 'foto_kondisi_wakapro_url'];

    public function getFotoKerusakanUrlAttribute(): ?string
    {
        if (!$this->foto_kerusakan) {
            return null;
        }
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->foto_kerusakan);
    }

    public function getFotoKondisiWakaproUrlAttribute(): ?string
    {
        if (!$this->foto_kondisi_wakapro) {
            return null;
        }
        // Jika sudah URL lengkap (Supabase atau external)
        if (filter_var($this->foto_kondisi_wakapro, FILTER_VALIDATE_URL)) {
            return $this->foto_kondisi_wakapro;
        }
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->foto_kondisi_wakapro);
    }

    public function saranaPrasarana()
    {
        return $this->belongsTo(SaranaPrasarana::class, 'sarana_prasarana_id');
    }

    public function inventarisGudang()
    {
        return $this->belongsTo(InventarisGudang::class, 'inventaris_gudang_id');
    }

    public function riwayatPemakaian()
    {
        return $this->hasMany(RiwayatPemakaianBarang::class, 'distribusi_aset_id')->orderBy('tanggal_pemakaian', 'desc')->orderBy('id', 'desc');
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
