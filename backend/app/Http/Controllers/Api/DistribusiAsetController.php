<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DistribusiAset;
use App\Models\SaranaPrasarana;
use App\Models\Ruangan;
use App\Models\User;
use App\Models\History;
use App\Models\Notifikasi;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DistribusiAsetController extends Controller
{
    /**
     * Tampilkan daftar pengiriman aset / distribusi
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = DistribusiAset::with([
            'saranaPrasarana',
            'ruanganTujuan.gedung',
            'petugasPengirim',
            'wakaproPenerima',
        ]);

        // Jika Wakapro, batasi HANYA ruangan miliknya berdasarkan ruangan_id
        // Jika ruangan_id belum di-assign, kembalikan data kosong (bukan fallback ke wakapro_penerima_id
        // karena itu bisa menyebabkan wakapro melihat distribusi milik workshop lain)
        if ($user->role === 'wakapro') {
            if ($user->ruangan_id) {
                $query->where('ruangan_tujuan_id', $user->ruangan_id);
            } else {
                // Ruangan belum di-assign — kembalikan kosong agar tidak bocor ke data workshop lain
                return response()->json([]);
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('ruangan_id')) {
            $query->where('ruangan_tujuan_id', $request->ruangan_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nomor_surat_jalan', 'like', "%{$search}%")
                  ->orWhere('nomor_bast', 'like', "%{$search}%")
                  ->orWhere('nomor_pengiriman', 'like', "%{$search}%")
                  ->orWhereHas('saranaPrasarana', function ($sq) use ($search) {
                      $sq->where('nama_barang', 'like', "%{$search}%")
                         ->orWhere('kode', 'like', "%{$search}%");
                  });
            });
        }

        $items = $query->latest('tanggal_kirim')->latest('id')->get();

        return response()->json($items);
    }

    /**
     * Petugas Input / Super Admin mendistribusikan aset ke bengkel (terbit Surat Jalan)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'sarana_prasarana_id' => 'required|exists:sarana_prasaranas,id',
            'ruangan_tujuan_id'   => 'required|exists:ruangans,id',
            'jumlah'              => 'nullable|integer|min:1',
            'harga_satuan'        => 'nullable|numeric|min:0',
            'catatan_pengiriman'  => 'nullable|string',
        ]);

        $user = $request->user();
        $jumlah = $validated['jumlah'] ?? 1;

        $sarana = SaranaPrasarana::find($validated['sarana_prasarana_id']);
        $hargaSatuan = isset($validated['harga_satuan']) && $validated['harga_satuan'] !== ''
            ? (float) $validated['harga_satuan']
            : (float) ($sarana?->nilai_harga_pembelian ?? 0);
        $totalHarga = $hargaSatuan * $jumlah;

        // Cari Wakapro yang bertanggung jawab atas ruangan tujuan jika ada
        $wakapro = User::where('role', 'wakapro')
            ->where('ruangan_id', $validated['ruangan_tujuan_id'])
            ->first();

        // Generate Nomor Surat Jalan: SJ-YYYYMM-XXXX
        $prefix = 'SJ-' . date('Ym') . '-';
        $countThisMonth = DistribusiAset::where('nomor_surat_jalan', 'like', "{$prefix}%")->count();
        $nomorSuratJalan = $prefix . str_pad($countThisMonth + 1, 4, '0', STR_PAD_LEFT);

        $distribusi = DB::transaction(function () use ($validated, $user, $wakapro, $nomorSuratJalan, $jumlah, $hargaSatuan, $totalHarga, $sarana) {
            $record = DistribusiAset::create([
                'nomor_surat_jalan'   => $nomorSuratJalan,
                'sarana_prasarana_id' => $validated['sarana_prasarana_id'],
                'ruangan_tujuan_id'   => $validated['ruangan_tujuan_id'],
                'petugas_pengirim_id' => $user->id,
                'wakapro_penerima_id' => $wakapro ? $wakapro->id : null,
                'jumlah'              => $jumlah,
                'harga_satuan'        => $hargaSatuan,
                'total_harga'         => $totalHarga,
                'tanggal_kirim'       => Carbon::today(),
                'status'              => 'menunggu_konfirmasi',
                'catatan_pengiriman'  => $validated['catatan_pengiriman'] ?? null,
            ]);

            // Update lokasi ruangan pada sarana prasarana
            $sarana = SaranaPrasarana::find($validated['sarana_prasarana_id']);
            if ($sarana) {
                $sarana->update(['id_ruangan' => $validated['ruangan_tujuan_id']]);
            }

            // Catat history aktivitas jika model History aktif
            try {
                History::create([
                    'user_id'    => $user->id,
                    'aksi'       => 'Kirim Aset ke Bengkel',
                    'keterangan' => "Pengiriman {$sarana->nama_barang} dengan No. {$nomorSuratJalan} ke bengkel tujuan.",
                    'tanggal'    => Carbon::now(),
                ]);
            } catch (\Exception $e) {
                // Abaikan jika history opsional
            }

            return $record;
        });

        $distribusi->load(['saranaPrasarana', 'ruanganTujuan.gedung', 'petugasPengirim', 'wakaproPenerima']);

        return response()->json([
            'message' => 'Pengiriman aset berhasil dicatat. Surat Jalan telah dibuat.',
            'data'    => $distribusi,
        ], 201);
    }

    /**
     * Bulk store - Distribusi banyak aset sekaligus
     */
    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'ruangan_tujuan_id'   => 'required|exists:ruangans,id',
            'catatan_pengiriman'  => 'nullable|string',
            'items'               => 'required|array|min:1',
            'items.*.sarana_prasarana_id' => 'nullable|exists:sarana_prasaranas,id',
            'items.*.jumlah'      => 'required|integer|min:1',
            'items.*.harga_satuan' => 'nullable|numeric|min:0',
            // Data untuk barang baru jika sarana_prasarana_id tidak ada
            'items.*.nama_barang' => 'nullable|string',
            'items.*.satuan'      => 'nullable|string',
            'items.*.kondisi'     => 'nullable|string|in:Baik,Rusak Ringan,Rusak Berat',
            'items.*.keterangan'  => 'nullable|string',
        ]);

        $user = $request->user();
        $ruanganTujuanId = $validated['ruangan_tujuan_id'];

        // Cari Wakapro yang bertanggung jawab atas ruangan tujuan jika ada
        $wakapro = User::where('role', 'wakapro')
            ->where('ruangan_id', $ruanganTujuanId)
            ->first();

        $distribusiResults = DB::transaction(function () use ($validated, $user, $wakapro, $ruanganTujuanId) {
            $results = [];
            $prefix = 'SJ-' . date('Ym') . '-';

            // ── Generate satu Nomor Pengiriman untuk seluruh batch ───────────
            $npPrefix = 'PGRM-' . date('Ym') . '-';
            $npCount  = DistribusiAset::where('nomor_pengiriman', 'like', "{$npPrefix}%")
                            ->distinct('nomor_pengiriman')
                            ->count('nomor_pengiriman');
            $nomorPengiriman = $npPrefix . str_pad($npCount + 1, 4, '0', STR_PAD_LEFT);

            foreach ($validated['items'] as $item) {
                $hargaSatuan = isset($item['harga_satuan']) && $item['harga_satuan'] !== ''
                    ? (float) $item['harga_satuan']
                    : 0;

                // Jika sarana_prasarana_id tidak ada, buat data barang baru
                if (empty($item['sarana_prasarana_id'])) {
                    if (empty($item['nama_barang'])) {
                        continue; // Skip jika nama barang kosong
                    }

                    // Generate kode otomatis untuk barang baru
                    $kodePrefix = 'BRG-' . date('Ym') . '-';
                    $countBarang = SaranaPrasarana::where('kode', 'like', "{$kodePrefix}%")->count();
                    $kode = $kodePrefix . str_pad($countBarang + 1, 4, '0', STR_PAD_LEFT);

                    $saranaNew = SaranaPrasarana::create([
                        'kode'                  => $kode,
                        'nama_barang'           => $item['nama_barang'],
                        'satuan'                => $item['satuan'] ?? 'Unit',
                        'stok_awal'             => $item['jumlah'],
                        'stok_masuk'            => 0,
                        'stok_keluar'           => 0,
                        'nilai_harga_pembelian' => $hargaSatuan,
                        'nilai_harga_sekarang'  => $hargaSatuan,
                        'kondisi'               => $item['kondisi'] ?? 'Baik',
                        'keterangan'            => $item['keterangan'] ?? 'Input manual saat distribusi',
                        'id_user'               => $user->id,
                    ]);

                    $saranaId = $saranaNew->id;
                } else {
                    $saranaId = $item['sarana_prasarana_id'];
                    $saranaExist = SaranaPrasarana::find($saranaId);
                    if ($hargaSatuan <= 0 && $saranaExist) {
                        $hargaSatuan = (float) ($saranaExist->nilai_harga_pembelian ?? 0);
                    }
                }

                $totalHarga = $hargaSatuan * $item['jumlah'];

                // Generate Nomor Surat Jalan untuk setiap item
                $countThisMonth = DistribusiAset::where('nomor_surat_jalan', 'like', "{$prefix}%")->count();
                $nomorSuratJalan = $prefix . str_pad($countThisMonth + 1, 4, '0', STR_PAD_LEFT);

                $distribusi = DistribusiAset::create([
                    'nomor_surat_jalan'   => $nomorSuratJalan,
                    'nomor_pengiriman'    => $nomorPengiriman,
                    'sarana_prasarana_id' => $saranaId,
                    'ruangan_tujuan_id'   => $ruanganTujuanId,
                    'petugas_pengirim_id' => $user->id,
                    'wakapro_penerima_id' => $wakapro ? $wakapro->id : null,
                    'jumlah'              => $item['jumlah'],
                    'harga_satuan'        => $hargaSatuan,
                    'total_harga'         => $totalHarga,
                    'tanggal_kirim'       => Carbon::today(),
                    'status'              => 'menunggu_konfirmasi',
                    'catatan_pengiriman'  => $validated['catatan_pengiriman'] ?? null,
                ]);

                // Update lokasi ruangan pada sarana prasarana
                $sarana = SaranaPrasarana::find($saranaId);
                if ($sarana) {
                    $sarana->update(['id_ruangan' => $ruanganTujuanId]);
                }

                $distribusi->load(['saranaPrasarana', 'ruanganTujuan.gedung', 'petugasPengirim', 'wakaproPenerima']);
                $results[] = $distribusi;
            }

            // Catat history aktivitas jika model History aktif
            try {
                History::create([
                    'user_id'    => $user->id,
                    'aksi'       => 'Distribusi Bulk Aset',
                    'keterangan' => "Distribusi " . count($results) . " item barang ke workshop.",
                    'tanggal'    => Carbon::now(),
                ]);
            } catch (\Exception $e) {
                // Abaikan jika history opsional
            }

            // Kirim notifikasi terkhususkan HANYA untuk Wakapro workshop penerima
            try {
                $countResults = count($results);
                $namaRuang = Ruangan::find($ruanganTujuanId)?->nama_ruangan ?? 'Workshop';
                $existingDistNotif = Notifikasi::where('tipe', 'distribusi_masuk')
                    ->where('target_ruangan_id', $ruanganTujuanId)
                    ->where('is_read', false)
                    ->first();

                if ($existingDistNotif) {
                    $existingDistNotif->update([
                        'judul' => "Pengiriman Aset Baru ke Workshop",
                        'pesan' => "Petugas {$user->nama_lengkap} menambahkan pengiriman aset ke {$namaRuang}. Terdapat item yang menunggu verifikasi dan BAST.",
                        'updated_at' => Carbon::now(),
                    ]);
                } else {
                    Notifikasi::create([
                        'target_role'       => 'wakapro',
                        'target_user_id'    => $wakapro ? $wakapro->id : null,
                        'target_ruangan_id' => $ruanganTujuanId,
                        'tipe'              => 'distribusi_masuk',
                        'judul'             => "Pengiriman Aset Baru ({$countResults} Item)",
                        'pesan'             => "Petugas {$user->nama_lengkap} mengirimkan {$countResults} item barang ke {$namaRuang}. Silakan periksa fisik barang dan lakukan konfirmasi BAST.",
                        'data'              => [
                            'ruangan_id' => $ruanganTujuanId,
                            'link_url'   => '/wakapro/penerimaan',
                        ],
                        'is_read'           => false,
                    ]);
                }
            } catch (\Exception $e) {
                // Jangan gagalkan transaksi jika notifikasi gagal
            }

            return $results;
        });

        return response()->json([
            'message' => count($distribusiResults) . ' item barang berhasil didistribusikan ke workshop.',
            'data'    => $distribusiResults,
        ], 201);
    }

    /**
     * Pencarian barang untuk autocomplete
     */
    public function searchBarang(Request $request)
    {
        $search = $request->get('q', '');
        
        $results = SaranaPrasarana::where(function ($query) use ($search) {
            $query->where('nama_barang', 'like', "%{$search}%")
                  ->orWhere('kode', 'like', "%{$search}%");
        })
        ->with('folder')
        ->limit(20)
        ->get()
        ->map(function ($item) {
            return [
                'id'                    => $item->id,
                'kode'                  => $item->kode,
                'nama_barang'           => $item->nama_barang,
                'satuan'                => $item->satuan,
                'stok_akhir'            => $item->stok_akhir,
                'kondisi'               => $item->kondisi,
                'nilai_harga_pembelian' => (float) ($item->nilai_harga_pembelian ?? 0),
                'folder_nama'           => $item->folder ? $item->folder->nama_folder : null,
            ];
        });

        return response()->json($results);
    }

    /**
     * Konfirmasi penerimaan aset oleh Wakapro (atau Super Admin)
     */
    public function konfirmasi(Request $request, $id)
    {
        $distribusi = DistribusiAset::findOrFail($id);
        $user = $request->user();

        // Validasi hak akses: wakapro hanya boleh konfirmasi distribusi ke ruangannya sendiri
        if ($user->role === 'wakapro') {
            if (!$user->ruangan_id) {
                return response()->json([
                    'message' => 'Akun Anda belum terhubung ke ruangan manapun. Hubungi administrator.',
                ], 403);
            }
            if ($distribusi->ruangan_tujuan_id != $user->ruangan_id) {
                return response()->json([
                    'message' => 'Anda tidak memiliki hak untuk mengonfirmasi barang ruangan lain.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'aksi'                => 'required|in:terima,tolak',
            'catatan_penerimaan'  => 'nullable|string',
            'kondisi_diterima'    => 'nullable|in:Baik,Rusak Ringan,Rusak Berat',
            'foto_kerusakan'      => 'nullable|file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($validated['aksi'] === 'terima') {
            $kondisi = $validated['kondisi_diterima'] ?? 'Baik';

            // Jika barang diterima dalam kondisi rusak, wajib menyertakan foto kerusakan
            if (in_array($kondisi, ['Rusak Ringan', 'Rusak Berat'])) {
                if (!$request->hasFile('foto_kerusakan') && !$distribusi->foto_kerusakan) {
                    return response()->json([
                        'message' => 'Wajib mengunggah foto kerusakan saat menerima barang dengan kondisi rusak.',
                        'errors'  => [
                            'foto_kerusakan' => ['Foto barang rusak wajib dilampirkan jika kondisi barang Rusak Ringan atau Rusak Berat.']
                        ]
                    ], 422);
                }
            }

            $fotoKerusakanPath = $distribusi->foto_kerusakan;
            if ($request->hasFile('foto_kerusakan')) {
                if ($fotoKerusakanPath && Storage::disk('public')->exists($fotoKerusakanPath)) {
                    Storage::disk('public')->delete($fotoKerusakanPath);
                }
                $fotoKerusakanPath = $request->file('foto_kerusakan')->store('distribusi/kerusakan', 'public');
            }

            // Generate Nomor BAST: BAST-YYYYMM-XXXX
            $prefix = 'BAST-' . date('Ym') . '-';
            $countThisMonth = DistribusiAset::where('nomor_bast', 'like', "{$prefix}%")->count();
            $nomorBast = $prefix . str_pad($countThisMonth + 1, 4, '0', STR_PAD_LEFT);

            $distribusi->update([
                'status'              => 'diterima',
                'nomor_bast'          => $nomorBast,
                'tanggal_terima'      => Carbon::now(),
                'wakapro_penerima_id' => $user->id,
                'catatan_penerimaan'  => $validated['catatan_penerimaan'] ?? ($kondisi === 'Baik' ? 'Barang telah diperiksa fisik dan diterima dalam kondisi baik.' : "Barang diterima dalam kondisi {$kondisi}."),
                'foto_kerusakan'      => $fotoKerusakanPath,
            ]);

            // Jika ada perubahan kondisi saat diterima
            $sarana = SaranaPrasarana::find($distribusi->sarana_prasarana_id);
            if ($sarana) {
                $saranaData = ['kondisi' => $kondisi];
                if ($fotoKerusakanPath) {
                    $saranaData['foto_kerusakan'] = $fotoKerusakanPath;
                }
                $sarana->update($saranaData);
            }

            $message = "Aset berhasil diterima dan Berita Acara Serah Terima ({$nomorBast}) telah diterbitkan.";
        } else {
            $distribusi->update([
                'status'             => 'ditolak',
                'tanggal_terima'     => Carbon::now(),
                'catatan_penerimaan' => $validated['catatan_penerimaan'] ?? 'Ditolak saat pemeriksaan fisik di bengkel.',
            ]);

            $message = 'Konfirmasi pengiriman aset ditolak dengan catatan.';
        }

        // Cek sisa aset yang menunggu konfirmasi di ruangan ini; jika 0, tandai notifikasi distribusi masuk sebagai selesai/dibaca
        try {
            $sisaMenunggu = DistribusiAset::where('ruangan_tujuan_id', $distribusi->ruangan_tujuan_id)
                ->where('status', 'menunggu_konfirmasi')
                ->count();

            if ($sisaMenunggu === 0) {
                Notifikasi::where('tipe', 'distribusi_masuk')
                    ->where('target_ruangan_id', $distribusi->ruangan_tujuan_id)
                    ->where('is_read', false)
                    ->update(['is_read' => true]);
            }

            // Notifikasi ke Admin bahwa Wakapro telah memproses serah terima
            $namaBarang = $distribusi->saranaPrasarana?->nama_barang ?? 'Aset';
            $namaRuang  = $distribusi->ruanganTujuan?->nama_ruangan ?? 'Workshop';
            $statusText = $validated['aksi'] === 'terima' ? 'menerima' : 'menolak';

            Notifikasi::create([
                'target_role'        => 'admin',
                'target_user_id'     => null,
                'target_ruangan_id'  => $distribusi->ruangan_tujuan_id,
                'tipe'               => 'konfirmasi_distribusi',
                'judul'              => "Konfirmasi BAST: {$namaBarang}",
                'pesan'              => "Wakapro {$user->nama_lengkap} ({$namaRuang}) telah {$statusText} distribusi aset \"{$namaBarang}\"." . (!empty($validated['catatan_penerimaan']) ? " Catatan: \"{$validated['catatan_penerimaan']}\"" : ""),
                'data'               => [
                    'distribusi_id' => $distribusi->id,
                    'aksi'          => $validated['aksi'],
                    'ruangan_id'    => $distribusi->ruangan_tujuan_id,
                    'link_url'      => '/dashboard/distribusi-aset',
                ],
                'is_read'            => false,
            ]);
        } catch (\Exception $e) {
            // Abaikan agar tidak menggagalkan response
        }

        $distribusi->load(['saranaPrasarana', 'ruanganTujuan.gedung', 'petugasPengirim', 'wakaproPenerima']);

        return response()->json([
            'message' => $message,
            'data'    => $distribusi,
        ]);
    }

    /**
     * Mengambil data terformat untuk cetak Surat Jalan (satu item)
     */
    public function cetakSuratJalan($id)
    {
        $distribusi = DistribusiAset::with([
            'saranaPrasarana.folder',
            'ruanganTujuan.gedung',
            'petugasPengirim',
            'wakaproPenerima',
        ])->findOrFail($id);

        return response()->json($distribusi);
    }

    /**
     * Mengambil data terformat untuk cetak Surat Jalan Bulk (seluruh batch nomor_pengiriman)
     */
    public function cetakSuratJalanBulk($nomorPengiriman)
    {
        $items = DistribusiAset::with([
            'saranaPrasarana.folder',
            'ruanganTujuan.gedung',
            'petugasPengirim',
            'wakaproPenerima',
        ])
        ->where('nomor_pengiriman', $nomorPengiriman)
        ->latest('id')
        ->get();

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Nomor pengiriman tidak ditemukan.'], 404);
        }

        return response()->json([
            'nomor_pengiriman' => $nomorPengiriman,
            'items'            => $items,
        ]);
    }

    /**
     * Mengambil data terformat untuk cetak Berita Acara Serah Terima (BAST)
     */
    public function cetakBast($id)
    {
        $distribusi = DistribusiAset::with([
            'saranaPrasarana.folder',
            'ruanganTujuan.gedung',
            'petugasPengirim',
            'wakaproPenerima',
        ])->findOrFail($id);

        // Ambil data Wakasek Sarpras untuk tanda tangan mengetahui
        $wakasek = User::where('role', 'wakasek')->where('status', true)->first();

        return response()->json([
            'distribusi' => $distribusi,
            'wakasek'    => $wakasek,
        ]);
    }

    /**
     * Statistik Operasional Khusus Petugas Input (Dashboard KPI)
     */
    public function statsPetugas(Request $request)
    {
        $now = Carbon::now();

        $totalDiinput = SaranaPrasarana::count();
        $inputBulanIni = SaranaPrasarana::whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->count();

        $menungguKonfirmasi = DistribusiAset::where('status', 'menunggu_konfirmasi')->count();
        $selesaiSerahTerima = DistribusiAset::where('status', 'diterima')->count();

        // 5 Pengiriman Terakhir (Live Tracker)
        $distribusiTerbaru = DistribusiAset::with([
            'saranaPrasarana',
            'ruanganTujuan.gedung',
            'petugasPengirim',
            'wakaproPenerima'
        ])
        ->latest('tanggal_kirim')
        ->latest('id')
        ->take(5)
        ->get();

        // 5 Aset Terakhir yang Diinput
        $inputTerbaru = SaranaPrasarana::latest('id')
            ->take(5)
            ->get();

        // Sebaran Aset per Bengkel / Ruangan
        $sebaranBengkel = Ruangan::where('jenis', 'workshop')
            ->orWhere('nama_ruangan', 'like', '%Bengkel%')
            ->orWhere('nama_ruangan', 'like', '%Lab%')
            ->take(6)
            ->get()
            ->map(function ($r) {
                $count = DistribusiAset::where('ruangan_tujuan_id', $r->id)->sum('jumlah');
                return [
                    'nama_ruangan' => $r->nama_ruangan,
                    'total_aset'   => (int) $count,
                ];
            });

        return response()->json([
            'total_diinput'        => $totalDiinput,
            'input_bulan_ini'      => $inputBulanIni,
            'menunggu_konfirmasi'  => $menungguKonfirmasi,
            'selesai_serah_terima' => $selesaiSerahTerima,
            'distribusi_terbaru'   => $distribusiTerbaru,
            'input_terbaru'        => $inputTerbaru,
            'sebaran_bengkel'      => $sebaranBengkel,
        ]);
    }

    /**
     * Statistik Khusus Dashboard Wakapro (Kepala Workshop / Bengkel Jurusan)
     */
    public function statsWakapro(Request $request)
    {
        $user = $request->user();
        $ruanganId = $user ? $user->ruangan_id : null;

        // Jika ruangan belum diassign, kembalikan empty stats — jangan fallback ke workshop lain
        if (!$ruanganId) {
            return response()->json([
                'ruangan'             => null,
                'total_unit'          => 0,
                'total_item_jenis'    => 0,
                'kondisi_baik'        => 0,
                'kondisi_rusak'       => 0,
                'menunggu_konfirmasi' => 0,
                'menunggu_list'       => [],
                'aset_list'           => [],
                'distribusi_terbaru'  => [],
                'warning'             => 'Akun Anda belum terhubung ke ruangan manapun. Hubungi administrator.',
            ]);
        }

        $ruangan = Ruangan::with('gedung')->find($ruanganId);
        $semuaDistribusi = DistribusiAset::with([
            'saranaPrasarana',
            'ruanganTujuan.gedung',
            'petugasPengirim',
            'wakaproPenerima'
        ])
        ->where('ruangan_tujuan_id', $ruanganId)
        ->latest('tanggal_kirim')
        ->latest('id')
        ->get();

        // Distribusi yang sudah diterima (fisik aktif di bengkel)
        $diterima = $semuaDistribusi->where('status', 'diterima');
        
        // Distribusi yang masih menunggu verifikasi fisik Wakapro
        $menunggu = $semuaDistribusi->where('status', 'menunggu_konfirmasi');

        // Total unit fisik di bengkel
        $totalUnit = (int) $diterima->sum('jumlah');
        $totalItemJenis = $diterima->pluck('sarana_prasarana_id')->unique()->count();

        // Hitung total nilai aset dan kondisi berdasarkan sarana_prasarana yang diterima
        $totalNilaiAset = 0;
        $kondisiBaik = 0;
        $kondisiRusak = 0;
        foreach ($diterima as $dist) {
            $harga = (float) ($dist->total_harga ?: ($dist->jumlah * ($dist->harga_satuan ?: ($dist->saranaPrasarana?->nilai_harga_pembelian ?? 0))));
            $totalNilaiAset += $harga;

            $kondisi = $dist->saranaPrasarana?->kondisi ?? 'Baik';
            $isRusak = in_array($kondisi, ['Rusak Ringan', 'Rusak Berat', 'Tidak Layak Pakai'])
                || stripos($kondisi, 'rusak') !== false
                || stripos($kondisi, 'tidak layak') !== false;
            if ($isRusak) {
                $kondisiRusak += (int) $dist->jumlah;
            } else {
                $kondisiBaik += (int) $dist->jumlah;
            }
        }

        return response()->json([
            'ruangan'             => $ruangan,
            'total_unit'          => $totalUnit,
            'total_item_jenis'    => $totalItemJenis,
            'total_nilai_aset'    => $totalNilaiAset,
            'kondisi_baik'        => $kondisiBaik,
            'kondisi_rusak'       => $kondisiRusak,
            'menunggu_konfirmasi' => $menunggu->count(),
            'menunggu_list'       => $menunggu->values(),
            'aset_list'           => $diterima->values(),
            'distribusi_terbaru'  => $semuaDistribusi->take(6)->values(),
        ]);
    }

    /**
     * Inventaris lengkap workshop milik wakapro yang sedang login.
     * Hanya menampilkan aset yang sudah berstatus 'diterima' (sudah BAST)
     * dari distribusi ke ruangan wakapro ini.
     */
    public function inventarisWorkshop(Request $request)
    {
        $user = $request->user();

        if (!$user->ruangan_id) {
            return response()->json([
                'ruangan'  => null,
                'items'    => [],
                'summary'  => ['total_unit' => 0, 'total_jenis' => 0, 'total_nilai' => 0, 'kondisi_baik' => 0, 'kondisi_rusak' => 0],
                'warning'  => 'Akun Anda belum terhubung ke ruangan manapun. Hubungi administrator.',
            ]);
        }

        $ruangan = Ruangan::with('gedung')->find($user->ruangan_id);

        $query = DistribusiAset::with([
            'saranaPrasarana',
            'petugasPengirim',
            'wakaproPenerima',
        ])
        ->where('ruangan_tujuan_id', $user->ruangan_id)
        ->where('status', 'diterima'); // Hanya yang sudah diterima via BAST

        // Filter kondisi
        if ($request->filled('kondisi')) {
            $query->whereHas('saranaPrasarana', function ($q) use ($request) {
                $q->where('kondisi', $request->kondisi);
            });
        }

        // Pencarian
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('saranaPrasarana', function ($q) use ($search) {
                $q->where('nama_barang', 'like', "%{$search}%")
                  ->orWhere('kode', 'like', "%{$search}%");
            });
        }

        $items = $query->latest('tanggal_terima')->latest('id')->get();

        // Hitung summary
        $totalUnit   = (int) $items->sum('jumlah');
        $totalJenis  = $items->pluck('sarana_prasarana_id')->unique()->count();
        $totalNilai  = 0;
        $kondisiBaik = 0;
        $kondisiRusak = 0;
        foreach ($items as $item) {
            $harga = (float) ($item->total_harga ?: ($item->jumlah * ($item->harga_satuan ?: ($item->saranaPrasarana?->nilai_harga_pembelian ?? 0))));
            $totalNilai += $harga;

            $k = $item->saranaPrasarana?->kondisi ?? 'Baik';
            $isRusak = in_array($k, ['Rusak Ringan', 'Rusak Berat', 'Tidak Layak Pakai'])
                || stripos($k, 'rusak') !== false
                || stripos($k, 'tidak layak') !== false;
            if ($isRusak) {
                $kondisiRusak += (int) $item->jumlah;
            } else {
                $kondisiBaik += (int) $item->jumlah;
            }
        }

        return response()->json([
            'ruangan' => $ruangan,
            'items'   => $items->values(),
            'summary' => [
                'total_unit'   => $totalUnit,
                'total_jenis'  => $totalJenis,
                'total_nilai'  => $totalNilai,
                'kondisi_baik' => $kondisiBaik,
                'kondisi_rusak'=> $kondisiRusak,
            ],
        ]);
    }

    /**
     * Wakapro update kondisi aset di inventaris workshop mereka
     * (untuk laporan kerusakan/service)
     */
    public function updateKondisiInventaris(Request $request, $id)
    {
        $user = $request->user();
        
        // Cari distribusi item
        $distribusi = DistribusiAset::with(['saranaPrasarana', 'ruanganTujuan.gedung'])->findOrFail($id);
        
        // Validasi: Hanya wakapro yang punya ruangan ini yang bisa update
        if ($user->role === 'wakapro') {
            if (!$user->ruangan_id || $distribusi->ruangan_tujuan_id != $user->ruangan_id) {
                return response()->json([
                    'message' => 'Anda tidak memiliki akses untuk mengubah kondisi aset ini.'
                ], 403);
            }
        }
        
        $validated = $request->validate([
            'kondisi' => 'required|in:Baik,Cukup Baik,Rusak Ringan,Rusak Berat,Tidak Layak Pakai',
            'catatan' => 'nullable|string|max:500',
        ]);
        
        // Update kondisi di sarana_prasarana (sumber data)
        if ($distribusi->saranaPrasarana) {
            $oldKondisi = $distribusi->saranaPrasarana->kondisi;
            $distribusi->saranaPrasarana->update([
                'kondisi' => $validated['kondisi'],
                'keterangan' => $validated['catatan'] ?? $distribusi->saranaPrasarana->keterangan,
            ]);
            
            // Log history (using correct History model fields)
            try {
                History::create([
                    'id_user' => $user->id,
                    'aksi' => 'Update Kondisi Aset',
                    'keterangan' => "Wakapro {$user->nama_lengkap} mengubah kondisi aset {$distribusi->saranaPrasarana->nama_barang} dari {$oldKondisi} menjadi {$validated['kondisi']}",
                    'tanggal' => Carbon::now(),
                ]);
            } catch (\Exception $e) {
                // History logging is optional, don't fail the request if it errors
            }

            // Notifikasi ke Admin jika aset minimal mengalami Kerusakan Ringan
            $isDamaged = in_array($validated['kondisi'], ['Rusak Ringan', 'Rusak Berat', 'Tidak Layak Pakai'])
                || stripos($validated['kondisi'], 'rusak') !== false
                || stripos($validated['kondisi'], 'tidak layak') !== false;

            if ($isDamaged) {
                try {
                    $namaBarang  = $distribusi->saranaPrasarana->nama_barang ?? 'Barang Workshop';
                    $namaRuangan = $distribusi->ruanganTujuan?->nama_ruangan ?? 'Workshop';
                    $namaGedung  = $distribusi->ruanganTujuan?->gedung?->nama_gedung ?? null;
                    $pelapor     = $user ? $user->nama_lengkap : 'Wakapro';

                    // Cek apakah sudah ada notifikasi kerusakan yang belum dibaca untuk aset/distribusi ini agar tidak dobel / menumpuk
                    $existingNotif = Notifikasi::where('tipe', 'kerusakan_aset_workshop')
                        ->where('is_read', false)
                        ->where('target_role', 'admin')
                        ->where(function ($q) use ($distribusi) {
                            $q->where('data->distribusi_id', $distribusi->id)
                              ->orWhere('data->sarana_prasarana_id', $distribusi->sarana_prasarana_id);
                        })
                        ->first();

                    $notifPayload = [
                        'target_role'        => 'admin',
                        'target_user_id'     => null,
                        'target_ruangan_id'  => $distribusi->ruangan_tujuan_id,
                        'tipe'               => 'kerusakan_aset_workshop',
                        'judul'              => "Laporan Kerusakan Aset: {$namaBarang}",
                        'pesan'              => "Wakapro {$pelapor} melaporkan aset \"{$namaBarang}\" di {$namaRuangan} dalam kondisi \"{$validated['kondisi']}\"" . (!empty($validated['catatan']) ? ": \"{$validated['catatan']}\"" : "."),
                        'data'               => [
                            'distribusi_id'       => $distribusi->id,
                            'sarana_prasarana_id' => $distribusi->sarana_prasarana_id,
                            'nama_barang'         => $namaBarang,
                            'kode_barang'         => $distribusi->saranaPrasarana->kode ?? '-',
                            'kondisi'             => $validated['kondisi'],
                            'catatan'             => $validated['catatan'] ?? null,
                            'ruangan_id'          => $distribusi->ruangan_tujuan_id,
                            'nama_ruangan'        => $namaRuangan,
                            'nama_gedung'         => $namaGedung,
                            'wakapro_id'          => $user?->id,
                            'wakapro_nama'        => $pelapor,
                            'link_url'            => '/dashboard/kondisi',
                        ],
                        'is_read'            => false,
                    ];

                    if ($existingNotif) {
                        // Perbarui notifikasi lama agar tidak menumpuk dobel
                        $existingNotif->update($notifPayload);
                    } else {
                        Notifikasi::create($notifPayload);
                    }
                } catch (\Exception $e) {
                    // Jangan gagalkan request jika notifikasi gagal disimpan
                }
            } else {
                // Jika kondisi aset sudah kembali "Baik" / tidak rusak, tandai notifikasi kerusakan lama sebagai sudah dibaca / diselesaikan
                try {
                    Notifikasi::where('tipe', 'kerusakan_aset_workshop')
                        ->where('is_read', false)
                        ->where('target_role', 'admin')
                        ->where(function ($q) use ($distribusi) {
                            $q->where('data->distribusi_id', $distribusi->id)
                              ->orWhere('data->sarana_prasarana_id', $distribusi->sarana_prasarana_id);
                        })
                        ->update(['is_read' => true]);
                } catch (\Exception $e) {
                    // abaikan
                }
            }
        }
        
        return response()->json([
            'message' => 'Kondisi aset berhasil diperbarui',
            'data' => $distribusi->fresh(['saranaPrasarana']),
        ]);
    }

    /**
     * Daftar barang / aset yang berada di workshop milik wakapro tertentu (yang sedang login).
     * Digunakan untuk opsi "Pilih Barang" di modul Servis & Perbaikan Wakapro.
     */
    public function pilihBarangWorkshop(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->ruangan_id) {
            return response()->json([
                'ruangan' => null,
                'items'   => [],
                'warning' => 'Akun Anda belum terhubung ke ruangan workshop manapun. Hubungi administrator.',
            ]);
        }

        $ruangan = Ruangan::with('gedung')->find($user->ruangan_id);

        // 1. Sarana Prasarana yang telah diterima via BAST di workshop wakapro ini
        $distribusiItems = DistribusiAset::with(['saranaPrasarana'])
            ->where('ruangan_tujuan_id', $user->ruangan_id)
            ->where('status', 'diterima')
            ->get();

        $saranas = $distribusiItems
            ->pluck('saranaPrasarana')
            ->filter()
            ->unique('id')
            ->values()
            ->map(function ($s) use ($distribusiItems) {
                $totalUnit = (int) $distribusiItems->where('sarana_prasarana_id', $s->id)->sum('jumlah');
                return [
                    'id'                  => $s->id,
                    'sarana_prasarana_id' => $s->id,
                    'id_aset'             => null,
                    'tipe'                => 'sarana_prasarana',
                    'nama_barang'         => $s->nama_barang,
                    'kode'                => $s->kode,
                    'kondisi'             => $s->kondisi ?? 'Baik',
                    'jumlah'              => $totalUnit,
                    'satuan'              => $s->satuan ?? 'Unit',
                    'keterangan'          => $s->keterangan,
                ];
            });

        // 2. Aset fisik di tabel asets jika ada yang ditempatkan di ruangan workshop ini
        $asets = \App\Models\Aset::with('kondisi')
            ->where('id_ruangan', $user->ruangan_id)
            ->get()
            ->map(function ($a) {
                return [
                    'id'                  => $a->id,
                    'sarana_prasarana_id' => null,
                    'id_aset'             => $a->id,
                    'tipe'                => 'aset',
                    'nama_barang'         => $a->nama_aset,
                    'kode'                => $a->kode_aset,
                    'kondisi'             => $a->kondisi?->nama_kondisi ?? 'Baik',
                    'jumlah'              => $a->jumlah,
                    'satuan'              => $a->satuan ?? 'Unit',
                    'keterangan'          => $a->deskripsi,
                ];
            });

        $items = $saranas->concat($asets)->values();

        return response()->json([
            'ruangan' => $ruangan,
            'items'   => $items,
        ]);
    }

    /**
     * Statistik Khusus Dashboard Wakasek (Monitoring Eksekutif Sarpras & 5 Bengkel)
     */
    public function statsWakasek(Request $request)
    {
        // Mengambil 5 Bengkel Workshop Utama
        $workshops = Ruangan::where('jenis', 'workshop')
            ->orWhere('nama_ruangan', 'like', '%Bengkel%')
            ->orWhere('nama_ruangan', 'like', '%Lab%')
            ->with('gedung')
            ->get();

        $bengkelData = [];
        $totalUnitSemuaBengkel = 0;
        $totalBaikSemua = 0;
        $totalRusakSemua = 0;

        foreach ($workshops as $ws) {
            $wakapro = User::where('ruangan_id', $ws->id)->where('role', 'wakapro')->first();
            $distDiterima = DistribusiAset::where('ruangan_tujuan_id', $ws->id)
                ->where('status', 'diterima')
                ->with('saranaPrasarana')
                ->get();

            $unitCount = (int) $distDiterima->sum('jumlah');
            $baikCount = 0;
            $rusakCount = 0;
            foreach ($distDiterima as $d) {
                $k = $d->saranaPrasarana?->kondisi ?? 'Baik';
                if ($k === 'Baik') $baikCount += (int) $d->jumlah;
                else $rusakCount += (int) $d->jumlah;
            }

            $totalUnitSemuaBengkel += $unitCount;
            $totalBaikSemua += $baikCount;
            $totalRusakSemua += $rusakCount;

            $persenKesiapan = $unitCount > 0 ? round(($baikCount / $unitCount) * 100) : 100;

            $bengkelData[] = [
                'id'              => $ws->id,
                'nama_ruangan'    => $ws->nama_ruangan,
                'kode_ruangan'    => $ws->kode_ruangan,
                'nama_gedung'     => $ws->gedung?->nama_gedung ?? 'Gedung Workshop',
                'wakapro'         => $wakapro ? $wakapro->nama_lengkap : 'Belum Ditugaskan',
                'total_unit'      => $unitCount,
                'kondisi_baik'    => $baikCount,
                'kondisi_rusak'   => $rusakCount,
                'kesiapan_persen' => $persenKesiapan,
            ];
        }

        $totalBastSah = DistribusiAset::where('status', 'diterima')->whereNotNull('nomor_bast')->count();
        $totalSuratJalan = DistribusiAset::count();
        $bastTerbaru = DistribusiAset::with([
            'saranaPrasarana',
            'ruanganTujuan.gedung',
            'petugasPengirim',
            'wakaproPenerima'
        ])
        ->where('status', 'diterima')
        ->whereNotNull('nomor_bast')
        ->latest('tanggal_terima')
        ->take(6)
        ->get();

        return response()->json([
            'total_unit_bengkel' => $totalUnitSemuaBengkel,
            'total_baik'         => $totalBaikSemua,
            'total_rusak'        => $totalRusakSemua,
            'rasio_kelaikan'     => $totalUnitSemuaBengkel > 0 ? round(($totalBaikSemua / $totalUnitSemuaBengkel) * 100) : 100,
            'total_bast_sah'     => $totalBastSah,
            'total_surat_jalan'  => $totalSuratJalan,
            'bengkel_list'       => $bengkelData,
            'bast_terbaru'       => $bastTerbaru,
        ]);
    }

    /**
     * Riwayat penerimaan barang oleh Wakapro (status: diterima atau ditolak).
     * Item dari distribusi bulk (nomor_pengiriman tidak null) dikembalikan
     * sebagai grup; item distribusi single dikembalikan flat seperti biasa.
     */
    public function riwayat(Request $request)
    {
        $user = $request->user();
        $query = DistribusiAset::with([
            'saranaPrasarana',
            'ruanganTujuan.gedung',
            'petugasPengirim',
            'wakaproPenerima',
        ])->whereIn('status', ['diterima', 'ditolak']);

        // Wakapro hanya melihat riwayat milik ruangannya sendiri
        if ($user->role === 'wakapro') {
            if ($user->ruangan_id) {
                $query->where('ruangan_tujuan_id', $user->ruangan_id);
            } else {
                return response()->json([]);
            }
        }

        // Filter opsional berdasarkan status tertentu
        if ($request->filled('status') && in_array($request->status, ['diterima', 'ditolak'])) {
            $query->where('status', $request->status);
        }

        // Filter pencarian — cari juga di nomor_pengiriman
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nomor_surat_jalan', 'like', "%{$search}%")
                  ->orWhere('nomor_bast', 'like', "%{$search}%")
                  ->orWhere('nomor_pengiriman', 'like', "%{$search}%")
                  ->orWhereHas('saranaPrasarana', function ($sq) use ($search) {
                      $sq->where('nama_barang', 'like', "%{$search}%")
                         ->orWhere('kode', 'like', "%{$search}%");
                  });
            });
        }

        $items = $query->latest('tanggal_terima')->latest('id')->get();

        // ── Group item bulk, biarkan item single tetap flat ─────────────────
        $grouped = [];
        $seen    = [];   // nomor_pengiriman yang sudah dikumpulkan

        foreach ($items as $item) {
            $np = $item->nomor_pengiriman;

            if ($np) {
                // Item bulk — kumpulkan ke dalam grup
                if (!isset($seen[$np])) {
                    $seen[$np] = count($grouped);
                    $grouped[] = [
                        'type'              => 'bulk',
                        'nomor_pengiriman'  => $np,
                        'tanggal_kirim'     => $item->tanggal_kirim,
                        'tanggal_terima'    => $item->tanggal_terima,
                        'ruangan_tujuan'    => $item->ruanganTujuan,
                        'petugas_pengirim'  => $item->petugasPengirim,
                        'catatan_pengiriman'=> $item->catatan_pengiriman,
                        // Status grup: diterima jika semua diterima, ditolak jika semua ditolak,
                        // sebagian jika campuran
                        'status'            => $item->status,
                        'items'             => [],
                    ];
                }

                $idx = $seen[$np];
                $grouped[$idx]['items'][] = $item;

                // Perbarui status grup
                $statusList = collect($grouped[$idx]['items'])->pluck('status')->unique()->values()->all();
                if (count($statusList) > 1) {
                    $grouped[$idx]['status'] = 'sebagian';
                } else {
                    $grouped[$idx]['status'] = $statusList[0];
                }

                // Ambil tanggal_terima terbaru dalam grup
                if ($item->tanggal_terima && (!$grouped[$idx]['tanggal_terima'] ||
                    $item->tanggal_terima > $grouped[$idx]['tanggal_terima'])) {
                    $grouped[$idx]['tanggal_terima'] = $item->tanggal_terima;
                }
            } else {
                // Item single — masuk sebagai entri individual
                $grouped[] = [
                    'type'  => 'single',
                    'items' => [$item],
                    // convenience fields agar frontend bisa pakai struktur yang sama
                    'nomor_pengiriman'   => null,
                    'tanggal_kirim'      => $item->tanggal_kirim,
                    'tanggal_terima'     => $item->tanggal_terima,
                    'ruangan_tujuan'     => $item->ruanganTujuan,
                    'petugas_pengirim'   => $item->petugasPengirim,
                    'catatan_pengiriman' => $item->catatan_pengiriman,
                    'status'             => $item->status,
                ];
            }
        }

        return response()->json(array_values($grouped));
    }
}
