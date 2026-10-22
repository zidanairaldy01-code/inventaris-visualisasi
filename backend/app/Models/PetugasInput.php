<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PetugasInput extends Model
{
    use HasFactory;

    protected $table = 'petugas_inputs';

    protected $fillable = [
        'user_id',
        'nama_lengkap',
        'nip',
        'shift_kerja',
        'divisi',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
