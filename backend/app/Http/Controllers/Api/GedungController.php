<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gedung;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;

class GedungController extends Controller
{
    public function index()
    {
        $gedungs = Gedung::with([
            'ruangans' => function ($q) {
                $q->where('jenis', 'gedung');
            },
            'ruangans.asets.kategori',
            'ruangans.asets.kondisi'
        ])->get();
        return response()->json($gedungs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_gedung' => 'required|string|max:255',
            'kode_gedung' => 'nullable|string|max:50',
            'jumlah_lantai' => 'nullable|integer',
            'deskripsi' => 'nullable|string',
            'foto_gedung' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('foto_gedung')) {
            $validated['foto_gedung'] = $this->uploadFotoGedung($request->file('foto_gedung'));
        }

        $gedung = Gedung::create($validated);
        return response()->json($gedung, 201);
    }

    public function show(string $id)
    {
        $gedung = Gedung::findOrFail($id);
        return response()->json($gedung);
    }

    public function update(Request $request, string $id)
    {
        $gedung = Gedung::findOrFail($id);
        
        $validated = $request->validate([
            'nama_gedung' => 'required|string|max:255',
            'kode_gedung' => 'nullable|string|max:50',
            'jumlah_lantai' => 'nullable|integer',
            'deskripsi' => 'nullable|string',
            'foto_gedung' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('foto_gedung')) {
            // Hapus foto lama jika ada
            if ($gedung->foto_gedung) {
                $this->deleteFotoGedung($gedung->foto_gedung);
            }
            $validated['foto_gedung'] = $this->uploadFotoGedung($request->file('foto_gedung'));
        }

        $gedung->update($validated);
        return response()->json($gedung);
    }

    public function destroy(string $id)
    {
        $gedung = Gedung::findOrFail($id);
        if ($gedung->foto_gedung) {
            $this->deleteFotoGedung($gedung->foto_gedung);
        }
        $gedung->delete();
        return response()->json(['message' => 'Gedung berhasil dihapus']);
    }

    /**
     * Upload foto gedung ke Supabase Storage (fallback ke local).
     */
    private function uploadFotoGedung($file): string
    {
        $hasSupabase = !empty(config('services.supabase.url'))
            && !empty(config('services.supabase.service_key'));

        if ($hasSupabase) {
            try {
                $supabase = app(SupabaseStorageService::class);
                $result   = $supabase->uploadWithHash($file, 'gedung');
                if (!empty($result['url'])) {
                    return $result['url'];
                }
            } catch (\Throwable $e) {
                \Log::warning('Supabase upload gagal untuk foto_gedung, fallback ke local: ' . $e->getMessage());
            }
        }

        // Fallback: simpan ke local public storage
        $path = $file->store('gedung', 'public');
        return '/storage/' . $path;
    }

    /**
     * Hapus foto gedung dari Supabase atau local storage.
     */
    private function deleteFotoGedung(?string $path): void
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
                \Log::warning('Supabase delete gagal untuk foto_gedung: ' . $e->getMessage());
            }
            return;
        }

        // Fallback: hapus dari local storage
        $localPath = str_replace('/storage/', '', $path);
        \Storage::disk('public')->delete($localPath);
    }
}
