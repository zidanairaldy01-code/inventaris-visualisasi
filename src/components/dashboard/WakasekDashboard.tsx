'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import axios from '@/lib/axios';
import {
  FileText, Building2, Warehouse, CheckCircle2, AlertTriangle,
  ArrowRight, ShieldCheck, CheckSquare, Layers, Package, X,
  Search, Loader2, Calendar, Hash, User, ExternalLink, RefreshCw,
  Clock, DollarSign, Wrench, ChevronRight, Tag, Truck, ClipboardCheck,
  Info, BadgeCheck, Camera, ZoomIn
} from 'lucide-react';

interface WakasekStats {
  total_unit_bengkel: number;
  total_baik: number;
  total_rusak: number;
  rasio_kelaikan: number;
  total_bast_sah: number;
  total_surat_jalan: number;
  bengkel_list: {
    id: number;
    nama_ruangan: string;
    kode_ruangan: string;
    nama_gedung: string;
    wakapro: string;
    total_unit: number;
    kondisi_baik: number;
    kondisi_rusak: number;
    kesiapan_persen: number;
  }[];
  bast_terbaru: any[];
}

interface WakasekDashboardProps {
  user: any;
  greeting: string;
  wakasekStats: WakasekStats;
  loading: boolean;
}

interface WorkshopItem {
  id: number;
  nomor_surat_jalan?: string;
  nomor_bast?: string | null;
  jumlah: number;
  harga_satuan?: number;
  total_harga?: number;
  tanggal_kirim?: string;
  tanggal_terima?: string | null;
  status: string;
  catatan_penerimaan?: string | null;
  foto_kondisi_wakapro_url?: string | null;
  sarana_prasarana?: {
    id?: number;
    nama_barang?: string;
    nama_sarana?: string;
    kode?: string;
    kode_sarana?: string;
    satuan?: string;
    kondisi?: string;
    nilai_harga_pembelian?: number;
    keterangan?: string | null;
    fotos?: Array<{
      id: number;
      path_file: string;
      url_foto: string;
      keterangan?: string | null;
      is_thumbnail: boolean;
      urutan: number;
    }>;
  };
  petugas_pengirim?: { nama_lengkap: string };
  wakapro_penerima?: { nama_lengkap: string } | null;
}

