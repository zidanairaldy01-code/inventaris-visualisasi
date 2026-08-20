<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Servis;
use Illuminate\Http\Request;

class ServisController extends Controller
{
    public function index()
    {
        $servises = Servis::with(['aset.ruangan', 'aset.kategori'])
            ->orderBy('tanggal_servis', 'desc')
            ->get();
            
        return response()->json($servises);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_aset'             => 'required|exists:asets,id',
            'jenis_perbaikan'     => 'required|string|max:255',
            'tanggal_servis'     => 'required|date',
            'biaya_servis'       => 'required|numeric|min:0',
            'teknisi_bengkel'    => 'nullable|string|max:255',
            'deskripsi_kerusakan'=> 'nullable|string',
            'status'             => 'required|in:Selesai,Proses,Batal',
        ]);

        $servis = Servis::create($validated);
        $servis->load(['aset.ruangan', 'aset.kategori']);

        return response()->json($servis, 201);
    }

    public function show($id)
    {
        $servis = Servis::with(['aset.ruangan', 'aset.kategori'])->findOrFail($id);
        return response()->json($servis);
    }

    public function update(Request $request, $id)
    {
        $servis = Servis::findOrFail($id);

        $validated = $request->validate([
            'id_aset'             => 'sometimes|required|exists:asets,id',
            'jenis_perbaikan'     => 'sometimes|required|string|max:255',
            'tanggal_servis'     => 'sometimes|required|date',
            'biaya_servis'       => 'sometimes|required|numeric|min:0',
            'teknisi_bengkel'    => 'nullable|string|max:255',
            'deskripsi_kerusakan'=> 'nullable|string',
            'status'             => 'sometimes|required|in:Selesai,Proses,Batal',
        ]);

        $servis->update($validated);
        $servis->load(['aset.ruangan', 'aset.kategori']);

        return response()->json($servis);
    }

    public function destroy($id)
    {
        $servis = Servis::findOrFail($id);
        $servis->delete();

        return response()->json(['message' => 'Data servis berhasil dihapus']);
    }
}
