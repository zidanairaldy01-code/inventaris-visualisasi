<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Berita;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BeritaController extends Controller
{
    /**
     * Endpoint publik untuk landing page (hanya menampilkan berita yang aktif / tidak disembunyikan).
     */
    public function publicIndex()
    {
        $beritas = Berita::where('is_active', true)
            ->orderBy('urutan', 'asc')
            ->orderBy('tanggal', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $beritas,
        ]);
    }

    /**
     * Endpoint manajemen berita untuk Super Admin (menampilkan semua berita termasuk yang di-hide).
     */
    public function index(Request $request)
    {
        $query = Berita::with('user');

        // Filter pencarian
        if ($request->filled('search')) {
            $search = strtolower($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('judul', 'like', "%{$search}%")
                  ->orWhere('penulis', 'like', "%{$search}%")
                  ->orWhere('ringkasan', 'like', "%{$search}%")
                  ->orWhere('konten', 'like', "%{$search}%");
            });
        }

        // Filter status (published / hidden)
        if ($request->filled('status')) {
            $status = $request->input('status');
            if ($status === 'published' || $status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'hidden' || $status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $beritas = $query->orderBy('tanggal', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $beritas,
        ]);
    }

    /**
     * Simpan berita baru.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'judul'        => 'required|string|max:255',
            'ringkasan'    => 'nullable|string',
            'konten'       => 'nullable|string',
            'tanggal'      => 'nullable|date',
            'penulis'      => 'nullable|string|max:100',
            'is_active'    => 'nullable',
            'urutan'       => 'nullable|integer',
            'gambar'       => 'nullable', // bisa string URL atau file
            'foto'         => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
        ]);

        $data = [
            'judul'     => $validated['judul'],
            'slug'      => Str::slug($validated['judul']) . '-' . Str::random(5),
            'ringkasan' => $validated['ringkasan'] ?? null,
            'konten'    => $validated['konten'] ?? $validated['ringkasan'] ?? null,
            'tanggal'   => !empty($validated['tanggal']) ? $validated['tanggal'] : now()->toDateString(),
            'penulis'   => !empty($validated['penulis']) ? $validated['penulis'] : ($request->user()?->nama_lengkap ?? 'Super Admin'),
            'is_active' => $request->has('is_active') ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN) : true,
            'urutan'    => $validated['urutan'] ?? 0,
            'id_user'   => $request->user()?->id,
        ];

        // Handle upload foto jika ada
        if ($request->hasFile('foto')) {
            $data['gambar'] = $this->uploadImage($request->file('foto'));
        } elseif ($request->hasFile('gambar')) {
            $data['gambar'] = $this->uploadImage($request->file('gambar'));
        } elseif (!empty($validated['gambar']) && is_string($validated['gambar'])) {
            $data['gambar'] = $validated['gambar'];
        }

        $berita = Berita::create($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Berita berhasil ditambahkan',
            'data'    => $berita->fresh()->load('user'),
        ], 201);
    }

    /**
     * Tampilkan detail berita.
     */
    public function show($id)
    {
        $berita = Berita::with('user')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $berita,
        ]);
    }

    /**
     * Update berita yang ada.
     */
    public function update(Request $request, $id)
    {
        $berita = Berita::findOrFail($id);

        $validated = $request->validate([
            'judul'        => 'required|string|max:255',
            'ringkasan'    => 'nullable|string',
            'konten'       => 'nullable|string',
            'tanggal'      => 'nullable|date',
            'penulis'      => 'nullable|string|max:100',
            'is_active'    => 'nullable',
            'urutan'       => 'nullable|integer',
            'gambar'       => 'nullable',
            'foto'         => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
            'hapus_gambar' => 'nullable',
        ]);

        $berita->judul     = $validated['judul'];
        $berita->ringkasan = $validated['ringkasan'] ?? null;
        $berita->konten    = $validated['konten'] ?? $validated['ringkasan'] ?? null;
        if (!empty($validated['tanggal'])) {
            $berita->tanggal = $validated['tanggal'];
        }
        if (!empty($validated['penulis'])) {
            $berita->penulis = $validated['penulis'];
        }
        if ($request->has('is_active')) {
            $berita->is_active = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($validated['urutan'])) {
            $berita->urutan = $validated['urutan'];
        }

        // Hapus gambar jika diminta
        if ($request->boolean('hapus_gambar')) {
            $this->deleteOldImage($berita->gambar);
            $berita->gambar = null;
        }

        // Handle gambar baru jika ada upload
        if ($request->hasFile('foto')) {
            $this->deleteOldImage($berita->gambar);
            $berita->gambar = $this->uploadImage($request->file('foto'));
        } elseif ($request->hasFile('gambar')) {
            $this->deleteOldImage($berita->gambar);
            $berita->gambar = $this->uploadImage($request->file('gambar'));
        } elseif (!empty($validated['gambar']) && is_string($validated['gambar'])) {
            $berita->gambar = $validated['gambar'];
        }

        $berita->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Berita berhasil diperbarui',
            'data'    => $berita->fresh()->load('user'),
        ]);
    }

    /**
     * Toggle status aktif/sembunyi (Hide / Unhide berita).
     */
    public function toggleStatus($id)
    {
        $berita = Berita::findOrFail($id);
        $berita->is_active = !$berita->is_active;
        $berita->save();

        $statusText = $berita->is_active ? 'ditampilkan di publik' : 'disembunyikan dari publik';

        return response()->json([
            'status'  => 'success',
            'message' => "Berita \"{$berita->judul}\" berhasil {$statusText}.",
            'data'    => $berita,
        ]);
    }

    /**
     * Hapus berita.
     */
    public function destroy($id)
    {
        $berita = Berita::findOrFail($id);
        $this->deleteOldImage($berita->gambar);
        $berita->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Berita berhasil dihapus',
        ]);
    }

    /**
     * Helper upload image (Supabase fallback ke local public disk).
     */
    private function uploadImage($file): string
    {
        $hasSupabase = !empty(config('services.supabase.url')) && !empty(config('services.supabase.service_key'));

        if ($hasSupabase) {
            try {
                $supabase = app(SupabaseStorageService::class);
                $res = $supabase->uploadWithHash($file, 'berita');
                if (!empty($res['url'])) {
                    return $res['url'];
                }
            } catch (\Throwable $e) {
                \Log::warning('Supabase upload failed for berita, falling back to local storage: ' . $e->getMessage());
            }
        }

        // Fallback local storage
        $path = $file->store('berita', 'public');
        return $path;
    }

    /**
     * Helper hapus file gambar lokal.
     */
    private function deleteOldImage(?string $path): void
    {
        if (empty($path)) return;

        if (!str_starts_with($path, 'http://') && !str_starts_with($path, 'https://')) {
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }
}
