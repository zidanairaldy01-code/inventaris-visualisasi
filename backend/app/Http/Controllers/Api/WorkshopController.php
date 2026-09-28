<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workshop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class WorkshopController extends Controller
{
    /**
     * Display a listing of the resource (Public - hanya yang active).
     */
    public function index()
    {
        $workshops = Workshop::where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($workshop) {
                return [
                    'id' => $workshop->id,
                    'nama_workshop' => $workshop->nama_workshop,
                    'deskripsi' => $workshop->deskripsi,
                    'kategori' => $workshop->kategori,
                    'icon' => $workshop->icon,
                    'foto_url' => $workshop->foto_url,
                    'fasilitas' => $workshop->fasilitas ?? [],
                ];
            });

        return response()->json($workshops);
    }

    /**
     * Display a listing for admin (semua workshop).
     */
    public function indexAdmin()
    {
        $workshops = Workshop::orderBy('created_at', 'desc')
            ->get()
            ->map(function ($workshop) {
                return [
                    'id' => $workshop->id,
                    'nama_workshop' => $workshop->nama_workshop,
                    'deskripsi' => $workshop->deskripsi,
                    'kategori' => $workshop->kategori,
                    'icon' => $workshop->icon,
                    'foto_url' => $workshop->foto_url,
                    'fasilitas' => $workshop->fasilitas ?? [],
                    'is_active' => $workshop->is_active,
                    'created_at' => $workshop->created_at,
                    'updated_at' => $workshop->updated_at,
                ];
            });

        return response()->json($workshops);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama_workshop' => 'required|string|max:255',
            'deskripsi' => 'required|string',
            'kategori' => 'required|string|max:100',
            'icon' => 'required|string|in:wrench,laptop,zap,cog',
            'foto_workshop' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'fasilitas' => 'nullable|array',
            'fasilitas.*' => 'string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        // Upload foto jika ada
        if ($request->hasFile('foto_workshop')) {
            $file = $request->file('foto_workshop');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('workshops', $filename, 'public');
            $data['foto_workshop'] = $path;
        }

        $workshop = Workshop::create($data);

        return response()->json([
            'message' => 'Workshop berhasil ditambahkan',
            'data' => $workshop
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $workshop = Workshop::find($id);

        if (!$workshop) {
            return response()->json([
                'message' => 'Workshop tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'id' => $workshop->id,
            'nama_workshop' => $workshop->nama_workshop,
            'deskripsi' => $workshop->deskripsi,
            'kategori' => $workshop->kategori,
            'icon' => $workshop->icon,
            'foto_url' => $workshop->foto_url,
            'fasilitas' => $workshop->fasilitas ?? [],
            'is_active' => $workshop->is_active,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $workshop = Workshop::find($id);

        if (!$workshop) {
            return response()->json([
                'message' => 'Workshop tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama_workshop' => 'sometimes|required|string|max:255',
            'deskripsi' => 'sometimes|required|string',
            'kategori' => 'sometimes|required|string|max:100',
            'icon' => 'sometimes|required|string|in:wrench,laptop,zap,cog',
            'foto_workshop' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'fasilitas' => 'nullable|array',
            'fasilitas.*' => 'string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        // Upload foto baru jika ada
        if ($request->hasFile('foto_workshop')) {
            // Hapus foto lama
            if ($workshop->foto_workshop) {
                Storage::disk('public')->delete($workshop->foto_workshop);
            }

            $file = $request->file('foto_workshop');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('workshops', $filename, 'public');
            $data['foto_workshop'] = $path;
        }

        $workshop->update($data);

        return response()->json([
            'message' => 'Workshop berhasil diupdate',
            'data' => $workshop
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $workshop = Workshop::find($id);

        if (!$workshop) {
            return response()->json([
                'message' => 'Workshop tidak ditemukan'
            ], 404);
        }

        // Hapus foto jika ada
        if ($workshop->foto_workshop) {
            Storage::disk('public')->delete($workshop->foto_workshop);
        }

        $workshop->delete();

        return response()->json([
            'message' => 'Workshop berhasil dihapus'
        ]);
    }
}
