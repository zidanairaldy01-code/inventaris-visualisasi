<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Wakasek extends Model
{
    use HasFactory;

    protected $table = 'wakaseks';

    protected $fillable = [
        'user_id',
        'nama_lengkap',
        'nip',
        'bidang',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
