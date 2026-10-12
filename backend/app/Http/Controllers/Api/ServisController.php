<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Servis;
use App\Models\History;
use App\Models\Notifikasi;
use App\Models\SaranaPrasarana;
use App\Models\Aset;
use App\Models\Kondisi;
use App\Models\DistribusiAset;
use App\Models\Ruangan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ServisController extends Controller
{
    /**
     * Menampilkan daftar servis & pengajuan perbaikan
     */
    public function index(Request $request)
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $query = Servis::with([
            'aset.ruangan',
            'aset.kategori',
            'saranaPrasarana',
            'pelapor',
            'ruangan.gedung',
            'approvedByWakasek',
            'verifiedByAdmin',
        ]);

        // Filter status jika ada
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Jika user adalah wakapro, hanya tampilkan servis aset milik workshopnya
        if ($user && $user->role === 'wakapro') {
            if (!$user->ruangan_id) {
                return response()->json([]);
            }

            $saranaIds = DistribusiAset::where('ruangan_tujuan_id', $user->ruangan_id)
                ->where('status', 'diterima')
                ->pluck('sarana_prasarana_id')
                ->toArray();

            $query->where(function ($q) use ($user, $saranaIds) {
                $q->where('ruangan_id', $user->ruangan_id)
                  ->orWhere('pelapor_user_id', $user->id)
                  ->orWhereIn('sarana_prasarana_id', $saranaIds)
                  ->orWhereHas('aset', function ($qa) use ($user) {
                      $qa->where('id_ruangan', $user->ruangan_id);
                  });
            });
        }

        $servises = $query->orderBy('created_at', 'desc')->orderBy('tanggal_servis', 'desc')->get();
            
        return response()->json($servises);
    }

    /**
     * Input servis / Laporan Kerusakan & Pengajuan Servis Baru
     */
    public function store(Request $request)
    {
        $user = $request->user();

        // Validasi input
        $rules = [
            'id_aset'              => 'nullable|exists:asets,id',
            'sarana_prasarana_id'  => 'nullable|exists:sarana_prasaranas,id',
            'jenis_perbaikan'      => 'required|string|max:255',
            'tanggal_servis'      => 'nullable|date',
            'deskripsi_kerusakan' => 'nullable|string',
            'foto_kerusakan'      => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'kondisi_rusak'       => 'nullable|string|in:Rusak Ringan,Rusak Berat,Tidak Layak Pakai',
        ];

        // Jika Admin / Wakasek, biaya dan status bisa ditentukan langsung
        if ($user && in_array($user->role, ['super_admin', 'admin', 'wakasek'])) {
            $rules['biaya_servis']    = 'nullable|numeric|min:0';
            $rules['teknisi_bengkel'] = 'nullable|string|max:255';
            $rules['status']          = 'nullable|in:Menunggu Persetujuan,Proses,Selesai,Batal,Ditolak';
        }

        $validated = $request->validate($rules);

        if (empty($validated['id_aset']) && empty($validated['sarana_prasarana_id'])) {
            return response()->json([
                'message' => 'Pilih salah satu aset atau sarana prasarana yang diservis.'
            ], 422);
        }

        // Tentukan ruangan_id dan pelapor
        $ruanganId = null;
        if ($user && $user->role === 'wakapro') {
            if (!$user->ruangan_id) {
                return response()->json(['message' => 'Akun Anda belum terhubung ke ruangan workshop manapun.'], 403);
            }
            $ruanganId = $user->ruangan_id;

            // Validasi kepemilikan aset workshop untuk wakapro
            if (!empty($validated['sarana_prasarana_id'])) {
                $isAllowed = DistribusiAset::where('ruangan_tujuan_id', $user->ruangan_id)
                    ->where('sarana_prasarana_id', $validated['sarana_prasarana_id'])
                    ->where('status', 'diterima')
                    ->exists();
                if (!$isAllowed) {
                    return response()->json(['message' => 'Barang ini bukan milik workshop Anda.'], 403);
                }
            }

            if (!empty($validated['id_aset'])) {
                $isAllowed = Aset::where('id', $validated['id_aset'])
                    ->where('id_ruangan', $user->ruangan_id)
                    ->exists();
                if (!$isAllowed) {
                    return response()->json(['message' => 'Aset ini bukan milik workshop Anda.'], 403);
                }
            }

            // Wakapro melaporkan: status default 'Menunggu Persetujuan' dan biaya 0 (Wakasek yang akan ACC & atur biaya)
            $validated['status']       = 'Menunggu Persetujuan';
            $validated['biaya_servis'] = 0;
            $validated['pelapor_user_id'] = $user->id;
            $validated['ruangan_id']   = $user->ruangan_id;
        } else {
            // Admin atau Wakasek yang input
            $validated['status'] = $validated['status'] ?? 'Proses';
            $validated['biaya_servis'] = $validated['biaya_servis'] ?? 0;
            $validated['pelapor_user_id'] = $user?->id;
            
            // Cek ruangan aset
            if (!empty($validated['sarana_prasarana_id'])) {
                $dist = DistribusiAset::where('sarana_prasarana_id', $validated['sarana_prasarana_id'])
                    ->where('status', 'diterima')
                    ->first();
                $ruanganId = $dist?->ruangan_tujuan_id;
            } elseif (!empty($validated['id_aset'])) {
                $ruanganId = Aset::find($validated['id_aset'])?->id_ruangan;
            }
            $validated['ruangan_id'] = $ruanganId;
        }

        $validated['tanggal_servis'] = $validated['tanggal_servis'] ?? now()->toDateString();

        if ($request->hasFile('foto_kerusakan')) {
            $path = $request->file('foto_kerusakan')->store('servis/kerusakan', 'public');
            $validated['foto_kerusakan'] = $path;
        }

        $servis = Servis::create($validated);
        $servis->load(['aset.ruangan', 'aset.kategori', 'saranaPrasarana', 'pelapor', 'ruangan.gedung']);

        $namaBarang  = $servis->saranaPrasarana?->nama_barang ?? $servis->aset?->nama_aset ?? 'Aset';
        $namaRuangan = $servis->ruangan?->nama_ruangan ?? 'Workshop';
        $kondisiRusak = $validated['kondisi_rusak'] ?? 'Rusak Ringan';

        // Update kondisi pada sarana prasarana jika ada
        if ($servis->sarana_prasarana_id) {
            $sarana = SaranaPrasarana::find($servis->sarana_prasarana_id);
            if ($sarana) {
                if ($servis->status === 'Selesai') {
                    $sarana->update(['kondisi' => 'Baik', 'foto_kerusakan' => null]);
                } else {
                    $sarana->update([
                        'kondisi'        => $kondisiRusak,
                        'foto_kerusakan' => $servis->foto_kerusakan ?? $sarana->foto_kerusakan,
                    ]);
                }
            }
        }

        // Update kondisi pada aset fisik jika ada
        if ($servis->id_aset) {
            $kondisiTarget = $servis->status === 'Selesai' ? 'Baik' : $kondisiRusak;
            $k = Kondisi::where('nama_kondisi', $kondisiTarget)->first();
            if ($k) {
                Aset::where('id', $servis->id_aset)->update(['id_kondisi' => $k->id]);
            }
        }

        // Buat Log History
        try {
            $isLaporKeWakasek = ($user && $user->role === 'wakapro') || 
                                ($user && in_array($user->role, ['super_admin', 'admin']) && $servis->status === 'Menunggu Persetujuan');
            $roleLabel = $user ? ($user->role === 'super_admin' ? 'Super Admin' : ($user->role === 'admin' ? 'Admin' : 'Wakapro')) : 'User';

            $keteranganLog = $isLaporKeWakasek
                ? "{$roleLabel} {$user->nama_lengkap} melaporkan kerusakan aset {$namaBarang} ({$servis->jenis_perbaikan}) dan mengajukan perbaikan ke Wakasek."
                : "Aset {$namaBarang} dicatat diservis: {$validated['jenis_perbaikan']}. Status: {$servis->status}.";

            History::create([
                'id_aset'    => $servis->id_aset,
                'id_user'    => $user?->id,
                'aksi'       => $isLaporKeWakasek ? 'LAPOR KERUSAKAN' : 'SERVIS',
                'keterangan' => $keteranganLog,
                'tanggal'    => now()
            ]);
        } catch (\Exception $e) {}

        // Notifikasi ke Wakasek jika Wakapro yang melapor
        if ($user && $user->role === 'wakapro') {
            try {
                Notifikasi::create([
                    'target_role'       => 'wakasek',
                    'target_user_id'    => null,
                    'target_ruangan_id' => $ruanganId,
                    'tipe'              => 'pengajuan_servis_wakapro',
                    'judul'             => "Pengajuan Servis: {$namaBarang}",
                    'pesan'             => "Wakapro {$user->nama_lengkap} melaporkan kerusakan aset \"{$namaBarang}\" di {$namaRuangan} ({$kondisiRusak}) dan mengajukan persetujuan anggaran servis.",
                    'data'              => [
                        'servis_id'           => $servis->id,
                        'sarana_prasarana_id' => $servis->sarana_prasarana_id,
                        'nama_barang'         => $namaBarang,
                        'nama_ruangan'        => $namaRuangan,
                        'wakapro_nama'        => $user->nama_lengkap,
                        'link_url'            => '/wakasek/servis',
                    ],
                    'is_read'           => false,
                ]);

                // Notifikasi juga ke Super Admin sebagai monitoring
                Notifikasi::create([
                    'target_role'       => 'admin',
                    'target_user_id'    => null,
                    'target_ruangan_id' => $ruanganId,
                    'tipe'              => 'pengajuan_servis_wakapro',
                    'judul'             => "Pengajuan Servis Baru: {$namaBarang}",
                    'pesan'             => "Wakapro {$user->nama_lengkap} melaporkan aset \"{$namaBarang}\" di {$namaRuangan} rusak. Menunggu ACC & anggaran dari Wakasek.",
                    'data'              => [
                        'servis_id'           => $servis->id,
                        'sarana_prasarana_id' => $servis->sarana_prasarana_id,
                        'nama_barang'         => $namaBarang,
                        'link_url'            => '/dashboard/servis',
                    ],
                    'is_read'           => false,
                ]);
            } catch (\Exception $e) {}
        }

        // Notifikasi ke Wakasek jika Admin / Super Admin lapor dengan workflow (Menunggu Persetujuan)
        if ($user && in_array($user->role, ['super_admin', 'admin']) && $servis->status === 'Menunggu Persetujuan') {
            try {
                $roleName = $user->role === 'super_admin' ? 'Super Admin' : 'Admin';
                Notifikasi::create([
                    'target_role'       => 'wakasek',
                    'target_user_id'    => null,
                    'target_ruangan_id' => $ruanganId,
                    'tipe'              => 'pengajuan_servis_admin',
                    'judul'             => "Pengajuan Servis dari {$roleName}: {$namaBarang}",
                    'pesan'             => "{$roleName} {$user->nama_lengkap} mengajukan perbaikan aset \"{$namaBarang}\" ({$kondisiRusak}). Mohon tinjau dan tentukan anggaran servis.",
                    'data'              => [
                        'servis_id'   => $servis->id,
                        'nama_barang' => $namaBarang,
                        'pelapor'     => $user->nama_lengkap,
                        'role'        => $roleName,
                        'link_url'    => '/wakasek/servis',
                    ],
                    'is_read'           => false,
                ]);
            } catch (\Exception $e) {}
        }

        return response()->json($servis, 201);
    }

    /**
     * Wakasek: ACC Servis & Tentukan Biaya Servis
     * Mengubah status pengajuan menjadi 'Proses' (Sedang Diservis)
     */
    public function accWakasek(Request $request, $id)
    {
        $user = $request->user();
        if ($user && !in_array($user->role, ['wakasek', 'super_admin', 'admin'])) {
            return response()->json(['message' => 'Hanya Wakasek atau Administrator yang berhak menyetujui servis.'], 403);
        }

        $servis = Servis::with(['saranaPrasarana', 'aset', 'pelapor', 'ruangan'])->findOrFail($id);

        $validated = $request->validate([
            'biaya_servis'    => 'required|numeric|min:0',
            'teknisi_bengkel' => 'nullable|string|max:255',
            'catatan_wakasek' => 'nullable|string',
        ]);

        $servis->update([
            'status'                 => 'Proses', // Langsung berjalan servis
            'biaya_servis'           => $validated['biaya_servis'],
            'teknisi_bengkel'        => $validated['teknisi_bengkel'] ?? $servis->teknisi_bengkel,
            'catatan_wakasek'        => $validated['catatan_wakasek'] ?? null,
            'approved_by_wakasek_id' => $user->id,
            'tanggal_acc_wakasek'    => now(),
        ]);

        $servis->load(['aset.ruangan', 'aset.kategori', 'saranaPrasarana', 'pelapor', 'ruangan.gedung', 'approvedByWakasek', 'verifiedByAdmin']);

        $namaBarang = $servis->saranaPrasarana?->nama_barang ?? $servis->aset?->nama_aset ?? 'Aset';
        $formatBiaya = number_format($validated['biaya_servis'], 0, ',', '.');

        // Log history
        try {
            History::create([
                'id_aset'    => $servis->id_aset,
                'id_user'    => $user->id,
                'aksi'       => 'ACC SERVIS',
                'keterangan' => "Wakasek {$user->nama_lengkap} menyetujui servis aset {$namaBarang} dengan alokasi biaya Rp {$formatBiaya}. Status: Sedang Diservis.",
                'tanggal'    => now()
            ]);
        } catch (\Exception $e) {}

        // Notifikasi ke Pelapor bahwa pengajuannya telah di-ACC
        try {
            if ($servis->pelapor_user_id) {
                $pelaporRole = $servis->pelapor?->role ?? 'wakapro';
                $linkUrl = in_array($pelaporRole, ['super_admin', 'admin']) ? '/dashboard/servis' : '/wakapro/servis';
                Notifikasi::create([
                    'target_role'       => $pelaporRole,
                    'target_user_id'    => $servis->pelapor_user_id,
                    'target_ruangan_id' => $servis->ruangan_id,
                    'tipe'              => 'servis_diacc',
                    'judul'             => "Servis Di-ACC: {$namaBarang}",
                    'pesan'             => "Pengajuan perbaikan aset \"{$namaBarang}\" telah disetujui oleh Wakasek {$user->nama_lengkap} dengan biaya Rp {$formatBiaya}. Servis sedang berlangsung.",
                    'data'              => [
                        'servis_id'   => $servis->id,
                        'nama_barang' => $namaBarang,
                        'link_url'    => $linkUrl,
                    ],
                    'is_read'           => false,
                ]);
            }

            // Notifikasi ke Admin bahwa servis sedang berjalan
            Notifikasi::create([
                'target_role'       => 'admin',
                'target_user_id'    => null,
                'target_ruangan_id' => $servis->ruangan_id,
                'tipe'              => 'servis_diacc',
                'judul'             => "Servis Sedang Berjalan: {$namaBarang}",
                'pesan'             => "Wakasek {$user->nama_lengkap} telah meng-ACC servis aset \"{$namaBarang}\" (Biaya: Rp {$formatBiaya}). Menunggu verifikasi selesai oleh Admin.",
                'data'              => [
                    'servis_id'   => $servis->id,
                    'nama_barang' => $namaBarang,
                    'link_url'    => '/dashboard/servis',
                ],
                'is_read'           => false,
            ]);
        } catch (\Exception $e) {}

        return response()->json([
            'message' => "Servis aset {$namaBarang} berhasil disetujui (ACC). Proses servis dimulai.",
            'data'    => $servis
        ]);
    }

    /**
     * Wakasek: Tolak Pengajuan Servis
     */
    public function tolakWakasek(Request $request, $id)
    {
        $user = $request->user();
        if ($user && !in_array($user->role, ['wakasek', 'super_admin', 'admin'])) {
            return response()->json(['message' => 'Hanya Wakasek atau Administrator yang berhak menolak servis.'], 403);
        }

        $servis = Servis::with(['saranaPrasarana', 'aset', 'pelapor', 'ruangan'])->findOrFail($id);

        $validated = $request->validate([
            'catatan_wakasek' => 'required|string',
        ]);

        $servis->update([
            'status'                 => 'Ditolak',
            'catatan_wakasek'        => $validated['catatan_wakasek'],
            'approved_by_wakasek_id' => $user->id,
            'tanggal_acc_wakasek'    => now(),
        ]);

        $namaBarang = $servis->saranaPrasarana?->nama_barang ?? $servis->aset?->nama_aset ?? 'Aset';

        // Notifikasi ke Pelapor
        try {
            if ($servis->pelapor_user_id) {
                $pelaporRole = $servis->pelapor?->role ?? 'wakapro';
                $linkUrl = in_array($pelaporRole, ['super_admin', 'admin']) ? '/dashboard/servis' : '/wakapro/servis';
                Notifikasi::create([
                    'target_role'       => $pelaporRole,
                    'target_user_id'    => $servis->pelapor_user_id,
                    'target_ruangan_id' => $servis->ruangan_id,
                    'tipe'              => 'servis_ditolak',
                    'judul'             => "Pengajuan Servis Ditolak: {$namaBarang}",
                    'pesan'             => "Pengajuan perbaikan aset \"{$namaBarang}\" ditolak oleh Wakasek. Alasan: {$validated['catatan_wakasek']}",
                    'data'              => [
                        'servis_id'   => $servis->id,
                        'nama_barang' => $namaBarang,
                        'link_url'    => $linkUrl,
                    ],
                    'is_read'           => false,
                ]);
            }
        } catch (\Exception $e) {}

        return response()->json([
            'message' => "Pengajuan servis aset {$namaBarang} berhasil ditolak.",
            'data'    => $servis
        ]);
    }

    /**
     * Super Admin: Menentukan & Memverifikasi Servis SELESAI
     * Mengembalikan kondisi barang ke 'Baik'
     */
    public function selesaiAdmin(Request $request, $id)
    {
        $user = $request->user();
        if ($user && !in_array($user->role, ['super_admin', 'admin'])) {
            return response()->json(['message' => 'Hanya Administrator yang berhak memvalidasi penyelesaian servis.'], 403);
        }

        $servis = Servis::with(['saranaPrasarana', 'aset', 'pelapor', 'ruangan'])->findOrFail($id);

        $validated = $request->validate([
            'catatan_admin'    => 'nullable|string',
            'biaya_realisasi'  => 'nullable|numeric|min:0',
        ]);

        $servisUpdate = [
            'status'                => 'Selesai',
            'verified_by_admin_id'  => $user->id,
            'tanggal_selesai_admin' => now(),
            'catatan_admin'         => $validated['catatan_admin'] ?? $servis->catatan_admin,
        ];

        if (isset($validated['biaya_realisasi']) && $validated['biaya_realisasi'] > 0) {
            $servisUpdate['biaya_servis'] = $validated['biaya_realisasi'];
        }

        $servis->update($servisUpdate);

        // Pulihkan kondisi aset kembali menjadi 'Baik'
        if ($servis->sarana_prasarana_id) {
            $sarana = SaranaPrasarana::find($servis->sarana_prasarana_id);
            if ($sarana) {
                $sarana->update([
                    'kondisi'        => 'Baik',
                    'foto_kerusakan' => null,
                ]);
            }
        }

        if ($servis->id_aset) {
            $kBaik = Kondisi::where('nama_kondisi', 'Baik')->first();
            if ($kBaik) {
                Aset::where('id', $servis->id_aset)->update(['id_kondisi' => $kBaik->id]);
            }
        }

        $servis->load(['aset.ruangan', 'aset.kategori', 'saranaPrasarana', 'pelapor', 'ruangan.gedung', 'approvedByWakasek', 'verifiedByAdmin']);

        $namaBarang = $servis->saranaPrasarana?->nama_barang ?? $servis->aset?->nama_aset ?? 'Aset';

        // Log history
        try {
            History::create([
                'id_aset'    => $servis->id_aset,
                'id_user'    => $user->id,
                'aksi'       => 'SELESAI SERVIS',
                'keterangan' => "Admin {$user->nama_lengkap} memvalidasi servis aset {$namaBarang} ({$servis->jenis_perbaikan}) telah SELESAI. Kondisi aset kembali Baik.",
                'tanggal'    => now()
            ]);
        } catch (\Exception $e) {}

        // Notifikasi ke Wakapro dan Wakasek
        try {
            if ($servis->pelapor_user_id) {
                $pelaporRole = $servis->pelapor?->role ?? 'wakapro';
                $linkUrl = in_array($pelaporRole, ['super_admin', 'admin']) ? '/dashboard/servis' : '/wakapro/servis';
                Notifikasi::create([
                    'target_role'       => $pelaporRole,
                    'target_user_id'    => $servis->pelapor_user_id,
                    'target_ruangan_id' => $servis->ruangan_id,
                    'tipe'              => 'servis_selesai',
                    'judul'             => "Servis Selesai: {$namaBarang}",
                    'pesan'             => "Servis aset \"{$namaBarang}\" telah diverifikasi SELESAI oleh Admin {$user->nama_lengkap}. Kondisi aset telah kembali Baik.",
                    'data'              => [
                        'servis_id'   => $servis->id,
                        'nama_barang' => $namaBarang,
                        'link_url'    => $linkUrl,
                    ],
                    'is_read'           => false,
                ]);
            }

            Notifikasi::create([
                'target_role'       => 'wakasek',
                'target_user_id'    => null,
                'target_ruangan_id' => $servis->ruangan_id,
                'tipe'              => 'servis_selesai',
                'judul'             => "Servis Selesai: {$namaBarang}",
                'pesan'             => "Servis aset \"{$namaBarang}\" telah selesai dan diverifikasi oleh Admin. Kondisi aset telah pulih menjadi Baik.",
                'data'              => [
                    'servis_id'   => $servis->id,
                    'nama_barang' => $namaBarang,
                    'link_url'    => '/wakasek/servis',
                ],
                'is_read'           => false,
            ]);
        } catch (\Exception $e) {}

        return response()->json([
            'message' => "Servis aset {$namaBarang} telah diverifikasi selesai. Kondisi aset kembali Baik.",
            'data'    => $servis
        ]);
    }

    public function show($id)
    {
        $servis = Servis::with(['aset.ruangan', 'aset.kategori', 'saranaPrasarana', 'pelapor', 'ruangan.gedung', 'approvedByWakasek', 'verifiedByAdmin'])->findOrFail($id);
        return response()->json($servis);
    }

    public function update(Request $request, $servis)
    {
        $servis = Servis::findOrFail($servis);

        $validated = $request->validate([
            'id_aset'              => 'sometimes|nullable|exists:asets,id',
            'sarana_prasarana_id'  => 'sometimes|nullable|exists:sarana_prasaranas,id',
            'jenis_perbaikan'      => 'sometimes|required|string|max:255',
            'tanggal_servis'      => 'sometimes|required|date',
            'biaya_servis'        => 'sometimes|required|numeric|min:0',
            'teknisi_bengkel'     => 'nullable|string|max:255',
            'deskripsi_kerusakan' => 'nullable|string',
            'foto_kerusakan'      => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'status'              => 'sometimes|required|in:Menunggu Persetujuan,Proses,Selesai,Batal,Ditolak',
        ]);

        if ($request->hasFile('foto_kerusakan')) {
            if ($servis->foto_kerusakan) {
                Storage::disk('public')->delete($servis->foto_kerusakan);
            }
            $path = $request->file('foto_kerusakan')->store('servis/kerusakan', 'public');
            $validated['foto_kerusakan'] = $path;
        } elseif ($request->input('hapus_foto') == '1') {
            if ($servis->foto_kerusakan) {
                Storage::disk('public')->delete($servis->foto_kerusakan);
            }
            $validated['foto_kerusakan'] = null;
        } else {
            unset($validated['foto_kerusakan']);
        }

        unset($validated['id_aset'], $validated['sarana_prasarana_id']);

        $statusBerubahMenjadiSelesai = isset($validated['status']) && 
                                      $validated['status'] === 'Selesai' && 
                                      $servis->status !== 'Selesai';

        $servis->update($validated);
        $servis->load(['aset.ruangan', 'aset.kategori', 'saranaPrasarana', 'pelapor', 'ruangan.gedung', 'approvedByWakasek', 'verifiedByAdmin']);

        // Update kondisi jika status diubah
        if ($servis->sarana_prasarana_id) {
            $sarana = SaranaPrasarana::find($servis->sarana_prasarana_id);
            if ($sarana) {
                if ($servis->status === 'Selesai') {
                    $sarana->update(['kondisi' => 'Baik', 'foto_kerusakan' => null]);
                } else if ($servis->status === 'Proses') {
                    $sarana->update(['kondisi' => 'Rusak Ringan']);
                }
            }
        }

        if ($statusBerubahMenjadiSelesai) {
            try {
                $namaBarang = $servis->saranaPrasarana?->nama_barang ?? $servis->aset?->nama_aset ?? 'Aset';
                History::create([
                    'id_aset' => $servis->id_aset,
                    'id_user' => $request->user()?->id,
                    'aksi' => 'SELESAI SERVIS',
                    'keterangan' => "Servis {$namaBarang} ({$servis->jenis_perbaikan}) telah selesai. Aset kembali normal.",
                    'tanggal' => now()
                ]);
            } catch (\Exception $e) {}
        }

        return response()->json($servis);
    }

    public function destroy($id)
    {
        $servis = Servis::findOrFail($id);
        if ($servis->foto_kerusakan) {
            Storage::disk('public')->delete($servis->foto_kerusakan);
        }
        $servis->delete();

        return response()->json(['message' => 'Data servis berhasil dihapus']);
    }
}
