<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workshop;
use App\Models\Ruangan;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class WorkshopController extends Controller
{
    /**
     * Display a listing of the resource (Public - hanya yang active).
     * Terintegrasi langsung dengan Ruangan Workshop yang dibuat Admin di dashboard.
     */
    public function index()
    {
        // 1. Ambil data Ruangan Workshop yang dibuat Admin (dari tabel ruangans)
        $ruangans = Ruangan::where('jenis', 'workshop')
            ->with(['gedung', 'asets'])
            ->withCount('asets')
            ->orderBy('id', 'desc')
            ->get();

        $ruanganWorkshops = $ruangans->map(function ($r) {
            $nameLower = strtolower($r->nama_ruangan);
            $kategori = 'Workshop';
            $icon = 'wrench';

            if (str_contains($nameLower, 'komputer') || str_contains($nameLower, 'tkj') || str_contains($nameLower, 'rpl') || str_contains($nameLower, 'lab')) {
                $kategori = 'Teknologi';
                $icon = 'laptop';
            } elseif (str_contains($nameLower, 'listrik') || str_contains($nameLower, 'elektro') || str_contains($nameLower, 'titl')) {
                $kategori = 'Listrik';
                $icon = 'zap';
            } elseif (str_contains($nameLower, 'mesin') || str_contains($nameLower, 'tmi') || str_contains($nameLower, 'tpm') || str_contains($nameLower, 'bubut') || str_contains($nameLower, 'frais')) {
                $kategori = 'Manufaktur';
                $icon = 'cog';
            } elseif (str_contains($nameLower, 'otomotif') || str_contains($nameLower, 'tkr') || str_contains($nameLower, 'tsm') || str_contains($nameLower, 'tbsm') || str_contains($nameLower, 'mobil') || str_contains($nameLower, 'motor')) {
                $kategori = 'Otomotif';
                $icon = 'wrench';
            }

            // Ambil daftar aset nyata di ruangan ini sebagai fasilitas
            $fasilitas = $r->asets->pluck('nama_aset')->take(5)->filter()->values()->toArray();
            if (empty($fasilitas)) {
                $fasilitas = array_values(array_filter([
                    $r->luas_ruangan ? "Luas {$r->luas_ruangan} m²" : null,
                    $r->lantai ? "Lantai {$r->lantai}" : null,
                    $r->gedung ? $r->gedung->nama_gedung : null,
                    $r->asets_count > 0 ? "{$r->asets_count} Unit Aset" : 'Peralatan Praktik Kejuruan',
                ]));
            }

            // Resolusi URL foto ruangan
            $fotoUrl = null;
            if ($r->foto_ruangan) {
                if (str_starts_with($r->foto_ruangan, 'http')) {
                    $fotoUrl = $r->foto_ruangan;
                } else {
                    $fotoUrl = url('storage/' . ltrim(str_replace('/storage/', '', $r->foto_ruangan), '/'));
                }
            }

            return [
                'id' => $r->id,
                'nama_workshop' => $r->nama_ruangan,
                'deskripsi' => $r->deskripsi ?: "Fasilitas {$r->nama_ruangan} dilengkapi sarana prasarana modern untuk mendukung kompetensi dan pembelajaran praktik siswa.",
                'kategori' => $kategori,
                'icon' => $icon,
                'foto_url' => $fotoUrl,
                'fasilitas' => $fasilitas,
                'asets_count' => $r->asets_count,
                'kode_ruangan' => $r->kode_ruangan,
            ];
        });

        // 2. Ambil juga dari tabel workshops jika ada
        $staticWorkshops = Workshop::where('is_active', true)
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

        // Gabungkan keduanya, prioritaskan Ruangan Workshop yang dibuat Admin
        $allWorkshops = $ruanganWorkshops->concat($staticWorkshops)->values();

        return response()->json([
            'status' => 'success',
            'data' => $allWorkshops
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
                \Log::error('Supabase upload gagal untuk foto_workshop: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString()
                ]);
                if (app()->isProduction() || config('app.env') === 'production') {
                    throw new \Exception('Gagal mengunggah foto ke Supabase Storage: ' . $e->getMessage());
                }
            }
        }

        // Fallback: simpan ke local public storage (hanya untuk development lokal tanpa Supabase)
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
