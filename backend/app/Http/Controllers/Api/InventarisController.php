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
        
        \Log::info("Import started: Total rows in Excel = " . count($rows));

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

            // Tanggal
            if (stripos($v1, 'tanggal') !== false) {
                $columnMap['tanggal'] = $idx;
            }
            
            // Kode Kegiatan
            if (stripos($combined, 'kegiatan') !== false && !isset($columnMap['kode_kegiatan'])) {
                $columnMap['kode_kegiatan'] = $idx;
            }
            
            // Kode Rekening  
            if (stripos($combined, 'rekening') !== false && !isset($columnMap['kode_rekening'])) {
                $columnMap['kode_rekening'] = $idx;
            }
            
            // Kode (fallback if no kegiatan/rekening) - SKIP kolom dengan "kegiatan" atau "rekening"
            if ($v1 === 'kode' && 
                !isset($columnMap['kode']) && 
                stripos($combined, 'kegiatan') === false && 
                stripos($combined, 'rekening') === false) {
                $columnMap['kode'] = $idx;
            }
            
            // Nama Barang / Uraian
            if ((stripos($combined, 'nama') !== false || stripos($combined, 'uraian') !== false) && 
                !isset($columnMap['nama_barang'])) {
                $columnMap['nama_barang'] = $idx;
            }
            
            // Satuan (bukan "Harga Satuan")
            if (stripos($v1, 'satuan') !== false && stripos($combined, 'harga') === false && !isset($columnMap['satuan'])) {
                $columnMap['satuan'] = $idx;
            }
            
            // Harga Satuan
            if (stripos($combined, 'harga') !== false && !isset($columnMap['harga_satuan'])) {
                $columnMap['harga_satuan'] = $idx;
            }
            
            // Jumlah Barang (for belanja format)
            if (stripos($combined, 'jumlah barang') !== false || stripos($combined, 'jumlah item') !== false) {
                $columnMap['jumlah_barang'] = $idx;
            }
            // Stok Awal (for inventory format)
            elseif (stripos($combined, 'awal') !== false && !isset($columnMap['stok_awal'])) {
                $columnMap['stok_awal'] = $idx;
            }
            
            // Stok Masuk / IN
            if (!isset($columnMap['stok_masuk'])) {
                if (
                    stripos($combined, 'masuk') !== false ||
                    $v2 === 'in' ||
                    ($v1 === 'in' && !$hasSubHeader)
                ) {
                    $columnMap['stok_masuk'] = $idx;
                }
            }
            
            // Stok Keluar / OUT
            if (!isset($columnMap['stok_keluar'])) {
                if (
                    stripos($combined, 'keluar') !== false ||
                    $v2 === 'out' ||
                    ($v1 === 'out' && !$hasSubHeader)
                ) {
                    $columnMap['stok_keluar'] = $idx;
                }
            }
            
            // Stok Akhir / Saldo
            if (stripos($combined, 'akhir') !== false || stripos($combined, 'saldo') !== false) {
                $columnMap['stok_akhir'] = $idx;
            }
            
            // Jumlah Total (for belanja format - harga total)
            if ((stripos($v1, 'jumlah') !== false || stripos($v1, 'total') !== false) && 
                stripos($combined, 'barang') === false && 
                stripos($combined, 'item') === false && 
                !isset($columnMap['jumlah_total'])) {
                $columnMap['jumlah_total'] = $idx;
            }
            
            // Keterangan
            if (stripos($combined, 'keterangan') !== false || $combined === 'ket') {
                $columnMap['keterangan'] = $idx;
            }
        }
        
        \Log::info("Column mapping: " . json_encode($columnMap));

        $dataStartIndex = $headerRowIndex + ($hasSubHeader ? 2 : 1);
        $imported = 0;
        $skipped  = 0;
        $errors   = [];
        
        \Log::info("Data start index: {$dataStartIndex}, Total rows to process: " . (count($rows) - $dataStartIndex));

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                if ($index < $dataStartIndex) continue;
                
                // Skip empty rows
                if (empty(array_filter($row, fn($c) => !is_null($c) && trim(strval($c)) !== ''))) {
                    \Log::debug("Skipping empty row at index {$index}");
                    continue;
                }

                try {
                    // Parse fields
                    $tanggalRaw = $row[$columnMap['tanggal'] ?? -1] ?? '';
                    $namaRaw = trim($row[$columnMap['nama_barang'] ?? -1] ?? '');
                    
                    if (empty($namaRaw)) {
                        \Log::debug("Skipping row {$index}: empty nama_barang");
                        $skipped++;
                        continue;
                    }
                    
                    \Log::debug("Processing row {$index}: {$namaRaw}");
                    
                    // Handle Kode (priority: Kode Rekening > Kode > Kode Kegiatan)
                    $kKegiatan = isset($columnMap['kode_kegiatan']) ? $row[$columnMap['kode_kegiatan']] ?? '' : '';
                    $kRekening = isset($columnMap['kode_rekening']) ? trim(strval($row[$columnMap['kode_rekening']] ?? '')) : '';
                    $kodeRaw = isset($columnMap['kode']) ? trim(strval($row[$columnMap['kode']] ?? '')) : '';
                    
                    // Handle Kode Kegiatan yang mungkin terbaca sebagai time/decimal oleh Excel
                    if ($kKegiatan) {
                        if (is_numeric($kKegiatan) && $kKegiatan < 1 && $kKegiatan > 0) {
                            // Kemungkinan ini adalah time yang terbaca sebagai decimal
                            // Convert decimal days back to time format (HH:MM:SS)
                            $totalSeconds = round($kKegiatan * 86400); // 86400 seconds in a day
                            $hours = floor($totalSeconds / 3600);
                            $minutes = floor(($totalSeconds % 3600) / 60);
                            $seconds = $totalSeconds % 60;
                            $kKegiatan = sprintf('%d:%02d:%02d', $hours, $minutes, $seconds);
                        } else {
                            $kKegiatan = trim(strval($kKegiatan));
                        }
                        
                        // Clean format
                        $kKegiatan = preg_replace('/\s+/', '', $kKegiatan); // Remove spaces
                    }
                    
                    $finalKode = $kRekening ?: $kodeRaw ?: $kKegiatan ?: null;
                    
                    // Handle Satuan
                    $satuanRaw = isset($columnMap['satuan'])
                                    ? trim($row[$columnMap['satuan']] ?? 'Unit')
                                    : 'Unit';
                    
                    // Handle Stok: Priority jumlah_barang > stok_awal
                    $jumlahBarangRaw = isset($columnMap['jumlah_barang']) ? $row[$columnMap['jumlah_barang']] : null;
                    $awalRaw = isset($columnMap['stok_awal']) ? $row[$columnMap['stok_awal']] : null;
                    
                    // Use jumlah_barang if available (belanja format), otherwise stok_awal
                    $stokAwal = $jumlahBarangRaw !== null ? $this->parseNumber($jumlahBarangRaw) : $this->parseNumber($awalRaw);
                    
                    $masukRaw = isset($columnMap['stok_masuk']) ? $row[$columnMap['stok_masuk']] : 0;
                    $keluarRaw = isset($columnMap['stok_keluar']) ? $row[$columnMap['stok_keluar']] : 0;
                    
                    // Handle Harga Satuan & Build Keterangan
                    $hargaSatuan = isset($columnMap['harga_satuan']) ? $this->parseNumber($row[$columnMap['harga_satuan']]) : 0;
                    $keteranganRaw = isset($columnMap['keterangan']) ? trim($row[$columnMap['keterangan']] ?? '') : '';
                    
                    // Build keterangan string
                    $ketParts = [];
                    if ($kKegiatan) $ketParts[] = "Kegiatan: {$kKegiatan}";
                    if ($hargaSatuan > 0) $ketParts[] = "Harga Satuan: Rp " . number_format($hargaSatuan, 0, ',', '.');
                    if ($keteranganRaw) $ketParts[] = $keteranganRaw;
                    
                    $data = [
                        'tanggal_pengambilan' => !empty($tanggalRaw) ? $this->parseDate($tanggalRaw) : null,
                        'kode'                => $finalKode,
                        'nama_barang'         => $namaRaw,
                        'satuan'              => $satuanRaw ?: 'Unit',
                        'stok_awal'           => $stokAwal,
                        'stok_masuk'          => $this->parseNumber($masukRaw),
                        'stok_keluar'         => $this->parseNumber($keluarRaw),
                        'keterangan'          => !empty($ketParts) ? implode(' | ', $ketParts) : null,
                        'id_user'             => $request->user()?->id,
                        'id_folder'           => $idFolder ?: null,
                    ];

                    // ALWAYS INSERT - tidak update berdasarkan kode
                    // Karena dalam belanja, kode rekening bisa sama untuk barang berbeda
                    Inventaris::create($data);
                    $imported++;

                } catch (\Exception $e) {
                    $errorMsg = 'Baris ' . ($index + 1) . ' (' . ($namaRaw ?? 'Unknown') . '): ' . $e->getMessage();
                    $errors[] = $errorMsg;
                    \Log::error("Import error: {$errorMsg}");
                    $skipped++;
                }
            }

            DB::commit();
            
            \Log::info("Import completed: imported={$imported}, skipped={$skipped}, errors=" . count($errors));

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
