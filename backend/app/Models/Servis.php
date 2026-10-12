<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Servis extends Model
{
    protected $table = 'servises';

    protected $fillable = [
        'id_aset',
        'sarana_prasarana_id',
        'pelapor_user_id',
        'ruangan_id',
        'jenis_perbaikan',
        'tanggal_servis',
        'biaya_servis',
        'teknisi_bengkel',
        'deskripsi_kerusakan',
        'foto_kerusakan',
        'status',
        'approved_by_wakasek_id',
        'tanggal_acc_wakasek',
        'verified_by_admin_id',
        'tanggal_selesai_admin',
        'catatan_wakasek',
        'catatan_admin',
    ];

    protected $casts = [
        'tanggal_acc_wakasek'   => 'datetime',
        'tanggal_selesai_admin' => 'datetime',
        'biaya_servis'          => 'float',
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

    public function pelapor()
    {
        return $this->belongsTo(User::class, 'pelapor_user_id');
    }

    public function ruangan()
    {
        return $this->belongsTo(Ruangan::class, 'ruangan_id');
    }

    public function approvedByWakasek()
    {
        return $this->belongsTo(User::class, 'approved_by_wakasek_id');
    }

    public function verifiedByAdmin()
    {
        return $this->belongsTo(User::class, 'verified_by_admin_id');
    }
}
