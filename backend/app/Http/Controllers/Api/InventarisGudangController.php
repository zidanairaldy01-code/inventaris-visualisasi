<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarisGudang;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class InventarisGudangController extends Controller
{
    /**
     * Display a listing of the resource for Gudang.
     */
    public function index(Request $request)
    {
        $query = InventarisGudang::with(['user', 'folder']);

        if ($request->has('id_folder')) {
            $idFolder = $request->query('id_folder');
            if ($idFolder === 'general' || $idFolder === 'null') {
                $query->whereNull('id_folder');
            } elseif (is_numeric($idFolder)) {
                $query->where('id_folder', $idFolder);
            }
        }

        $items = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data'   => $items,
        ]);
    }

    /**
     * Store a newly created gudang item in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'tanggal_pengambilan' => 'nullable|date',
            'kode'                => 'nullable|string|max:255',
            'nama_barang'         => 'required|string|max:255',
            'satuan'              => 'nullable|string|max:50',
            'stok_awal'           => 'nullable|integer|min:0',
            'stok_masuk'          => 'nullable|integer|min:0',
            'stok_keluar'         => 'nullable|integer|min:0',
            'keterangan'          => 'nullable|string',
            'id_folder'           => 'nullable|exists:folder_inventaris,id',
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

        $validated['stok_awal']   = $validated['stok_awal']   ?? 0;
        $validated['stok_masuk']  = $validated['stok_masuk']  ?? 0;
        $validated['stok_keluar'] = $validated['stok_keluar'] ?? 0;
        $validated['id_user']     = $request->user()?->id;

        $item = InventarisGudang::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Data barang gudang berhasil ditambahkan',
            'data'    => $item->load('user'),
        ], 201);
    }

    /**
     * Display the specified gudang item.
     */
    public function show(string $id)
    {
        $item = InventarisGudang::with(['user', 'folder'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $item,
        ]);
    }

    /**
     * Update the specified gudang item in storage.
     */
    public function update(Request $request, string $id)
    {
        $item = InventarisGudang::findOrFail($id);

        $validated = $request->validate([
            'tanggal_pengambilan' => 'sometimes|nullable|date',
            'kode'                => 'sometimes|nullable|string|max:255',
            'nama_barang'         => 'sometimes|required|string|max:255',
            'satuan'              => 'sometimes|nullable|string|max:50',
            'stok_awal'           => 'sometimes|integer|min:0',
            'stok_masuk'          => 'sometimes|integer|min:0',
            'stok_keluar'         => 'sometimes|integer|min:0',
            'keterangan'          => 'nullable|string',
            'id_folder'           => 'nullable|exists:folder_inventaris,id',
        ]);

        if (array_key_exists('tanggal_pengambilan', $validated) && empty($validated['tanggal_pengambilan'])) {
            $validated['tanggal_pengambilan'] = null;
        }

        if (array_key_exists('kode', $validated) && empty(trim($validated['kode'] ?? ''))) {
            $validated['kode'] = null;
        }

        $item->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Data barang gudang berhasil diperbarui',
            'data'    => $item->fresh(['user', 'folder']),
        ]);
    }

    /**
     * Remove the specified gudang item from storage.
     */
    public function destroy(string $id)
    {
        $item = InventarisGudang::findOrFail($id);
        $item->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Data barang gudang berhasil dihapus',
        ]);
    }

    /**
     * Import Excel khusus Inventaris Gudang — Robust Column Mapper.
     */
    public function importExcel(Request $request)
    {
        $request->validate([
            'file'      => 'required|file|mimes:xlsx,xls,csv|max:10240',
            'id_folder' => 'nullable',
        ]);

        $file     = $request->file('file');
        $idFolder = $request->input('id_folder');
        if ($idFolder === 'null' || $idFolder === 'general' || empty($idFolder)) {
            $idFolder = null;
        }

        DB::beginTransaction();
        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet   = $spreadsheet->getActiveSheet();

            // Read all rows as plain array (no formatting, keep nulls)
            $rawRows = $worksheet->toArray(null, false, false, false);

            if (empty($rawRows)) {
                return response()->json(['status' => 'error', 'message' => 'File Excel kosong'], 400);
            }

            $imported = 0;
            $skipped  = 0;
            $errors   = [];

            // ── Step 1: Find header row (look for "nama" or "barang" keyword) ──
            $h1Idx = -1;
            foreach ($rawRows as $idx => $row) {
                if (!is_array($row)) continue;
                $line = strtolower(implode(' ', array_map(fn($c) => trim(strval($c ?? '')), $row)));
                if (
                    str_contains($line, 'nama barang') ||
                    str_contains($line, 'nama') ||
                    str_contains($line, 'barang') ||
                    str_contains($line, 'kode')
                ) {
                    $h1Idx = $idx;
                    break;
                }
            }

            if ($h1Idx === -1) {
                DB::rollBack();
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Header tidak ditemukan. Pastikan ada kolom: NAMA BARANG, KODE, STOK.',
                ], 400);
            }

            // ── Step 2: Check for sub-header row (AWAL / IN / OUT / AKHIR) ──
            $h2Idx = $h1Idx + 1;
            $hasSubHeader = false;
            if (isset($rawRows[$h2Idx])) {
                $subLine = strtolower(implode(' ', array_map(fn($c) => trim(strval($c ?? '')), $rawRows[$h2Idx])));
                if (
                    str_contains($subLine, 'awal') ||
                    str_contains($subLine, 'akhir') ||
                    preg_match('/\bin\b/', $subLine) ||
                    preg_match('/\bout\b/', $subLine)
                ) {
                    $hasSubHeader = true;
                }
            }

            $dataStartIndex = $hasSubHeader ? $h1Idx + 2 : $h1Idx + 1;

            // ── Step 3: Build column map by scanning h1 + h2 headers ──
            $h1 = array_map(fn($c) => strtolower(trim(strval($c ?? ''))), $rawRows[$h1Idx]);
            $h2 = $hasSubHeader
                ? array_map(fn($c) => strtolower(trim(strval($c ?? ''))), $rawRows[$h2Idx])
                : array_fill(0, count($h1), '');

            $maxCols = max(count($h1), count($h2));
            $colMap  = [];

            for ($i = 0; $i < $maxCols; $i++) {
                $v1 = $h1[$i] ?? '';
                $v2 = $h2[$i] ?? '';
                $combined = trim("$v1 $v2");
                if ($combined === '') continue;

                // NO / nomor
                if (($v1 === 'no' || $v1 === 'no.' || $v1 === 'nomor') && !isset($colMap['no'])) {
                    $colMap['no'] = $i;
                }
                // Tanggal
                if ((str_contains($combined, 'tanggal') || str_contains($v1, 'tanggal')) && !isset($colMap['tanggal'])) {
                    $colMap['tanggal'] = $i;
                }
                // Kode
                if ((str_contains($v1, 'kode') || $v1 === 'kode') && !isset($colMap['kode'])) {
                    $colMap['kode'] = $i;
                }
                // Nama Barang
                if (
                    (str_contains($combined, 'nama barang') || str_contains($combined, 'nama') || str_contains($v1, 'barang') || str_contains($v1, 'uraian')) &&
                    !isset($colMap['nama'])
                ) {
                    $colMap['nama'] = $i;
                }
                // Satuan
                if (str_contains($combined, 'satuan') && !isset($colMap['satuan'])) {
                    $colMap['satuan'] = $i;
                }
                // Stok Awal
                if ((str_contains($combined, 'awal') || ($v1 === 'stok' && $v2 === 'awal')) && !isset($colMap['stok_awal'])) {
                    $colMap['stok_awal'] = $i;
                }
                // Stok Masuk / IN
                if ((str_contains($combined, 'masuk') || str_contains($combined, ' in') || $v2 === 'in') && !isset($colMap['stok_masuk'])) {
                    $colMap['stok_masuk'] = $i;
                }
                // Stok Keluar / OUT
                if ((str_contains($combined, 'keluar') || str_contains($combined, 'out') || $v2 === 'out') && !isset($colMap['stok_keluar'])) {
                    $colMap['stok_keluar'] = $i;
                }
                // Stok Akhir
                if ((str_contains($combined, 'akhir') || ($v1 === 'stok' && $v2 === 'akhir')) && !isset($colMap['stok_akhir'])) {
                    $colMap['stok_akhir'] = $i;
                }
            }

            // Fallback: if no explicit 'nama' column found, look for any text column
            // Try positional fallback: NO=0, TANGGAL=1, KODE=2, NAMA=3, SATUAN=4, AWAL=5, IN=6, OUT=7
            if (!isset($colMap['nama'])) {
                $colMap['nama']       = 3;
            }
            if (!isset($colMap['tanggal'])) {
                $colMap['tanggal']    = 1;
            }
            if (!isset($colMap['kode'])) {
                $colMap['kode']       = 2;
            }
            if (!isset($colMap['satuan'])) {
                $colMap['satuan']     = 4;
            }
            if (!isset($colMap['stok_awal'])) {
                $colMap['stok_awal']  = 5;
            }
            if (!isset($colMap['stok_masuk'])) {
                $colMap['stok_masuk'] = 6;
            }
            if (!isset($colMap['stok_keluar'])) {
                $colMap['stok_keluar'] = 7;
            }

            // ── Step 4: Process data rows ──
            foreach ($rawRows as $index => $row) {
                if ($index < $dataStartIndex) continue;
                if (!is_array($row)) continue;

                // Skip fully empty rows
                $hasContent = false;
                foreach ($row as $cell) {
                    if ($cell !== null && trim(strval($cell)) !== '') {
                        $hasContent = true;
                        break;
                    }
                }
                if (!$hasContent) continue;

                try {
                    $namaRaw    = trim(strval($row[$colMap['nama']]       ?? ''));
                    $tanggalRaw = $row[$colMap['tanggal']]   ?? null;
                    $kodeRaw    = trim(strval($row[$colMap['kode']]        ?? ''));
                    $satuanRaw  = trim(strval($row[$colMap['satuan']]      ?? ''));
                    $awalRaw    = $row[$colMap['stok_awal']]  ?? 0;
                    $masukRaw   = $row[$colMap['stok_masuk']] ?? 0;
                    $keluarRaw  = $row[$colMap['stok_keluar']] ?? 0;

                    // Fallback: nama still empty → scan all text cells
                    if (empty($namaRaw)) {
                        foreach ($row as $cIdx => $val) {
                            $sv = trim(strval($val ?? ''));
                            if (
                                !empty($sv) &&
                                !is_numeric($sv) &&
                                !preg_match('/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/', $sv) &&
                                strlen($sv) > 3
                            ) {
                                $namaRaw = $sv;
                                break;
                            }
                        }
                    }

                    if (empty($namaRaw)) {
                        $skipped++;
                        continue;
                    }

                    // Skip header-like rows
                    $namaLower = strtolower($namaRaw);
                    if (
                        in_array($namaLower, ['nama barang', 'uraian', 'nama', 'barang']) ||
                        str_starts_with($namaLower, 'total') ||
                        str_starts_with($namaLower, 'jumlah') ||
                        $namaLower === 'stok' ||
                        $namaLower === 'no' ||
                        $namaLower === 'no.'
                    ) {
                        continue;
                    }

                    $parsedTanggal = !empty($tanggalRaw) ? $this->parseDate($tanggalRaw) : null;
                    $finalKode     = !empty($kodeRaw) ? $kodeRaw : null;

                    $data = [
                        'tanggal_pengambilan' => $parsedTanggal,
                        'kode'                => $finalKode,
                        'nama_barang'         => $namaRaw,
                        'satuan'              => $satuanRaw ?: 'Unit',
                        'stok_awal'           => $this->parseNumber($awalRaw),
                        'stok_masuk'          => $this->parseNumber($masukRaw),
                        'stok_keluar'         => $this->parseNumber($keluarRaw),
                        'keterangan'          => null,
                        'id_user'             => $request->user()?->id,
                        'id_folder'           => $idFolder ?: null,
                    ];

                    if ($finalKode) {
                        $existing = InventarisGudang::where('kode', $finalKode)->first();
                        $existing ? $existing->update($data) : InventarisGudang::create($data);
                    } else {
                        InventarisGudang::create($data);
                    }
                    $imported++;

                } catch (\Exception $e) {
                    $errors[] = 'Baris ' . ($index + 1) . ': ' . $e->getMessage();
                    $skipped++;
                }
            }

            DB::commit();

            if ($imported === 0 && $skipped > 0) {
                return response()->json([
                    'status'  => 'error',
                    'message' => "Tidak ada data yang berhasil diimport. {$skipped} baris dilewati." .
                        (!empty($errors) ? ' Error: ' . implode('; ', array_slice($errors, 0, 3)) : ''),
                ], 422);
            }

            return response()->json([
                'status'   => 'success',
                'message'  => "Berhasil import {$imported} data gudang" . ($skipped > 0 ? ", {$skipped} dilewati" : ''),
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
     * Get summary metrics for Gudang.
     */
    public function summary(Request $request)
    {
        $query = InventarisGudang::query();

        if ($request->has('id_folder')) {
            $idFolder = $request->query('id_folder');
            if ($idFolder === 'general' || $idFolder === 'null') {
                $query->whereNull('id_folder');
            } elseif (is_numeric($idFolder)) {
                $query->where('id_folder', $idFolder);
            }
        }

        $totalItems      = (clone $query)->count();
        $totalStokAwal   = (clone $query)->sum('stok_awal');
        $totalStokMasuk  = (clone $query)->sum('stok_masuk');
        $totalStokKeluar = (clone $query)->sum('stok_keluar');
        $totalStokAkhir  = (clone $query)->sum('stok_akhir');
        $totalMenipis    = (clone $query)->where('stok_akhir', '<=', 5)->count();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_items'       => $totalItems,
                'total_stok_awal'   => $totalStokAwal,
                'total_stok_masuk'  => $totalStokMasuk,
                'total_stok_keluar' => $totalStokKeluar,
                'total_stok_akhir'  => $totalStokAkhir,
                'total_menipis'     => $totalMenipis,
            ],
        ]);
    }
}
