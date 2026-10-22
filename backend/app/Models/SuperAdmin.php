<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuperAdmin extends Model
{
    use HasFactory;

    protected $table = 'super_admins';

    protected $fillable = [
        'user_id',
        'nama_lengkap',
        'no_telepon',
        'hak_akses',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
