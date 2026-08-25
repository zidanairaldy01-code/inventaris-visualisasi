<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aset;
use App\Models\Servis;
use App\Models\Peminjaman;
use App\Models\History;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LaporanController extends Controller
{
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

        $items = Servis::with(['aset.ruangan'])
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
                'nama_aset'           => $s->aset?->nama_aset,
                'kode_aset'           => $s->aset?->kode_aset,
                'ruangan'             => $s->aset?->ruangan?->nama_ruangan,
                'jenis_perbaikan'     => $s->jenis_perbaikan,
                'tanggal_servis'      => $s->tanggal_servis,
                'biaya_servis'        => $s->biaya_servis,
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

        $items = Peminjaman::with(['aset.ruangan'])
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
                'nama_aset'               => $p->aset?->nama_aset,
                'kode_aset'               => $p->aset?->kode_aset,
                'ruangan'                 => $p->aset?->ruangan?->nama_ruangan,
                'jumlah'                  => $p->jumlah,
                'keperluan'               => $p->keperluan,
                'tanggal_pinjam'          => $p->tanggal_pinjam,
                'tanggal_kembali_rencana' => $p->tanggal_kembali_rencana,
                'tanggal_kembali_aktual'  => $p->tanggal_kembali_aktual,
                'status'                  => $p->status,
            ]),
        ]);
    }
}
