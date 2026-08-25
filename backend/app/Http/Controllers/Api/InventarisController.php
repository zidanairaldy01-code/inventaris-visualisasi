<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventaris;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class InventarisController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Inventaris::with(['user', 'folder']);

        if ($request->has('id_folder')) {
            $idFolder = $request->query('id_folder');
            if ($idFolder === 'general' || $idFolder === 'null') {
                $query->whereNull('id_folder');
            } elseif (is_numeric($idFolder)) {
                $query->where('id_folder', $idFolder);
            }
        }

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
            'stok_awal'           => 'nullable|integer|min:0',
            'stok_masuk'          => 'nullable|integer|min:0',
            'stok_keluar'         => 'nullable|integer|min:0',
            'keterangan'          => 'nullable|string',
            'id_folder'           => 'nullable|exists:folder_inventaris,id',
        ]);

        if (empty($validated['tanggal_pengambilan'])) {
            $validated['tanggal_pengambilan'] = now()->toDateString();
        }

        if (empty($validated['kode'])) {
            $lastId = Inventaris::max('id') ?? 0;
            $validated['kode'] = 'INV-' . str_pad($lastId + 1, 4, '0', STR_PAD_LEFT);
        }

        $existingCount = Inventaris::where('kode', $validated['kode'])->count();
        if ($existingCount > 0) {
            $validated['kode'] = $validated['kode'] . '-' . time();
        }

        if (empty($validated['satuan'])) {
            $validated['satuan'] = 'Unit';
        }

        $validated['stok_awal']   = $validated['stok_awal']   ?? 0;
        $validated['stok_masuk']  = $validated['stok_masuk']  ?? 0;
        $validated['stok_keluar'] = $validated['stok_keluar'] ?? 0;
        $validated['id_user']     = $request->user()?->id;

        $item = Inventaris::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Data inventaris berhasil ditambahkan',
            'data'    => $item->load('user'),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $item = Inventaris::with('user')->findOrFail($id);

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
        $item = Inventaris::findOrFail($id);

        $validated = $request->validate([
            'tanggal_pengambilan' => 'sometimes|required|date',
            'kode'                => 'sometimes|required|string|max:255|unique:' . (new Inventaris)->getTable() . ',kode,' . $id,
            'nama_barang'         => 'sometimes|required|string|max:255',
            'satuan'              => 'sometimes|required|string|max:50',
            'stok_awal'           => 'sometimes|required|integer|min:0',
            'stok_masuk'          => 'sometimes|required|integer|min:0',
            'stok_keluar'         => 'sometimes|required|integer|min:0',
            'keterangan'          => 'nullable|string',
            'id_folder'           => 'nullable|exists:folder_inventaris,id',
        ]);

        $item->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Data inventaris berhasil diupdate',
            'data'    => $item->fresh()->load(['user', 'folder']),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $item = Inventaris::findOrFail($id);
        $item->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Data inventaris berhasil dihapus',
        ]);
    }

    /**
     * Import data from Excel.
     */
    public function importExcel(Request $request)
    {
        $request->validate([
            'file'      => 'required|file|mimes:xlsx,xls,csv|max:5120',
            'id_folder' => 'nullable|exists:folder_inventaris,id',
        ]);

        $file        = $request->file('file');
        $idFolder    = $request->input('id_folder');
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
                'message' => 'Format Excel tidak sesuai. Header tidak ditemukan. Pastikan ada kolom: Tanggal, Kode, Nama Barang, AWAL, IN, OUT, AKHIR.',
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
                    $masukRaw      = $row[$columnMap['stok_masuk']   ?? -1] ?? 0;
                    $keluarRaw     = $row[$columnMap['stok_keluar']  ?? -1] ?? 0;
                    $keteranganRaw = isset($columnMap['keterangan'])
                                        ? trim($row[$columnMap['keterangan']] ?? '')
                                        : null;

                    if (empty($namaRaw)) {
                        $skipped++;
                        continue;
                    }

                    if (empty($kodeRaw)) {
                        $lastId  = Inventaris::max('id') ?? 0;
                        $kodeRaw = 'INV-' . str_pad($lastId + $imported + 1, 4, '0', STR_PAD_LEFT);
                    }

                    $data = [
                        'tanggal_pengambilan' => $this->parseDate($tanggalRaw),
                        'kode'                => $kodeRaw,
                        'nama_barang'         => $namaRaw,
                        'satuan'              => $satuanRaw ?: 'Unit',
                        'stok_awal'           => $this->parseNumber($awalRaw),
                        'stok_masuk'          => $this->parseNumber($masukRaw),
                        'stok_keluar'         => $this->parseNumber($keluarRaw),
                        'keterangan'          => $keteranganRaw ?: null,
                        'id_user'             => $request->user()?->id,
                        'id_folder'           => $idFolder ?: null,
                    ];

                    $item = Inventaris::where('kode', $data['kode'])->first();
                    $item ? $item->update($data) : Inventaris::create($data);
                    $imported++;

                } catch (\Exception $e) {
                    $errors[] = 'Baris ' . ($index + 1) . ': ' . $e->getMessage();
                    $skipped++;
                }
            }

            DB::commit();

            $message = "Berhasil import {$imported} data inventaris";
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

    private function parseDate($value): string
    {
        if (empty($value)) return now()->toDateString();
        if (is_numeric($value)) {
            $base = new \DateTime('1899-12-30');
            $base->modify("+{$value} days");
            return $base->format('Y-m-d');
        }

        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return now()->toDateString();
        }
    }

    private function parseNumber($value): int
    {
        if (is_numeric($value)) return (int) $value;
        $cleaned = preg_replace('/[^0-9\-]/', '', strval($value));
        return $cleaned !== '' ? (int) $cleaned : 0;
    }

    /**
     * Get summary statistics.
     */
    public function summary(Request $request)
    {
        $query = Inventaris::query();

        if ($request->has('id_folder')) {
            $idFolder = $request->query('id_folder');
            if ($idFolder === 'general' || $idFolder === 'null') {
                $query->whereNull('id_folder');
            } elseif (is_numeric($idFolder)) {
                $query->where('id_folder', $idFolder);
            }
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_items'       => (clone $query)->count(),
                'total_stok_awal'   => (clone $query)->sum('stok_awal'),
                'total_stok_masuk'  => (clone $query)->sum('stok_masuk'),
                'total_stok_keluar' => (clone $query)->sum('stok_keluar'),
                'total_stok_akhir'  => (clone $query)->sum('stok_akhir'),
            ],
        ]);
    }
}
