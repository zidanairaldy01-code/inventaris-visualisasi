<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Jurusan;
use Illuminate\Http\Request;

class JurusanController extends Controller
{
    /**
     * Get all jurusan (untuk dropdown sidebar)
     */
    public function index()
    {
        $jurusans = Jurusan::with(['kelas' => function ($query) {
            $query->orderBy('tingkat')->orderBy('nama_kelas');
        }])->get();

        return response()->json([
            'status' => 'success',
            'data' => $jurusans
        ]);
    }

    /**
     * Get detail jurusan by ID
     */
    public function show($id)
    {
        $jurusan = Jurusan::with(['kelas' => function ($query) {
            $query->orderBy('tingkat')->orderBy('nama_kelas');
        }])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $jurusan
        ]);
    }

    /**
     * Get jurusan by kode (slug)
     */
    public function getByKode($kode)
    {
        $jurusan = Jurusan::where('kode_jurusan', strtoupper($kode))
            ->with(['kelas' => function ($query) {
                $query->orderBy('tingkat')->orderBy('nama_kelas');
            }])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $jurusan
        ]);
    }
}
