<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gedung;
use Illuminate\Http\Request;

class GedungController extends Controller
{
    public function index()
    {
        return response()->json(Gedung::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_gedung' => 'required|string|max:255',
            'kode_gedung' => 'nullable|string|max:50',
            'jumlah_lantai' => 'nullable|integer',
            'deskripsi' => 'nullable|string'
        ]);

        $gedung = Gedung::create($validated);
        return response()->json($gedung, 201);
    }

    public function show(string $id)
    {
        $gedung = Gedung::findOrFail($id);
        return response()->json($gedung);
    }

    public function update(Request $request, string $id)
    {
        $gedung = Gedung::findOrFail($id);
        
        $validated = $request->validate([
            'nama_gedung' => 'required|string|max:255',
            'kode_gedung' => 'nullable|string|max:50',
            'jumlah_lantai' => 'nullable|integer',
            'deskripsi' => 'nullable|string'
        ]);

        $gedung->update($validated);
        return response()->json($gedung);
    }

    public function destroy(string $id)
    {
        Gedung::findOrFail($id)->delete();
        return response()->json(['message' => 'Gedung berhasil dihapus']);
    }
}
