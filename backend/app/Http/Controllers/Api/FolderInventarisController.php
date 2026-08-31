<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FolderInventaris;
use Illuminate\Http\Request;

class FolderInventarisController extends Controller
{
    /**
     * Display a listing of custom folders with item counts.
     */
    public function index(Request $request)
    {
        $jenis = $request->query('jenis');
        
        $query = FolderInventaris::query();

        // Filter berdasarkan jenis
        if ($jenis) {
            $query->where('jenis', $jenis);
        }

        // Filter berdasarkan id_sumber_dana
        if ($request->has('id_sumber_dana')) {
            if ($request->id_sumber_dana === 'null' || $request->id_sumber_dana === 'general') {
                $query->whereNull('id_sumber_dana');
            } else {
                $query->where('id_sumber_dana', $request->id_sumber_dana);
            }
        }

        // Load count berdasarkan jenis folder
        if ($jenis === 'inventaris') {
            $query->withCount('items');
        } elseif ($jenis === 'inventaris-belanja') {
            $query->withCount('daftarBelanjas as items_count')->with('sumberDana');
        } elseif ($jenis === 'sarana-prasarana') {
            $query->withCount('saranaPrasaranas as items_count');
        } elseif ($jenis === 'inventaris-gudang') {
            $query->withCount('inventarisGudangs as items_count');
        } else {
            $query->withCount('items');
        }

        $folders = $query->orderBy('created_at', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data'   => $folders,
        ]);
    }

    /**
     * Store a newly created folder in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_folder'   => 'required|string|max:255',
            'keterangan'    => 'nullable|string',
            'warna'         => 'nullable|string|max:30',
            'jenis'         => 'required|string|in:inventaris,sarana-prasarana,inventaris-belanja,inventaris-gudang',
            'id_sumber_dana' => 'nullable|integer|exists:sumber_danas,id',
        ]);

        if (empty($validated['warna'])) {
            $colors = ['blue', 'indigo', 'purple', 'emerald', 'amber', 'rose'];
            $validated['warna'] = $colors[array_rand($colors)];
        }

        $folder = FolderInventaris::create($validated);

        // Load count berdasarkan jenis folder
        $jenis = $validated['jenis'];
        if ($jenis === 'inventaris') {
            $folder->loadCount('items');
        } elseif ($jenis === 'inventaris-belanja') {
            $folder->loadCount(['daftarBelanjas as items_count'])->load('sumberDana');
        } elseif ($jenis === 'sarana-prasarana') {
            $folder->loadCount(['saranaPrasaranas as items_count']);
        } elseif ($jenis === 'inventaris-gudang') {
            $folder->loadCount(['inventarisGudangs as items_count']);
        } else {
            $folder->loadCount('items');
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Folder berhasil dibuat',
            'data'    => $folder,
        ], 201);
    }

    /**
     * Display the specified folder.
     */
    public function show(string $id)
    {
        $folder = FolderInventaris::withCount('items')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $folder,
        ]);
    }

    /**
     * Update the specified folder in storage.
     */
    public function update(Request $request, string $id)
    {
        $folder = FolderInventaris::findOrFail($id);

        $validated = $request->validate([
            'nama_folder'   => 'sometimes|required|string|max:255',
            'keterangan'    => 'nullable|string',
            'warna'         => 'nullable|string|max:30',
            'jenis'         => 'sometimes|string|in:inventaris,sarana-prasarana,inventaris-belanja,inventaris-gudang',
            'id_sumber_dana' => 'nullable|integer|exists:sumber_danas,id',
        ]);

        $folder->update($validated);

        // Reload dengan relasi sumber dana
        $jenis = $folder->fresh()->jenis;
        $folder->refresh();
        $folder->load('sumberDana');

        if ($jenis === 'inventaris-belanja') {
            $folder->loadCount(['daftarBelanjas as items_count']);
        } else {
            $folder->loadCount('items');
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Folder berhasil diperbarui',
            'data'    => $folder,
        ]);
    }

    /**
     * Remove the specified folder from storage.
     */
    public function destroy(string $id)
    {
        $folder = FolderInventaris::findOrFail($id);
        $folder->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Folder berhasil dihapus',
        ]);
    }
}
