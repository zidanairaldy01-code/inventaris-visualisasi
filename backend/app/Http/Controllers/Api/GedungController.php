<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gedung;
use Illuminate\Http\Request;

class GedungController extends Controller
{
    public function index()
    {
        $gedungs = Gedung::with([
            'ruangans' => function ($q) {
                $q->where('jenis', 'gedung');
            },
            'ruangans.asets.kategori',
            'ruangans.asets.kondisi'
        ])->get();
        return response()->json($gedungs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_gedung' => 'required|string|max:255',
            'kode_gedung' => 'nullable|string|max:50',
            'jumlah_lantai' => 'nullable|integer',
            'deskripsi' => 'nullable|string',
            'foto_gedung' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('foto_gedung')) {
            $path = $request->file('foto_gedung')->store('gedung', 'public');
            $validated['foto_gedung'] = '/storage/' . $path;
        }

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
            'deskripsi' => 'nullable|string',
            'foto_gedung' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('foto_gedung')) {
            // Delete old foto if exists
            if ($gedung->foto_gedung) {
                $oldPath = str_replace('/storage/', '', $gedung->foto_gedung);
                \Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('foto_gedung')->store('gedung', 'public');
            $validated['foto_gedung'] = '/storage/' . $path;
        }

        $gedung->update($validated);
        return response()->json($gedung);
    }

    public function destroy(string $id)
    {
        Gedung::findOrFail($id)->delete();
        return response()->json(['message' => 'Gedung berhasil dihapus']);
    }
}
