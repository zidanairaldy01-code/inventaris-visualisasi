<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use App\Models\Aset;
use App\Models\Jurusan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsetPerKelasController extends Controller
{
    /**
     * Get aset by kelas ID
     */
    public function getAsetByKelas($id_kelas)
    {
        $kelas = Kelas::with('jurusan')->findOrFail($id_kelas);

        $asets = Aset::with([
            'kategori',
            'ruangan.kelas.jurusan',
            'kondisi',
            'sumberDana',
            'fotos'
        ])
            ->whereHas('ruangan', function ($query) use ($id_kelas) {
                $query->where('id_kelas', $id_kelas);
            })
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'kelas' => $kelas,
                'asets' => $asets
            ]
        ]);
    }

    /**
     * Get summary aset by jurusan
     */
    public function getSummaryByJurusan($id_jurusan)
    {
        $jurusan = Jurusan::findOrFail($id_jurusan);

        // Get all aset untuk jurusan ini
        $asets = Aset::whereHas('ruangan.kelas', function ($query) use ($id_jurusan) {
            $query->where('id_jurusan', $id_jurusan);
        })->with(['kondisi', 'ruangan.kelas']);

        $totalAset = $asets->count();
        $totalNilai = $asets->sum('harga_perolehan');
        $rataRataHarga = $totalAset > 0 ? $totalNilai / $totalAset : 0;

        // Group by kondisi
        $byKondisi = $asets->get()->groupBy('kondisi.nama_kondisi')->map(function ($items) {
            return $items->count();
        });

        // Group by tingkat
        $byTingkat = $asets->get()->groupBy(function ($item) {
            return $item->ruangan->kelas->tingkat ?? 'Tanpa Kelas';
        })->map(function ($items) {
            return [
                'total_aset' => $items->count(),
                'total_nilai' => $items->sum('harga_perolehan')
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => [
                'jurusan' => $jurusan,
                'summary' => [
                    'total_aset' => $totalAset,
                    'total_nilai' => $totalNilai,
                    'rata_rata_harga' => $rataRataHarga,
                    'by_kondisi' => $byKondisi,
                    'by_tingkat' => $byTingkat
                ]
            ]
        ]);
    }

    /**
     * Get summary aset by kelas
     */
    public function getSummaryByKelas($id_kelas)
    {
        $kelas = Kelas::with('jurusan')->findOrFail($id_kelas);

        $asets = Aset::whereHas('ruangan', function ($query) use ($id_kelas) {
            $query->where('id_kelas', $id_kelas);
        })->with(['kondisi', 'kategori']);

        $totalAset = $asets->count();
        $totalNilai = $asets->sum('harga_perolehan');
        $rataRataHarga = $totalAset > 0 ? $totalNilai / $totalAset : 0;

        // Group by kondisi
        $byKondisi = $asets->get()->groupBy('kondisi.nama_kondisi')->map(function ($items) {
            return $items->count();
        });

        // Group by kategori
        $byKategori = $asets->get()->groupBy('kategori.nama_kategori')->map(function ($items) {
            return [
                'total_aset' => $items->count(),
                'total_nilai' => $items->sum('harga_perolehan')
            ];
        });

        // Count dipinjam
        $dipinjam = $asets->where('status_aset', 'Dipinjam')->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'kelas' => $kelas,
                'summary' => [
                    'total_aset' => $totalAset,
                    'total_nilai' => $totalNilai,
                    'rata_rata_harga' => $rataRataHarga,
                    'aset_dipinjam' => $dipinjam,
                    'by_kondisi' => $byKondisi,
                    'by_kategori' => $byKategori
                ]
            ]
        ]);
    }
}
