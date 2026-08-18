<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SumberDana;
use Illuminate\Http\Request;

class SumberDanaController extends Controller
{
    public function index()
    {
        return response()->json(SumberDana::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_sumber' => 'required|string|max:255',
            'jenis_sumber' => 'nullable|string|max:100',
            'keterangan' => 'nullable|string'
        ]);

        $sumberDana = SumberDana::create($validated);
        return response()->json($sumberDana, 201);
    }

    public function show(string $id)
    {
        $sumberDana = SumberDana::findOrFail($id);
        return response()->json($sumberDana);
    }

    public function update(Request $request, string $id)
    {
        $sumberDana = SumberDana::findOrFail($id);
        
        $validated = $request->validate([
            'nama_sumber' => 'required|string|max:255',
            'jenis_sumber' => 'nullable|string|max:100',
            'keterangan' => 'nullable|string'
        ]);

        $sumberDana->update($validated);
        return response()->json($sumberDana);
    }

    public function destroy(string $id)
    {
        SumberDana::findOrFail($id)->delete();
        return response()->json(['message' => 'Sumber Dana berhasil dihapus']);
    }
}
