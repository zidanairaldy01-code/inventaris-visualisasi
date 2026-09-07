<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SaranaPrasarana;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SaranaPrasaranaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SaranaPrasarana::with(['user']);

        $items = $query->orderBy('tanggal_pengambilan', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $items,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'tanggal_pengambilan' => 'nullable|date',
            'kode'                => 'nullable|string|max:255',
            'nama_barang'         => 'required|string|max:255',
            'satuan'              => 'nullable|string|max:50',
            'luas_jumlah'         => 'nullable|string|max:100',
            'stok_awal'           => 'nullable|integer|min:0',
            'stok_masuk'          => 'nullable|integer|min:0',
            'stok_keluar'         => 'nullable|integer|min:0',
            'nilai_harga_pembelian' => 'nullable|integer|min:0',
            'nilai_harga_sekarang'  => 'nullable|integer|min:0',
            'kondisi'               => 'nullable|string|max:50',
            'keterangan'            => 'nullable|string',
        ]);

        if (array_key_exists('tanggal_pengambilan', $validated) && empty($validated['tanggal_pengambilan'])) {
            $validated['tanggal_pengambilan'] = null;
        }

        if (array_key_exists('kode', $validated) && empty(trim($validated['kode'] ?? ''))) {
            $validated['kode'] = null;
        }

        if (empty($validated['satuan'])) {
            $validated['satuan'] = 'Unit';
        }

        if (empty($validated['kondisi'])) {
            $validated['kondisi'] = 'Baik';
        }

        if (empty($validated['luas_jumlah']) && isset($validated['stok_awal'])) {
            $validated['luas_jumlah'] = $validated['stok_awal'] . ' ' . $validated['satuan'];
        }

        $validated['stok_awal']   = $validated['stok_awal']   ?? 0;
        $validated['stok_masuk']  = $validated['stok_masuk']  ?? 0;
        $validated['stok_keluar'] = $validated['stok_keluar'] ?? 0;
        $validated['nilai_harga_pembelian'] = $validated['nilai_harga_pembelian'] ?? 0;
        $validated['nilai_harga_sekarang']  = $validated['nilai_harga_sekarang']  ?? 0;
        $validated['id_user']     = $request->user()?->id;

        $item = SaranaPrasarana::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Data sarana prasarana berhasil ditambahkan',
            'data'    => $item->load('user'),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $item = SaranaPrasarana::with('user')->findOrFail($id);
        return response()->json([
            'status' => 'success',
            'data'   => $item,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $item = SaranaPrasarana::findOrFail($id);

        $validated = $request->validate([
            'tanggal_pengambilan'   => 'nullable|date',
            'kode'                  => 'nullable|string|max:255|unique:sarana_prasaranas,kode,' . $id,
            'nama_barang'           => 'required|string|max:255',
            'satuan'                => 'nullable|string|max:50',
            'luas_jumlah'           => 'nullable|string|max:100',
            'stok_awal'             => 'nullable|integer|min:0',
            'stok_masuk'            => 'nullable|integer|min:0',
            'stok_keluar'           => 'nullable|integer|min:0',
            'nilai_harga_pembelian' => 'nullable|integer|min:0',
            'nilai_harga_sekarang'  => 'nullable|integer|min:0',
            'kondisi'               => 'nullable|string|max:50',
            'keterangan'            => 'nullable|string',
        ]);

        // Normalize nullable fields
        if (array_key_exists('tanggal_pengambilan', $validated) && empty($validated['tanggal_pengambilan'])) {
            $validated['tanggal_pengambilan'] = null;
        }
        if (array_key_exists('kode', $validated) && empty(trim($validated['kode'] ?? ''))) {
            $validated['kode'] = null;
        }
        if (empty($validated['satuan'])) {
            $validated['satuan'] = $item->satuan ?: 'Unit';
        }
        if (empty($validated['kondisi'])) {
            $validated['kondisi'] = $item->kondisi ?: 'Baik';
        }
        if (!array_key_exists('luas_jumlah', $validated) || is_null($validated['luas_jumlah'])) {
            if (isset($validated['stok_awal'])) {
                $validated['luas_jumlah'] = $validated['stok_awal'] . ' ' . $validated['satuan'];
            }
        }

        $validated['stok_awal']   = $validated['stok_awal']   ?? $item->stok_awal   ?? 0;
        $validated['stok_masuk']  = $validated['stok_masuk']  ?? $item->stok_masuk  ?? 0;
        $validated['stok_keluar'] = $validated['stok_keluar'] ?? $item->stok_keluar ?? 0;
        $validated['nilai_harga_pembelian'] = $validated['nilai_harga_pembelian'] ?? $item->nilai_harga_pembelian ?? 0;
        $validated['nilai_harga_sekarang']  = $validated['nilai_harga_sekarang']  ?? $item->nilai_harga_sekarang  ?? 0;

        $item->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Data sarana prasarana berhasil diupdate',
            'data'    => $item->fresh()->load('user'),
        ]);
    }


    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $item = SaranaPrasarana::findOrFail($id);
        $item->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Data sarana prasarana berhasil dihapus',
        ]);
    }

    /**
     * Import data from Excel.
     */
    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:5120',
        ]);

        $file        = $request->file('file');
        $spreadsheet = IOFactory::load($file->getPathname());
        $sheet       = $spreadsheet->getActiveSheet();
        $rows        = $sheet->toArray(null, false, false, false);

        $headerRowIndex = null;
        for ($i = 0; $i < min(count($rows), 5); $i++) {
            $rowNorm = array_map(fn($c) => strtolower(trim(strval($c ?? ''))), $rows[$i]);
            $rowText = implode(' ', $rowNorm);
            if (stripos($rowText, 'kode') !== false || stripos($rowText, 'nama') !== false) {
                $headerRowIndex = $i;
                break;
            }
        }

        if ($headerRowIndex === null) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Format Excel tidak sesuai. Header tidak ditemukan.',
            ], 400);
        }

        $h1 = array_map(fn($c) => trim(strval($c ?? '')), $rows[$headerRowIndex]);
        $h2 = isset($rows[$headerRowIndex + 1])
            ? array_map(fn($c) => trim(strval($c ?? '')), $rows[$headerRowIndex + 1])
            : [];

        $h2Text       = strtolower(implode(' ', $h2));
        $hasSubHeader = (
            stripos($h2Text, 'awal')   !== false ||
            stripos($h2Text, 'akhir')  !== false ||
            stripos($h2Text, 'masuk')  !== false ||
            stripos($h2Text, 'keluar') !== false ||
            preg_match('/\bin\b/', $h2Text) ||
            preg_match('/\bout\b/', $h2Text)
        );

        $columnMap = [];
        $maxCols   = max(count($h1), count($h2));

        for ($idx = 0; $idx < $maxCols; $idx++) {
            $v1       = strtolower($h1[$idx] ?? '');
            $v2       = strtolower($h2[$idx] ?? '');
            $combined = trim("$v1 $v2");

            if ($combined === '') continue;

            if (stripos($v1, 'tanggal') !== false) {
                $columnMap['tanggal'] = $idx;
            }
            if ($v1 === 'kode' || stripos($v1, 'kode') !== false) {
                $columnMap['kode'] = $idx;
            }
            if (stripos($combined, 'nama') !== false && !isset($columnMap['nama_barang'])) {
                $columnMap['nama_barang'] = $idx;
            }
            if (stripos($combined, 'satuan') !== false) {
                $columnMap['satuan'] = $idx;
            }
            if (stripos($combined, 'awal') !== false) {
                $columnMap['stok_awal'] = $idx;
            }
            if (!isset($columnMap['stok_masuk'])) {
                if (
                    stripos($combined, 'masuk') !== false ||
                    $v2 === 'in' ||
                    ($v1 === 'in' && !$hasSubHeader)
                ) {
                    $columnMap['stok_masuk'] = $idx;
                }
            }
            if (!isset($columnMap['stok_keluar'])) {
                if (
                    stripos($combined, 'keluar') !== false ||
                    $v2 === 'out' ||
                    ($v1 === 'out' && !$hasSubHeader)
                ) {
                    $columnMap['stok_keluar'] = $idx;
                }
            }
            if (stripos($combined, 'akhir') !== false || stripos($combined, 'saldo') !== false) {
                $columnMap['stok_akhir'] = $idx;
            }
            if (stripos($combined, 'keterangan') !== false || $combined === 'ket') {
                $columnMap['keterangan'] = $idx;
            }
            if (stripos($combined, 'kondisi') !== false || stripos($combined, 'keadaan') !== false) {
                $columnMap['kondisi'] = $idx;
            }
            if (stripos($combined, 'pembelian') !== false || stripos($combined, 'perolehan') !== false || stripos($combined, 'harga beli') !== false) {
                $columnMap['nilai_harga_pembelian'] = $idx;
            }
            if (stripos($combined, 'sekarang') !== false || stripos($combined, 'saat ini') !== false || stripos($combined, 'harga sekarang') !== false) {
                $columnMap['nilai_harga_sekarang'] = $idx;
            }
        }

        $dataStartIndex = $headerRowIndex + ($hasSubHeader ? 2 : 1);
        $imported = 0;
        $skipped  = 0;
        $errors   = [];

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                if ($index < $dataStartIndex) continue;
                if (empty(array_filter($row, fn($c) => !is_null($c) && trim(strval($c)) !== ''))) {
                    continue;
                }

                try {
                    $tanggalRaw    = $row[$columnMap['tanggal']      ?? -1] ?? '';
                    $kodeRaw       = trim($row[$columnMap['kode']     ?? -1] ?? '');
                    $namaRaw       = trim($row[$columnMap['nama_barang'] ?? -1] ?? '');
                    $satuanRaw     = isset($columnMap['satuan'])
                                        ? trim($row[$columnMap['satuan']] ?? 'Unit')
                                        : 'Unit';
                    $awalRaw       = $row[$columnMap['stok_awal']    ?? -1] ?? 0;
                    $luasJumlahRaw = isset($columnMap['stok_awal'])
                                        ? trim(strval($row[$columnMap['stok_awal']] ?? ''))
                                        : '';
                    $masukRaw      = $row[$columnMap['stok_masuk']   ?? -1] ?? 0;
                    $keluarRaw     = $row[$columnMap['stok_keluar']  ?? -1] ?? 0;
                    $hargaBeliRaw  = isset($columnMap['nilai_harga_pembelian'])
                                        ? ($row[$columnMap['nilai_harga_pembelian']] ?? 0)
                                        : 0;
                    $hargaSkrgRaw  = isset($columnMap['nilai_harga_sekarang'])
                                        ? ($row[$columnMap['nilai_harga_sekarang']] ?? 0)
                                        : 0;
                    $keteranganRaw = isset($columnMap['keterangan'])
                                        ? trim($row[$columnMap['keterangan']] ?? '')
                                        : null;
                    $kondisiRaw    = isset($columnMap['kondisi'])
                                        ? trim($row[$columnMap['kondisi']] ?? '')
                                        : '';

                    if (empty($kondisiRaw) && !empty($keteranganRaw)) {
                        $lowerKet = strtolower($keteranganRaw);
                        if (str_contains($lowerKet, 'tidak layak')) $kondisiRaw = 'Tidak Layak Pakai';
                        elseif (str_contains($lowerKet, 'rusak berat')) $kondisiRaw = 'Rusak Berat';
                        elseif (str_contains($lowerKet, 'rusak ringan') || str_contains($lowerKet, 'rusak')) $kondisiRaw = 'Rusak Ringan';
                        elseif (str_contains($lowerKet, 'cukup baik')) $kondisiRaw = 'Cukup Baik';
                        elseif (str_contains($lowerKet, 'baik')) $kondisiRaw = 'Baik';
                    }
                    if (empty($kondisiRaw)) {
                        $kondisiRaw = 'Baik';
                    }

                    if (empty($namaRaw)) {
                        $skipped++;
                        continue;
                    }

                    $finalKode = !empty($kodeRaw) ? $kodeRaw : null;

                    $parsedAwal = $this->parseNumber($awalRaw);
                    if ($parsedAwal === 0 && preg_match('/\/|\bx\b|m2/i', $luasJumlahRaw)) {
                        if (preg_match('/\/ *(\d+)/', $luasJumlahRaw, $m)) {
                            $parsedAwal = (int) $m[1];
                        } else {
                            $parsedAwal = 1;
                        }
                    }

                    $data = [
                        'tanggal_pengambilan'   => !empty($tanggalRaw) ? $this->parseDate($tanggalRaw) : null,
                        'kode'                  => $finalKode,
                        'nama_barang'           => $namaRaw,
                        'satuan'                => $satuanRaw ?: 'Unit',
                        'luas_jumlah'           => !empty($luasJumlahRaw) ? $luasJumlahRaw : ($parsedAwal . ' ' . $satuanRaw),
                        'stok_awal'             => $parsedAwal,
                        'stok_masuk'            => $this->parseNumber($masukRaw),
                        'stok_keluar'           => $this->parseNumber($keluarRaw),
                        'nilai_harga_pembelian' => $this->parseNumber($hargaBeliRaw),
                        'nilai_harga_sekarang'  => $this->parseNumber($hargaSkrgRaw),
                        'kondisi'               => $kondisiRaw,
                        'keterangan'            => $keteranganRaw ?: null,
                        'id_user'               => $request->user()?->id,
                    ];

                    if ($finalKode) {
                        $item = SaranaPrasarana::where('kode', $finalKode)->first();
                        $item ? $item->update($data) : SaranaPrasarana::create($data);
                    } else {
                        SaranaPrasarana::create($data);
                    }
                    $imported++;

                } catch (\Exception $e) {
                    $errors[] = 'Baris ' . ($index + 1) . ': ' . $e->getMessage();
                    $skipped++;
                }
            }

            DB::commit();

            $message = "Berhasil import {$imported} data sarana prasarana";
            if ($skipped > 0) $message .= ", {$skipped} baris dilewati";

            return response()->json([
                'status'   => 'success',
                'message'  => $message,
                'imported' => $imported,
                'skipped'  => $skipped,
                'errors'   => $errors,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal import data: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function parseDate($value): ?string
    {
        if (empty($value)) return null;
        if (is_numeric($value)) {
            $base = new \DateTime('1899-12-30');
            $base->modify("+{$value} days");
            return $base->format('Y-m-d');
        }

        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    private function parseNumber($value): int
    {
        if (is_numeric($value)) return (int) $value;
        $cleaned = preg_replace('/[^0-9\-]/', '', strval($value));
        return $cleaned !== '' ? (int) $cleaned : 0;
    }

    /**
     * Batch store multiple items (untuk import Excel dari frontend).
     */
    public function batchStore(Request $request)
    {
        $validated = $request->validate([
            'items'   => 'required|array|min:1',
            'items.*' => 'required|array',
        ]);

        $items = $validated['items'];
        $created = 0;

        DB::beginTransaction();
        try {
            foreach ($items as $item) {
                // Map data dari format aset ke format sarana_prasarana
                $luasStr = $item['luas_jumlah'] ?? null;
                $stokAwal = isset($item['stok_awal']) ? (int) $item['stok_awal'] : 0;
                if ($stokAwal === 0 && !empty($luasStr)) {
                    if (preg_match('/\/ *(\d+)/', $luasStr, $m)) {
                        $stokAwal = (int) $m[1];
                    } elseif (is_numeric($luasStr)) {
                        $stokAwal = (int) $luasStr;
                    } elseif (isset($item['jumlah']) && is_numeric($item['jumlah'])) {
                        $stokAwal = (int) $item['jumlah'];
                    } else {
                        $stokAwal = 1;
                    }
                }

                $data = [
                    'tanggal_pengambilan' => $item['tanggal_perolehan'] ?? $item['tanggal_pengambilan'] ?? null,
                    'kode'                => $item['kode_aset'] ?? $item['kode'] ?? null,
                    'nama_barang'         => $item['nama_barang'] ?? $item['nama_aset'] ?? 'Item',
                    'satuan'              => $item['satuan'] ?? 'Unit',
                    'luas_jumlah'         => !empty($luasStr) ? $luasStr : ($stokAwal . ' ' . ($item['satuan'] ?? 'Unit')),
                    'stok_awal'           => $stokAwal,
                    'stok_masuk'          => $item['stok_masuk'] ?? 0,
                    'stok_keluar'         => $item['stok_keluar'] ?? 0,
                    'nilai_harga_pembelian' => $item['nilai_harga_pembelian'] ?? 0,
                    'nilai_harga_sekarang'  => $item['nilai_harga_sekarang']  ?? 0,
                    'kondisi'               => $item['kondisi'] ?? 'Baik',
                    'keterangan'          => $item['keterangan'] ?? null,
                    'id_user'             => $request->user()?->id,
                ];

                // Pastikan tidak ada nilai kosong untuk field required
                if (empty($data['nama_barang'])) {
                    continue; // Skip item tanpa nama
                }

                SaranaPrasarana::create($data);
                $created++;
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Berhasil menyimpan {$created} data sarana prasarana",
                'count'   => $created,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan data: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get summary statistics.
     */
    public function summary(Request $request)
    {
        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_items'       => SaranaPrasarana::count(),
                'total_stok_awal'   => SaranaPrasarana::sum('stok_awal'),
                'total_stok_masuk'  => SaranaPrasarana::sum('stok_masuk'),
                'total_stok_keluar' => SaranaPrasarana::sum('stok_keluar'),
                'total_stok_akhir'  => SaranaPrasarana::sum('stok_akhir'),
            ],
        ]);
    }
}
