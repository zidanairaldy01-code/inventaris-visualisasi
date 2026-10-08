'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import Link from 'next/link';
import {
  Search, Plus, Edit2, CheckCircle2, AlertTriangle, X,
  RefreshCw, Info, Building2, Warehouse, Package, Wrench,
  Filter, AlertOctagon, Flame, ExternalLink, SlidersHorizontal,
  FileText, ShieldCheck
} from 'lucide-react';
import Toast from '@/components/Toast';

interface AsetRusakItem {
  id: number;
  distribusi_id?: number;
  tipe_sumber: 'gedung' | 'workshop' | 'sarana_prasarana';
  tipe_item?: 'sarana_prasarana' | 'aset';
  sumber_label: string;
  kode: string | null;
  nama_barang: string;
  merek: string | null;
  tipe: string | null;
  jumlah: number;
  satuan: string;
  kondisi: string;
  gedung: string;
  ruangan: string;
  lantai: string | null;
  lokasi_detail: string;
  kategori: string;
  foto_thumbnail: string | null;
  deskripsi: string | null;
  link_url: string;
}

interface SummaryRusak {
  total_rusak: number;
  rusak_ringan: number;
  rusak_berat: number;
  tidak_layak_pakai: number;
}

interface WorkshopBarang {
  id: number;
  sarana_prasarana_id?: number | null;
  id_aset?: number | null;
  tipe: 'sarana_prasarana' | 'aset';
  nama_barang: string;
  kode: string | null;
  kondisi: string;
  jumlah: number;
  satuan: string;
  keterangan: string | null;
}

