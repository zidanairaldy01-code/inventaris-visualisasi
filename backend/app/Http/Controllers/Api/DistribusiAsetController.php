<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DistribusiAset;
use App\Models\SaranaPrasarana;
use App\Models\Ruangan;
use App\Models\User;
use App\Models\History;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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

        // Jika Wakapro, batasi hanya ruangan miliknya
        if ($user->role === 'wakapro') {
            if ($user->ruangan_id) {
                $query->where('ruangan_tujuan_id', $user->ruangan_id);
            } else {
                $query->where('wakapro_penerima_id', $user->id);
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
            'catatan_pengiriman'  => 'nullable|string',
        ]);

        $user = $request->user();
        $jumlah = $validated['jumlah'] ?? 1;

        // Cari Wakapro yang bertanggung jawab atas ruangan tujuan jika ada
        $wakapro = User::where('role', 'wakapro')
            ->where('ruangan_id', $validated['ruangan_tujuan_id'])
            ->first();

        // Generate Nomor Surat Jalan: SJ-YYYYMM-XXXX
        $prefix = 'SJ-' . date('Ym') . '-';
        $countThisMonth = DistribusiAset::where('nomor_surat_jalan', 'like', "{$prefix}%")->count();
        $nomorSuratJalan = $prefix . str_pad($countThisMonth + 1, 4, '0', STR_PAD_LEFT);

        $distribusi = DB::transaction(function () use ($validated, $user, $wakapro, $nomorSuratJalan, $jumlah) {
            $record = DistribusiAset::create([
                'nomor_surat_jalan'   => $nomorSuratJalan,
                'sarana_prasarana_id' => $validated['sarana_prasarana_id'],
                'ruangan_tujuan_id'   => $validated['ruangan_tujuan_id'],
                'petugas_pengirim_id' => $user->id,
                'wakapro_penerima_id' => $wakapro ? $wakapro->id : null,
                'jumlah'              => $jumlah,
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
     * Konfirmasi penerimaan aset oleh Wakapro (atau Super Admin)
     */
    public function konfirmasi(Request $request, $id)
    {
        $distribusi = DistribusiAset::findOrFail($id);
        $user = $request->user();

        // Validasi hak akses
        if ($user->role === 'wakapro' && $user->ruangan_id && $distribusi->ruangan_tujuan_id != $user->ruangan_id) {
            return response()->json([
                'message' => 'Anda tidak memiliki hak untuk mengonfirmasi barang ruangan lain.',
            ], 403);
        }

        $validated = $request->validate([
            'aksi'                => 'required|in:terima,tolak',
            'catatan_penerimaan'  => 'nullable|string',
            'kondisi_diterima'    => 'nullable|in:Baik,Rusak Ringan,Rusak Berat',
        ]);

        if ($validated['aksi'] === 'terima') {
            // Generate Nomor BAST: BAST-YYYYMM-XXXX
            $prefix = 'BAST-' . date('Ym') . '-';
            $countThisMonth = DistribusiAset::where('nomor_bast', 'like', "{$prefix}%")->count();
            $nomorBast = $prefix . str_pad($countThisMonth + 1, 4, '0', STR_PAD_LEFT);

            $distribusi->update([
                'status'              => 'diterima',
                'nomor_bast'          => $nomorBast,
                'tanggal_terima'      => Carbon::now(),
                'wakapro_penerima_id' => $user->id,
                'catatan_penerimaan'  => $validated['catatan_penerimaan'] ?? 'Barang telah diperiksa fisik dan diterima dalam kondisi baik.',
            ]);

            // Jika ada perubahan kondisi saat diterima
            if (!empty($validated['kondisi_diterima'])) {
                $sarana = SaranaPrasarana::find($distribusi->sarana_prasarana_id);
                if ($sarana) {
                    $sarana->update(['kondisi' => $validated['kondisi_diterima']]);
                }
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

        $distribusi->load(['saranaPrasarana', 'ruanganTujuan.gedung', 'petugasPengirim', 'wakaproPenerima']);

        return response()->json([
            'message' => $message,
            'data'    => $distribusi,
        ]);
    }

    /**
     * Mengambil data terformat untuk cetak Surat Jalan
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

        // Jika ruangan belum diassign, fallback ke workshop pertama
        if (!$ruanganId) {
            $firstWs = Ruangan::where('jenis', 'workshop')->first();
            $ruanganId = $firstWs ? $firstWs->id : null;
        }

        $ruangan = $ruanganId ? Ruangan::with('gedung')->find($ruanganId) : null;

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
            ]);
        }

        // Ambil semua distribusi ke ruangan ini
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

        // Hitung kondisi berdasarkan sarana_prasarana yang diterima
        $kondisiBaik = 0;
        $kondisiRusak = 0;
        foreach ($diterima as $dist) {
            $kondisi = $dist->saranaPrasarana?->kondisi ?? 'Baik';
            if ($kondisi === 'Baik') {
                $kondisiBaik += (int) $dist->jumlah;
            } else {
                $kondisiRusak += (int) $dist->jumlah;
            }
        }

        return response()->json([
            'ruangan'             => $ruangan,
            'total_unit'          => $totalUnit,
            'total_item_jenis'    => $totalItemJenis,
            'kondisi_baik'        => $kondisiBaik,
            'kondisi_rusak'       => $kondisiRusak,
            'menunggu_konfirmasi' => $menunggu->count(),
            'menunggu_list'       => $menunggu->values(),
            'aset_list'           => $diterima->values(),
            'distribusi_terbaru'  => $semuaDistribusi->take(6)->values(),
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
}
