<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\FolderInventaris;

class SaranaPrasarana extends Model
{
    protected $table = 'sarana_prasaranas';

    protected $fillable = [
        'tanggal_pengambilan',
        'kode',
        'nama_barang',
        'satuan',
        'luas_jumlah',
        'stok_awal',
        'stok_masuk',
        'stok_keluar',
        'stok_akhir',
        'nilai_harga_pembelian',
        'nilai_harga_sekarang',
        'kondisi',
        'foto_kerusakan',
        'keterangan',
        'id_user',
        'id_folder',
    ];

    protected $casts = [
        'tanggal_pengambilan' => 'date',
    ];

    protected $appends = ['foto_kerusakan_url'];

    public function getFotoKerusakanUrlAttribute(): ?string
    {
        if (!$this->foto_kerusakan) {
            return null;
        }
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->foto_kerusakan);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function folder()
    {
        return $this->belongsTo(FolderInventaris::class, 'id_folder')->withTrashed();
    }

    public function fotos()
    {
        return $this->hasMany(\App\Models\FotoSaranaPrasarana::class, 'id_sarana_prasarana')->orderBy('urutan');
    }

    public function distribusiAset()
    {
        return $this->hasMany(\App\Models\DistribusiAset::class, 'sarana_prasarana_id');
    }

    // Auto calculate stok_akhir and synchronize luas_jumlah before saving
    protected static function booted()
    {
        static::saving(function ($item) {
            $item->stok_akhir = max(0, (int) $item->stok_awal + (int) $item->stok_masuk - (int) $item->stok_keluar);

            // Jika luas_jumlah berupa angka murni atau kuantitas unit, sinkronkan dengan stok_akhir
            if (!empty($item->luas_jumlah)) {
                $trimmed = trim((string) $item->luas_jumlah);
                if (is_numeric($trimmed)) {
                    $item->luas_jumlah = (string) $item->stok_akhir;
                } elseif (preg_match('/^\d+(\s+[a-zA-Z]+.*)$/', $trimmed, $m)) {
                    $item->luas_jumlah = $item->stok_akhir . $m[1];
                } elseif (preg_match('/^(.*?\/ *)\d+$/', $trimmed, $m)) {
                    $item->luas_jumlah = $m[1] . $item->stok_akhir;
                }
            } else {
                $item->luas_jumlah = (string) $item->stok_akhir;
            }
        });
    }
}
