<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Wakapro extends Model
{
    use HasFactory;

    protected $table = 'wakapros';

    protected $fillable = [
        'user_id',
        'nama_lengkap',
        'nip',
        'program_keahlian',
        'ruangan_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function ruangan()
    {
        return $this->belongsTo(Ruangan::class, 'ruangan_id');
    }
}
