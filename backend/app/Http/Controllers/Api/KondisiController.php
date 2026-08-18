<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kondisi;
use Illuminate\Http\Request;

class KondisiController extends Controller
{
    public function index()
    {
        return response()->json(Kondisi::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_kondisi' => 'required|string|max:255',
            'keterangan' => 'nullable|string'
        ]);

        $kondisi = Kondisi::create($validated);
        return response()->json($kondisi, 201);
    }

    public function show(string $id)
    {
        $kondisi = Kondisi::findOrFail($id);
        return response()->json($kondisi);
    }

    public function update(Request $request, string $id)
    {
        $kondisi = Kondisi::findOrFail($id);
        
        $validated = $request->validate([
            'nama_kondisi' => 'required|string|max:255',
            'keterangan' => 'nullable|string'
        ]);

        $kondisi->update($validated);
        return response()->json($kondisi);
    }

    public function destroy(string $id)
    {
        Kondisi::findOrFail($id)->delete();
        return response()->json(['message' => 'Kondisi berhasil dihapus']);
    }
}
