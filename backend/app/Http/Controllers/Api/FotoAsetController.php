<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FotoAset;
use App\Models\Aset;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FotoAsetController extends Controller
{
    protected SupabaseStorageService $supabase;

    public function __construct(SupabaseStorageService $supabase)
    {
        $this->supabase = $supabase;
    }

    public function store(Request $request, $aset_id)
    {
        $aset = Aset::findOrFail($aset_id);
        
        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'keterangan' => 'nullable|string',
            'is_thumbnail' => 'nullable|boolean'
        ]);

        if ($request->hasFile('foto')) {
            try {
                // Upload ke Supabase Storage
                $file = $request->file('foto');
                $folder = 'aset';
                $result = $this->supabase->uploadWithHash($file, $folder);

                if ($request->is_thumbnail) {
                    FotoAset::where('id_aset', $aset->id)->update(['is_thumbnail' => false]);
                }

                $foto = FotoAset::create([
                    'id_aset' => $aset->id,
                    'nama_file' => $file->getClientOriginalName(),
                    'path_file' => $result['url'], // Simpan full URL dari Supabase
                    'keterangan' => $request->keterangan,
                    'is_thumbnail' => $request->is_thumbnail ?? false,
                    'urutan' => FotoAset::where('id_aset', $aset->id)->count() + 1
                ]);

                return response()->json($foto, 201);

            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Gagal upload foto: ' . $e->getMessage()
                ], 500);
            }
        }

        return response()->json(['message' => 'File tidak ditemukan'], 400);
    }

    public function destroy(string $id)
    {
        $foto = FotoAset::findOrFail($id);
        
        try {
            // Jika URL adalah Supabase URL, extract path dan delete dari Supabase
            if (str_contains($foto->path_file, 'supabase')) {
                $urlParts = parse_url($foto->path_file);
                if (isset($urlParts['path'])) {
                    $pathSegments = explode('/', trim($urlParts['path'], '/'));
                    $filePath = implode('/', array_slice($pathSegments, 5));
                    $this->supabase->delete($filePath);
                }
            } else {
                // Fallback: delete from local storage
                if (Storage::disk('public')->exists($foto->path_file)) {
                    Storage::disk('public')->delete($foto->path_file);
                }
            }

            $foto->delete();
            return response()->json(['message' => 'Foto berhasil dihapus']);

        } catch (\Exception $e) {
            $foto->delete();
            return response()->json(['message' => 'Foto berhasil dihapus dari database']);
        }
    }
}
