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
    public function index(Request $request)
    {
        $perPage = $request->query('per_page', 50);
        $idFolder = $request->query('id_folder');
        
        $query = Aset::with(['kategori', 'kondisi', 'sumberDana', 'folder'])
            ->select(['id', 'kode_aset', 'nama_aset', 'merek', 'jumlah', 'satuan', 
                     'harga_perolehan', 'status_aset', 'id_kategori', 'id_kondisi', 
                     'id_sumber_dana', 'id_ruangan', 'id_folder', 'created_at'])
            ->orderBy('created_at', 'desc');

        if ($idFolder === 'null') {
            $query->whereNull('id_folder');
        } elseif ($idFolder === '-1') {
            $query->whereNull('id_folder');
        } elseif (!empty($idFolder) && is_numeric($idFolder)) {
            $query->where('id_folder', $idFolder);
        }

        if ($perPage === 'all') {
            $asets = $query->get();
            return response()->json($asets);
        }

        $asets = $query->paginate($perPage);
        return response()->json($asets);
    }

    public function publicStats()
    {
        $asets = Aset::whereNull('deleted_at')->get();

        $totalUnit = $asets->sum('jumlah');
        $totalItem = $asets->count();
        $totalNilai = $asets->sum(fn($a) => (float) ($a->harga_perolehan ?? 0));

        $perKondisi = $asets->groupBy(fn($a) => $a->id_kondisi)
            ->map(fn($group) => $group->count());

        $perKategori = Aset::with('kategori')
            ->whereNull('deleted_at')
            ->get()
            ->groupBy(fn($a) => $a->kategori?->nama_kategori ?? 'Lainnya')
            ->map(fn($g) => ['jumlah' => $g->count(), 'nilai' => $g->sum(fn($a) => (float) ($a->harga_perolehan ?? 0))]);

        // Hitung jumlah ruangan, gedung, kategori
        $totalRuangan = \App\Models\Ruangan::count();
        $totalGedung  = \App\Models\Gedung::count();
        $totalKategori = \App\Models\Kategori::count();

        // Hitung total nilai pembelian dari daftar belanja
        $totalBelanja = \App\Models\DaftarBelanja::sum('jumlah');
        $totalItemBelanja = \App\Models\DaftarBelanja::count();

        // Hitung total nilai pembelian dari sarana prasarana
        $totalNilaiPembelianSarana = (float) \App\Models\SaranaPrasarana::sum('nilai_harga_pembelian');
        $totalNilaiSekarangSarana  = (float) \App\Models\SaranaPrasarana::sum('nilai_harga_sekarang');
        $totalItemSarana           = \App\Models\SaranaPrasarana::count();

        return response()->json([
            'total_item'                   => $totalItem,
            'total_unit'                   => $totalUnit,
            'total_nilai'                  => $totalNilai,
            'per_kategori'                 => $perKategori,
            'total_ruangan'                => $totalRuangan,
            'total_gedung'                 => $totalGedung,
            'total_kategori'               => $totalKategori,
            'total_belanja'                => (float) $totalBelanja,
            'total_item_belanja'           => $totalItemBelanja,
            'total_nilai_pembelian_sarana' => $totalNilaiPembelianSarana,
            'total_nilai_sekarang_sarana'  => $totalNilaiSekarangSarana,
            'total_item_sarana'            => $totalItemSarana,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_kategori' => 'required|exists:kategoris,id',
            'id_ruangan' => 'required|exists:ruangans,id',
            'id_sumber_dana' => 'nullable|exists:sumber_danas,id',
            'id_kondisi' => 'required|exists:kondisis,id',
            'id_folder' => 'nullable|exists:folder_inventaris,id',
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
            'status_aset' => 'required|string|in:aktif,dipinjam,rusak,dihapus',
            'foto_thumbnail' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        // Handle foto upload
        if ($request->hasFile('foto_thumbnail')) {
            $path = $request->file('foto_thumbnail')->store('aset', 'public');
            $validated['foto_thumbnail'] = '/storage/' . $path;
        }

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
            'id_folder' => 'nullable|exists:folder_inventaris,id',
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
            'status_aset' => 'required|string|in:aktif,dipinjam,rusak,dihapus',
            'foto_thumbnail' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        // Handle foto upload
        if ($request->hasFile('foto_thumbnail')) {
            // Delete old foto if exists
            if ($aset->foto_thumbnail) {
                $oldPath = str_replace('/storage/', '', $aset->foto_thumbnail);
                \Storage::disk('public')->delete($oldPath);
            }
            
            $path = $request->file('foto_thumbnail')->store('aset', 'public');
            $validated['foto_thumbnail'] = '/storage/' . $path;
        }

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

    public function batchDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:asets,id',
        ]);

        $count = Aset::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'message' => "Berhasil menghapus {$count} data sarana & prasarana",
            'count' => $count
        ]);
    }

    public function batchStore(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.nama_aset' => 'required|string|max:255',
            'items.*.id_kategori' => 'nullable|integer',
            'items.*.id_ruangan' => 'nullable|integer',
            'items.*.id_kondisi' => 'nullable|integer',
            'items.*.id_folder' => 'nullable|integer',
            'items.*.jumlah' => 'required|integer',
            'items.*.satuan' => 'required|string',
            'items.*.harga_perolehan' => 'nullable|numeric',
            'items.*.tahun_perolehan' => 'nullable|integer',
            'items.*.deskripsi' => 'nullable|string',
            'items.*.status_aset' => 'required|string',
        ]);

        $userId = $request->user()->id;
        $now = now();
        $importedCount = 0;

        // Resolve default master data (auto-create jika belum ada)
        $defaultKategori = \App\Models\Kategori::firstOrCreate(
            ['nama_kategori' => 'Sarana & Prasarana'],
            ['nama_kategori' => 'Sarana & Prasarana']
        );
        $defaultGedung = \App\Models\Gedung::firstOrCreate(
            ['nama_gedung' => 'Gedung Utama'],
            ['nama_gedung' => 'Gedung Utama', 'kode_gedung' => 'GD-UTAMA', 'jumlah_lantai' => 1, 'deskripsi' => 'Dibuat otomatis']
        );
        $defaultRuangan = \App\Models\Ruangan::firstOrCreate(
            ['nama_ruangan' => 'Belum Ditentukan'],
            ['nama_ruangan' => 'Belum Ditentukan', 'id_gedung' => $defaultGedung->id]
        );
        $defaultKondisi = \App\Models\Kondisi::firstOrCreate(
            ['nama_kondisi' => 'Baik'],
            ['nama_kondisi' => 'Baik']
        );

        DB::beginTransaction();
        try {
            foreach ($validated['items'] as $item) {
                // Gunakan ID yang dikirim jika valid, fallback ke default
                $idKategori = !empty($item['id_kategori']) && \App\Models\Kategori::find($item['id_kategori'])
                    ? $item['id_kategori']
                    : $defaultKategori->id;

                $idRuangan = !empty($item['id_ruangan']) && \App\Models\Ruangan::find($item['id_ruangan'])
                    ? $item['id_ruangan']
                    : $defaultRuangan->id;

                $idKondisi = !empty($item['id_kondisi']) && \App\Models\Kondisi::find($item['id_kondisi'])
                    ? $item['id_kondisi']
                    : $defaultKondisi->id;

                Aset::create([
                    'nama_aset'        => $item['nama_aset'],
                    'id_kategori'      => $idKategori,
                    'id_ruangan'       => $idRuangan,
                    'id_kondisi'       => $idKondisi,
                    'id_folder'        => $item['id_folder'] ?? null,
                    'id_sumber_dana'   => $item['id_sumber_dana'] ?? null,
                    'id_user'          => $userId,
                    'kode_aset'        => $item['kode_aset'] ?? null,
                    'jumlah'           => $item['jumlah'],
                    'satuan'           => $item['satuan'],
                    'harga_perolehan'  => $item['harga_perolehan'] ?? null,
                    'tahun_perolehan'  => $item['tahun_perolehan'] ?? (int) date('Y'),
                    'deskripsi'        => $item['deskripsi'] ?? null,
                    'status_aset'      => $item['status_aset'] ?? 'aktif',
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ]);
                $importedCount++;
            }
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Berhasil menyimpan {$importedCount} data sarana & prasarana.",
                'count' => $importedCount
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan batch data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bersihkan string angka dari format Rupiah / pemisah ribuan.
     * Mendukung format:
     *   - "Rp   1,260,000,000"  (koma = pemisah ribuan, format US/Excel ID)
     *   - "Rp 1.260.000.000"    (titik = pemisah ribuan, format ID)
     *   - "1.260.000.000"
     *   - "1,260,000,000"
     *   - "1260000000"
     *   - "1.260.000,50"        (titik ribuan, koma desimal)
     */
    private function parseAngka(?string $value): float
    {
        if (empty($value)) return 0;

        // Hapus semua karakter selain digit, titik, dan koma
        $clean = preg_replace('/[^\d.,]/', '', trim($value));
        if (empty($clean)) return 0;

        // Hitung jumlah titik dan koma
        $countDot   = substr_count($clean, '.');
        $countComma = substr_count($clean, ',');

        if ($countDot === 0 && $countComma === 0) {
            // Tidak ada pemisah sama sekali: angka bulat
            return (float) $clean;
        }

        if ($countDot > 0 && $countComma === 0) {
            // Hanya ada titik: bisa pemisah ribuan (1.260.000) atau desimal (1.5)
            if ($countDot > 1) {
                // Lebih dari satu titik → pasti pemisah ribuan
                return (float) str_replace('.', '', $clean);
            }
            // Satu titik → desimal biasa (1260000.50) atau ribuan (1.260)?
            // Jika bagian setelah titik > 2 digit → ribuan, bukan desimal
            $parts = explode('.', $clean);
            if (strlen($parts[1]) >= 3) {
                return (float) str_replace('.', '', $clean);
            }
            return (float) $clean;
        }

        if ($countDot === 0 && $countComma > 0) {
            // Hanya ada koma: bisa pemisah ribuan (1,260,000) atau desimal (1,5)
            if ($countComma > 1) {
                // Lebih dari satu koma → pasti pemisah ribuan
                return (float) str_replace(',', '', $clean);
            }
            // Satu koma → cek panjang bagian setelah koma
            $parts = explode(',', $clean);
            if (strlen($parts[1]) >= 3) {
                // e.g. "1,260" → ribuan
                return (float) str_replace(',', '', $clean);
            }
            // e.g. "1,50" → desimal
            return (float) str_replace(',', '.', $clean);
        }

        // Ada keduanya (titik dan koma)
        // Tentukan mana pemisah ribuan dan mana desimal berdasarkan posisi terakhir
        $lastDot   = strrpos($clean, '.');
        $lastComma = strrpos($clean, ',');

        if ($lastDot > $lastComma) {
            // Titik muncul lebih akhir → titik = desimal, koma = ribuan
            // e.g. "1,260,000.50"
            $clean = str_replace(',', '', $clean);
            return (float) $clean;
        } else {
            // Koma muncul lebih akhir → koma = desimal, titik = ribuan
            // e.g. "1.260.000,50"
            $clean = str_replace('.', '', $clean);
            $clean = str_replace(',', '.', $clean);
            return (float) $clean;
        }
    }

    /**
     * Normalisasi nilai status_aset agar sesuai enum: aktif|dipinjam|rusak|dihapus
     */
    private function parseStatus(?string $value): string
    {
        $v = strtolower(trim($value ?? ''));
        $map = [
            'aktif'    => 'aktif',
            'active'   => 'aktif',
            'baik'     => 'aktif',
            'baru'     => 'aktif',
            'dipinjam' => 'dipinjam',
            'pinjam'   => 'dipinjam',
            'rusak'    => 'rusak',
            'broken'   => 'rusak',
            'bekas'    => 'aktif',
            'habis pakai' => 'aktif',
            'dihapus'  => 'dihapus',
        ];
        return $map[$v] ?? 'aktif';
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
        $errors = [];

        // Siapkan gedung default untuk import — dipakai jika kolom Ruangan kosong
        $gedungDefault = \App\Models\Gedung::firstOrCreate(
            ['nama_gedung' => 'Gedung Utama'],
            ['nama_gedung' => 'Gedung Utama', 'kode_gedung' => 'GD-UTAMA', 'jumlah_lantai' => 1, 'deskripsi' => 'Dibuat otomatis saat import']
        );

        try {
            $rows = \Spatie\SimpleExcel\SimpleExcelReader::create($fullPath)->getRows();
            $rows->each(function (array $row) use ($request, &$imported, &$failed, &$errors, $gedungDefault) {
                try {
                    // Ambil nama aset — skip baris kosong
                    $namaAset = trim($row['Nama Aset'] ?? '');
                    if (empty($namaAset)) {
                        $failed++;
                        return;
                    }

                    // Cari atau buat master data dari nama
                    $namaKategori = trim($row['Kategori'] ?? '') ?: 'Umum';
                    $kategori = \App\Models\Kategori::firstOrCreate(['nama_kategori' => $namaKategori]);

                    $namaRuangan = trim($row['Ruangan'] ?? '') ?: 'Belum Ditentukan';
                    // Ruangan butuh id_gedung — pakai gedung default jika belum ada
                    $ruangan = \App\Models\Ruangan::firstOrCreate(
                        ['nama_ruangan' => $namaRuangan],
                        ['nama_ruangan' => $namaRuangan, 'id_gedung' => $gedungDefault->id]
                    );

                    $sumberDana = null;
                    $namaSD = trim($row['Sumber Dana'] ?? '');
                    if (!empty($namaSD)) {
                        $sumberDana = \App\Models\SumberDana::firstOrCreate(['nama_sumber_dana' => $namaSD]);
                    }

                    $namaKondisi = trim($row['Kondisi'] ?? '') ?: 'Baik';
                    $kondisi = \App\Models\Kondisi::firstOrCreate(['nama_kondisi' => $namaKondisi]);

                    // Parse jumlah — bisa berupa "48" atau "48 buah" atau "35 x 12 / 1"
                    $jumlahRaw = trim((string) ($row['Jumlah'] ?? '1'));
                    // Ambil angka pertama yang ditemukan
                    preg_match('/[\d]+/', $jumlahRaw, $matches);
                    $jumlah = !empty($matches[0]) ? (int) $matches[0] : 1;
                    if ($jumlah < 1) $jumlah = 1;

                    // Parse harga — bersihkan format Rupiah
                    $hargaRaw = (string) ($row['Harga Perolehan'] ?? '0');
                    $harga = $this->parseAngka($hargaRaw);

                    // Parse tahun perolehan
                    $tahunRaw = trim((string) ($row['Tahun Perolehan'] ?? ''));
                    $tahun = is_numeric($tahunRaw) ? (int) $tahunRaw : (int) date('Y');

                    // Parse tanggal perolehan
                    $tglRaw = trim($row['Tanggal Perolehan'] ?? '');
                    $tanggal = null;
                    if (!empty($tglRaw)) {
                        try {
                            $tanggal = date('Y-m-d', strtotime($tglRaw));
                            if ($tanggal === '1970-01-01') $tanggal = null;
                        } catch (\Exception $e) {
                            $tanggal = null;
                        }
                    }

                    // Parse status
                    $statusRaw = trim($row['Status'] ?? '');
                    $status = $this->parseStatus($statusRaw);

                    $data = [
                        'id_kategori'      => $kategori->id,
                        'id_ruangan'       => $ruangan->id,
                        'id_sumber_dana'   => $sumberDana ? $sumberDana->id : null,
                        'id_kondisi'       => $kondisi->id,
                        'id_user'          => $request->user()->id,
                        'kode_aset'        => trim($row['Kode Aset'] ?? '') ?: null,
                        'nama_aset'        => $namaAset,
                        'merek'            => trim($row['Merek'] ?? '') ?: null,
                        'tipe'             => trim($row['Tipe'] ?? '') ?: null,
                        'warna'            => trim($row['Warna'] ?? '') ?: null,
                        'jumlah'           => $jumlah,
                        'satuan'           => trim($row['Satuan'] ?? '') ?: 'Unit',
                        'tahun_perolehan'  => $tahun,
                        'harga_perolehan'  => $harga,
                        'nomor_seri'       => trim($row['Nomor Seri'] ?? '') ?: null,
                        'tanggal_perolehan'=> $tanggal,
                        'deskripsi'        => trim($row['Deskripsi'] ?? '') ?: null,
                        'status_aset'      => $status,
                    ];

                    // Jika ada Kode Aset, update. Jika tidak ada, create.
                    $kodeAset = $data['kode_aset'];
                    if (!empty($kodeAset)) {
                        $aset = Aset::updateOrCreate(['kode_aset' => $kodeAset], $data);
                    } else {
                        $aset = Aset::create($data);
                    }

                    // Rekam History
                    if ($aset->wasRecentlyCreated) {
                        History::create([
                            'id_aset'    => $aset->id,
                            'id_user'    => $request->user()->id,
                            'aksi'       => 'PENAMBAHAN',
                            'keterangan' => 'Aset baru diimport dari Excel ke Ruangan ' . $ruangan->nama_ruangan,
                            'tanggal'    => now()
                        ]);
                    }

                    $imported++;
                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = ($row['Nama Aset'] ?? '?') . ': ' . $e->getMessage();
                    \Illuminate\Support\Facades\Log::error('Import error baris: ' . json_encode($row) . ' — ' . $e->getMessage());
                }
            });

            // Hapus file temporary
            \Illuminate\Support\Facades\Storage::delete($path);

            return response()->json([
                'message'  => 'Proses import selesai.',
                'imported' => $imported,
                'failed'   => $failed,
                'errors'   => array_slice($errors, 0, 20), // kirim maks 20 error pertama
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Storage::delete($path ?? '');
            return response()->json([
                'message' => 'Gagal membaca file Excel.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}
