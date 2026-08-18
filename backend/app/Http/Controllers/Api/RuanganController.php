<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ruangan;
use Illuminate\Http\Request;

class RuanganController extends Controller
{
    public function index()
    {
        return response()->json(Ruangan::with('gedung')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_gedung' => 'required|exists:gedungs,id',
            'nama_ruangan' => 'required|string|max:255',
            'kode_ruangan' => 'nullable|string|max:50',
            'lantai' => 'nullable|string|max:50',
            'luas_ruangan' => 'nullable|string|max:50',
            'deskripsi' => 'nullable|string'
        ]);

        $ruangan = Ruangan::create($validated);
        return response()->json($ruangan, 201);
    }

    public function show(string $id)
    {
        $ruangan = Ruangan::with('gedung')->findOrFail($id);
        return response()->json($ruangan);
    }

    public function update(Request $request, string $id)
    {
        $ruangan = Ruangan::findOrFail($id);
        
        $validated = $request->validate([
            'id_gedung' => 'required|exists:gedungs,id',
            'nama_ruangan' => 'required|string|max:255',
            'kode_ruangan' => 'nullable|string|max:50',
            'lantai' => 'nullable|string|max:50',
            'luas_ruangan' => 'nullable|string|max:50',
            'deskripsi' => 'nullable|string'
        ]);

        $ruangan->update($validated);
        return response()->json($ruangan);
    }

    public function destroy(string $id)
    {
        Ruangan::findOrFail($id)->delete();
        return response()->json(['message' => 'Ruangan berhasil dihapus']);
    }
}
