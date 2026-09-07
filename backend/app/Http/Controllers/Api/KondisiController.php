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

        // 1. Aset dari Gedung / Workshop
        $asetQuery = \App\Models\Aset::with(['kondisi', 'ruangan.gedung', 'kategori', 'folder'])
            ->whereHas('kondisi', function ($q) {
                $q->where('nama_kondisi', 'like', '%rusak%')
                  ->orWhere('nama_kondisi', 'like', '%tidak layak%');
            });

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

        // 2. Sarana & Prasarana
        $spItems = collect();
        if ($lokasiFilter === 'all' || $lokasiFilter === 'sarana_prasarana') {
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

        $all = $asets->concat($spItems);

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

        // Summary counts
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
}
