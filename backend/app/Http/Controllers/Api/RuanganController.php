<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ruangan;
use Illuminate\Http\Request;

class RuanganController extends Controller
{
    public function index()
    {
        return response()->json(Ruangan::with(['gedung', 'asets'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_gedung' => 'required|exists:gedungs,id',
            'nama_ruangan' => 'required|string|max:255',
            'kode_ruangan' => 'nullable|string|max:50',
            'lantai' => 'nullable|string|max:50',
            'luas_ruangan' => 'nullable|string|max:50',
            'deskripsi' => 'nullable|string',
            'foto_ruangan' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('foto_ruangan')) {
            $path = $request->file('foto_ruangan')->store('ruangan', 'public');
            $validated['foto_ruangan'] = '/storage/' . $path;
        }

        $ruangan = Ruangan::create($validated);
        return response()->json($ruangan, 201);
    }

    public function show(string $id)
    {
        $ruangan = Ruangan::with(['gedung', 'asets'])->findOrFail($id);
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
            'deskripsi' => 'nullable|string',
            'foto_ruangan' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('foto_ruangan')) {
            // Delete old foto if exists
            if ($ruangan->foto_ruangan) {
                $oldPath = str_replace('/storage/', '', $ruangan->foto_ruangan);
                \Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('foto_ruangan')->store('ruangan', 'public');
            $validated['foto_ruangan'] = '/storage/' . $path;
        }

        $ruangan->update($validated);
        return response()->json($ruangan);
    }

    public function destroy(string $id)
    {
        Ruangan::findOrFail($id)->delete();
        return response()->json(['message' => 'Ruangan berhasil dihapus']);
    }
}
