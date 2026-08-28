<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DaftarBelanja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class DaftarBelanjaController extends Controller
{
    /**
     * Summary statistik daftar belanja untuk dashboard.
     */
    public function summary()
    {
        try {
            $items = DaftarBelanja::all();

            $totalItems   = $items->count();
            $totalJumlah  = $items->sum(fn($i) => (float) ($i->jumlah ?? 0));
            $totalVolume  = $items->sum(fn($i) => (float) ($i->volume ?? 0));

            // Group by folder (null = General)
            $perFolder = DaftarBelanja::with('folder')
                ->get()
                ->groupBy(fn($i) => $i->folder?->nama_folder ?? 'Umum')
                ->map(fn($g) => [
                    'jumlah_item' => $g->count(),
                    'total_nilai' => $g->sum(fn($i) => (float) ($i->jumlah ?? 0)),
                ]);

            return response()->json([
                'status'       => 'success',
                'total_items'  => $totalItems,
                'total_jumlah' => $totalJumlah,
                'total_volume' => $totalVolume,
                'per_folder'   => $perFolder,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil summary daftar belanja',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = DaftarBelanja::with(['user', 'folder']);

            // Filter by folder if specified
            if ($request->has('id_folder')) {
                if ($request->id_folder === 'general') {
                    $query->whereNull('id_folder');
                } else {
                    $query->where('id_folder', $request->id_folder);
                }
            }

            $items = $query->orderBy('no_urut', 'asc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $items
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil data daftar belanja',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'no_urut' => 'nullable|integer',
            'kode_rekening' => 'nullable|string|max:255',
            'kode_program' => 'nullable|string|max:255',
            'uraian' => 'required|string',
            'volume' => 'required|numeric|min:0',
            'satuan' => 'required|string|max:100',
            'tarif_harga' => 'required|numeric|min:0',
            'keterangan' => 'nullable|string',
            'id_folder' => 'nullable|integer|exists:folder_inventaris,id',
        ], [
            'uraian.required' => 'Uraian wajib diisi',
            'volume.required' => 'Volume wajib diisi',
            'volume.numeric' => 'Volume harus berupa angka',
            'satuan.required' => 'Satuan wajib diisi',
            'tarif_harga.required' => 'Tarif harga wajib diisi',
            'tarif_harga.numeric' => 'Tarif harga harus berupa angka',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $validator->validated();
            $data['id_user'] = Auth::id();
            
            // Hitung jumlah otomatis
            $data['jumlah'] = $data['volume'] * $data['tarif_harga'];

            $item = DaftarBelanja::create($data);

            return response()->json([
                'status' => 'success',
                'message' => 'Data daftar belanja berhasil ditambahkan',
                'data' => $item->load(['user', 'folder'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menambahkan data daftar belanja',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $item = DaftarBelanja::with(['user', 'folder'])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $item
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data daftar belanja tidak ditemukan',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $validator = Validator::make($request->all(), [
            'no_urut' => 'nullable|integer',
            'kode_rekening' => 'nullable|string|max:255',
            'kode_program' => 'nullable|string|max:255',
            'uraian' => 'required|string',
            'volume' => 'required|numeric|min:0',
            'satuan' => 'required|string|max:100',
            'tarif_harga' => 'required|numeric|min:0',
            'keterangan' => 'nullable|string',
            'id_folder' => 'nullable|integer|exists:folder_inventaris,id',
        ], [
            'uraian.required' => 'Uraian wajib diisi',
            'volume.required' => 'Volume wajib diisi',
            'volume.numeric' => 'Volume harus berupa angka',
            'satuan.required' => 'Satuan wajib diisi',
            'tarif_harga.required' => 'Tarif harga wajib diisi',
            'tarif_harga.numeric' => 'Tarif harga harus berupa angka',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $item = DaftarBelanja::findOrFail($id);
            $data = $validator->validated();
            
            // Hitung jumlah otomatis
            $data['jumlah'] = $data['volume'] * $data['tarif_harga'];

            $item->update($data);

            return response()->json([
                'status' => 'success',
                'message' => 'Data daftar belanja berhasil diperbarui',
                'data' => $item->load(['user', 'folder'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui data daftar belanja',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $item = DaftarBelanja::findOrFail($id);
            $item->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Data daftar belanja berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus data daftar belanja',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Batch store multiple items at once
     */
    public function batchStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array',
            'items.*.no_urut' => 'nullable|integer',
            'items.*.kode_rekening' => 'nullable|string|max:255',
            'items.*.kode_program' => 'nullable|string|max:255',
            'items.*.uraian' => 'required|string',
            'items.*.volume' => 'required|numeric|min:0',
            'items.*.satuan' => 'required|string|max:100',
            'items.*.tarif_harga' => 'required|numeric|min:0',
            'items.*.keterangan' => 'nullable|string',
            'items.*.id_folder' => 'nullable|integer|exists:folder_inventaris,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $items = $request->items;
            $userId = Auth::id();
            $created = [];

            foreach ($items as $itemData) {
                $itemData['id_user'] = $userId;
                $itemData['jumlah'] = $itemData['volume'] * $itemData['tarif_harga'];
                $created[] = DaftarBelanja::create($itemData);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Berhasil import ' . count($created) . ' data daftar belanja',
                'count' => count($created),
                'data' => $created
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal import data batch',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Batch delete multiple items
     */
    public function batchDelete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array',
            'ids.*' => 'required|integer|exists:daftar_belanjas,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $deleted = DaftarBelanja::whereIn('id', $request->ids)->delete();

            return response()->json([
                'status' => 'success',
                'message' => "Berhasil menghapus {$deleted} data daftar belanja",
                'count' => $deleted
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus data batch',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
