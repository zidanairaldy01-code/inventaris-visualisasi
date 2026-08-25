<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use Illuminate\Http\Request;

class KelasController extends Controller
{
    /**
     * Get all kelas (optional filter)
     */
    public function index(Request $request)
    {
        $query = Kelas::with('jurusan');

        if ($request->has('id_jurusan')) {
            $query->where('id_jurusan', $request->id_jurusan);
        }

        if ($request->has('tingkat')) {
            $query->where('tingkat', $request->tingkat);
        }

        $kelas = $query->orderBy('tingkat')
            ->orderBy('nama_kelas')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $kelas
        ]);
    }

    /**
     * Get detail kelas by ID
     */
    public function show($id)
    {
        $kelas = Kelas::with(['jurusan', 'ruangans'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $kelas
        ]);
    }

    /**
     * Get kelas by jurusan ID
     */
    public function getByJurusan($id_jurusan)
    {
        $kelas = Kelas::where('id_jurusan', $id_jurusan)
            ->with('jurusan')
            ->orderBy('tingkat')
            ->orderBy('nama_kelas')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $kelas
        ]);
    }

    /**
     * Get kelas by jurusan ID and tingkat
     */
    public function getByTingkat($id_jurusan, $tingkat)
    {
        $kelas = Kelas::where('id_jurusan', $id_jurusan)
            ->where('tingkat', $tingkat)
            ->with('jurusan')
            ->orderBy('nama_kelas')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $kelas
        ]);
    }

    /**
     * Store new kelas (untuk admin tambah kelas baru)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_jurusan' => 'required|exists:jurusans,id',
            'tingkat' => 'required|in:X,XI,XII',
            'nama_kelas' => 'required|string|max:50',
            'tahun_ajaran' => 'nullable|string|max:20',
            'wali_kelas' => 'nullable|string|max:100',
            'jumlah_siswa' => 'nullable|integer|min:0',
        ]);

        $kelas = Kelas::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Kelas berhasil ditambahkan',
            'data' => $kelas->load('jurusan')
        ], 201);
    }

    /**
     * Update kelas
     */
    public function update(Request $request, $id)
    {
        $kelas = Kelas::findOrFail($id);

        $validated = $request->validate([
            'id_jurusan' => 'sometimes|exists:jurusans,id',
            'tingkat' => 'sometimes|in:X,XI,XII',
            'nama_kelas' => 'sometimes|string|max:50',
            'tahun_ajaran' => 'nullable|string|max:20',
            'wali_kelas' => 'nullable|string|max:100',
            'jumlah_siswa' => 'nullable|integer|min:0',
        ]);

        $kelas->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Kelas berhasil diupdate',
            'data' => $kelas->load('jurusan')
        ]);
    }

    /**
     * Delete kelas
     */
    public function destroy($id)
    {
        $kelas = Kelas::findOrFail($id);
        
        // Check if ada ruangan yang terhubung
        if ($kelas->ruangans()->count() > 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat menghapus kelas yang masih memiliki ruangan terhubung'
            ], 400);
        }

        $kelas->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Kelas berhasil dihapus'
        ]);
    }
}
