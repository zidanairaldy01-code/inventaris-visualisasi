<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notifikasi extends Model
{
    protected $fillable = [
        'target_role',
        'target_user_id',
        'target_ruangan_id',
        'tipe',
        'judul',
        'pesan',
        'data',
        'is_read',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
    ];

    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function targetRuangan()
    {
        return $this->belongsTo(Ruangan::class, 'target_ruangan_id');
    }

    /**
     * Scope query berdasarkan hak akses dan peran pengguna saat ini.
     * Mencegah notifikasi bocor ke role / wakapro lain.
     */
    public function scopeForUser($query, $user)
    {
        if (!$user) {
            return $query->whereRaw('1 = 0');
        }

        // Super Admin & Admin: Melihat notifikasi yang ditujukan untuk admin, global (all), atau eksplisit user ini
        if (in_array($user->role, ['super_admin', 'admin'])) {
            return $query->where(function ($q) use ($user) {
                $q->whereIn('target_role', ['admin', 'all'])
                  ->orWhere('target_user_id', $user->id);
            });
        }

        // Wakapro: HANYA melihat notifikasi terkhususkan untuk wakapro dan HANYA untuk ruangan workshopnya
        if ($user->role === 'wakapro') {
            return $query->where('target_role', 'wakapro')
                ->where(function ($q) use ($user) {
                    if ($user->ruangan_id) {
                        $q->where('target_ruangan_id', $user->ruangan_id)
                          ->orWhere('target_user_id', $user->id);
                    } else {
                        $q->where('target_user_id', $user->id);
                    }
                });
        }

        // Petugas: Hanya notifikasi untuk role petugas atau eksplisit user ini
        if ($user->role === 'petugas') {
            return $query->where(function ($q) use ($user) {
                $q->whereIn('target_role', ['petugas', 'all'])
                  ->orWhere('target_user_id', $user->id);
            });
        }

        // Wakasek: Notifikasi untuk wakasek atau all
        if ($user->role === 'wakasek') {
            return $query->where(function ($q) use ($user) {
                $q->whereIn('target_role', ['wakasek', 'all'])
                  ->orWhere('target_user_id', $user->id);
            });
        }

        return $query->where('target_user_id', $user->id);
    }
}
