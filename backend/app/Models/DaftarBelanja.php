<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DaftarBelanja extends Model
{
    use HasFactory;

    protected $fillable = [
        'no_urut',
        'kode_rekening',
        'kode_program',
        'uraian',
        'volume',
        'satuan',
        'tarif_harga',
        'jumlah',
        'keterangan',
        'id_user',
        'id_folder',
        'id_sumber_dana',
    ];

    protected $casts = [
        'no_urut' => 'integer',
        'volume' => 'decimal:2',
        'tarif_harga' => 'decimal:2',
        'jumlah' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relasi dengan User
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    /**
     * Relasi dengan Folder Inventaris
     */
    public function folder()
    {
        return $this->belongsTo(FolderInventaris::class, 'id_folder');
    }

    /**
     * Relasi dengan Sumber Dana
     */
    public function sumberDana()
    {
        return $this->belongsTo(\App\Models\SumberDana::class, 'id_sumber_dana');
    }

    /**
     * Accessor untuk menghitung jumlah otomatis
     * Jumlah = Volume × Tarif Harga
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // Hitung jumlah otomatis
            $model->jumlah = $model->volume * $model->tarif_harga;
        });
    }
}