const formatRupiah = (val?: number | null) => {
  if (!val) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

const getKondisiBadge = (kondisi?: string) => {
  const k = (kondisi || 'Baik').toLowerCase();
  if (k === 'baik') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (k === 'cukup baik') {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  if (k === 'rusak ringan') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

export default function WakasekDashboard({ user, greeting, wakasekStats, loading }: WakasekDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedBengkel, setSelectedBengkel] = useState<WakasekStats['bengkel_list'][0] | null>(null);
  const [workshopItems, setWorkshopItems] = useState<WorkshopItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [filterKondisi, setFilterKondisi] = useState<'semua' | 'baik' | 'rusak'>('semua');
  const [selectedItem, setSelectedItem] = useState<WorkshopItem | null>(null);
  const [itemLightboxUrl, setItemLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenBengkel = async (b: WakasekStats['bengkel_list'][0]) => {
    setSelectedBengkel(b);
    setSearchItem('');
    setFilterKondisi('semua');
    setLoadingItems(true);
    try {
      const res = await axios.get(`/api/distribusi-asets?ruangan_id=${b.id}&status=diterima`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setWorkshopItems(data);
    } catch (err) {
      console.error('Gagal mengambil daftar barang workshop:', err);
      setWorkshopItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCloseBengkel = () => {
    setSelectedBengkel(null);
    setWorkshopItems([]);
    setSelectedItem(null);
  };

  const handleOpenItem = (item: WorkshopItem) => {
    setSelectedItem(item);
  };

  const handleCloseItem = () => {
    setSelectedItem(null);
  };

  const filteredItems = useMemo(() => {
    return workshopItems.filter((item) => {
      const nama = (item.sarana_prasarana?.nama_barang || item.sarana_prasarana?.nama_sarana || '').toLowerCase();
      const kode = (item.sarana_prasarana?.kode || item.sarana_prasarana?.kode_sarana || '').toLowerCase();
      const bast = (item.nomor_bast || '').toLowerCase();
      const q = searchItem.toLowerCase();
      const matchSearch = !q || nama.includes(q) || kode.includes(q) || bast.includes(q);

      const k = (item.sarana_prasarana?.kondisi || 'Baik').toLowerCase();
      const isBaik = k === 'baik' || k === 'cukup baik';
      const matchKondisi =
        filterKondisi === 'semua' ||
        (filterKondisi === 'baik' && isBaik) ||
        (filterKondisi === 'rusak' && !isBaik);

      return matchSearch && matchKondisi;
    });
  }, [workshopItems, searchItem, filterKondisi]);

  const totalNilaiBengkel = useMemo(() => {
    return workshopItems.reduce((acc, i) => {
      const harga = Number(i.total_harga) || (Number(i.jumlah || 1) * (Number(i.harga_satuan) || Number(i.sarana_prasarana?.nilai_harga_pembelian) || 0));
      return acc + harga;
    }, 0);
  }, [workshopItems]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* ── Banner Eksekutif Wakasek Sarpras ── */}
      <div className="bg-linear-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden border border-teal-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-600/15 rounded-full blur-3xl pointer-events-none -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none translate-y-16" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                WAKASEK SARPRAS • EXECUTIVE MONITORING
              </span>
              <span className="text-xs text-slate-400">SMK PGRI Telagasari</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {greeting}, {user?.nama_lengkap || 'Wakasek Bidang Sarana & Prasarana'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Pemantauan komprehensif kelaikan fasilitas di 5 workshop kejuruan, audit legalitas Berita Acara Serah Terima (BAST), dan rekapitulasi sarpras sekolah.
            </p>
          </div>

          {/* Quick Actions Wakasek */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/wakasek/laporan"
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Rekap Laporan Sarpras
            </Link>
            <Link
              href="/wakasek/sarana-prasarana"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Package className="h-4 w-4 text-slate-400" />
              Data Sarana Prasarana
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4 KPI Eksekutif Sarpras ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Unit di 5 Bengkel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
              <Warehouse className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded-full border border-teal-200">5 Bengkel</span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {wakasekStats.total_unit_bengkel.toLocaleString('id-ID')}{' '}
              <span className="text-sm font-semibold text-slate-500">Unit</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Total peralatan terdistribusi di workshop</p>
        </div>

        {/* Rasio Kelaikan Fasilitas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">Kesiapan</span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-emerald-600 tracking-tight">
              {wakasekStats.rasio_kelaikan}%{' '}
              <span className="text-sm font-semibold text-slate-500">Laik Pakai</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">{wakasekStats.total_baik} unit siap untuk praktikum</p>
        </div>

        {/* Dokumen BAST Sah Diterbitkan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">Legalitas</span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {wakasekStats.total_bast_sah}{' '}
              <span className="text-sm font-semibold text-slate-500">BAST Sah</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Serah terima aset resmi bertanda tangan</p>
        </div>

        {/* Unit Perlu Servis */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">Maintenance</span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {wakasekStats.total_rusak}{' '}
              <span className="text-sm font-semibold text-rose-500">Unit Rusak</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Aset butuh tindakan perbaikan</p>
        </div>
      </div>

      {/* ── Matriks Monitoring 5 Bengkel Jurusan (Interactive) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-teal-600" />
              Kesiapan Sarana di 5 Workshop Kejuruan (TP, TMI, TPL, RPL, TKR)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik pada salah satu workshop untuk melihat rincian barang fisik dan kelaikannya
            </p>
          </div>
          <span className="text-xs text-teal-600 font-semibold hidden sm:inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            Klik kartu untuk rincian barang
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wakasekStats.bengkel_list.map((b) => (
              <div
                key={b.id}
                onClick={() => handleOpenBengkel(b)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenBengkel(b);
                  }
                }}
                className="p-5 rounded-2xl border border-slate-200 hover:border-teal-400 bg-white hover:bg-teal-50/20 transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-teal-700 transition-colors">
                      {b.nama_ruangan}
                    </h4>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 group-hover:bg-teal-100 group-hover:text-teal-800 transition-colors">
                      {b.kode_ruangan}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">{b.nama_gedung}</p>

                  <div className="p-3 bg-slate-50/70 group-hover:bg-white rounded-xl border border-slate-100 space-y-1.5 text-xs mb-3 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Kepala Bengkel:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">{b.wakapro}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Total Aset:</span>
                      <span className="font-extrabold text-teal-700">{b.total_unit} Unit</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Baik / Rusak:</span>
                      <span>
                        <strong className="text-emerald-600">{b.kondisi_baik} Baik</strong> /{' '}
                        <strong className="text-rose-500">{b.kondisi_rusak} Rusak</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                    <span className="text-slate-500">Tingkat Kesiapan</span>
                    <span className="text-teal-600">{b.kesiapan_persen}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${b.kesiapan_persen}%` }}
                    />
                  </div>

                  {/* Tombol aksi mikro */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-teal-600 group-hover:text-teal-700">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      Detail Barang ({b.total_unit} Unit)
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Dokumen Berita Acara Serah Terima (BAST) Terkini ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Audit Legalitas Berita Acara Serah Terima (BAST) Terkini
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi distribusi barang resmi yang telah diterima dan disetujui Kepala Bengkel
            </p>
          </div>
          <Link href="/wakasek/sarana-prasarana" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            Lihat Data Sarana
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : wakasekStats.bast_terbaru.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Belum ada BAST resmi yang diterbitkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Nomor BAST</th>
                  <th className="py-2.5 px-3">Peralatan / Sarana</th>
                  <th className="py-2.5 px-3">Bengkel Tujuan</th>
                  <th className="py-2.5 px-3 text-center">Jumlah</th>
                  <th className="py-2.5 px-3">Tanggal Disetujui</th>
                  <th className="py-2.5 px-3 text-right">Status Legalitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wakasekStats.bast_terbaru.map((bast: any) => (
                  <tr key={bast.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {bast.nomor_bast || 'BAST-OFFICIAL'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{bast.sarana_prasarana?.nama_sarana || bast.sarana_prasarana?.nama_barang}</p>
                      <p className="text-[10px] text-slate-400">Kode: {bast.sarana_prasarana?.kode_sarana || '-'}</p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {bast.ruangan?.nama_ruangan || 'Bengkel'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {bast.jumlah} Unit
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {bast.updated_at ? new Date(bast.updated_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckSquare className="h-3 w-3 text-blue-600" />
                        Sah / BAST Terverifikasi
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL DETAIL BARANG WORKSHOP (WAKASEK SARPRAS) ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mounted && selectedBengkel && createPortal(
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={handleCloseBengkel}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Modal Header ── */}
            <div className="bg-linear-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-2xl backdrop-blur-sm">
                    <Warehouse className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                        {selectedBengkel.nama_ruangan}
                      </h2>
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/30">
                        {selectedBengkel.kode_ruangan}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-teal-400" />
                        {selectedBengkel.nama_gedung}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-teal-400" />
                        Kepala Bengkel: <strong className="text-white">{selectedBengkel.wakapro}</strong>
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseBengkel}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  aria-label="Tutup Detail"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Filter & Search Toolbar ── */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama barang, kode sarana, no. BAST..."
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {searchItem && (
                  <button
                    onClick={() => setSearchItem('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter kondisi pills */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterKondisi('semua')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterKondisi === 'semua'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Semua ({workshopItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKondisi('baik')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterKondisi === 'baik'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  Baik
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKondisi('rusak')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterKondisi === 'rusak'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  Rusak
                </button>
              </div>
            </div>

            {/* ── Item Table / List (Scrollable) ── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[260px]">
              {loadingItems ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">
                    Memuat daftar barang fisik di {selectedBengkel.nama_ruangan}...
                  </p>
                </div>
              ) : workshopItems.length === 0 ? (
                <div className="py-14 text-center max-w-md mx-auto space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Package className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Belum Ada Barang di Workshop Ini</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Belum ada sarana & prasarana yang didistribusikan secara resmi atau disetujui melalui BAST untuk{' '}
                    <strong>{selectedBengkel.nama_ruangan}</strong>.
                  </p>
                  <p className="text-[11px] text-teal-600 font-semibold">
                    Distribusi dapat dilakukan oleh Petugas Input / Admin melalui modul Distribusi & BAST.
                  </p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Tidak ada barang yang cocok dengan kata kunci pencarian atau filter yang dipilih.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3 text-center w-10">No</th>
                        <th className="py-3 px-3">Nama Peralatan / Barang</th>
                        <th className="py-3 px-3 text-center">Jumlah</th>
                        <th className="py-3 px-3">Kondisi</th>
                        <th className="py-3 px-3">Legalitas BAST</th>
                        <th className="py-3 px-3 text-right">Nilai Perolehan</th>
                        <th className="py-3 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredItems.map((item, idx) => {
                        const nama = item.sarana_prasarana?.nama_barang || item.sarana_prasarana?.nama_sarana || 'Tanpa Nama';
                        const kode = item.sarana_prasarana?.kode || item.sarana_prasarana?.kode_sarana || '-';
                        const kondisi = item.sarana_prasarana?.kondisi || 'Baik';
                        const satuan = item.sarana_prasarana?.satuan || 'Unit';
                        const totalHarga = Number(item.total_harga) || (Number(item.jumlah || 1) * (Number(item.harga_satuan) || Number(item.sarana_prasarana?.nilai_harga_pembelian) || 0));

                        return (
                          <tr
                            key={item.id || idx}
                            onClick={() => handleOpenItem(item)}
                            className="hover:bg-teal-50/60 transition-colors cursor-pointer group"
                            title="Klik untuk lihat detail barang"
                          >
                            <td className="py-3 px-3 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{nama}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                  {kode}
                                </span>
                                {item.catatan_penerimaan && (
                                  <span className="truncate max-w-[200px]" title={item.catatan_penerimaan}>
                                    • {item.catatan_penerimaan}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-900 whitespace-nowrap">
                              <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                                {item.jumlah} {satuan}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getKondisiBadge(kondisi)}`}>
                                {kondisi.toLowerCase().includes('rusak') ? (
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                )}
                                {kondisi}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {item.nomor_bast ? (
                                <div>
                                  <span className="font-mono font-bold text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {item.nomor_bast}
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {item.tanggal_terima ? new Date(item.tanggal_terima).toLocaleDateString('id-ID') : '-'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Non-BAST</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <p className="font-bold text-slate-800">{formatRupiah(totalHarga)}</p>
                              {item.jumlah > 1 && item.harga_satuan ? (
                                <p className="text-[10px] text-slate-400">
                                  @{formatRupiah(item.harga_satuan)}
                                </p>
                              ) : null}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Modal Footer ── */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="font-bold text-slate-800">Estimasi Total Nilai Aset:</span>
                <span className="font-extrabold text-teal-700 text-sm">
                  {formatRupiah(totalNilaiBengkel)}
                </span>
                <span className="text-slate-400">({workshopItems.length} jenis barang)</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCloseBengkel}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL DETAIL ITEM (Nested Portal, tampil di atas modal bengkel) ══ */}
      {mounted && selectedItem && createPortal(
        <div
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={handleCloseItem}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-linear-to-br from-teal-700 via-teal-800 to-slate-900 p-5 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
                    <Package className="h-5 w-5 text-teal-200" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-teal-300 mb-0.5">Detail Barang</p>
                    <h3 className="font-extrabold text-base leading-tight text-white">
                      {selectedItem.sarana_prasarana?.nama_barang || selectedItem.sarana_prasarana?.nama_sarana || 'Tanpa Nama'}
                    </h3>
                    <p className="font-mono text-xs text-teal-200 mt-0.5">
                      {selectedItem.sarana_prasarana?.kode || selectedItem.sarana_prasarana?.kode_sarana || '-'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseItem}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
              {/* Kondisi badge besar */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  getKondisiBadge(selectedItem.sarana_prasarana?.kondisi || 'Baik')
                }`}>
                  {(selectedItem.sarana_prasarana?.kondisi || 'Baik').toLowerCase().includes('rusak') ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {selectedItem.sarana_prasarana?.kondisi || 'Baik'}
                </span>
                {selectedItem.nomor_bast && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    BAST Sah
                  </span>
                )}
              </div>

              {/* Grid info */}
              <div className="grid grid-cols-2 gap-3">
                {/* Jumlah */}
                <div className="bg-teal-50 rounded-2xl p-3 border border-teal-100">
                  <p className="text-[10px] font-bold text-teal-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Jumlah
                  </p>
                  <p className="text-xl font-black text-teal-700">
                    {selectedItem.jumlah}
                    <span className="text-sm font-semibold ml-1">{selectedItem.sarana_prasarana?.satuan || 'Unit'}</span>
                  </p>
                </div>

                {/* Nilai Perolehan */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Nilai Perolehan
                  </p>
                  <p className="text-sm font-black text-slate-800 leading-tight">
                    {formatRupiah(
                      Number(selectedItem.total_harga) ||
                      (Number(selectedItem.jumlah || 1) * (Number(selectedItem.harga_satuan) || Number(selectedItem.sarana_prasarana?.nilai_harga_pembelian) || 0))
                    )}
                  </p>
                  {selectedItem.jumlah > 1 && selectedItem.harga_satuan ? (
                    <p className="text-[10px] text-slate-400 mt-0.5">@ {formatRupiah(selectedItem.harga_satuan)} / unit</p>
                  ) : null}
                </div>
              </div>

              {/* Info BAST & Pengiriman */}
              <div className="space-y-2 text-xs">
                {selectedItem.nomor_bast && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-400 flex items-center gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" /> Nomor BAST</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{selectedItem.nomor_bast}</span>
                  </div>
                )}
                {selectedItem.nomor_surat_jalan && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-400 flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> No. Surat Jalan</span>
                    <span className="font-mono font-bold text-slate-700">{selectedItem.nomor_surat_jalan}</span>
                  </div>
                )}
                {selectedItem.tanggal_kirim && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Tanggal Kirim</span>
                    <span className="font-semibold text-slate-700">{new Date(selectedItem.tanggal_kirim).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {selectedItem.tanggal_terima && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-400 flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> Tanggal Diterima</span>
                    <span className="font-semibold text-slate-700">{new Date(selectedItem.tanggal_terima).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {selectedItem.petugas_pengirim && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-400 flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Dikirim Oleh</span>
                    <span className="font-semibold text-slate-700">{selectedItem.petugas_pengirim.nama_lengkap}</span>
                  </div>
                )}
                {selectedItem.wakapro_penerima && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-400 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Diterima Oleh</span>
                    <span className="font-semibold text-slate-700">{selectedItem.wakapro_penerima.nama_lengkap}</span>
                  </div>
                )}
                {selectedItem.sarana_prasarana?.keterangan && (
                  <div className="flex items-start justify-between py-2 border-b border-slate-100 gap-2">
                    <span className="text-slate-400 flex items-center gap-1.5 shrink-0"><Info className="h-3.5 w-3.5" /> Keterangan</span>
                    <span className="text-slate-600 text-right">{selectedItem.sarana_prasarana.keterangan}</span>
                  </div>
                )}
                {selectedItem.catatan_penerimaan && (
                  <div className="flex items-start justify-between py-2 gap-2">
                    <span className="text-slate-400 flex items-center gap-1.5 shrink-0"><ClipboardCheck className="h-3.5 w-3.5" /> Catatan Terima</span>
                    <span className="text-slate-600 text-right">{selectedItem.catatan_penerimaan}</span>
                  </div>
                )}
              </div>

              {/* ── GALERI FOTO BARANG ASLI ── */}
              {selectedItem.sarana_prasarana?.fotos && selectedItem.sarana_prasarana.fotos.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-teal-500" />
                    Foto Barang ({selectedItem.sarana_prasarana.fotos.length} foto)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedItem.sarana_prasarana.fotos.map((foto) => (
                      <button
                        key={foto.id}
                        type="button"
                        onClick={() => setItemLightboxUrl(foto.url_foto)}
                        className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 hover:border-teal-400 transition-all shadow-sm hover:shadow-md"
                        title={foto.keterangan || 'Lihat foto barang'}
                      >
                        <img
                          src={foto.url_foto}
                          alt={foto.keterangan || 'Foto barang'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f1f5f9"/><text x="50" y="55" text-anchor="middle" fill="%2394a3b8" font-size="12">No img</text></svg>';
                          }}
                        />
                        {foto.is_thumbnail && (
                          <span className="absolute top-1 left-1 bg-teal-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">Utama</span>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {foto.keterangan && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1.5 py-1 truncate">
                            {foto.keterangan}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── FOTO KONDISI WAKAPRO ── */}
              {selectedItem.foto_kondisi_wakapro_url && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-indigo-500" />
                    Foto Kondisi saat Diterima (Wakapro)
                  </p>
                  <button
                    type="button"
                    onClick={() => setItemLightboxUrl(selectedItem.foto_kondisi_wakapro_url!)}
                    className="relative group w-full rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-400 transition-all shadow-sm hover:shadow-md"
                  >
                    <img
                      src={selectedItem.foto_kondisi_wakapro_url}
                      alt="Foto kondisi wakapro"
                      className="w-full max-h-48 object-cover group-hover:scale-102 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 flex items-center justify-center transition-all">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Camera className="h-2.5 w-2.5" /> Kondisi Terima
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={handleCloseItem}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

