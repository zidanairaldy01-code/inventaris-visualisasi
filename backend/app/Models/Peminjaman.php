<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Peminjaman extends Model
{
    protected $table = 'peminjamans';

    protected $fillable = [
        'id_aset',
        'sarana_prasarana_id',
        'nama_peminjam',
        'role_peminjam',
        'jumlah',
        'tanggal_pinjam',
        'tanggal_kembali_rencana',
        'tanggal_kembali_aktual',
        'keperluan',
        'status',
    ];

    protected $appends = [
        'total_dikembalikan',
        'sisa_pinjam',
    ];

    public function getTotalDikembalikanAttribute(): int
    {
        return (int) ($this->relationLoaded('pengembalians')
            ? $this->pengembalians->sum('jumlah_kembali')
            : $this->pengembalians()->sum('jumlah_kembali'));
    }

    public function getSisaPinjamAttribute(): int
    {
        return max(0, (int) $this->jumlah - $this->total_dikembalikan);
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }

    public function saranaPrasarana()
    {
        return $this->belongsTo(SaranaPrasarana::class, 'sarana_prasarana_id');
    }

    public function pengembalians()
    {
        return $this->hasMany(PengembalianPeminjaman::class, 'peminjaman_id')
            ->with('user:id,nama_lengkap,role')
            ->orderBy('tanggal_kembali', 'desc')
            ->orderBy('id', 'desc');
    }
}