const getKondisiBadge = (nama: string) => {
  const n = (nama || '').toLowerCase();
  if (n === 'baik') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (n === 'cukup baik') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (n === 'rusak ringan') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (n === 'rusak berat') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (n === 'tidak layak pakai') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (n.includes('rusak')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return `${baseUrl}${path}`;
};

export default function WakaproKondisiPage() {
  // Monitoring aset rusak
  const [rusakItems, setRusakItems] = useState<AsetRusakItem[]>([]);
  const [summaryRusak, setSummaryRusak] = useState<SummaryRusak>({
    total_rusak: 0,
    rusak_ringan: 0,
    rusak_berat: 0,
    tidak_layak_pakai: 0,
  });
  const [loadingRusak, setLoadingRusak] = useState(true);
  const [filterKerusakan, setFilterKerusakan] = useState<string>('all');
  const [searchRusak, setSearchRusak] = useState('');

  // Barang workshop untuk modal pelaporan kondisi
  const [barangWorkshop, setBarangWorkshop] = useState<WorkshopBarang[]>([]);
  const [namaWorkshop, setNamaWorkshop] = useState('');
  const [loadingBarang, setLoadingBarang] = useState(false);

  // Modal pelaporan / ubah kondisi aset
  const [showModal, setShowModal] = useState(false);
  const [selectedItemKey, setSelectedItemKey] = useState<string>('');
  const [selectedKondisi, setSelectedKondisi] = useState<string>('Rusak Ringan');
  const [catatan, setCatatan] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
  }, []);

  /* ── Fetch Monitoring Aset Rusak Workshop ── */
  const fetchAsetRusak = useCallback(async () => {
    try {
      setLoadingRusak(true);
      const res = await axios.get('/api/kondisis/aset-rusak', {
        params: {
          kondisi: filterKerusakan,
          lokasi: 'workshop',
          search: searchRusak,
        },
      });
      if (res.data?.status === 'success') {
        setRusakItems(res.data.data || []);
        if (res.data.summary) {
          setSummaryRusak(res.data.summary);
        }
        if (res.data.warning) {
          showToast(res.data.warning, 'warning');
        }
      }
    } catch {
      showToast('Gagal memuat data aset rusak workshop', 'error');
    } finally {
      setLoadingRusak(false);
    }
  }, [filterKerusakan, searchRusak, showToast]);

  /* ── Fetch Daftar Semua Barang di Workshop Wakapro ── */
  const fetchWorkshopBarang = useCallback(async () => {
    try {
      setLoadingBarang(true);
      const res = await axios.get('/api/workshop/pilih-barang');
      setBarangWorkshop(res.data?.items || []);
      setNamaWorkshop(res.data?.ruangan?.nama_ruangan || '');
    } catch {
      // ignore
    } finally {
      setLoadingBarang(false);
    }
  }, []);

  useEffect(() => {
    fetchAsetRusak();
  }, [fetchAsetRusak]);

  useEffect(() => {
    fetchWorkshopBarang();
  }, [fetchWorkshopBarang]);

  /* ── Modal Handlers ── */
  const openLaporModal = (itemToEdit?: AsetRusakItem) => {
    if (itemToEdit) {
      // Buka modal untuk mengubah kondisi item yang ada di tabel
      const key = `${itemToEdit.tipe_item || (itemToEdit.tipe_sumber === 'sarana_prasarana' ? 'sarana_prasarana' : 'aset')}-${itemToEdit.id}`;
      setSelectedItemKey(key);
      setSelectedKondisi(itemToEdit.kondisi || 'Rusak Ringan');
      setCatatan(itemToEdit.deskripsi || '');
    } else {
      // Buka modal baru
      const firstBarang = barangWorkshop[0];
      setSelectedItemKey(firstBarang ? `${firstBarang.tipe}-${firstBarang.id}` : '');
      setSelectedKondisi('Rusak Ringan');
      setCatatan('');
    }
    setShowModal(true);
  };

  const handleLaporSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemKey) {
      showToast('Silakan pilih barang yang ingin dilaporkan', 'warning');
      return;
    }

    const [tipe_item, idStr] = selectedItemKey.split('-');
    const id = parseInt(idStr, 10);

    if (!id || !tipe_item) {
      showToast('Identitas barang tidak valid', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post('/api/kondisis/lapor-kerusakan', {
        tipe_item,
        id,
        kondisi: selectedKondisi,
        catatan: catatan.trim() || null,
      });

      showToast(res.data?.message || 'Laporan kondisi aset berhasil disimpan', 'success');
      setShowModal(false);
      fetchAsetRusak();
      fetchWorkshopBarang();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message || 'Gagal menyimpan laporan kondisi aset', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBarangObj = barangWorkshop.find(b => `${b.tipe}-${b.id}` === selectedItemKey);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-indigo-100 mb-1 border border-white/20">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Monitoring &amp; Pelaporan Kondisi Aset</span>
            {namaWorkshop && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold">
                Workshop: {namaWorkshop}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Kondisi &amp; Aset Rusak</h1>
          <p className="text-sm text-indigo-100 max-w-xl leading-relaxed">
            Pantau inventaris workshop yang bermasalah dan laporkan kondisi kerusakan secara real-time langsung ke panel Super Administrator.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchAsetRusak()}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all shadow-sm flex items-center gap-2 text-xs font-semibold"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRusak ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          <button
            onClick={() => openLaporModal()}
            className="px-5 py-3 bg-white hover:bg-indigo-50 text-indigo-700 font-bold rounded-2xl shadow-lg shadow-indigo-950/20 transition-all flex items-center gap-2 text-sm active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Laporkan Kerusakan Aset</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rusak */}
        <div
          onClick={() => setFilterKerusakan('all')}
          className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
            filterKerusakan === 'all'
              ? 'border-slate-400 ring-2 ring-slate-400/20 bg-slate-50/50'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="p-3.5 bg-rose-100 text-rose-600 rounded-2xl">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Kerusakan</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{summaryRusak.total_rusak}</span>
              <span className="text-xs font-semibold text-rose-600">Unit Barang</span>
            </div>
          </div>
        </div>

        {/* Rusak Ringan */}
        <div
          onClick={() => setFilterKerusakan(filterKerusakan === 'Rusak Ringan' ? 'all' : 'Rusak Ringan')}
          className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
            filterKerusakan === 'Rusak Ringan'
              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/30'
              : 'border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="p-3.5 bg-amber-100 text-amber-600 rounded-2xl">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rusak Ringan</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-amber-700">{summaryRusak.rusak_ringan}</span>
              <span className="text-xs text-slate-400">Dapat diservis</span>
            </div>
          </div>
        </div>

        {/* Rusak Berat */}
        <div
          onClick={() => setFilterKerusakan(filterKerusakan === 'Rusak Berat' ? 'all' : 'Rusak Berat')}
          className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
            filterKerusakan === 'Rusak Berat'
              ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/30'
              : 'border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="p-3.5 bg-rose-100 text-rose-600 rounded-2xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rusak Berat</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-rose-700">{summaryRusak.rusak_berat}</span>
              <span className="text-xs text-slate-400">Perbaikan berat</span>
            </div>
          </div>
        </div>

        {/* Tidak Layak Pakai */}
        <div
          onClick={() => setFilterKerusakan(filterKerusakan === 'Tidak Layak Pakai' ? 'all' : 'Tidak Layak Pakai')}
          className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
            filterKerusakan === 'Tidak Layak Pakai'
              ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/30'
              : 'border-slate-200/80 hover:border-purple-300'
          }`}
        >
          <div className="p-3.5 bg-purple-100 text-purple-600 rounded-2xl">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tidak Layak Pakai</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-purple-700">{summaryRusak.tidak_layak_pakai}</span>
              <span className="text-xs text-slate-400">Siap dihapuskan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchRusak}
            onChange={e => setSearchRusak(e.target.value)}
            placeholder="Cari nama barang, kode aset, atau rincian kerusakan..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
          />
          {searchRusak && (
            <button onClick={() => setSearchRusak('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterKerusakan}
              onChange={e => setFilterKerusakan(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Kategori Kerusakan</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
              <option value="Tidak Layak Pakai">Tidak Layak Pakai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Aset Rusak Workshop */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Daftar Aset Bermasalah di Workshop
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {rusakItems.length} aset dengan status kerusakan aktif
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            Terhubung langsung ke Dashboard Notifikasi Admin
          </span>
        </div>

        <div className="overflow-x-auto">
          {loadingRusak ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Memuat data barang rusak...</p>
            </div>
          ) : rusakItems.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">Tidak Ada Barang Rusak Ditemukan</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchRusak || filterKerusakan !== 'all'
                    ? 'Tidak ada barang rusak yang cocok dengan filter atau kata kunci pencarian saat ini.'
                    : 'Seluruh aset di workshop Anda saat ini berada dalam kondisi baik dan siap digunakan praktik.'}
                </p>
              </div>
              <button
                onClick={() => openLaporModal()}
                className="mt-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Laporkan Kerusakan Baru</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-sm min-w-[850px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-12 text-center">No</th>
                  <th className="px-5 py-3.5">Barang &amp; Kode</th>
                  <th className="px-5 py-3.5 text-center">Kondisi Saat Ini</th>
                  <th className="px-5 py-3.5">Lokasi Workshop</th>
                  <th className="px-5 py-3.5 text-center">Jumlah</th>
                  <th className="px-5 py-3.5">Catatan Kerusakan</th>
                  <th className="px-5 py-3.5 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rusakItems.map((item, idx) => (
                  <tr key={`${item.tipe_sumber}-${item.id}`} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3.5 text-center text-xs text-slate-400 font-semibold">{idx + 1}</td>

                    {/* Info Barang */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        {item.foto_thumbnail ? (
                          <img
                            src={getImageUrl(item.foto_thumbnail)!}
                            alt={item.nama_barang}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 border border-slate-200">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {item.nama_barang}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.kode && (
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {item.kode}
                              </span>
                            )}
                            {(item.merek || item.tipe) && (
                              <span className="text-xs text-slate-400">
                                {item.merek} {item.tipe ? `/ ${item.tipe}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kategori Kerusakan */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getKondisiBadge(item.kondisi)}`}>
                        {item.kondisi}
                      </span>
                    </td>

                    {/* Lokasi Workshop */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Warehouse className="h-3 w-3 text-amber-600" />
                          {item.ruangan || namaWorkshop || 'Workshop'}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {item.gedung} {item.lantai ? `· ${item.lantai}` : ''}
                        </p>
                      </div>
                    </td>

                    {/* Jumlah */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold text-slate-900">{item.jumlah}</span>
                      <span className="text-xs text-slate-400 ml-1">{item.satuan}</span>
                    </td>

                    {/* Catatan Kerusakan */}
                    <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs">
                      {item.deskripsi ? (
                        <div className="line-clamp-2" title={item.deskripsi}>
                          {item.deskripsi}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada keterangan</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => openLaporModal(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-xs cursor-pointer"
                        title="Perbarui kondisi atau tandai sudah diperbaiki"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Ubah Kondisi</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ════════ MODAL: LAPORKAN / PERBARUI KONDISI ASET ════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Laporkan Kondisi Aset</h3>
                  <p className="text-xs text-slate-300">
                    Workshop: {namaWorkshop || 'Workshop Anda'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleLaporSubmit} className="p-6 space-y-4">
              {/* Pilihan Barang di Workshop */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Barang di Workshop <span className="text-rose-500">*</span>
                </label>
                {loadingBarang ? (
                  <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={selectedItemKey}
                    onChange={e => setSelectedItemKey(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                  >
                    <option value="" disabled>-- Pilih Barang --</option>
                    {barangWorkshop.map(b => (
                      <option key={`${b.tipe}-${b.id}`} value={`${b.tipe}-${b.id}`}>
                        {b.nama_barang} ({b.jumlah} {b.satuan}) — Kondisi saat ini: {b.kondisi}
                      </option>
                    ))}
                  </select>
                )}

                {selectedBarangObj && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs flex items-center justify-between">
                    <span className="text-slate-500">Kondisi Terkini:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${getKondisiBadge(selectedBarangObj.kondisi)}`}>
                      {selectedBarangObj.kondisi}
                    </span>
                  </div>
                )}
              </div>

              {/* Pilihan Kondisi Baru */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status / Kondisi yang Dilaporkan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'Rusak Ringan', label: 'Rusak Ringan', desc: 'Bisa diservis / kendala ringan', color: 'border-amber-300 bg-amber-50/40 text-amber-800' },
                    { val: 'Rusak Berat', label: 'Rusak Berat', desc: 'Perlu servis besar / tidak bisa dipakai', color: 'border-rose-300 bg-rose-50/40 text-rose-800' },
                    { val: 'Tidak Layak Pakai', label: 'Tidak Layak Pakai', desc: 'Hancur / usang / afkir', color: 'border-purple-300 bg-purple-50/40 text-purple-800' },
                    { val: 'Baik', label: 'Baik (Normal)', desc: 'Sudah selesai diperbaiki', color: 'border-emerald-300 bg-emerald-50/40 text-emerald-800' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setSelectedKondisi(opt.val)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedKondisi === opt.val
                          ? `${opt.color} ring-2 ring-indigo-500/30 font-bold shadow-xs`
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold leading-tight">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan / Deskripsi Kerusakan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan / Deskripsi Kerusakan
                </label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  placeholder="Contoh: Kaki meja goyang dan baut patah, kabel power konslet..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              {/* Alert Info Sinkronisasi Notifikasi */}
              <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {selectedKondisi === 'Baik' ? (
                    <span>
                      Mengubah status ke <strong>Baik</strong> akan menyelesaikan status kerusakan di monitoring workshop serta menandai notifikasi kerusakan di panel Super Admin sebagai selesai.
                    </span>
                  ) : (
                    <span>
                      Laporan kerusakan ini akan <strong>otomatis memunculkan alert peringatan &amp; notifikasi</strong> di panel Super Administrator untuk perbaikan / monitoring.
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Simpan &amp; Kirim Laporan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
