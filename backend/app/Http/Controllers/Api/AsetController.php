<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aset;
use App\Models\History;
use App\Models\Ruangan;
use App\Models\Kondisi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsetController extends Controller
{
    public function index()
    {
        return response()->json(Aset::with(['kategori', 'ruangan', 'sumberDana', 'kondisi', 'user', 'fotos'])->get());
    }

    public function publicStats()
    {
        $asets = Aset::whereNull('deleted_at')->get();

        $totalUnit = $asets->sum('jumlah');
        $totalItem = $asets->count();
        $totalNilai = $asets->sum(fn($a) => ($a->jumlah ?? 1) * ($a->harga_perolehan ?? 0));

        $perKondisi = $asets->groupBy(fn($a) => $a->id_kondisi)
            ->map(fn($group) => $group->count());

        $perKategori = Aset::with('kategori')
            ->whereNull('deleted_at')
            ->get()
            ->groupBy(fn($a) => $a->kategori?->nama_kategori ?? 'Lainnya')
            ->map(fn($g) => ['jumlah' => $g->count(), 'nilai' => $g->sum(fn($a) => ($a->jumlah ?? 1) * ($a->harga_perolehan ?? 0))]);

        return response()->json([
            'total_item' => $totalItem,
            'total_unit' => $totalUnit,
            'total_nilai' => $totalNilai,
            'per_kategori' => $perKategori,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_kategori' => 'required|exists:kategoris,id',
            'id_ruangan' => 'required|exists:ruangans,id',
            'id_sumber_dana' => 'nullable|exists:sumber_danas,id',
            'id_kondisi' => 'required|exists:kondisis,id',
            'kode_aset' => 'nullable|string|max:100',
            'nama_aset' => 'required|string|max:255',
            'merek' => 'nullable|string|max:255',
            'tipe' => 'nullable|string|max:255',
            'warna' => 'nullable|string|max:100',
            'jumlah' => 'required|integer',
            'satuan' => 'required|string|max:50',
            'tahun_perolehan' => 'nullable|integer',
            'harga_perolehan' => 'nullable|numeric',
            'nomor_seri' => 'nullable|string|max:100',
            'tanggal_perolehan' => 'nullable|date',
            'deskripsi' => 'nullable|string',
            'status_aset' => 'required|string|in:aktif,dipinjam,rusak,dihapus'
        ]);

        $validated['id_user'] = $request->user()->id;

        DB::beginTransaction();
        try {
            $aset = Aset::create($validated);

            $ruangan = Ruangan::find($aset->id_ruangan);
            History::create([
                'id_aset' => $aset->id,
                'id_user' => $request->user()->id,
                'aksi' => 'PENAMBAHAN',
                'keterangan' => 'Aset baru ditambahkan ke Ruangan ' . ($ruangan ? $ruangan->nama_ruangan : '-'),
                'tanggal' => now()
            ]);

            DB::commit();
            return response()->json($aset->load(['kategori', 'ruangan', 'kondisi']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menyimpan aset', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(string $id)
    {
        $aset = Aset::with(['kategori', 'ruangan', 'sumberDana', 'kondisi', 'user', 'fotos', 'histories' => function ($query) {
            $query->orderBy('tanggal', 'desc'); }])->findOrFail($id);
        return response()->json($aset);
    }

    public function update(Request $request, string $id)
    {
        $aset = Aset::findOrFail($id);

        $validated = $request->validate([
            'id_kategori' => 'required|exists:kategoris,id',
            'id_ruangan' => 'required|exists:ruangans,id',
            'id_sumber_dana' => 'nullable|exists:sumber_danas,id',
            'id_kondisi' => 'required|exists:kondisis,id',
            'kode_aset' => 'nullable|string|max:100',
            'nama_aset' => 'required|string|max:255',
            'merek' => 'nullable|string|max:255',
            'tipe' => 'nullable|string|max:255',
            'warna' => 'nullable|string|max:100',
            'jumlah' => 'required|integer',
            'satuan' => 'required|string|max:50',
            'tahun_perolehan' => 'nullable|integer',
            'harga_perolehan' => 'nullable|numeric',
            'nomor_seri' => 'nullable|string|max:100',
            'tanggal_perolehan' => 'nullable|date',
            'deskripsi' => 'nullable|string',
            'status_aset' => 'required|string|in:aktif,dipinjam,rusak,dihapus'
        ]);

        DB::beginTransaction();
        try {
            // Cek perubahan ruangan
            if ($aset->id_ruangan != $validated['id_ruangan']) {
                $ruanganLama = Ruangan::find($aset->id_ruangan);
                $ruanganBaru = Ruangan::find($validated['id_ruangan']);

                History::create([
                    'id_aset' => $aset->id,
                    'id_user' => $request->user()->id,
                    'aksi' => 'MUTASI',
                    'keterangan' => 'Aset dipindahkan dari Ruangan ' . ($ruanganLama ? $ruanganLama->nama_ruangan : '-') . ' ke Ruangan ' . ($ruanganBaru ? $ruanganBaru->nama_ruangan : '-'),
                    'tanggal' => now()
                ]);
            }

            // Cek perubahan kondisi
            if ($aset->id_kondisi != $validated['id_kondisi']) {
                $kondisiLama = Kondisi::find($aset->id_kondisi);
                $kondisiBaru = Kondisi::find($validated['id_kondisi']);

                History::create([
                    'id_aset' => $aset->id,
                    'id_user' => $request->user()->id,
                    'aksi' => 'UBAH KONDISI',
                    'keterangan' => 'Kondisi diubah dari ' . ($kondisiLama ? $kondisiLama->nama_kondisi : '-') . ' menjadi ' . ($kondisiBaru ? $kondisiBaru->nama_kondisi : '-'),
                    'tanggal' => now()
                ]);
            }

            $aset->update($validated);
            DB::commit();
            return response()->json($aset->fresh()->load(['kategori', 'ruangan', 'kondisi']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal mengupdate aset', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, string $id)
    {
        $aset = Aset::findOrFail($id);

        History::create([
            'id_aset' => $aset->id,
            'id_user' => $request->user()->id,
            'aksi' => 'PENGHAPUSAN',
            'keterangan' => 'Aset dihapus (Soft Delete)',
            'tanggal' => now()
        ]);

        $aset->delete();
        return response()->json(['message' => 'Aset berhasil dihapus']);
    }

    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv'
        ]);

        $file = $request->file('file');
        $path = $file->storeAs('temp', $file->getClientOriginalName());
        $fullPath = storage_path('app/private/' . $path);

        $imported = 0;
        $failed = 0;

        try {
            $rows = \Spatie\SimpleExcel\SimpleExcelReader::create($fullPath)->getRows();
            $rows->each(function (array $row) use ($request, &$imported, &$failed) {
                try {
                    // Cari atau buat master data dari nama
                    $kategori = \App\Models\Kategori::firstOrCreate(['nama_kategori' => $row['Kategori'] ?? 'Umum']);
                    $ruangan = \App\Models\Ruangan::firstOrCreate(['nama_ruangan' => $row['Ruangan'] ?? 'Belum Ditentukan']);

                    $sumberDana = null;
                    if (!empty($row['Sumber Dana'])) {
                        $sumberDana = \App\Models\SumberDana::firstOrCreate(['nama_sumber_dana' => $row['Sumber Dana']]);
                    }

                    $kondisi = \App\Models\Kondisi::firstOrCreate(['nama_kondisi' => $row['Kondisi'] ?? 'Baik']);

                    $data = [
                        'id_kategori' => $kategori->id,
                        'id_ruangan' => $ruangan->id,
                        'id_sumber_dana' => $sumberDana ? $sumberDana->id : null,
                        'id_kondisi' => $kondisi->id,
                        'id_user' => $request->user()->id,
                        'kode_aset' => $row['Kode Aset'] ?? null,
                        'nama_aset' => $row['Nama Aset'] ?? 'Aset Tanpa Nama',
                        'merek' => $row['Merek'] ?? null,
                        'tipe' => $row['Tipe'] ?? null,
                        'warna' => $row['Warna'] ?? null,
                        'jumlah' => $row['Jumlah'] ?? 1,
                        'satuan' => $row['Satuan'] ?? 'Unit',
                        'tahun_perolehan' => $row['Tahun Perolehan'] ?? date('Y'),
                        'harga_perolehan' => $row['Harga Perolehan'] ?? 0,
                        'nomor_seri' => $row['Nomor Seri'] ?? null,
                        'tanggal_perolehan' => !empty($row['Tanggal Perolehan']) ? date('Y-m-d', strtotime($row['Tanggal Perolehan'])) : null,
                        'deskripsi' => $row['Deskripsi'] ?? null,
                        'status_aset' => $row['Status'] ?? 'aktif',
                    ];

                    // Jika ada Kode Aset, kita update. Jika tidak ada, kita create.
                    if (!empty($data['kode_aset'])) {
                        $aset = Aset::updateOrCreate(['kode_aset' => $data['kode_aset']], $data);
                    } else {
                        $aset = Aset::create($data);
                    }

                    // Rekam History
                    if ($aset->wasRecentlyCreated) {
                        History::create([
                            'id_aset' => $aset->id,
                            'id_user' => $request->user()->id,
                            'aksi' => 'PENAMBAHAN',
                            'keterangan' => 'Aset baru diimport dari Excel ke Ruangan ' . $ruangan->nama_ruangan,
                            'tanggal' => now()
                        ]);
                    }

                    $imported++;
                } catch (\Exception $e) {
                    $failed++;
                    \Illuminate\Support\Facades\Log::error('Error import baris: ' . json_encode($row) . ' - ' . $e->getMessage());
                }
            });

            // Hapus file temporary
            \Illuminate\Support\Facades\Storage::delete($path);

            return response()->json([
                'message' => 'Proses import selesai.',
                'imported' => $imported,
                'failed' => $failed
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal membaca file Excel.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
