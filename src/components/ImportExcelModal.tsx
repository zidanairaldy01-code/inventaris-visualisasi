'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  X, Upload, FileSpreadsheet, CheckSquare, Square, AlertCircle,
  CheckCircle2, ChevronDown, Search, Loader2, Info, Trash2
} from 'lucide-react';
import axios from '@/lib/axios';

// ─── Tipe Data ────────────────────────────────────────────────────────────────

interface ExcelRow {
  _rowIndex: number;       // index asli dari file
  nama_aset: string;
  kode_aset: string;
  kategori: string;
  ruangan: string;
  kondisi: string;
  jumlah: string | number;
  satuan: string;
  harga_perolehan: string | number;
  merek: string;
  tipe: string;
  warna: string;
  sumber_dana: string;
  tahun_perolehan: string | number;
  nomor_seri: string;
  tanggal_perolehan: string;
  deskripsi: string;
  status: string;
  _valid: boolean;         // apakah baris ini valid (minimal nama_aset tidak kosong)
}

interface ImportResult {
  imported: number;
  failed: number;
  message: string;
  errors?: string[];
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Kolom Excel yang didukung ─────────────────────────────────────────────────
// key = nama kolom di header Excel (case-insensitive), value = field di ExcelRow
const COLUMN_MAP: Record<string, keyof Omit<ExcelRow, '_rowIndex' | '_valid'> | '_no'> = {
  // Format template sistem
  'nama aset': 'nama_aset',
  'kode aset': 'kode_aset',
  'kategori': 'kategori',
  'ruangan': 'ruangan',
  'kondisi': 'kondisi',
  'jumlah': 'jumlah',
  'satuan': 'satuan',
  'harga perolehan': 'harga_perolehan',
  'merek': 'merek',
  'tipe': 'tipe',
  'warna': 'warna',
  'sumber dana': 'sumber_dana',
  'tahun perolehan': 'tahun_perolehan',
  'nomor seri': 'nomor_seri',
  'tanggal perolehan': 'tanggal_perolehan',
  'deskripsi': 'deskripsi',
  'status': 'status',

  // Format Excel SMK (Data Sarana dan Prasarana)
  'jenis kekayaan': 'nama_aset',
  'luas/jumlah': 'jumlah',
  'nilai harga pembelian': 'harga_perolehan',
  'nilai harga sekarang': 'harga_perolehan', // fallback jika kolom pembelian kosong
  'ket': 'kondisi',
  'keterangan': 'kondisi',
  'no': '_no', // kolom nomor urut, akan diabaikan
};

const REQUIRED_COLUMNS = ['nama_aset'];

// ─── Helper ───────────────────────────────────────────────────────────────────

// Kata kunci yang menandakan baris bukan data aset (baris total, judul, kosong, dll.)
const SKIP_ROW_KEYWORDS = [
  'total', 'jumlah', 'sub total', 'subtotal', 'grand total',
  'mengetahui', 'kepala', 'ketua', 'sekretaris', 'anggota',
  'tim penilai', 'dipindahkan', 'pindahan', 'data keadaan',
  'kompetensi keahlian', 'smk', 'tahun pelajaran',
];

const shouldSkipRow = (raw: Record<string, unknown>): boolean => {
  // Cek apakah semua nilai kosong
  const values = Object.values(raw).map(v => String(v ?? '').trim());
  if (values.every(v => v === '')) return true;

  // Cek nilai di kolom pertama — jika bukan angka dan mengandung kata kunci skip
  const firstVal = values[0]?.toLowerCase() ?? '';
  if (SKIP_ROW_KEYWORDS.some(kw => firstVal.includes(kw))) return true;

  return false;
};

const parseExcelRows = (worksheet: XLSX.WorkSheet): ExcelRow[] => {
  // Cek apakah ini format SMK: cari header "JENIS KEKAYAAN" di sembarang baris
  // dengan cara baca raw terlebih dulu
  const rawAll = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    defval: '',
    raw: false,
    header: 1, // baca sebagai array of array untuk deteksi header
  }) as unknown[][];

  // Deteksi apakah format SMK (ada kolom "JENIS KEKAYAAN" atau "NO")
  const isSmkFormat = rawAll.some(row =>
    Array.isArray(row) && row.some(cell =>
      typeof cell === 'string' &&
      (cell.trim().toUpperCase() === 'JENIS KEKAYAAN' ||
       cell.trim().toUpperCase().includes('JENIS KEKAYAAN'))
    )
  );

  // Jika format SMK, cari baris header yang mengandung "JENIS KEKAYAAN"
  let headerRowIndex = 0;
  if (isSmkFormat) {
    for (let i = 0; i < rawAll.length; i++) {
      const row = rawAll[i] as unknown[];
      if (Array.isArray(row) && row.some(cell =>
        typeof cell === 'string' && cell.trim().toUpperCase().includes('JENIS KEKAYAAN')
      )) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
    range: headerRowIndex, // mulai dari baris header yang terdeteksi
  });

  const result: ExcelRow[] = [];
  let dataIdx = 0;

  jsonData.forEach((raw) => {
    if (shouldSkipRow(raw)) return;

    dataIdx++;
    const row: Partial<ExcelRow> & { _hargaPembelian?: unknown; _hargaSekarang?: unknown } = {
      _rowIndex: headerRowIndex + dataIdx + 1,
    };

    // Normalisasi header dan mapping ke field
    // Untuk format SMK: "Nilai Harga Pembelian" diutamakan, "Nilai Harga Sekarang" sebagai fallback
    let hargaPembelian: unknown = '';
    let hargaSekarang: unknown = '';

    Object.entries(raw).forEach(([key, val]) => {
      const normalized = key.trim().toLowerCase();
      const field = COLUMN_MAP[normalized];

      if (normalized.includes('nilai harga pembelian') || normalized === 'nilai harga pembelian') {
        hargaPembelian = val ?? '';
      } else if (normalized.includes('nilai harga sekarang') || normalized === 'nilai harga sekarang') {
        hargaSekarang = val ?? '';
      } else if (field && field !== ('_no' as keyof Omit<ExcelRow, '_rowIndex' | '_valid'>)) {
        (row as Record<string, unknown>)[field] = val ?? '';
      }
    });

    // Gunakan harga pembelian, fallback ke harga sekarang jika kosong
    const hargaFinal = hargaPembelian && String(hargaPembelian).trim() !== '' && String(hargaPembelian).trim() !== '0'
      ? hargaPembelian
      : hargaSekarang;
    if (hargaFinal) row.harga_perolehan = String(hargaFinal);

    // Validasi minimal: nama_aset tidak kosong dan bukan angka murni (bukan nomor urut)
    const namaVal = String(row.nama_aset ?? '').trim();
    const valid = Boolean(namaVal !== '' && isNaN(Number(namaVal)));

    result.push({
      _rowIndex: row._rowIndex ?? headerRowIndex + dataIdx + 1,
      nama_aset: namaVal,
      kode_aset: String(row.kode_aset ?? '').trim(),
      kategori: String(row.kategori ?? '').trim(),
      ruangan: String(row.ruangan ?? '').trim(),
      kondisi: String(row.kondisi ?? '').trim(),
      jumlah: row.jumlah ?? '',
      satuan: String(row.satuan ?? '').trim(),
      harga_perolehan: row.harga_perolehan ?? '',
      merek: String(row.merek ?? '').trim(),
      tipe: String(row.tipe ?? '').trim(),
      warna: String(row.warna ?? '').trim(),
      sumber_dana: String(row.sumber_dana ?? '').trim(),
      tahun_perolehan: row.tahun_perolehan ?? '',
      nomor_seri: String(row.nomor_seri ?? '').trim(),
      tanggal_perolehan: String(row.tanggal_perolehan ?? '').trim(),
      deskripsi: String(row.deskripsi ?? '').trim(),
      status: String(row.status ?? '').trim(),
      _valid: valid,
    } as ExcelRow);
  });

  return result;
};

