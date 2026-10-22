<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Services\SupabaseStorageService;

class AuthController extends Controller
{
    /**
     * Helper upload avatar:
     * 1. Coba upload ke Supabase Storage jika dikonfigurasi.
     * 2. Fallback otomatis ke local public storage.
     */
    protected function uploadAvatar(UploadedFile $file, string $folder = 'avatars'): string
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
                \Log::warning('Supabase avatar upload gagal, beralih ke local storage: ' . $e->getMessage());
            }
        }

        // Fallback: simpan di local storage (backend/storage/app/public/avatars)
        $path = $file->store($folder, 'public');
        return url('/storage/' . $path);
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required',
            'password' => 'required'
        ], [
            'username.required' => 'Username wajib diisi.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $user = User::where('username', $request->username)->first();

        // 1. Validasi Username: akun tidak ditemukan
        if (! $user) {
            return response()->json([
                'title' => 'Username Salah',
                'message' => 'Username tidak terdaftar dalam sistem.',
                'field' => 'username',
                'errors' => [
                    'username' => ['Username tidak terdaftar dalam sistem.']
                ]
            ], 401);
        }

        // 2. Validasi Password: kata sandi tidak cocok
        if (! Hash::check($request->password, $user->password)) {
            return response()->json([
                'title' => 'Password Salah',
                'message' => 'Password yang Anda masukkan salah.',
                'field' => 'password',
                'errors' => [
                    'password' => ['Password yang Anda masukkan salah.']
                ]
            ], 401);
        }

        // 3. Validasi Status Akun
        if (! $user->status) {
            return response()->json([
                'title' => 'Akun Dinonaktifkan',
                'message' => 'Akun dinonaktifkan oleh Administrator.',
                'field' => 'status',
                'errors' => [
                    'status' => ['Akun Anda dinonaktifkan. Silakan hubungi Administrator.']
                ]
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Berhasil logout']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $user->load('ruangan.gedung');
        }
        return response()->json($user);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'nama_lengkap' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'foto' => 'nullable',
        ], [
            'nama_lengkap.required' => 'Nama lengkap wajib diisi.',
            'username.required' => 'Username wajib diisi.',
            'username.unique' => 'Username sudah digunakan oleh akun lain.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah digunakan oleh akun lain.',
        ]);

        $updateData = [
            'nama_lengkap' => $request->nama_lengkap,
            'username' => $request->username,
            'email' => $request->email,
        ];

        // Jika ada upload foto baru via form
        if ($request->hasFile('foto')) {
            $request->validate([
                'foto' => 'image|mimes:jpeg,png,jpg,webp,gif|max:5120',
            ], [
                'foto.image' => 'File harus berupa gambar.',
                'foto.max' => 'Ukuran foto maksimal 5MB.',
            ]);
            $updateData['foto'] = $this->uploadAvatar($request->file('foto'));
        }

        $user->update($updateData);
        $user->load('ruangan.gedung');

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user' => $user
        ]);
    }

    /**
     * Upload / update foto profil pengguna
     */
    public function updatePhoto(Request $request)
    {
        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
        ], [
            'foto.required' => 'Pilih file foto yang ingin diunggah.',
            'foto.image' => 'File harus berupa gambar.',
            'foto.max' => 'Ukuran foto maksimal 5MB.',
        ]);

        $user = $request->user();
        $url = $this->uploadAvatar($request->file('foto'));

        $user->update([
            'foto' => $url,
        ]);
        $user->load('ruangan.gedung');

        return response()->json([
            'message' => 'Foto profil berhasil diperbarui.',
            'user' => $user,
            'foto_url' => $user->foto_url,
        ]);
    }

    /**
     * Hapus foto profil (kembali ke avatar default)
     */
    public function deletePhoto(Request $request)
    {
        $user = $request->user();
        $user->update([
            'foto' => null,
        ]);
        $user->load('ruangan.gedung');

        return response()->json([
            'message' => 'Foto profil berhasil dihapus.',
            'user' => $user,
        ]);
    }

    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required',
            'password' => 'required|min:6|confirmed',
        ], [
            'current_password.required' => 'Password saat ini wajib diisi.',
            'password.required' => 'Password baru wajib diisi.',
            'password.min' => 'Password baru minimal 6 karakter.',
            'password.confirmed' => 'Konfirmasi password baru tidak cocok.',
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Password saat ini tidak sesuai.',
                'errors' => ['current_password' => ['Password saat ini tidak sesuai.']]
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'message' => 'Password berhasil diperbarui.',
        ]);
    }
}

