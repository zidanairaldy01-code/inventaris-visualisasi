'use client';

import { useState } from 'react';
import axios from '@/lib/axios';
import * as XLSX from 'xlsx';
import {
  FileText, Search, Download, Loader2, BarChart3,
  Package, Wrench, Handshake, ChevronDown, AlertCircle,
  TrendingUp, DollarSign, Hash, Calendar,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TipeLaporan = 'aset' | 'servis' | 'peminjaman';

interface Ringkasan {
  // aset
  total_item?: number;
  total_unit?: number;
  total_nilai?: number;
  per_kategori?: Record<string, { jumlah_item: number; total_unit: number; total_nilai: number }>;
  per_kondisi?: Record<string, number>;
  // servis
  total_catatan?: number;
  total_biaya?: number;
  per_status?: Record<string, number>;
  // peminjaman
  total_transaksi?: number;
  per_role?: Record<string, number>;
}

interface LaporanResponse {
  periode: { dari: string; sampai: string };
  ringkasan: Ringkasan;
  data: Record<string, unknown>[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(2)} Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`;
  return `Rp ${n}`;
};

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// Preset rentang tanggal
const PRESETS = [
  { label: 'Hari Ini', getDari: today, getSampai: today },
  {
    label: 'Bulan Ini',
    getDari: firstOfMonth,
    getSampai: today,
  },
  {
    label: 'Tahun Ini',
    getDari: () => `${new Date().getFullYear()}-01-01`,
    getSampai: today,
  },
  {
    label: 'Semester 1',
    getDari: () => `${new Date().getFullYear()}-01-01`,
    getSampai: () => `${new Date().getFullYear()}-06-30`,
  },
  {
    label: 'Semester 2',
    getDari: () => `${new Date().getFullYear()}-07-01`,
    getSampai: () => `${new Date().getFullYear()}-12-31`,
  },
];

// Kolom per tipe laporan untuk tabel & ekspor
const COLUMNS: Record<TipeLaporan, { key: string; label: string; align?: 'right' }[]> = {
  aset: [
    { key: 'tanggal_input', label: 'Tgl Input' },
    { key: 'kode_aset', label: 'Kode' },
    { key: 'nama_aset', label: 'Nama Aset' },
    { key: 'kategori', label: 'Kategori' },
    { key: 'ruangan', label: 'Ruangan' },
    { key: 'kondisi', label: 'Kondisi' },
    { key: 'sumber_dana', label: 'Sumber Dana' },
    { key: 'jumlah', label: 'Jml', align: 'right' },
    { key: 'satuan', label: 'Satuan' },
    { key: 'harga_perolehan', label: 'Harga Satuan', align: 'right' },
    { key: 'total_nilai', label: 'Total Nilai', align: 'right' },
    { key: 'tahun_perolehan', label: 'Tahun' },
  ],
  servis: [
    { key: 'tanggal_servis', label: 'Tanggal' },
    { key: 'kode_aset', label: 'Kode' },
    { key: 'nama_aset', label: 'Nama Aset' },
    { key: 'ruangan', label: 'Ruangan' },
    { key: 'jenis_perbaikan', label: 'Jenis Perbaikan' },
    { key: 'teknisi_bengkel', label: 'Teknisi/Bengkel' },
    { key: 'biaya_servis', label: 'Biaya', align: 'right' },
    { key: 'deskripsi_kerusakan', label: 'Deskripsi' },
    { key: 'status', label: 'Status' },
  ],
  peminjaman: [
    { key: 'tanggal_pinjam', label: 'Tgl Pinjam' },
    { key: 'nama_peminjam', label: 'Nama Peminjam' },
    { key: 'role_peminjam', label: 'Status' },
    { key: 'nama_aset', label: 'Aset Dipinjam' },
    { key: 'ruangan', label: 'Ruangan' },
    { key: 'jumlah', label: 'Jml', align: 'right' },
    { key: 'keperluan', label: 'Keperluan' },
    { key: 'tanggal_kembali_rencana', label: 'Rencana Kembali' },
    { key: 'tanggal_kembali_aktual', label: 'Aktual Kembali' },
    { key: 'status', label: 'Status' },
  ],
};

const TIPE_CONFIG: Record<TipeLaporan, { label: string; icon: React.ElementType; color: string; gradient: string }> = {
  aset:       { label: 'Inventaris Aset',   icon: Package,  color: 'blue',   gradient: 'from-blue-600 to-indigo-600' },
  servis:     { label: 'Servis & Perbaikan', icon: Wrench,   color: 'amber',  gradient: 'from-amber-500 to-orange-600' },
  peminjaman: { label: 'Peminjaman',         icon: Handshake, color: 'indigo', gradient: 'from-indigo-500 to-purple-600' },
};

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export default function LaporanPage() {
  const [tipe, setTipe] = useState<TipeLaporan>('aset');
  const [dari, setDari] = useState(firstOfMonth());
  const [sampai, setSampai] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LaporanResponse | null>(null);
  const [search, setSearch] = useState('');

  const cfg = TIPE_CONFIG[tipe];
  const columns = COLUMNS[tipe];

  // ── Fetch laporan ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setError('');
    setResult(null);
    setSearch('');
    setLoading(true);
    try {
      const res = await axios.get(`/api/laporan/${tipe}`, {
        params: { dari, sampai },
      });
      setResult(res.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(', ')
        : err?.response?.data?.message || 'Gagal mengambil data laporan.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Preset tanggal ─────────────────────────────────────────────────────────
  const applyPreset = (p: typeof PRESETS[0]) => {
    setDari(p.getDari());
    setSampai(p.getSampai());
  };

  // ── Filter tabel ───────────────────────────────────────────────────────────
  const filteredData = (result?.data ?? []).filter(row =>
    search === '' ||
    Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  // ── Format nilai sel ───────────────────────────────────────────────────────
  const renderCell = (key: string, val: unknown) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-300">—</span>;
    if ((key === 'harga_perolehan' || key === 'biaya_servis' || key === 'total_nilai') && typeof val === 'number') {
      return <span className="font-semibold text-slate-700">{fmt(val)}</span>;
    }
    if (key === 'kondisi') {
      const k = String(val).toLowerCase();
      const cls = k === 'baik' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : k.includes('rusak') ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
      return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${cls}`}>{String(val)}</span>;
    }
    if (key === 'status') {
      const v = String(val);
      const cls = v === 'Selesai' || v === 'Dikembalikan' || v === 'aktif'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : v === 'Proses' || v === 'Dipinjam'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-red-50 text-red-700 border-red-200';
      return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${cls}`}>{v}</span>;
    }
    if (key === 'kode_aset') {
      return <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{String(val)}</span>;
    }
    return <span>{String(val)}</span>;
  };

  // ── Export Excel ───────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!result) return;
    const rows = result.data.map(row =>
      Object.fromEntries(columns.map(c => [c.label, row[c.key] ?? '']))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `laporan_${tipe}_${dari}_sd_${sampai}.xlsx`);
  };

  // ── Ringkasan cards ────────────────────────────────────────────────────────
  const renderRingkasan = () => {
    if (!result) return null;
    const r = result.ringkasan;

    if (tipe === 'aset') return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Hash} label="Total Item" value={String(r.total_item ?? 0)} sub="jenis aset" color="blue" />
        <StatCard icon={Package} label="Total Unit" value={(r.total_unit ?? 0).toLocaleString('id-ID')} sub="unit barang" color="indigo" />
        <StatCard icon={DollarSign} label="Total Nilai" value={fmtShort(r.total_nilai ?? 0)} sub="nilai perolehan" color="emerald" />
        <StatCard icon={BarChart3} label="Kategori" value={String(Object.keys(r.per_kategori ?? {}).length)} sub="jenis kategori" color="amber" />
      </div>
    );

    if (tipe === 'servis') return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Wrench} label="Total Catatan" value={String(r.total_catatan ?? 0)} sub="perbaikan" color="amber" />
        <StatCard icon={DollarSign} label="Total Biaya" value={fmtShort(r.total_biaya ?? 0)} sub="biaya servis" color="red" />
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 mb-2">Per Status</p>
          <div className="space-y-1">
            {Object.entries(r.per_status ?? {}).map(([s, n]) => (
              <div key={s} className="flex justify-between text-xs">
                <span className="text-slate-600">{s}</span>
                <span className="font-bold text-slate-800">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    if (tipe === 'peminjaman') return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Handshake} label="Total Transaksi" value={String(r.total_transaksi ?? 0)} sub="peminjaman" color="indigo" />
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 mb-2">Per Status</p>
          <div className="space-y-1">
            {Object.entries(r.per_status ?? {}).map(([s, n]) => (
              <div key={s} className="flex justify-between text-xs">
                <span className="text-slate-600">{s}</span>
                <span className="font-bold text-slate-800">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 mb-2">Per Peminjam</p>
          <div className="space-y-1">
            {Object.entries(r.per_role ?? {}).map(([s, n]) => (
              <div key={s} className="flex justify-between text-xs">
                <span className="text-slate-600">{s}</span>
                <span className="font-bold text-slate-800">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fadeInUp">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mr-3 shadow-sm flex-shrink-0`}>
              <FileText className="h-4 w-4 text-white" />
            </div>
            Laporan
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">
            Generate laporan berdasarkan rentang tanggal yang ditentukan
          </p>
        </div>
        {result && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">

        {/* Pilih Tipe Laporan */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2.5 uppercase tracking-wider">Jenis Laporan</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(TIPE_CONFIG) as [TipeLaporan, typeof cfg][]).map(([key, c]) => {
              const Icon = c.icon;
              const active = tipe === key;
              return (
                <button
                  key={key}
                  onClick={() => { setTipe(key); setResult(null); setError(''); }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    active
                      ? `bg-gradient-to-r ${c.gradient} text-white border-transparent shadow-sm`
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-white/80' : 'text-slate-400'}`} />
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rentang Tanggal */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2.5 uppercase tracking-wider">Rentang Tanggal</p>

          {/* Preset Cepat */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                <Calendar className="inline h-3 w-3 mr-1" />Dari Tanggal
              </label>
              <input
                type="date"
                value={dari}
                onChange={e => setDari(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                <Calendar className="inline h-3 w-3 mr-1" />Sampai Tanggal
              </label>
              <input
                type="date"
                value={sampai}
                onChange={e => setSampai(e.target.value)}
                min={dari}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tombol Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading || !dari || !sampai}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm text-white bg-gradient-to-r ${cfg.gradient} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Memuat Data...</>
          ) : (
            <><TrendingUp className="h-4 w-4" /> Generate Laporan</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Hasil Laporan */}
      {result && (
        <div className="space-y-4">

          {/* Label Periode */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${cfg.gradient}`} />
              <span className="text-sm font-bold text-slate-700">
                Laporan {cfg.label}
              </span>
              <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 rounded-lg font-mono">
                {result.periode.dari} s/d {result.periode.sampai}
              </span>
            </div>
            <span className="text-xs text-slate-400">{result.data.length} data ditemukan</span>
          </div>

          {/* Ringkasan */}
          {renderRingkasan()}

          {/* Tabel Data */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Toolbar tabel */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter data..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg font-medium">
                  {filteredData.length} dari {result.data.length}
                </span>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
              </div>
            </div>

            {/* Tabel */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-widest">
                    <th className="px-4 py-3 font-semibold w-8">#</th>
                    {columns.map(c => (
                      <th key={c.key} className={`px-4 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="py-12 text-center text-sm text-slate-400">
                        Tidak ada data dalam periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400 font-medium">{idx + 1}</td>
                        {columns.map(c => (
                          <td key={c.key} className={`px-4 py-3 text-xs text-slate-600 ${c.align === 'right' ? 'text-right' : ''}`}>
                            {renderCell(c.key, row[c.key])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State (belum generate) */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg.gradient} opacity-10 flex items-center justify-center mx-auto mb-4`} />
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mx-auto -mt-20 mb-4 shadow-sm`}>
            <ChevronDown className="h-7 w-7 text-white" />
          </div>
          <p className="font-semibold text-slate-600 text-sm">Pilih jenis laporan dan tentukan periode</p>
          <p className="text-slate-400 text-xs mt-1">Klik &quot;Generate Laporan&quot; untuk melihat data</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-komponen StatCard ────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: 'blue' | 'indigo' | 'emerald' | 'amber' | 'red';
}) {
  const colorMap = {
    blue:   'text-blue-500 bg-blue-50',
    indigo: 'text-indigo-500 bg-indigo-50',
    emerald:'text-emerald-500 bg-emerald-50',
    amber:  'text-amber-500 bg-amber-50',
    red:    'text-red-500 bg-red-50',
  };
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${colorMap[color]} mb-3`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-extrabold text-slate-900 leading-none">{value}</p>
      <p className="text-xs font-semibold text-slate-400 mt-1">{label}</p>
      <p className="text-[11px] text-slate-300 mt-0.5">{sub}</p>
    </div>
  );
}