const formatRupiah = (val: string | number): string => {
  const n = parseFloat(String(val).replace(/[^\d.]/g, ''));
  if (isNaN(n) || n === 0) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
};

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export default function ImportExcelModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [filterValid, setFilterValid] = useState<'all' | 'valid' | 'invalid'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pastikan portal hanya dirender di client (hindari SSR mismatch)
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll saat modal terbuka
  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mounted]);

  // ── Baca file Excel di sisi klien ─────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsed = parseExcelRows(worksheet);
        setRows(parsed);
        // Pilih semua baris yang valid secara default
        const validIndices = new Set(parsed.filter(r => r._valid).map(r => r._rowIndex));
        setSelectedRows(validIndices);
        setStep('preview');
      } catch {
        alert('Gagal membaca file. Pastikan file berformat Excel (.xlsx/.xls) atau CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Seleksi baris ─────────────────────────────────────────────────────────
  const toggleRow = (rowIndex: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex); else next.add(rowIndex);
      return next;
    });
  };

  const filteredRows = rows.filter(r => {
    const matchSearch = search === '' ||
      r.nama_aset.toLowerCase().includes(search.toLowerCase()) ||
      r.kode_aset.toLowerCase().includes(search.toLowerCase()) ||
      r.kategori.toLowerCase().includes(search.toLowerCase()) ||
      r.ruangan.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterValid === 'all' ? true :
        filterValid === 'valid' ? r._valid :
          !r._valid;
    return matchSearch && matchFilter;
  });

  const visibleIndices = filteredRows.map(r => r._rowIndex);
  const allVisibleSelected = visibleIndices.length > 0 && visibleIndices.every(i => selectedRows.has(i));
  const someVisibleSelected = visibleIndices.some(i => selectedRows.has(i));

  const toggleAllVisible = () => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIndices.forEach(i => next.delete(i));
      } else {
        visibleIndices.forEach(i => next.add(i));
      }
      return next;
    });
  };

  const selectOnlyValid = () => {
    setSelectedRows(new Set(rows.filter(r => r._valid).map(r => r._rowIndex)));
  };

  const clearSelection = () => setSelectedRows(new Set());

  // ── Submit ke backend ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (selectedRows.size === 0) return;
    setSubmitting(true);

    try {
      // Buat file Excel baru hanya dari baris yang dipilih
      const selectedData = rows
        .filter(r => selectedRows.has(r._rowIndex))
        .map(r => ({
          'Nama Aset': r.nama_aset,
          'Kode Aset': r.kode_aset,
          'Kategori': r.kategori,
          'Ruangan': r.ruangan,
          'Kondisi': r.kondisi,
          'Jumlah': r.jumlah,
          'Satuan': r.satuan,
          'Harga Perolehan': r.harga_perolehan,
          'Merek': r.merek,
          'Tipe': r.tipe,
          'Warna': r.warna,
          'Sumber Dana': r.sumber_dana,
          'Tahun Perolehan': r.tahun_perolehan,
          'Nomor Seri': r.nomor_seri,
          'Tanggal Perolehan': r.tanggal_perolehan,
          'Deskripsi': r.deskripsi,
          'Status': r.status,
        }));

      const ws = XLSX.utils.json_to_sheet(selectedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aset');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', blob, 'import_selected.xlsx');

      const response = await axios.post('/api/asets/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult({
        imported: response.data.imported,
        failed: response.data.failed,
        message: response.data.message,
        errors: response.data.errors ?? [],
      });
      setStep('done');
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error?.response?.data?.message || 'Terjadi kesalahan saat import.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Download template ─────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const templateData = [
      {
        'Nama Aset': 'Kursi Siswa',
        'Kode Aset': 'AST-001',
        'Kategori': 'Mebel',
        'Ruangan': 'Kelas 1A',
        'Kondisi': 'Baik',
        'Jumlah': 30,
        'Satuan': 'Unit',
        'Harga Perolehan': 250000,
        'Merek': 'Olympic',
        'Tipe': '',
        'Warna': 'Coklat',
        'Sumber Dana': 'BOS',
        'Tahun Perolehan': 2023,
        'Nomor Seri': '',
        'Tanggal Perolehan': '2023-01-15',
        'Deskripsi': '',
        'Status': 'aktif',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Aset');
    XLSX.writeFile(wb, 'template_import_aset.xlsx');
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="min-h-screen w-full flex items-center justify-center py-8">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full flex flex-col relative"
          style={{ maxWidth: step === 'preview' ? '1100px' : '460px', maxHeight: step === 'preview' ? '90vh' : 'auto' }}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Import Excel</h2>
              <p className="text-xs text-slate-400">
                {step === 'upload' && 'Upload file Excel untuk diproses'}
                {step === 'preview' && `${fileName} — pilih baris yang ingin diimport`}
                {step === 'done' && 'Import selesai'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── STEP 1: Upload ─────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="p-6 flex flex-col gap-4">

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl py-7 px-6 text-center cursor-pointer transition-all ${
                dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">Drag & drop atau klik untuk pilih file</p>
              <p className="text-xs text-slate-400 mt-1">.xlsx · .xls · .csv</p>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>

            {/* Info kolom — satu baris ringkas */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <Info className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400 font-medium mr-1">Kolom:</span>
              {['Nama Aset*', 'Kategori', 'Ruangan', 'Kondisi', 'Jumlah', 'Harga Perolehan'].map(col => (
                <span key={col} className={`px-1.5 py-0.5 rounded border font-medium ${
                  col.includes('*') ? 'bg-red-50 text-red-500 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>{col}</span>
              ))}
              <span className="text-slate-300">+ lebih banyak</span>
            </div>

            {/* Download template */}
            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              Download Template Excel
            </button>
          </div>
        )}

        {/* ── STEP 2: Preview & Seleksi ──────────────────────────────── */}
        {step === 'preview' && (
          <>
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0 space-y-2">
              {/* Baris 1: info + aksi cepat */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">
                    {selectedRows.size} dipilih dari {rows.length} baris
                  </span>
                  <span className="text-slate-300">|</span>
                  <button onClick={selectOnlyValid} className="text-xs text-emerald-600 font-semibold hover:underline">
                    Pilih semua valid ({rows.filter(r => r._valid).length})
                  </button>
                  <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-slate-600 font-medium hover:underline">
                    Batalkan semua
                  </button>
                </div>

                {/* Filter valid/invalid */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                  {(['all', 'valid', 'invalid'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterValid(f)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        filterValid === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f === 'all' ? `Semua (${rows.length})` :
                       f === 'valid' ? `Valid (${rows.filter(r => r._valid).length})` :
                       `Invalid (${rows.filter(r => !r._valid).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Baris 2: search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, kode, kategori, ruangan..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Tabel Preview */}
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-left text-sm min-w-[900px]">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr className="text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="px-3 py-3 w-10">
                      <button onClick={toggleAllVisible} className="p-0.5">
                        {allVisibleSelected
                          ? <CheckSquare className="h-4 w-4 text-blue-600" />
                          : someVisibleSelected
                            ? <div className="h-4 w-4 rounded border-2 border-blue-400 bg-blue-100" />
                            : <Square className="h-4 w-4 text-slate-400" />
                        }
                      </button>
                    </th>
                    <th className="px-3 py-3 w-8">Baris</th>
                    <th className="px-3 py-3">Nama Aset</th>
                    <th className="px-3 py-3">Kode</th>
                    <th className="px-3 py-3">Kategori</th>
                    <th className="px-3 py-3">Ruangan</th>
                    <th className="px-3 py-3">Kondisi</th>
                    <th className="px-3 py-3 text-right">Jumlah</th>
                    <th className="px-3 py-3">Satuan</th>
                    <th className="px-3 py-3 text-right">Harga Perolehan</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-sm text-slate-400">
                        Tidak ada data yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(row => {
                      const isSelected = selectedRows.has(row._rowIndex);
                      return (
                        <tr
                          key={row._rowIndex}
                          onClick={() => row._valid && toggleRow(row._rowIndex)}
                          className={`transition-colors ${
                            !row._valid
                              ? 'bg-red-50/50 cursor-not-allowed opacity-60'
                              : isSelected
                                ? 'bg-blue-50/60 hover:bg-blue-50'
                                : 'hover:bg-slate-50/80 cursor-pointer'
                          }`}
                        >
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            {row._valid ? (
                              <button onClick={() => toggleRow(row._rowIndex)} className="p-0.5">
                                {isSelected
                                  ? <CheckSquare className="h-4 w-4 text-blue-600" />
                                  : <Square className="h-4 w-4 text-slate-300" />
                                }
                              </button>
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-400" />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-400 font-mono">{row._rowIndex}</td>
                          <td className="px-3 py-2.5">
                            {row.nama_aset
                              ? <span className="font-semibold text-slate-800">{row.nama_aset}</span>
                              : <span className="text-red-400 text-xs italic">Kosong (wajib diisi)</span>
                            }
                          </td>
                          <td className="px-3 py-2.5">
                            {row.kode_aset
                              ? <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{row.kode_aset}</span>
                              : <span className="text-slate-300 text-xs">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600">{row.kategori || <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-600">{row.ruangan || <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2.5">
                            {row.kondisi
                              ? <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-100">{row.kondisi}</span>
                              : <span className="text-slate-300 text-xs">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-700">{row.jumlah || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{row.satuan || '—'}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-slate-500">{formatRupiah(row.harga_perolehan)}</td>
                          <td className="px-3 py-2.5">
                            {row.status
                              ? <span className={`px-1.5 py-0.5 text-xs rounded border font-medium ${
                                  row.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  row.status === 'rusak' ? 'bg-red-50 text-red-600 border-red-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>{row.status}</span>
                              : <span className="text-slate-300 text-xs">—</span>
                            }
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Aksi */}
            <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setStep('upload'); setRows([]); setSelectedRows(new Set()); setSearch(''); setFilterValid('all'); }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Ganti File
                </button>
                {rows.filter(r => !r._valid).length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {rows.filter(r => !r._valid).length} baris tidak valid (tidak bisa dipilih)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={selectedRows.size === 0 || submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Mengimport...</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Import {selectedRows.size} Baris</>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: Done ────────────────────────────────────────────── */}
        {step === 'done' && result && (
          <div className="p-8 text-center space-y-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
              result.failed === 0 ? 'bg-emerald-50' : 'bg-amber-50'
            }`}>
              <CheckCircle2 className={`h-8 w-8 ${result.failed === 0 ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Import Selesai</h3>
              <p className="text-slate-500 text-sm mt-1">{result.message}</p>
            </div>
            <div className="flex justify-center gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-700">{result.imported}</p>
                <p className="text-xs font-semibold text-emerald-500 mt-0.5">Berhasil diimport</p>
              </div>
              {result.failed > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-3 text-center">
                  <p className="text-2xl font-extrabold text-red-600">{result.failed}</p>
                  <p className="text-xs font-semibold text-red-400 mt-0.5">Gagal diimport</p>
                </div>
              )}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-left max-h-36 overflow-y-auto w-full">
                <p className="text-xs font-bold text-red-600 mb-1.5">Detail error ({result.errors.length} pertama):</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-500 leading-relaxed">{err}</p>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
            >
              Selesai
            </button>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body
  );
}
