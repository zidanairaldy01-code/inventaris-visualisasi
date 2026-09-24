<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FotoSaranaPrasarana;
use App\Models\SaranaPrasarana;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FotoSaranaPrasaranaController extends Controller
{
    /**
     * Upload foto baru untuk item sarana prasarana.
     */
    public function store(Request $request, $id)
    {
        $item = SaranaPrasarana::findOrFail($id);

        $request->validate([
            'foto'        => 'required|image|mimes:jpeg,png,jpg,webp|max:3072',
            'keterangan'  => 'nullable|string|max:255',
            'is_thumbnail' => 'nullable|boolean',
        ]);

        if (!$request->hasFile('foto')) {
            return response()->json(['message' => 'File tidak ditemukan'], 400);
        }

        $path = $request->file('foto')->store('sarana-prasarana', 'public');

        if ($request->boolean('is_thumbnail', false)) {
            FotoSaranaPrasarana::where('id_sarana_prasarana', $item->id)->update(['is_thumbnail' => false]);
        }

        $existingCount = FotoSaranaPrasarana::where('id_sarana_prasarana', $item->id)->count();

        $foto = FotoSaranaPrasarana::create([
            'id_sarana_prasarana' => $item->id,
            'nama_barang_ref'     => $item->nama_barang,
            'nama_file'           => $request->file('foto')->getClientOriginalName(),
            'path_file'           => $path,
            'keterangan'          => $request->keterangan,
            'is_thumbnail'        => $request->boolean('is_thumbnail', $existingCount === 0),
            'urutan'              => $existingCount + 1,
        ]);

        return response()->json($foto->append('url_foto'), 201);
    }

    /**
     * Hapus foto.
     */
    public function destroy(string $id)
    {
        $foto = FotoSaranaPrasarana::findOrFail($id);

        if (Storage::disk('public')->exists($foto->path_file)) {
            Storage::disk('public')->delete($foto->path_file);
        }

        $foto->delete();

        return response()->json(['message' => 'Foto berhasil dihapus']);
    }

    /**
     * Gunakan foto dari barang lain yang namanya sama (shared photo).
     * Menduplikat entry foto (tanpa menyalin file fisik) ke item target.
     */
    public function useSharedPhoto(Request $request, $id)
    {
        $item = SaranaPrasarana::findOrFail($id);

        $request->validate([
            'foto_id' => 'required|exists:foto_sarana_prasaranas,id',
        ]);

        $sourcePhoto = FotoSaranaPrasarana::findOrFail($request->foto_id);

        // Cek apakah foto ini sudah pernah dipakai oleh item ini (berdasarkan path_file)
        $alreadyExists = FotoSaranaPrasarana::where('id_sarana_prasarana', $item->id)
            ->where('path_file', $sourcePhoto->path_file)
            ->exists();

        if ($alreadyExists) {
            return response()->json(['message' => 'Foto ini sudah digunakan oleh barang ini'], 422);
        }

        $existingCount = FotoSaranaPrasarana::where('id_sarana_prasarana', $item->id)->count();

        // Salin referensi foto (tanpa menyalin file fisik)
        $newFoto = FotoSaranaPrasarana::create([
            'id_sarana_prasarana' => $item->id,
            'nama_barang_ref'     => $item->nama_barang,
            'nama_file'           => $sourcePhoto->nama_file,
            'path_file'           => $sourcePhoto->path_file, // shared path, bukan salinan fisik
            'keterangan'          => $sourcePhoto->keterangan,
            'is_thumbnail'        => $existingCount === 0, // jadi thumbnail jika belum ada foto
            'urutan'              => $existingCount + 1,
        ]);

        return response()->json($newFoto->append('url_foto'), 201);
    }

    /**
     * Cari foto dari barang lain berdasarkan nama barang yang mirip (untuk shared photo picker).
     */
    public function searchSharedPhotos(Request $request)
    {
        $request->validate([
            'nama_barang' => 'required|string|min:2',
            'exclude_id'  => 'nullable|integer', // ID item yang sedang dibuka, agar fotonya tidak masuk hasil
        ]);

        $namaBarang = $request->nama_barang;
        $excludeId  = $request->exclude_id;

        // Ambil foto dari barang yang namanya mengandung kata kunci yang sama
        $query = FotoSaranaPrasarana::query()
            ->where('nama_barang_ref', 'like', '%' . $namaBarang . '%')
            ->orWhere(function ($q) use ($namaBarang) {
                // Cari kecocokan per kata (kata lebih dari 3 karakter)
                $words = array_filter(explode(' ', $namaBarang), fn($w) => strlen($w) > 3);
                foreach ($words as $word) {
                    $q->orWhere('nama_barang_ref', 'like', '%' . $word . '%');
                }
            });

        if ($excludeId) {
            $query->where('id_sarana_prasarana', '!=', $excludeId);
        }

        $fotos = $query
            ->with('saranaPrasarana:id,nama_barang')
            ->select(['id', 'id_sarana_prasarana', 'nama_barang_ref', 'path_file', 'nama_file', 'keterangan', 'is_thumbnail'])
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(fn($f) => $f->append('url_foto'))
            // Deduplicate berdasarkan path_file (karena foto bisa di-share)
            ->unique('path_file')
            ->values();

        return response()->json([
            'status' => 'success',
            'data'   => $fotos,
        ]);
    }
}
