<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventaris;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class InventarisBarangController extends Controller
{
    /**
     * Import data from Excel - Format Barang
     * Format: No Urut | Kode Rekening | Kode Program | Uraian | Volume | Satuan | Tarif Harga | Jumlah
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
        
        \Log::info("Import Barang started: Total rows in Excel = " . count($rows));

        // Find header row - mencari row dengan "Kode Rekening", "Kode Program", "Volume", atau "Tarif"
        $headerRowIndex = null;
        for ($i = 0; $i < min(count($rows), 10); $i++) {
            $rowNorm = array_map(fn($c) => strtolower(trim(strval($c ?? ''))), $rows[$i]);
            $rowText = implode(' ', $rowNorm);
            if (stripos($rowText, 'kode rekening') !== false || 
                stripos($rowText, 'kode program') !== false || 
                stripos($rowText, 'volume') !== false ||
                stripos($rowText, 'tarif') !== false) {
                $headerRowIndex = $i;
                break;
            }
        }

        if ($headerRowIndex === null) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Format Excel tidak sesuai. Header tidak ditemukan. Pastikan ada kolom: Kode Rekening, Kode Program, Uraian, Volume, Satuan, Tarif Harga.',
            ], 400);
        }

        $h1 = array_map(fn($c) => trim(strval($c ?? '')), $rows[$headerRowIndex]);
        $h2 = isset($rows[$headerRowIndex + 1])
            ? array_map(fn($c) => trim(strval($c ?? '')), $rows[$headerRowIndex + 1])
            : [];

        $h2Text = strtolower(implode(' ', $h2));
        
        // Deteksi sub-header "Rincian Perhitungan" yang memiliki Volume, Satuan, Tarif Harga
        $hasSubHeader = (
            stripos($h2Text, 'volume') !== false ||
            stripos($h2Text, 'satuan') !== false ||
            stripos($h2Text, 'tarif') !== false ||
            stripos($h2Text, 'harga') !== false
        );

        $columnMap = [];
        $maxCols   = max(count($h1), count($h2));

        for ($idx = 0; $idx < $maxCols; $idx++) {
            $v1       = strtolower($h1[$idx] ?? '');
            $v2       = strtolower($h2[$idx] ?? '');
            $combined = trim("$v1 $v2");

            if ($combined === '') continue;

            // No. Urut
            if (stripos($v1, 'no') !== false && stripos($v1, 'urut') !== false) {
                $columnMap['no_urut'] = $idx;
            }
            
            // Kode Rekening
            if (stripos($combined, 'kode rekening') !== false || 
                ($v1 === 'kode rekening' || $v2 === 'kode rekening')) {
                $columnMap['kode_rekening'] = $idx;
            }
            
            // Kode Program
            if (stripos($combined, 'kode program') !== false || 
                ($v1 === 'kode program' || $v2 === 'kode program')) {
                $columnMap['kode_program'] = $idx;
            }
            
            // Uraian / Nama Barang
            if (stripos($combined, 'uraian') !== false && !isset($columnMap['uraian'])) {
                $columnMap['uraian'] = $idx;
            }
            
            // Volume (untuk stok_awal)
            if ((stripos($combined, 'volume') !== false || $v2 === 'volume') && !isset($columnMap['volume'])) {
                $columnMap['volume'] = $idx;
            }
            
            // Satuan
            if ((stripos($combined, 'satuan') !== false || $v2 === 'satuan') && 
                stripos($combined, 'harga') === false && 
                !isset($columnMap['satuan'])) {
                $columnMap['satuan'] = $idx;
            }
            
            // Tarif Harga
            if ((stripos($combined, 'tarif') !== false && stripos($combined, 'harga') !== false) || 
                $v2 === 'tarif harga' ||
                (stripos($v1, 'rincian') !== false && stripos($v2, 'tarif') !== false)) {
                $columnMap['tarif_harga'] = $idx;
            }
            
            // Jumlah (total harga)
            if (($v1 === 'jumlah' || stripos($v1, 'jumlah') !== false) && 
                stripos($combined, 'barang') === false && 
                !isset($columnMap['jumlah'])) {
                $columnMap['jumlah'] = $idx;
            }
        }
        
        \Log::info("Column mapping Barang: " . json_encode($columnMap));

        // Validasi kolom wajib
        $requiredColumns = ['kode_rekening', 'uraian'];
        foreach ($requiredColumns as $col) {
            if (!isset($columnMap[$col])) {
                return response()->json([
                    'status'  => 'error',
                    'message' => "Kolom '{$col}' tidak ditemukan di Excel. Format tidak sesuai.",
                ], 400);
            }
        }

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
                    $uraianRaw = trim($row[$columnMap['uraian']] ?? '');
                    
                    if (empty($uraianRaw)) {
                        \Log::debug("Skipping row {$index}: empty uraian");
                        $skipped++;
                        continue;
                    }
                    
                    \Log::debug("Processing row {$index}: {$uraianRaw}");
                    
                    // Kode Rekening (PRIMARY)
                    $kodeRekening = isset($columnMap['kode_rekening']) ? trim(strval($row[$columnMap['kode_rekening']] ?? '')) : '';
                    
                    // Kode Program (SECONDARY)
                    $kodeProgram = isset($columnMap['kode_program']) ? trim(strval($row[$columnMap['kode_program']] ?? '')) : '';
                    
                    // Final kode: Kode Rekening sebagai primary
                    $finalKode = $kodeRekening ?: $kodeProgram ?: null;
                    
                    // Volume (untuk stok_awal)
                    $volumeRaw = isset($columnMap['volume']) ? $row[$columnMap['volume']] : 1;
                    $volume = $this->parseNumber($volumeRaw);
                    
                    // Satuan
                    $satuanRaw = isset($columnMap['satuan'])
                                    ? trim($row[$columnMap['satuan']] ?? 'Unit')
                                    : 'Unit';
                    
                    // Tarif Harga
                    $tarifHarga = isset($columnMap['tarif_harga']) ? $this->parseNumber($row[$columnMap['tarif_harga']]) : 0;
                    
                    // Jumlah Total
                    $jumlahTotal = isset($columnMap['jumlah']) ? $this->parseNumber($row[$columnMap['jumlah']]) : ($volume * $tarifHarga);
                    
                    // Build keterangan
                    $ketParts = [];
                    if ($kodeProgram && $kodeProgram !== $kodeRekening) {
                        $ketParts[] = "Kode Program: {$kodeProgram}";
                    }
                    if ($tarifHarga > 0) {
                        $ketParts[] = "Tarif: Rp " . number_format($tarifHarga, 0, ',', '.');
                    }
                    if ($jumlahTotal > 0) {
                        $ketParts[] = "Total: Rp " . number_format($jumlahTotal, 0, ',', '.');
                    }
                    
                    $data = [
                        'tanggal_pengambilan' => null,  // Format barang tidak ada tanggal
                        'kode'                => $finalKode,
                        'nama_barang'         => $uraianRaw,
                        'satuan'              => $satuanRaw ?: 'Unit',
                        'stok_awal'           => $volume,
                        'stok_masuk'          => 0,
                        'stok_keluar'         => 0,
                        'keterangan'          => !empty($ketParts) ? implode(' | ', $ketParts) : null,
                        'id_user'             => $request->user()?->id,
                        'id_folder'           => $idFolder ?: null,
                    ];

                    // ALWAYS INSERT - tidak update berdasarkan kode
                    Inventaris::create($data);
                    $imported++;

                } catch (\Exception $e) {
                    $errorMsg = 'Baris ' . ($index + 1) . ' (' . ($uraianRaw ?? 'Unknown') . '): ' . $e->getMessage();
                    $errors[] = $errorMsg;
                    \Log::error("Import Barang error: {$errorMsg}");
                    $skipped++;
                }
            }

            DB::commit();
            
            \Log::info("Import Barang completed: imported={$imported}, skipped={$skipped}, errors=" . count($errors));

            $message = "Berhasil import {$imported} data inventaris barang";
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

    private function parseNumber($value): int
    {
        if (is_numeric($value)) return (int) $value;
        $cleaned = preg_replace('/[^0-9\-]/', '', strval($value));
        return $cleaned !== '' ? (int) $cleaned : 0;
    }
}
