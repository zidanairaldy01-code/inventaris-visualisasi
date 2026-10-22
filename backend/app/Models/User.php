<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'nama_lengkap', 'username', 'email', 'password', 'role', 'status', 'ruangan_id',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        static::saved(function (User $user) {
            $user->syncRoleProfile();
        });
    }

    public function ruangan()
    {
        return $this->belongsTo(Ruangan::class, 'ruangan_id');
    }

    // Relasi 1:1 ke masing-masing tabel peran
    public function superAdmin()
    {
        return $this->hasOne(SuperAdmin::class, 'user_id');
    }

    public function petugasInput()
    {
        return $this->hasOne(PetugasInput::class, 'user_id');
    }

    public function wakapro()
    {
        return $this->hasOne(Wakapro::class, 'user_id');
    }

    public function wakasek()
    {
        return $this->hasOne(Wakasek::class, 'user_id');
    }

    /**
     * Otomatis sinkronisasi data profil ke tabel spesifik perannya
     */
    public function syncRoleProfile(): void
    {
        // Hapus data dari tabel peran lain jika sebelumnya berbeda peran
        if ($this->role !== 'super_admin' && $this->superAdmin()->exists()) {
            $this->superAdmin()->delete();
        }
        if ($this->role !== 'petugas' && $this->petugasInput()->exists()) {
            $this->petugasInput()->delete();
        }
        if ($this->role !== 'wakapro' && $this->wakapro()->exists()) {
            $this->wakapro()->delete();
        }
        if ($this->role !== 'wakasek' && $this->wakasek()->exists()) {
            $this->wakasek()->delete();
        }

        // Buat atau perbarui di tabel peran yang sesuai
        if ($this->role === 'super_admin') {
            $this->superAdmin()->updateOrCreate(
                ['user_id' => $this->id],
                [
                    'nama_lengkap' => $this->nama_lengkap,
                    'hak_akses'    => 'Super Administrator (Full Access)',
                ]
            );
        } elseif ($this->role === 'petugas') {
            $this->petugasInput()->updateOrCreate(
                ['user_id' => $this->id],
                [
                    'nama_lengkap' => $this->nama_lengkap,
                    'shift_kerja'  => 'Pagi',
                    'divisi'       => 'Inventaris & Sarana Prasarana',
                ]
            );
        } elseif ($this->role === 'wakapro') {
            $this->wakapro()->updateOrCreate(
                ['user_id' => $this->id],
                [
                    'nama_lengkap'     => $this->nama_lengkap,
                    'program_keahlian' => 'Teknik Komputer & Jaringan',
                    'ruangan_id'       => $this->ruangan_id,
                ]
            );
        } elseif ($this->role === 'wakasek') {
            $this->wakasek()->updateOrCreate(
                ['user_id' => $this->id],
                [
                    'nama_lengkap' => $this->nama_lengkap,
                    'bidang'       => 'Sarana dan Prasarana',
                ]
            );
        }
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isPetugas(): bool
    {
        return $this->role === 'petugas';
    }

    public function isWakasek(): bool
    {
        return $this->role === 'wakasek';
    }

    public function isWakapro(): bool
    {
        return $this->role === 'wakapro';
    }
}
