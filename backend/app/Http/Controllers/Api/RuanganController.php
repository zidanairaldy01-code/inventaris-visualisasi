<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ruangan;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;

class RuanganController extends Controller
{
    public function index(Request $request)
    {
        $query = Ruangan::with(['gedung'])
            ->withCount('asets')
            ->withSum('asets as total_harga_aset', \DB::raw('jumlah * COALESCE(harga_perolehan, 0)'));

        if ($request->filled('jenis')) {
            $query->where('jenis', $request->query('jenis'));
        }

        if ($request->filled('id_gedung')) {
            $query->where('id_gedung', $request->query('id_gedung'));
        }

        $query->orderBy('nama_ruangan', 'asc');

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_gedung' => 'nullable|exists:gedungs,id',
            'nama_ruangan' => 'required|string|max:255',
            'jenis' => 'nullable|in:gedung,workshop',
            'kode_ruangan' => 'nullable|string|max:50',
            'lantai' => 'nullable|string|max:50',
            'luas_ruangan' => 'nullable|string|max:50',
            'deskripsi' => 'nullable|string',
            'foto_ruangan' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if (empty($validated['jenis'])) {
            $validated['jenis'] = !empty($validated['id_gedung']) ? 'gedung' : 'workshop';
        }

        if ($request->hasFile('foto_ruangan')) {
            $validated['foto_ruangan'] = $this->uploadFotoRuangan($request->file('foto_ruangan'));
        }

        $ruangan = Ruangan::create($validated);
        return response()->json($ruangan, 201);
    }

    public function show(string $id)
    {
        $ruangan = Ruangan::with(['gedung', 'asets'])
            ->withCount('asets')
            ->withSum('asets as total_harga_aset', \DB::raw('jumlah * COALESCE(harga_perolehan, 0)'))
            ->findOrFail($id);
        return response()->json($ruangan);
    }

    public function update(Request $request, string $id)
    {
        $ruangan = Ruangan::findOrFail($id);
        
        $validated = $request->validate([
            'id_gedung' => 'nullable|exists:gedungs,id',
            'nama_ruangan' => 'required|string|max:255',
            'jenis' => 'nullable|in:gedung,workshop',
            'kode_ruangan' => 'nullable|string|max:50',
            'lantai' => 'nullable|string|max:50',
            'luas_ruangan' => 'nullable|string|max:50',
            'deskripsi' => 'nullable|string',
            'foto_ruangan' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('foto_ruangan')) {
            // Hapus foto lama jika ada
            if ($ruangan->foto_ruangan) {
                $this->deleteFotoRuangan($ruangan->foto_ruangan);
            }
            $validated['foto_ruangan'] = $this->uploadFotoRuangan($request->file('foto_ruangan'));
        }

        $ruangan->update($validated);
        return response()->json($ruangan);
    }

    public function destroy(string $id)
    {
        $ruangan = Ruangan::findOrFail($id);
        if ($ruangan->foto_ruangan) {
            $this->deleteFotoRuangan($ruangan->foto_ruangan);
        }
        $ruangan->delete();
        return response()->json(['message' => 'Ruangan berhasil dihapus']);
    }

    /**
     * Upload foto ruangan ke Supabase Storage (fallback ke local).
     */
    private function uploadFotoRuangan($file): string
    {
        $hasSupabase = !empty(config('services.supabase.url'))
            && !empty(config('services.supabase.service_key'));

        if ($hasSupabase) {
            try {
                $supabase = app(SupabaseStorageService::class);
                $result   = $supabase->uploadWithHash($file, 'ruangan');
                if (!empty($result['url'])) {
                    return $result['url'];
                }
            } catch (\Throwable $e) {
                \Log::error('Supabase upload gagal untuk foto_ruangan: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString()
                ]);
                if (app()->isProduction() || config('app.env') === 'production') {
                    throw new \Exception('Gagal mengunggah foto ke Supabase Storage: ' . $e->getMessage());
                }
            }
        }

        // Fallback: simpan ke local public storage (hanya untuk development lokal tanpa Supabase)
        $path = $file->store('ruangan', 'public');
        return '/storage/' . $path;
    }

    /**
     * Hapus foto ruangan dari Supabase atau local storage.
     */
    private function deleteFotoRuangan(?string $path): void
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
                \Log::warning('Supabase delete gagal untuk foto_ruangan: ' . $e->getMessage());
            }
            return;
        }

        // Fallback: hapus dari local storage
        $localPath = str_replace('/storage/', '', $path);
        \Storage::disk('public')->delete($localPath);
    }
}
