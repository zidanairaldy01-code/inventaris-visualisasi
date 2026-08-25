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
    public function index()
    {
        $folders = FolderInventaris::withCount('items')
            ->orderBy('created_at', 'asc')
            ->get();

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
            'nama_folder' => 'required|string|max:255',
            'keterangan'  => 'nullable|string',
            'warna'       => 'nullable|string|max:30',
        ]);

        if (empty($validated['warna'])) {
            $colors = ['blue', 'indigo', 'purple', 'emerald', 'amber', 'rose'];
            $validated['warna'] = $colors[array_rand($colors)];
        }

        $folder = FolderInventaris::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Folder berhasil dibuat',
            'data'    => $folder->loadCount('items'),
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
            'nama_folder' => 'sometimes|required|string|max:255',
            'keterangan'  => 'nullable|string',
            'warna'       => 'nullable|string|max:30',
        ]);

        $folder->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Folder berhasil diperbarui',
            'data'    => $folder->fresh()->loadCount('items'),
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
