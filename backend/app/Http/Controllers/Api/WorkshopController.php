<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workshop;
use App\Services\SupabaseStorageService;
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

        return response()->json([
            'status' => 'success',
            'data' => $workshops
        ]);
    }

    /**
     * Display a listing of all resources (Admin).
     */
    public function adminIndex()
    {
        $workshops = Workshop::orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $workshops
        ]);
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
            $data['foto_workshop'] = $this->uploadFoto($request->file('foto_workshop'));
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
                $this->deleteFoto($workshop->foto_workshop);
            }
            $data['foto_workshop'] = $this->uploadFoto($request->file('foto_workshop'));
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
            $this->deleteFoto($workshop->foto_workshop);
        }

        $workshop->delete();

        return response()->json([
            'message' => 'Workshop berhasil dihapus'
        ]);
    }

    /**
     * Upload foto workshop ke Supabase Storage (fallback ke local).
     */
    private function uploadFoto($file): string
    {
        $hasSupabase = !empty(config('services.supabase.url'))
            && !empty(config('services.supabase.service_key'));

        if ($hasSupabase) {
            try {
                $supabase = app(SupabaseStorageService::class);
                $result   = $supabase->uploadWithHash($file, 'workshops');
                if (!empty($result['url'])) {
                    return $result['url'];
                }
            } catch (\Throwable $e) {
                \Log::warning('Supabase upload gagal untuk foto_workshop, fallback ke local: ' . $e->getMessage());
            }
        }

        // Fallback: simpan ke local public storage
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('workshops', $filename, 'public');
        return '/storage/' . $path;
    }

    /**
     * Hapus foto workshop dari Supabase atau local storage.
     */
    private function deleteFoto(?string $path): void
    {
        if (empty($path)) return;

        if (str_contains($path, 'supabase')) {
            try {
                $supabase = app(SupabaseStorageService::class);
                $urlParts = parse_url($path);
                if (isset($urlParts['path'])) {
                    $segments = explode('/', trim($urlParts['path'], '/'));
                    $filePath = implode('/', array_slice($segments, 5));
                    $supabase->delete($filePath);
                }
            } catch (\Throwable $e) {
                \Log::warning('Supabase delete gagal untuk foto_workshop: ' . $e->getMessage());
            }
            return;
        }

        // Fallback: hapus dari local storage
        $localPath = str_replace('/storage/', '', $path);
        if (Storage::disk('public')->exists($localPath)) {
            Storage::disk('public')->delete($localPath);
        }
    }
}
