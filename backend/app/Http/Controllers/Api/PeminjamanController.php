<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Peminjaman;
use Illuminate\Http\Request;

class PeminjamanController extends Controller
{
    public function index()
    {
        $peminjamans = Peminjaman::with(['aset.ruangan', 'aset.kategori'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($peminjamans);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_aset'                 => 'required|exists:asets,id',
            'nama_peminjam'           => 'required|string|max:255',
            'role_peminjam'           => 'required|string|max:100',
            'jumlah'                  => 'required|integer|min:1',
            'tanggal_pinjam'          => 'required|date',
            'tanggal_kembali_rencana' => 'nullable|date',
            'keperluan'               => 'nullable|string',
            'status'                  => 'nullable|in:Dipinjam,Dikembalikan,Terlambat',
        ]);

        $peminjaman = Peminjaman::create($validated);
        $peminjaman->load(['aset.ruangan', 'aset.kategori']);

        return response()->json($peminjaman, 201);
    }

    public function show($id)
    {
        $peminjaman = Peminjaman::with(['aset.ruangan', 'aset.kategori'])->findOrFail($id);
        return response()->json($peminjaman);
    }

    public function update(Request $request, $id)
    {
        $peminjaman = Peminjaman::findOrFail($id);

        $validated = $request->validate([
            'id_aset'                 => 'sometimes|required|exists:asets,id',
            'nama_peminjam'           => 'sometimes|required|string|max:255',
            'role_peminjam'           => 'sometimes|required|string|max:100',
            'jumlah'                  => 'sometimes|required|integer|min:1',
            'tanggal_pinjam'          => 'sometimes|required|date',
            'tanggal_kembali_rencana' => 'nullable|date',
            'tanggal_kembali_aktual'  => 'nullable|date',
            'keperluan'               => 'nullable|string',
            'status'                  => 'sometimes|required|in:Dipinjam,Dikembalikan,Terlambat',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'Dikembalikan' && !$peminjaman->tanggal_kembali_aktual) {
            $validated['tanggal_kembali_aktual'] = now()->toDateString();
        }

        $peminjaman->update($validated);
        $peminjaman->load(['aset.ruangan', 'aset.kategori']);

        return response()->json($peminjaman);
    }

    public function destroy($id)
    {
        $peminjaman = Peminjaman::findOrFail($id);
        $peminjaman->delete();

        return response()->json(['message' => 'Data peminjaman berhasil dihapus']);
    }
}
