<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kondisi;
use Illuminate\Http\Request;

class KondisiController extends Controller
{
    public function index()
    {
        return response()->json(Kondisi::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_kondisi' => 'required|string|max:255',
            'keterangan' => 'nullable|string'
        ]);

        $kondisi = Kondisi::create($validated);
        return response()->json($kondisi, 201);
    }

    public function show(string $id)
    {
        $kondisi = Kondisi::findOrFail($id);
        return response()->json($kondisi);
    }

    public function update(Request $request, string $id)
    {
        $kondisi = Kondisi::findOrFail($id);
        
        $validated = $request->validate([
            'nama_kondisi' => 'required|string|max:255',
            'keterangan' => 'nullable|string'
        ]);

        $kondisi->update($validated);
        return response()->json($kondisi);
    }

    public function destroy(string $id)
    {
        Kondisi::findOrFail($id)->delete();
        return response()->json(['message' => 'Kondisi berhasil dihapus']);
    }

    public function asetRusak(Request $request)
    {
        $kondisiFilter = $request->query('kondisi', 'all');
        $lokasiFilter  = $request->query('lokasi', 'all');
        $search        = $request->query('search', '');
        
        // Get current user untuk filtering wakapro
        $user = $request->user();
        $isWakapro = $user && $user->role === 'wakapro';
        $ruanganId = $isWakapro ? $user->ruangan_id : null;

        // 1. Aset dari Gedung / Workshop
        $asetQuery = \App\Models\Aset::with(['kondisi', 'ruangan.gedung', 'kategori', 'folder'])
            ->whereHas('kondisi', function ($q) {
                $q->where('nama_kondisi', 'like', '%rusak%')
                  ->orWhere('nama_kondisi', 'like', '%tidak layak%');
            });
        
        // FILTER WAKAPRO: Hanya aset di ruangan workshop mereka
        if ($isWakapro) {
            if (!$ruanganId) {
                // Wakapro belum ditentukan ruangan → return empty
                return response()->json([
                    'status' => 'success',
                    'warning' => 'Anda belum ditentukan ruangan workshop. Silakan hubungi admin untuk assignment ruangan.',
                    'summary' => [
                        'total_rusak'       => 0,
                        'rusak_ringan'      => 0,
                        'rusak_berat'       => 0,
                        'tidak_layak_pakai' => 0,
                    ],
                    'data' => [],
                ]);
            }
            
            // Filter hanya aset di ruangan workshop wakapro
            $asetQuery->where('id_ruangan', $ruanganId);
        }

        if ($kondisiFilter !== 'all') {
            $asetQuery->whereHas('kondisi', function ($q) use ($kondisiFilter) {
                $q->where('nama_kondisi', $kondisiFilter);
            });
        }

        if ($lokasiFilter === 'gedung') {
            $asetQuery->whereHas('ruangan', function ($q) {
                $q->where('jenis', '!=', 'workshop');
            });
        } elseif ($lokasiFilter === 'workshop') {
            $asetQuery->whereHas('ruangan', function ($q) {
                $q->where('jenis', 'workshop');
            });
        }

        $asets = $asetQuery->get()->map(function ($a) {
            $isWorkshop   = $a->ruangan && $a->ruangan->jenis === 'workshop';
            $gedungNama   = $a->ruangan?->gedung?->nama_gedung;
            $ruanganNama  = $a->ruangan?->nama_ruangan;
            $lantai       = $a->ruangan?->lantai ? 'Lantai ' . $a->ruangan->lantai : null;

            return [
                'id'             => $a->id,
                'tipe_sumber'    => $isWorkshop ? 'workshop' : 'gedung',
                'tipe_item'      => 'aset',
                'sumber_label'   => $isWorkshop ? 'Workshop' : 'Gedung & Ruangan',
                'kode'           => $a->kode_aset,
                'nama_barang'    => $a->nama_aset,
                'merek'          => $a->merek,
                'tipe'           => $a->tipe,
                'jumlah'         => $a->jumlah,
                'satuan'         => $a->satuan,
                'kondisi'        => $a->kondisi?->nama_kondisi ?? 'Rusak',
                'gedung'         => $gedungNama ?? ($isWorkshop ? 'Workshop Mandiri' : 'Tanpa Gedung'),
                'ruangan'        => $ruanganNama ?? 'Belum Ditentukan',
                'lantai'         => $lantai,
                'lokasi_detail'  => ($gedungNama ? $gedungNama . ' · ' : '') . ($ruanganNama ?? '-') . ($lantai ? ' (' . $lantai . ')' : ''),
                'kategori'       => $a->kategori?->nama_kategori ?? '-',
                'foto_thumbnail' => $a->foto_thumbnail,
                'deskripsi'      => $a->deskripsi,
                'link_url'       => $isWorkshop ? '/dashboard/ruangan' : '/dashboard/gedung',
            ];
        });

        // 2. Sarana & Prasarana yang didistribusikan ke workshop wakapro
        $distribusiItems = collect();
        if ($isWakapro && $ruanganId) {
            $distQuery = \App\Models\DistribusiAset::with(['saranaPrasarana.folder', 'ruanganTujuan.gedung'])
                ->where('ruangan_tujuan_id', $ruanganId)
                ->where('status', 'diterima')
                ->whereHas('saranaPrasarana', function ($q) {
                    $q->where('kondisi', 'like', '%rusak%')
                      ->orWhere('kondisi', 'like', '%tidak layak%');
                });

            if ($kondisiFilter !== 'all') {
                $distQuery->whereHas('saranaPrasarana', function ($q) use ($kondisiFilter) {
                    $q->where('kondisi', $kondisiFilter);
                });
            }

            $distribusiItems = $distQuery->get()->map(function ($d) {
                $s = $d->saranaPrasarana;
                $ruanganNama = $d->ruanganTujuan?->nama_ruangan;
                $gedungNama  = $d->ruanganTujuan?->gedung?->nama_gedung;
                return [
                    'id'             => $s?->id ?? $d->id,
                    'distribusi_id'  => $d->id,
                    'tipe_sumber'    => 'workshop',
                    'tipe_item'      => 'sarana_prasarana',
                    'sumber_label'   => 'Workshop',
                    'kode'           => $s?->kode,
                    'nama_barang'    => $s?->nama_barang ?? 'Aset Workshop',
                    'merek'          => null,
                    'tipe'           => null,
                    'jumlah'         => $d->jumlah,
                    'satuan'         => $s?->satuan ?? 'Unit',
                    'kondisi'        => $s?->kondisi ?? 'Rusak',
                    'gedung'         => $gedungNama ?? 'Workshop',
                    'ruangan'        => $ruanganNama ?? 'Workshop',
                    'lantai'         => null,
                    'lokasi_detail'  => ($gedungNama ? $gedungNama . ' · ' : '') . ($ruanganNama ?? 'Workshop'),
                    'kategori'       => 'Sarana & Prasarana Workshop',
                    'foto_thumbnail' => null,
                    'deskripsi'      => $s?->keterangan,
                    'link_url'       => '/wakapro/inventaris',
                ];
            });
        }

        // 3. Sarana & Prasarana Umum (khusus Admin & non-Wakapro)
        $spItems = collect();
        if (!$isWakapro && ($lokasiFilter === 'all' || $lokasiFilter === 'sarana_prasarana')) {
            $spQuery = \App\Models\SaranaPrasarana::with('folder')
                ->where(function ($q) {
                    $q->where('kondisi', 'like', '%rusak%')
                      ->orWhere('kondisi', 'like', '%tidak layak%');
                });

            if ($kondisiFilter !== 'all') {
                $spQuery->where('kondisi', $kondisiFilter);
            }

            $spItems = $spQuery->get()->map(function ($s) {
                $folderNama = $s->folder?->nama_folder;
                return [
                    'id'             => $s->id,
                    'tipe_sumber'    => 'sarana_prasarana',
                    'tipe_item'      => 'sarana_prasarana',
                    'sumber_label'   => 'Sarana & Prasarana',
                    'kode'           => $s->kode,
                    'nama_barang'    => $s->nama_barang,
                    'merek'          => null,
                    'tipe'           => null,
                    'jumlah'         => $s->stok_akhir,
                    'satuan'         => $s->satuan,
                    'kondisi'        => $s->kondisi ?? 'Rusak',
                    'gedung'         => 'Sarana Prasarana Sekolah',
                    'ruangan'        => $folderNama ? 'Folder: ' . $folderNama : 'Penyimpanan Umum',
                    'lantai'         => null,
                    'lokasi_detail'  => 'Sarana & Prasarana' . ($folderNama ? ' · Folder: ' . $folderNama : ' · Umum'),
                    'kategori'       => 'Sarana & Prasarana',
                    'foto_thumbnail' => null,
                    'deskripsi'      => $s->keterangan,
                    'link_url'       => '/dashboard/sarana-prasarana',
                ];
            });
        }

        $all = $isWakapro ? $asets->concat($distribusiItems) : $asets->concat($spItems);

        if (!empty($search)) {
            $s = strtolower($search);
            $all = $all->filter(function ($item) use ($s) {
                return str_contains(strtolower($item['nama_barang'] ?? ''), $s) ||
                       str_contains(strtolower($item['kode'] ?? ''), $s) ||
                       str_contains(strtolower($item['lokasi_detail'] ?? ''), $s) ||
                       str_contains(strtolower($item['gedung'] ?? ''), $s) ||
                       str_contains(strtolower($item['ruangan'] ?? ''), $s);
            })->values();
        }

        // Summary counts (filtered untuk wakapro)
        if ($isWakapro && $ruanganId) {
            $countAsetTotal = \App\Models\Aset::where('id_ruangan', $ruanganId)
                ->whereHas('kondisi', function ($q) {
                    $q->where('nama_kondisi', 'like', '%rusak%')
                      ->orWhere('nama_kondisi', 'like', '%tidak layak%');
                })->count();

            $countDistTotal = \App\Models\DistribusiAset::where('ruangan_tujuan_id', $ruanganId)
                ->where('status', 'diterima')
                ->whereHas('saranaPrasarana', function ($q) {
                    $q->where('kondisi', 'like', '%rusak%')
                      ->orWhere('kondisi', 'like', '%tidak layak%');
                })->count();

            $allTotal = $countAsetTotal + $countDistTotal;

            $countRingan = \App\Models\Aset::where('id_ruangan', $ruanganId)
                ->whereHas('kondisi', fn($q) => $q->where('nama_kondisi', 'Rusak Ringan'))->count()
                + \App\Models\DistribusiAset::where('ruangan_tujuan_id', $ruanganId)
                    ->where('status', 'diterima')
                    ->whereHas('saranaPrasarana', fn($q) => $q->where('kondisi', 'Rusak Ringan'))->count();

            $countBerat = \App\Models\Aset::where('id_ruangan', $ruanganId)
                ->whereHas('kondisi', fn($q) => $q->where('nama_kondisi', 'Rusak Berat'))->count()
                + \App\Models\DistribusiAset::where('ruangan_tujuan_id', $ruanganId)
                    ->where('status', 'diterima')
                    ->whereHas('saranaPrasarana', fn($q) => $q->where('kondisi', 'Rusak Berat'))->count();

            $countTidakLayak = \App\Models\Aset::where('id_ruangan', $ruanganId)
                ->whereHas('kondisi', fn($q) => $q->where('nama_kondisi', 'Tidak Layak Pakai'))->count()
                + \App\Models\DistribusiAset::where('ruangan_tujuan_id', $ruanganId)
                    ->where('status', 'diterima')
                    ->whereHas('saranaPrasarana', fn($q) => $q->where('kondisi', 'Tidak Layak Pakai'))->count();
        } else {
            // Summary untuk admin/petugas/wakasek (semua data)
            $allTotal = \App\Models\Aset::whereHas('kondisi', function ($q) {
                $q->where('nama_kondisi', 'like', '%rusak%')
                  ->orWhere('nama_kondisi', 'like', '%tidak layak%');
            })->count() + \App\Models\SaranaPrasarana::where(function ($q) {
                $q->where('kondisi', 'like', '%rusak%')
                  ->orWhere('kondisi', 'like', '%tidak layak%');
            })->count();

            $countRingan = \App\Models\Aset::whereHas('kondisi', fn($q) => $q->where('nama_kondisi', 'Rusak Ringan'))->count()
                         + \App\Models\SaranaPrasarana::where('kondisi', 'Rusak Ringan')->count();

            $countBerat  = \App\Models\Aset::whereHas('kondisi', fn($q) => $q->where('nama_kondisi', 'Rusak Berat'))->count()
                         + \App\Models\SaranaPrasarana::where('kondisi', 'Rusak Berat')->count();

            $countTidakLayak = \App\Models\Aset::whereHas('kondisi', fn($q) => $q->where('nama_kondisi', 'Tidak Layak Pakai'))->count()
                             + \App\Models\SaranaPrasarana::where('kondisi', 'Tidak Layak Pakai')->count();
        }

        return response()->json([
            'status' => 'success',
            'summary' => [
                'total_rusak'       => $allTotal,
                'rusak_ringan'      => $countRingan,
                'rusak_berat'       => $countBerat,
                'tidak_layak_pakai' => $countTidakLayak,
            ],
            'data' => $all->values(),
        ]);
    }

    /**
     * Endpoint pelaporan / update kondisi aset oleh Wakapro atau Admin.
     * Otomatis sinkron dengan notifikasi kerusakan workshop untuk Admin.
     */
    public function laporKondisi(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'tipe_item' => 'required|in:sarana_prasarana,aset',
            'id'        => 'required|integer',
            'kondisi'   => 'required|in:Baik,Cukup Baik,Rusak Ringan,Rusak Berat,Tidak Layak Pakai',
            'catatan'   => 'nullable|string|max:500',
        ]);

        $kondisiBaru = $validated['kondisi'];
        $catatan     = $validated['catatan'] ?? null;
        $isDamaged   = in_array($kondisiBaru, ['Rusak Ringan', 'Rusak Berat', 'Tidak Layak Pakai'])
            || stripos($kondisiBaru, 'rusak') !== false
            || stripos($kondisiBaru, 'tidak layak') !== false;

        $namaBarang  = '';
        $namaRuangan = 'Workshop';
        $namaGedung  = null;
        $ruanganId   = null;
        $kodeBarang  = '-';

        if ($validated['tipe_item'] === 'sarana_prasarana') {
            $sarana = \App\Models\SaranaPrasarana::findOrFail($validated['id']);
            $namaBarang = $sarana->nama_barang;
            $kodeBarang = $sarana->kode ?? '-';
            $oldKondisi = $sarana->kondisi;

            $distribusiQuery = \App\Models\DistribusiAset::with('ruanganTujuan.gedung')
                ->where('sarana_prasarana_id', $sarana->id)
                ->where('status', 'diterima');

            if ($user->role === 'wakapro' && $user->ruangan_id) {
                $distribusiQuery->where('ruangan_tujuan_id', $user->ruangan_id);
            }

            $distribusi = $distribusiQuery->first();
            if ($distribusi) {
                $ruanganId   = $distribusi->ruangan_tujuan_id;
                $namaRuangan = $distribusi->ruanganTujuan?->nama_ruangan ?? 'Workshop';
                $namaGedung  = $distribusi->ruanganTujuan?->gedung?->nama_gedung;
            } elseif ($user->role === 'wakapro' && $user->ruangan_id) {
                $ruang = \App\Models\Ruangan::with('gedung')->find($user->ruangan_id);
                $ruanganId   = $user->ruangan_id;
                $namaRuangan = $ruang?->nama_ruangan ?? 'Workshop';
                $namaGedung  = $ruang?->gedung?->nama_gedung;
            }

            // Update SaranaPrasarana
            $sarana->update([
                'kondisi'    => $kondisiBaru,
                'keterangan' => $catatan ?: $sarana->keterangan,
            ]);

            // Log history
            try {
                \App\Models\History::create([
                    'id_user'    => $user->id,
                    'aksi'       => 'Update Kondisi Aset',
                    'keterangan' => "{$user->nama_lengkap} mengubah kondisi aset {$namaBarang} dari {$oldKondisi} menjadi {$kondisiBaru}" . ($catatan ? " (Catatan: {$catatan})" : ""),
                    'tanggal'    => now(),
                ]);
            } catch (\Exception $e) {}

            // Notifikasi ke Admin jika rusak
            if ($isDamaged) {
                try {
                    $existingNotif = \App\Models\Notifikasi::where('tipe', 'kerusakan_aset_workshop')
                        ->where('is_read', false)
                        ->where('target_role', 'admin')
                        ->where(function ($q) use ($sarana, $distribusi) {
                            $q->where('data->sarana_prasarana_id', $sarana->id);
                            if ($distribusi) {
                                $q->orWhere('data->distribusi_id', $distribusi->id);
                            }
                        })
                        ->first();

                    $notifPayload = [
                        'target_role'       => 'admin',
                        'target_user_id'    => null,
                        'target_ruangan_id' => $ruanganId,
                        'tipe'              => 'kerusakan_aset_workshop',
                        'judul'             => "Laporan Kerusakan Aset: {$namaBarang}",
                        'pesan'             => "Wakapro {$user->nama_lengkap} melaporkan aset \"{$namaBarang}\" di {$namaRuangan} dalam kondisi \"{$kondisiBaru}\"" . (!empty($catatan) ? ": \"{$catatan}\"" : "."),
                        'data'              => [
                            'distribusi_id'       => $distribusi?->id,
                            'sarana_prasarana_id' => $sarana->id,
                            'nama_barang'         => $namaBarang,
                            'kode_barang'         => $kodeBarang,
                            'kondisi'             => $kondisiBaru,
                            'catatan'             => $catatan,
                            'ruangan_id'          => $ruanganId,
                            'nama_ruangan'        => $namaRuangan,
                            'nama_gedung'         => $namaGedung,
                            'wakapro_id'          => $user->id,
                            'wakapro_nama'        => $user->nama_lengkap,
                            'link_url'            => '/dashboard/kondisi',
                        ],
                        'is_read'           => false,
                    ];

                    if ($existingNotif) {
                        $existingNotif->update($notifPayload);
                    } else {
                        \App\Models\Notifikasi::create($notifPayload);
                    }
                } catch (\Exception $e) {}
            } else {
                // Tandai notifikasi kerusakan lama sebagai sudah dibaca / diselesaikan jika kembali Baik
                try {
                    \App\Models\Notifikasi::where('tipe', 'kerusakan_aset_workshop')
                        ->where('is_read', false)
                        ->where('target_role', 'admin')
                        ->where(function ($q) use ($sarana, $distribusi) {
                            $q->where('data->sarana_prasarana_id', $sarana->id);
                            if ($distribusi) {
                                $q->orWhere('data->distribusi_id', $distribusi->id);
                            }
                        })
                        ->update(['is_read' => true]);
                } catch (\Exception $e) {}
            }

        } else {
            // Tipe: aset
            $aset = \App\Models\Aset::with('ruangan.gedung')->findOrFail($validated['id']);
            $namaBarang  = $aset->nama_aset;
            $kodeBarang  = $aset->kode_aset ?? '-';
            $ruanganId   = $aset->id_ruangan;
            $namaRuangan = $aset->ruangan?->nama_ruangan ?? 'Workshop';
            $namaGedung  = $aset->ruangan?->gedung?->nama_gedung;
            $oldKondisi  = $aset->kondisi?->nama_kondisi ?? '-';

            // Temukan / buat master kondisi
            $kondisiModel = \App\Models\Kondisi::firstOrCreate(['nama_kondisi' => $kondisiBaru]);
            $aset->update([
                'id_kondisi' => $kondisiModel->id,
                'deskripsi'  => $catatan ?: $aset->deskripsi,
            ]);

            // Log history
            try {
                \App\Models\History::create([
                    'id_aset'    => $aset->id,
                    'id_user'    => $user->id,
                    'aksi'       => 'Update Kondisi Aset',
                    'keterangan' => "{$user->nama_lengkap} mengubah kondisi aset {$namaBarang} dari {$oldKondisi} menjadi {$kondisiBaru}" . ($catatan ? " (Catatan: {$catatan})" : ""),
                    'tanggal'    => now(),
                ]);
            } catch (\Exception $e) {}

            // Notifikasi ke Admin jika rusak
            if ($isDamaged) {
                try {
                    $existingNotif = \App\Models\Notifikasi::where('tipe', 'kerusakan_aset_workshop')
                        ->where('is_read', false)
                        ->where('target_role', 'admin')
                        ->where('data->aset_id', $aset->id)
                        ->first();

                    $notifPayload = [
                        'target_role'       => 'admin',
                        'target_user_id'    => null,
                        'target_ruangan_id' => $ruanganId,
                        'tipe'              => 'kerusakan_aset_workshop',
                        'judul'             => "Laporan Kerusakan Aset: {$namaBarang}",
                        'pesan'             => "Wakapro {$user->nama_lengkap} melaporkan aset \"{$namaBarang}\" di {$namaRuangan} dalam kondisi \"{$kondisiBaru}\"" . (!empty($catatan) ? ": \"{$catatan}\"" : "."),
                        'data'              => [
                            'aset_id'      => $aset->id,
                            'nama_barang'  => $namaBarang,
                            'kode_barang'  => $kodeBarang,
                            'kondisi'      => $kondisiBaru,
                            'catatan'      => $catatan,
                            'ruangan_id'   => $ruanganId,
                            'nama_ruangan' => $namaRuangan,
                            'nama_gedung'  => $namaGedung,
                            'wakapro_id'   => $user->id,
                            'wakapro_nama' => $user->nama_lengkap,
                            'link_url'     => '/dashboard/kondisi',
                        ],
                        'is_read'           => false,
                    ];

                    if ($existingNotif) {
                        $existingNotif->update($notifPayload);
                    } else {
                        \App\Models\Notifikasi::create($notifPayload);
                    }
                } catch (\Exception $e) {}
            } else {
                try {
                    \App\Models\Notifikasi::where('tipe', 'kerusakan_aset_workshop')
                        ->where('is_read', false)
                        ->where('target_role', 'admin')
                        ->where('data->aset_id', $aset->id)
                        ->update(['is_read' => true]);
                } catch (\Exception $e) {}
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => $isDamaged
                ? "Laporan kerusakan untuk \"{$namaBarang}\" berhasil dikirimkan ke Admin."
                : "Kondisi aset \"{$namaBarang}\" berhasil diperbarui menjadi {$kondisiBaru}.",
        ]);
    }
}
