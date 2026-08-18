<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class History extends Model
{
    protected $fillable = ['id_aset', 'id_user', 'aksi', 'keterangan', 'tanggal'];

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }
}
