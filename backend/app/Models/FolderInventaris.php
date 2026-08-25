<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FolderInventaris extends Model
{
    protected $table = 'folder_inventaris';

    protected $fillable = [
        'nama_folder',
        'keterangan',
        'warna',
    ];

    public function items()
    {
        return $this->hasMany(Inventaris::class, 'id_folder');
    }
}
