<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use App\Services\SupabaseStorageService;

class SiteSettingController extends Controller
{
    /**
     * Helper upload gambar:
     * 1. Coba upload ke Supabase Storage jika dikonfigurasi.
     * 2. Fallback otomatis ke local public storage (misal untuk pengujian offline/lokal).
     */
    protected function uploadImage(UploadedFile $file, string $folder = 'site-settings'): string
    {
        $hasSupabase = !empty(config('services.supabase.url')) && !empty(config('services.supabase.service_key'));

        if ($hasSupabase) {
            try {
                $supabase = app(SupabaseStorageService::class);
                $res = $supabase->uploadWithHash($file, $folder);
                if (!empty($res['url'])) {
                    return $res['url'];
                }
            } catch (\Throwable $e) {
                \Log::warning('Supabase upload gagal, beralih ke local storage: ' . $e->getMessage());
            }
        }

        // Fallback: simpan di local storage (backend/storage/app/public/site-settings)
        $path = $file->store($folder, 'public');
        return url('/storage/' . $path);
    }

    /**
     * GET /api/site-settings  — public, no auth
     * Returns all settings as key => value object
     */
    public function index()
    {
        $rows = DB::table('site_settings')->get();
        $result = [];
        foreach ($rows as $row) {
            $result[$row->key] = $row->type === 'json'
                ? json_decode($row->value, true)
                : $row->value;
        }
        return response()->json($result);
    }

    /**
     * PUT /api/site-settings  — auth:sanctum, super admin
     * Body: { key => value, ... }  (text/json fields)
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'sekolah_nama'         => 'nullable|string|max:200',
            'sekolah_tagline'      => 'nullable|string|max:300',
            'sekolah_deskripsi1'   => 'nullable|string',
            'sekolah_deskripsi2'   => 'nullable|string',
            'sekolah_tahun_berdiri'=> 'nullable|string|max:10',
            'sekolah_hero_foto'    => 'nullable|string',
            'visi'                 => 'nullable|string',
            'misi'                 => 'nullable|string',
            'kontak_alamat'        => 'nullable|string',
            'kontak_telepon'       => 'nullable|string|max:50',
            'kontak_email'         => 'nullable|email|max:150',
            'maps_embed_url'       => 'nullable|string',
            'fasilitas_foto'       => 'nullable|array',
            'fasilitas_foto.*.url'     => 'nullable|string',
            'fasilitas_foto.*.caption' => 'nullable|string',
        ]);

        foreach ($data as $key => $value) {
            if ($key === 'fasilitas_foto') {
                DB::table('site_settings')->updateOrInsert(
                    ['key' => $key],
                    ['value' => json_encode($value), 'type' => 'json', 'updated_at' => now()]
                );
            } else {
                DB::table('site_settings')->updateOrInsert(
                    ['key' => $key],
                    ['value' => $value, 'type' => 'string', 'updated_at' => now()]
                );
            }
        }

        return response()->json(['message' => 'Pengaturan berhasil disimpan.']);
    }

    /**
     * POST /api/site-settings/upload-hero  — upload foto hero sekolah
     */
    public function uploadHero(Request $request)
    {
        $request->validate(['foto' => 'required|image|max:5120']);
        $file = $request->file('foto');

        $url = $this->uploadImage($file, 'site-settings');

        DB::table('site_settings')->updateOrInsert(
            ['key' => 'sekolah_hero_foto'],
            ['value' => $url, 'type' => 'string', 'updated_at' => now()]
        );

        return response()->json(['url' => $url]);
    }

    /**
     * POST /api/site-settings/upload-fasilitas  — upload 1 foto fasilitas, returns url
     */
    public function uploadFasilitas(Request $request)
    {
        $request->validate(['foto' => 'required|image|max:5120']);
        $file = $request->file('foto');

        $url = $this->uploadImage($file, 'site-settings');

        return response()->json(['url' => $url]);
    }
}
