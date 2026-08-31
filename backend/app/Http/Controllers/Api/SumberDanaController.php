<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SumberDana;
use App\Models\FolderInventaris;
use App\Models\DaftarBelanja;
use Illuminate\Http\Request;

class SumberDanaController extends Controller
{
    public function index()
    {
        $data = SumberDana::withCount(['asets', 'daftarBelanjas', 'folderInventaris'])
            ->withSum('daftarBelanjas as total_belanja', 'jumlah')
            ->withSum('daftarBelanjas as total_unit', 'volume')
            ->with(['folderInventaris' => function ($q) {
                $q->withCount('daftarBelanjas as items_count');
            }])
            ->get();
        return response()->json($data);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_sumber'  => 'required|string|max:255|unique:sumber_danas,nama_sumber',
            'jenis_sumber' => 'nullable|string|max:100',
            'keterangan'   => 'nullable|string',
            'folder_ids'   => 'nullable|array',
            'folder_ids.*' => 'integer|exists:folder_inventaris,id',
        ], [
            'nama_sumber.unique' => 'Nama sumber dana sudah ada',
        ]);

        $sumberDana = SumberDana::create([
            'nama_sumber'  => $validated['nama_sumber'],
            'jenis_sumber' => $validated['jenis_sumber'] ?? null,
            'keterangan'   => $validated['keterangan'] ?? null,
        ]);

        if (!empty($validated['folder_ids'])) {
            FolderInventaris::whereIn('id', $validated['folder_ids'])
                ->update(['id_sumber_dana' => $sumberDana->id]);

            DaftarBelanja::whereIn('id_folder', $validated['folder_ids'])
                ->update(['id_sumber_dana' => $sumberDana->id]);
        }

        $sumberDana->loadCount(['asets', 'daftarBelanjas', 'folderInventaris'])
            ->loadSum('daftarBelanjas as total_belanja', 'jumlah')
            ->loadSum('daftarBelanjas as total_unit', 'volume')
            ->load('folderInventaris');

        return response()->json([
            'status'  => 'success',
            'message' => 'Sumber dana berhasil ditambahkan',
            'data'    => $sumberDana,
        ], 201);
    }

    public function show(string $id)
    {
        $sumberDana = SumberDana::withCount(['asets', 'daftarBelanjas', 'folderInventaris'])
            ->withSum('daftarBelanjas as total_belanja', 'jumlah')
            ->withSum('daftarBelanjas as total_unit', 'volume')
            ->with(['folderInventaris' => function ($q) {
                $q->withCount('daftarBelanjas as items_count');
            }])
            ->findOrFail($id);
        return response()->json($sumberDana);
    }

    public function update(Request $request, string $id)
    {
        $sumberDana = SumberDana::findOrFail($id);

        $validated = $request->validate([
            'nama_sumber'  => 'required|string|max:255|unique:sumber_danas,nama_sumber,' . $id,
            'jenis_sumber' => 'nullable|string|max:100',
            'keterangan'   => 'nullable|string',
            'folder_ids'   => 'nullable|array',
            'folder_ids.*' => 'integer|exists:folder_inventaris,id',
        ], [
            'nama_sumber.unique' => 'Nama sumber dana sudah ada',
        ]);

        $sumberDana->update([
            'nama_sumber'  => $validated['nama_sumber'],
            'jenis_sumber' => $validated['jenis_sumber'] ?? null,
            'keterangan'   => $validated['keterangan'] ?? null,
        ]);

        if (array_key_exists('folder_ids', $validated)) {
            $folderIds = $validated['folder_ids'] ?? [];

            // Reset id_sumber_dana for folders that were unchecked
            FolderInventaris::where('id_sumber_dana', $sumberDana->id)
                ->whereNotIn('id', $folderIds)
                ->update(['id_sumber_dana' => null]);

            if (!empty($folderIds)) {
                FolderInventaris::whereIn('id', $folderIds)
                    ->update(['id_sumber_dana' => $sumberDana->id]);

                DaftarBelanja::whereIn('id_folder', $folderIds)
                    ->update(['id_sumber_dana' => $sumberDana->id]);
            }
        }

        $sumberDana->loadCount(['asets', 'daftarBelanjas', 'folderInventaris'])
            ->loadSum('daftarBelanjas as total_belanja', 'jumlah')
            ->loadSum('daftarBelanjas as total_unit', 'volume')
            ->load('folderInventaris');

        return response()->json([
            'status'  => 'success',
            'message' => 'Sumber dana berhasil diperbarui',
            'data'    => $sumberDana,
        ]);
    }

    public function destroy(string $id)
    {
        $sumberDana = SumberDana::withCount(['asets', 'daftarBelanjas', 'folderInventaris'])->findOrFail($id);

        // Cek apakah masih ada relasi
        if ($sumberDana->asets_count > 0 || $sumberDana->daftar_belanjas_count > 0) {
            return response()->json([
                'status'  => 'error',
                'message' => "Tidak dapat dihapus. Sumber dana ini masih digunakan oleh {$sumberDana->asets_count} aset dan {$sumberDana->daftar_belanjas_count} daftar belanja.",
            ], 422);
        }

        $sumberDana->delete();
        return response()->json([
            'status'  => 'success',
            'message' => 'Sumber Dana berhasil dihapus',
        ]);
    }
}
