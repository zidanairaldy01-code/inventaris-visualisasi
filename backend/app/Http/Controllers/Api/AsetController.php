<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aset;
use App\Models\History;
use App\Models\Ruangan;
use App\Models\Kondisi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsetController extends Controller
{
    public function index()
    {
        return response()->json(Aset::with(['kategori', 'ruangan', 'sumberDana', 'kondisi', 'user', 'fotos'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_kategori' => 'required|exists:kategoris,id',
            'id_ruangan' => 'required|exists:ruangans,id',
            'id_sumber_dana' => 'nullable|exists:sumber_danas,id',
            'id_kondisi' => 'required|exists:kondisis,id',
            'kode_aset' => 'nullable|string|max:100',
            'nama_aset' => 'required|string|max:255',
            'merek' => 'nullable|string|max:255',
            'tipe' => 'nullable|string|max:255',
            'warna' => 'nullable|string|max:100',
            'jumlah' => 'required|integer',
            'satuan' => 'required|string|max:50',
            'tahun_perolehan' => 'nullable|integer',
            'harga_perolehan' => 'nullable|numeric',
            'nomor_seri' => 'nullable|string|max:100',
            'tanggal_perolehan' => 'nullable|date',
            'deskripsi' => 'nullable|string',
            'status_aset' => 'required|string|in:aktif,dipinjam,rusak,dihapus'
        ]);

        $validated['id_user'] = $request->user()->id;

        DB::beginTransaction();
        try {
            $aset = Aset::create($validated);

            $ruangan = Ruangan::find($aset->id_ruangan);
            History::create([
                'id_aset' => $aset->id,
                'id_user' => $request->user()->id,
                'aksi' => 'PENAMBAHAN',
                'keterangan' => 'Aset baru ditambahkan ke Ruangan ' . ($ruangan ? $ruangan->nama_ruangan : '-'),
                'tanggal' => now()
            ]);

            DB::commit();
            return response()->json($aset->load(['kategori', 'ruangan', 'kondisi']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menyimpan aset', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(string $id)
    {
        $aset = Aset::with(['kategori', 'ruangan', 'sumberDana', 'kondisi', 'user', 'fotos', 'histories' => function($query) { $query->orderBy('tanggal', 'desc'); }])->findOrFail($id);
        return response()->json($aset);
    }

    public function update(Request $request, string $id)
    {
        $aset = Aset::findOrFail($id);
        
        $validated = $request->validate([
            'id_kategori' => 'required|exists:kategoris,id',
            'id_ruangan' => 'required|exists:ruangans,id',
            'id_sumber_dana' => 'nullable|exists:sumber_danas,id',
            'id_kondisi' => 'required|exists:kondisis,id',
            'kode_aset' => 'nullable|string|max:100',
            'nama_aset' => 'required|string|max:255',
            'merek' => 'nullable|string|max:255',
            'tipe' => 'nullable|string|max:255',
            'warna' => 'nullable|string|max:100',
            'jumlah' => 'required|integer',
            'satuan' => 'required|string|max:50',
            'tahun_perolehan' => 'nullable|integer',
            'harga_perolehan' => 'nullable|numeric',
            'nomor_seri' => 'nullable|string|max:100',
            'tanggal_perolehan' => 'nullable|date',
            'deskripsi' => 'nullable|string',
            'status_aset' => 'required|string|in:aktif,dipinjam,rusak,dihapus'
        ]);

        DB::beginTransaction();
        try {
            // Cek perubahan ruangan
            if ($aset->id_ruangan != $validated['id_ruangan']) {
                $ruanganLama = Ruangan::find($aset->id_ruangan);
                $ruanganBaru = Ruangan::find($validated['id_ruangan']);
                
                History::create([
                    'id_aset' => $aset->id,
                    'id_user' => $request->user()->id,
                    'aksi' => 'MUTASI',
                    'keterangan' => 'Aset dipindahkan dari Ruangan ' . ($ruanganLama ? $ruanganLama->nama_ruangan : '-') . ' ke Ruangan ' . ($ruanganBaru ? $ruanganBaru->nama_ruangan : '-'),
                    'tanggal' => now()
                ]);
            }

            // Cek perubahan kondisi
            if ($aset->id_kondisi != $validated['id_kondisi']) {
                $kondisiLama = Kondisi::find($aset->id_kondisi);
                $kondisiBaru = Kondisi::find($validated['id_kondisi']);
                
                History::create([
                    'id_aset' => $aset->id,
                    'id_user' => $request->user()->id,
                    'aksi' => 'UBAH KONDISI',
                    'keterangan' => 'Kondisi diubah dari ' . ($kondisiLama ? $kondisiLama->nama_kondisi : '-') . ' menjadi ' . ($kondisiBaru ? $kondisiBaru->nama_kondisi : '-'),
                    'tanggal' => now()
                ]);
            }

            $aset->update($validated);
            DB::commit();
            return response()->json($aset->fresh()->load(['kategori', 'ruangan', 'kondisi']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal mengupdate aset', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, string $id)
    {
        $aset = Aset::findOrFail($id);
        
        History::create([
            'id_aset' => $aset->id,
            'id_user' => $request->user()->id,
            'aksi' => 'PENGHAPUSAN',
            'keterangan' => 'Aset dihapus (Soft Delete)',
            'tanggal' => now()
        ]);
        
        $aset->delete();
        return response()->json(['message' => 'Aset berhasil dihapus']);
    }
}
