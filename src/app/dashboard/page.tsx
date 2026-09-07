'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import {
  Package, Building2, Warehouse, ArrowUpRight,
  TrendingUp, DollarSign, Layers, ShoppingCart,
  Handshake, Wrench, Clock, ChevronRight, FileText,
  ShieldAlert, Sparkles
} from 'lucide-react';
import Link from 'next/link';

const formatRupiah = (n: number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

interface StatsData {
  total_item: number;
  total_unit: number;
  total_nilai: number;
  total_ruangan: number;
  total_ruangan_all: number;
  total_ruangan_gedung: number;
  total_ruangan_workshop: number;
  total_gedung: number;
  total_belanja: number;
  total_item_belanja: number;
  total_nilai_pembelian_sarana: number;
  total_nilai_sekarang_sarana: number;
  total_item_sarana: number;
  total_peminjaman_aktif: number;
  total_servis_proses: number;
}

interface HistoryItem {
  id: number;
  aksi: string;
  keterangan: string;
  tanggal: string;
  aset?: { nama_aset: string };
  user?: { name: string };
}

const defaultStats: StatsData = {
  total_item: 0,
  total_unit: 0,
  total_nilai: 0,
  total_ruangan: 0,
  total_ruangan_all: 0,
  total_ruangan_gedung: 0,
  total_ruangan_workshop: 0,
  total_gedung: 0,
  total_belanja: 0,
  total_item_belanja: 0,
  total_nilai_pembelian_sarana: 0,
  total_nilai_sekarang_sarana: 0,
  total_item_sarana: 0,
  total_peminjaman_aktif: 0,
  total_servis_proses: 0,
};

export default function DashboardPage() {
  const [data, setData] = useState<StatsData>(defaultStats);
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setGreeting('Selamat Pagi');
    else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang');
    else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');

    Promise.all([
      axios.get('/api/stats'),
      axios.get('/api/histories').catch(() => ({ data: [] })),
    ])
      .then(([statsRes, historyRes]) => {
        setData({ ...defaultStats, ...statsRes.data });
        const rawHistory = Array.isArray(historyRes.data) ? historyRes.data : (historyRes.data?.data ?? []);
        setHistories(rawHistory.slice(0, 5));
      })
      .catch(err => {
        console.error('Gagal memuat statistik', err);
        setError('Gagal memuat data statistik dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      name: 'Sarana & Prasarana',
      value: data.total_item_sarana,
      sub: 'Item aset sekolah',
      icon: Package,
      href: '/dashboard/sarana-prasarana',
      gradient: 'from-blue-600 to-indigo-600',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      badge: 'Sarana',
    },
    {
      name: 'Ruangan Workshop',
      value: data.total_ruangan_workshop,
      sub: 'Ruang bengkel mandiri',
      icon: Warehouse,
      href: '/dashboard/ruangan',
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      badge: 'Workshop',
    },
    {
      name: 'Master Gedung',
      value: data.total_gedung,
      sub: `${data.total_ruangan_gedung} Ruangan gedung`,
      icon: Building2,
      href: '/dashboard/gedung',
      gradient: 'from-violet-600 to-purple-600',
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      badge: 'Gedung',
    },
    {
      name: 'Peminjaman Aktif',
      value: data.total_peminjaman_aktif,
      sub: 'Barang sedang dipinjam',
      icon: Handshake,
      href: '/dashboard/peminjaman',
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      badge: 'Sirkulasi',
    },
    {
      name: 'Servis & Perbaikan',
      value: data.total_servis_proses,
      sub: 'Dalam proses perbaikan',
      icon: Wrench,
      href: '/dashboard/servis',
      gradient: 'from-rose-500 to-red-500',
      bg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      badge: 'Servis',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* ── Welcome & Status Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none translate-y-16" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SIM Aset Aktif &amp; Terhubung
              </span>
              <span className="text-xs text-slate-400">SMK PGRI Telagasari</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {greeting}, Administrator
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Selamat datang di pusat kendali aset dan inventaris. Pantau kondisi barang, sirkulasi peminjaman, serta ruangan workshop dan gedung secara terpadu.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/dashboard/peminjaman"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Handshake className="h-4 w-4" />
              Catat Peminjaman
            </Link>
            <Link
              href="/dashboard/laporan"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4 text-slate-300" />
              Laporan Rekap
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Financial & Physical Metric Cards (Top Row) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Nilai Pembelian Sarana */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-blue-500/20 flex flex-col justify-between">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <p className="text-[11px] font-bold text-blue-100 uppercase tracking-wider">Nilai Beli Sarana</p>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Aktif</span>
            </div>
            {loading ? (
              <div className="h-8 w-36 bg-white/20 rounded-lg animate-pulse" />
            ) : (
              <p className="text-xl sm:text-2xl font-black tracking-tight">{formatRupiah(data.total_nilai_pembelian_sarana)}</p>
            )}
          </div>
          <p className="text-xs text-blue-200 mt-2 font-medium">
            Akumulasi nilai awal {data.total_item_sarana} item sarana
          </p>
        </div>

        {/* Total Nilai Belanja Pengadaan */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-emerald-500/20 flex flex-col justify-between">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Total Belanja</p>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Pengadaan</span>
            </div>
            {loading ? (
              <div className="h-8 w-36 bg-white/20 rounded-lg animate-pulse" />
            ) : (
              <p className="text-xl sm:text-2xl font-black tracking-tight">{formatRupiah(data.total_belanja)}</p>
            )}
          </div>
          <p className="text-xs text-emerald-200 mt-2 font-medium">
            Dari {data.total_item_belanja} daftar rincian belanja
          </p>
        </div>

        {/* Nilai Harga Sekarang */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nilai Sekarang</p>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">Kondisi</span>
            </div>
            {loading ? (
              <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatRupiah(data.total_nilai_sekarang_sarana)}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Estimasi nilai aset sarana saat ini
          </p>
        </div>

        {/* Total Unit Fisik */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                  <Layers className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Fisik Unit</p>
              </div>
              <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">Inventaris</span>
            </div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {data.total_unit.toLocaleString('id-ID')} <span className="text-sm font-semibold text-slate-500">Unit</span>
              </p>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Tersebar di seluruh ruangan &amp; gedung
          </p>
        </div>
      </div>

      {/* ── Core Section: 6 Navigational Quick-Stats ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Pusat Manajemen Aset &amp; Lokasi
            </h2>
            <p className="text-xs text-slate-500">Akses cepat ke masing-masing modul pengelolaan</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} className="block group">
                <div className="relative bg-white overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 cursor-pointer flex flex-col justify-between h-full">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-3 rounded-2xl ${item.bg} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-5 w-5 ${item.iconColor}`} />
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${item.bg} ${item.iconColor} border border-slate-100`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">{item.name}</p>
                    {loading ? (
                      <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse mb-1" />
                    ) : (
                      <p className="text-2xl font-black text-slate-900 tracking-tight mb-1">{item.value}</p>
                    )}
                    <p className="text-[11px] text-slate-400">{item.sub}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <span>Buka Modul</span>
                    <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Recent Activities (full-width) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Riwayat Aktivitas Terkini
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Catatan transaksi dan sirkulasi terbaru</p>
          </div>
          <Link
            href="/dashboard/history"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            Semua
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : histories.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Belum ada catatan riwayat transaksi.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {histories.map((h) => {
              const isPinjam = h.aksi === 'PEMINJAMAN';
              const isServis = h.aksi === 'SERVIS';

              return (
                <div
                  key={h.id}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        isPinjam
                          ? 'bg-amber-100 text-amber-800'
                          : isServis
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {h.aksi}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {h.tanggal ? new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 line-clamp-1">{h.aset?.nama_aset || 'Aset'}</p>
                  <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{h.keterangan}</p>
                </div>
              );
            })}
          </div>
        )}

        <Link
          href="/dashboard/history"
          className="mt-4 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
        >
          Lihat Log Riwayat Lengkap <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
