<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aset;
use App\Models\SaranaPrasarana;
use App\Models\Servis;
use App\Models\Peminjaman;
use App\Models\History;
use App\Models\DistribusiAset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LaporanController extends Controller
{
    /**
     * Laporan sarana & prasarana: daftar sarana prasarana dalam rentang tanggal,
     * beserta ringkasan statistik (total jenis barang, total unit, total nilai pembelian,
     * total nilai sekarang, per kondisi, per kategori/folder).
     */
    public function saranaPrasarana(Request $request)
    {
        $request->validate([
            'dari'   => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
        ]);

        $dari     = $request->dari;
        $sampai   = $request->sampai;
        $dariTs   = $request->dari . ' 00:00:00';
        $sampaiTs = $request->sampai . ' 23:59:59';

        $items = SaranaPrasarana::with(['user', 'folder.sumberDana'])
            ->where(function ($q) use ($dari, $sampai, $dariTs, $sampaiTs) {
                $q->whereBetween('tanggal_pengambilan', [$dari, $sampai])
                  ->orWhere(function ($q2) use ($dariTs, $sampaiTs) {
                      $q2->whereNull('tanggal_pengambilan')
                         ->whereBetween('created_at', [$dariTs, $sampaiTs]);
                  })
                  ->orWhereBetween('created_at', [$dariTs, $sampaiTs]);
            })
            ->orderBy('tanggal_pengambilan', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $totalItem          = $items->count();
        $totalUnit          = $items->sum(fn($s) => (int)($s->stok_akhir > 0 ? $s->stok_akhir : ($s->stok_awal ?: 1)));
        $totalNilaiBeli     = $items->sum(fn($s) => (float)($s->nilai_harga_pembelian ?? 0));
        $totalNilaiSekarang = $items->sum(fn($s) => (float)($s->nilai_harga_sekarang ?? 0));

        $perKondisi = $items->groupBy(fn($s) => $s->kondisi ?: 'Baik')
            ->map(fn($g) => $g->count());

        $perFolder = $items->groupBy(fn($s) => $s->folder?->nama_folder ?? 'Tanpa Kategori')
            ->map(fn($g) => [
                'jumlah_item' => $g->count(),
                'total_unit'  => $g->sum(fn($s) => (int)($s->stok_akhir > 0 ? $s->stok_akhir : ($s->stok_awal ?: 1))),
                'total_nilai' => $g->sum(fn($s) => (float)($s->nilai_harga_pembelian ?? 0)),
            ]);

        return response()->json([
            'periode' => ['dari' => $request->dari, 'sampai' => $request->sampai],
            'ringkasan' => [
                'total_item'            => $totalItem,
                'total_unit'            => $totalUnit,
                'total_nilai'           => $totalNilaiBeli,
                'total_nilai_pembelian' => $totalNilaiBeli,
                'total_nilai_sekarang'  => $totalNilaiSekarang,
                'per_kondisi'           => $perKondisi,
                'per_kategori'          => $perFolder,
            ],
            'data' => $items->map(fn($s) => [
                'id'                    => $s->id,
                'kode'                  => $s->kode,
                'nama_barang'           => $s->nama_barang,
                'satuan'                => $s->satuan ?? 'Unit',
                'luas_jumlah'           => $s->luas_jumlah ?: (($s->stok_akhir ?? 0) . ' ' . ($s->satuan ?? 'Unit')),
                'stok_awal'             => $s->stok_awal ?? 0,
                'stok_masuk'            => $s->stok_masuk ?? 0,
                'stok_keluar'           => $s->stok_keluar ?? 0,
                'stok_akhir'            => $s->stok_akhir ?? 0,
                'nilai_harga_pembelian' => (float)($s->nilai_harga_pembelian ?? 0),
                'nilai_harga_sekarang'  => (float)($s->nilai_harga_sekarang ?? 0),
                'kondisi'               => $s->kondisi ?: 'Baik',
                'keterangan'            => $s->keterangan,
                'folder'                => $s->folder?->nama_folder,
                'sumber_dana'           => $s->folder?->sumberDana?->nama_sumber,
                'tanggal_pengambilan'   => $s->tanggal_pengambilan?->format('Y-m-d'),
                'tanggal_input'         => $s->created_at?->format('Y-m-d'),
            ]),
        ]);
    }

    /**
     * Laporan aset: daftar aset yang ditambahkan dalam rentang tanggal,
     * beserta ringkasan statistik (total nilai, per kategori, per kondisi).
     */
    public function aset(Request $request)
    {
        $request->validate([
            'dari'  => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
        ]);

        $dari   = $request->dari . ' 00:00:00';
        $sampai = $request->sampai . ' 23:59:59';

        $asets = Aset::with(['kategori', 'ruangan', 'kondisi', 'sumberDana'])
            ->whereBetween('created_at', [$dari, $sampai])
            ->orderBy('created_at', 'asc')
            ->get();

        $totalNilai = $asets->sum(fn($a) => ($a->jumlah ?? 1) * ($a->harga_perolehan ?? 0));
        $totalUnit  = $asets->sum('jumlah');

        $perKategori = $asets->groupBy(fn($a) => $a->kategori?->nama_kategori ?? 'Lainnya')
            ->map(fn($g) => [
                'jumlah_item' => $g->count(),
                'total_unit'  => $g->sum('jumlah'),
                'total_nilai' => $g->sum(fn($a) => ($a->jumlah ?? 1) * ($a->harga_perolehan ?? 0)),
            ]);

        $perKondisi = $asets->groupBy(fn($a) => $a->kondisi?->nama_kondisi ?? 'Tidak Diketahui')
            ->map(fn($g) => $g->count());

        return response()->json([
            'periode' => ['dari' => $request->dari, 'sampai' => $request->sampai],
            'ringkasan' => [
                'total_item'    => $asets->count(),
                'total_unit'    => $totalUnit,
                'total_nilai'   => $totalNilai,
                'per_kategori'  => $perKategori,
                'per_kondisi'   => $perKondisi,
            ],
            'data' => $asets->map(fn($a) => [
                'id'              => $a->id,
                'kode_aset'       => $a->kode_aset,
                'nama_aset'       => $a->nama_aset,
                'kategori'        => $a->kategori?->nama_kategori,
                'ruangan'         => $a->ruangan?->nama_ruangan,
                'kondisi'         => $a->kondisi?->nama_kondisi,
                'sumber_dana'     => $a->sumberDana?->nama_sumber,
                'jumlah'          => $a->jumlah,
                'satuan'          => $a->satuan,
                'harga_perolehan' => $a->harga_perolehan,
                'total_nilai'     => ($a->jumlah ?? 1) * ($a->harga_perolehan ?? 0),
                'tahun_perolehan' => $a->tahun_perolehan,
                'tanggal_input'   => $a->created_at?->format('Y-m-d'),
            ]),
        ]);
    }

    /**
     * Laporan servis: catatan perbaikan dalam rentang tanggal.
     */
    public function servis(Request $request)
    {
        $request->validate([
            'dari'   => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
        ]);

        $items = Servis::with(['aset.ruangan', 'saranaPrasarana', 'ruangan'])
            ->whereBetween('tanggal_servis', [$request->dari, $request->sampai])
            ->orderBy('tanggal_servis', 'asc')
            ->get();

        $totalBiaya  = $items->sum('biaya_servis');
        $perStatus   = $items->groupBy('status')->map(fn($g) => $g->count());

        return response()->json([
            'periode'  => ['dari' => $request->dari, 'sampai' => $request->sampai],
            'ringkasan' => [
                'total_catatan' => $items->count(),
                'total_biaya'   => $totalBiaya,
                'per_status'    => $perStatus,
            ],
            'data' => $items->map(fn($s) => [
                'id'                  => $s->id,
                'nama_aset'           => $s->saranaPrasarana?->nama_barang ?? $s->aset?->nama_aset ?? 'Barang',
                'kode_aset'           => $s->saranaPrasarana?->kode ?? $s->aset?->kode_aset ?? '-',
                'ruangan'             => $s->ruangan?->nama_ruangan ?? $s->aset?->ruangan?->nama_ruangan ?? '-',
                'jenis_perbaikan'     => $s->jenis_perbaikan,
                'tanggal_servis'      => $s->tanggal_servis,
                'biaya_servis'        => (float)($s->biaya_servis ?? 0),
                'teknisi_bengkel'     => $s->teknisi_bengkel,
                'deskripsi_kerusakan' => $s->deskripsi_kerusakan,
                'status'              => $s->status,
            ]),
        ]);
    }

    /**
     * Laporan peminjaman: transaksi pinjam dalam rentang tanggal.
     */
    public function peminjaman(Request $request)
    {
        $request->validate([
            'dari'   => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
        ]);

        $items = Peminjaman::with(['aset.ruangan', 'saranaPrasarana'])
            ->whereBetween('tanggal_pinjam', [$request->dari, $request->sampai])
            ->orderBy('tanggal_pinjam', 'asc')
            ->get();

        $perStatus = $items->groupBy('status')->map(fn($g) => $g->count());
        $perRole   = $items->groupBy('role_peminjam')->map(fn($g) => $g->count());

        return response()->json([
            'periode'  => ['dari' => $request->dari, 'sampai' => $request->sampai],
            'ringkasan' => [
                'total_transaksi' => $items->count(),
                'per_status'      => $perStatus,
                'per_role'        => $perRole,
            ],
            'data' => $items->map(fn($p) => [
                'id'                      => $p->id,
                'nama_peminjam'           => $p->nama_peminjam,
                'role_peminjam'           => $p->role_peminjam,
                'nama_aset'               => $p->saranaPrasarana?->nama_barang ?? $p->aset?->nama_aset ?? 'Barang',
                'kode_aset'               => $p->saranaPrasarana?->kode ?? $p->aset?->kode_aset ?? '-',
                'ruangan'                 => $p->aset?->ruangan?->nama_ruangan ?? '-',
                'jumlah'                  => $p->jumlah,
                'keperluan'               => $p->keperluan,
                'tanggal_pinjam'          => $p->tanggal_pinjam,
                'tanggal_kembali_rencana' => $p->tanggal_kembali_rencana,
                'tanggal_kembali_aktual'  => $p->tanggal_kembali_aktual,
                'status'                  => $p->status,
            ]),
        ]);
    }

    /**
     * Laporan penerimaan barang: riwayat distribusi yang sudah diproses (diterima/ditolak)
     * Khusus wakapro — data dibatasi sesuai ruangan miliknya.
     * Mendukung seleksi ID spesifik untuk export parsial.
     */
    public function penerimaan(Request $request)
    {
        $request->validate([
            'dari'   => 'nullable|date',
            'sampai' => 'nullable|date|after_or_equal:dari',
            'status' => 'nullable|in:diterima,ditolak,semua',
            'search' => 'nullable|string|max:255',
            'ids'    => 'nullable|array',
            'ids.*'  => 'integer',
        ]);

        $user = $request->user();

        $query = DistribusiAset::with([
            'saranaPrasarana',
            'ruanganTujuan.gedung',
            'petugasPengirim',
        ])->whereIn('status', ['diterima', 'ditolak']);

        // Batasi data ke ruangan milik wakapro yang login
        if ($user->role === 'wakapro') {
            if ($user->ruangan_id) {
                $query->where('ruangan_tujuan_id', $user->ruangan_id);
            } else {
                return response()->json([
                    'periode'   => ['dari' => $request->dari, 'sampai' => $request->sampai],
                    'ringkasan' => ['total_diterima' => 0, 'total_ditolak' => 0, 'total_barang' => 0],
                    'data'      => [],
                ]);
            }
        }

        // Filter status
        $statusFilter = $request->status ?? 'semua';
        if ($statusFilter !== 'semua') {
            $query->where('status', $statusFilter);
        }

        // Filter rentang tanggal (berdasarkan tanggal_terima)
        if ($request->filled('dari')) {
            $query->whereDate('tanggal_terima', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $query->whereDate('tanggal_terima', '<=', $request->sampai);
        }

        // Filter pencarian
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

        // Filter seleksi ID spesifik (untuk export parsial)
        if ($request->filled('ids') && is_array($request->ids) && count($request->ids) > 0) {
            $query->whereIn('id', $request->ids);
        }

        $items = $query->orderBy('tanggal_terima', 'desc')->orderBy('id', 'desc')->get();

        $totalDiterima = $items->where('status', 'diterima')->count();
        $totalDitolak  = $items->where('status', 'ditolak')->count();
        $totalBarang   = $items->where('status', 'diterima')->sum('jumlah');

        return response()->json([
            'periode' => [
                'dari'   => $request->dari,
                'sampai' => $request->sampai,
            ],
            'ringkasan' => [
                'total_diterima' => $totalDiterima,
                'total_ditolak'  => $totalDitolak,
                'total_barang'   => $totalBarang,
            ],
            'data' => $items->map(fn($d) => [
                'id'                 => $d->id,
                'status'             => $d->status,
                'nomor_surat_jalan'  => $d->nomor_surat_jalan,
                'nomor_bast'         => $d->nomor_bast,
                'nama_barang'        => $d->saranaPrasarana?->nama_barang,
                'kode_barang'        => $d->saranaPrasarana?->kode,
                'jumlah'             => $d->jumlah,
                'kondisi_diterima'   => $d->saranaPrasarana?->kondisi,
                'pengirim'           => $d->petugasPengirim?->nama_lengkap,
                'ruangan'            => $d->ruanganTujuan?->nama_ruangan,
                'gedung'             => $d->ruanganTujuan?->gedung?->nama_gedung,
                'tanggal_kirim'      => $d->tanggal_kirim?->format('Y-m-d'),
                'tanggal_terima'     => $d->tanggal_terima?->format('Y-m-d'),
                'catatan_pengiriman' => $d->catatan_pengiriman,
                'catatan_penerimaan' => $d->catatan_penerimaan,
            ]),
        ]);
    }
}
