'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from '@/lib/axios';
import {
  Package, Building2, ArrowUpRight, TrendingUp, TrendingDown,
  DollarSign, ShoppingCart, Wrench, Clock,
  FileText, Sparkles, Plus, Users, ArrowRight, ShieldCheck,
  AlertTriangle, History as HistoryIcon, AlertCircle
} from 'lucide-react';

import RecentSaranaTable from '@/components/dashboard/RecentSaranaTable';

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

interface AdminDashboardProps {
  user: any;
  greeting: string;
  stats: StatsData;
  recentActivity: any[];
  recentBelanja: any[];
  recentSarana: any[];
  loading: boolean;
}

export default function AdminDashboard({
  user,
  greeting,
  stats,
  recentActivity,
  recentBelanja,
  recentSarana,
  loading
}: AdminDashboardProps) {
  const [unreadDamagedNotifs, setUnreadDamagedNotifs] = useState<any[]>([]);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await axios.get('/api/notifikasis?unread_only=true&tipe=kerusakan_aset_workshop,kerusakan_aset&limit=10');
        if (res.data?.status === 'success') {
          const onlyDamageReports = (res.data.data || []).filter((notif: any) => {
            const isDamageType = notif.tipe === 'kerusakan_aset_workshop' || notif.tipe === 'kerusakan_aset';
            const kondisi = String(notif.data?.kondisi || '').toLowerCase();
            const isDamagedCondition = kondisi.includes('rusak') || kondisi.includes('tidak layak');
            return isDamageType && (isDamagedCondition || !notif.data?.kondisi);
          });
          setUnreadDamagedNotifs(onlyDamageReports);
        }
      } catch {
        // ignore
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await axios.get('/api/histories');
        const data: any[] = Array.isArray(res.data) ? res.data : [];
        // Sort by created_at desc, take latest 6
        const sorted = [...data].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentHistory(sorted.slice(0, 6));
      } catch {
        // ignore
      }
    };

    fetchNotifs();
    fetchHistory();
  }, []);

  const getAksiColor = (aksi: string) => {
    switch (aksi) {
      case 'PENAMBAHAN': case 'PENGEMBALIAN': case 'SELESAI SERVIS':
        return { badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500', icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> };
      case 'PEMINJAMAN': case 'SERVIS':
        return { badge: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500', icon: <TrendingDown className="h-3.5 w-3.5 text-orange-600" /> };
      case 'MUTASI':
        return { badge: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500', icon: <Package className="h-3.5 w-3.5 text-blue-600" /> };
      case 'UBAH KONDISI':
        return { badge: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500', icon: <AlertCircle className="h-3.5 w-3.5 text-yellow-600" /> };
      case 'PENGHAPUSAN':
        return { badge: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500', icon: <TrendingDown className="h-3.5 w-3.5 text-red-600" /> };
      default:
        return { badge: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400', icon: <HistoryIcon className="h-3.5 w-3.5 text-slate-500" /> };
    }
  };

  const formatHistoryDate = (d: string) =>
    new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* ── Banner Master Admin ── */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -translate-y-16 translate-x-16" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                SUPER ADMINISTRATOR • MASTER CONTROL
              </span>
              <span className="text-xs text-slate-400">SMK PGRI Telagasari</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {greeting}, {user?.nama_lengkap || 'Administrator'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Ringkasan inventarisasi sarana prasarana sekolah, rekap nilai finansial aset, status ruangan &amp; 5 workshop kejuruan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/dashboard/sarana-prasarana"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Input Sarana Baru
            </Link>
            <Link
              href="/dashboard/users"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Users className="h-4 w-4 text-slate-400" />
              Manajemen User
            </Link>
          </div>
        </div>
      </div>

      {/* ── Alert Notifikasi Kerusakan Workshop (Jika ada laporan dari Wakapro) ── */}
      {unreadDamagedNotifs.length > 0 && (
        <div className="bg-linear-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shrink-0 animate-bounce">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Perhatian: {unreadDamagedNotifs.length} Laporan Kerusakan Aset di Workshop
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                    Perlu Tindak Lanjut
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Laporan terbaru: <strong className="text-slate-800">{unreadDamagedNotifs[0].data?.nama_barang || unreadDamagedNotifs[0].judul}</strong> di <strong className="text-slate-800">{unreadDamagedNotifs[0].data?.nama_ruangan || 'Workshop'}</strong> {unreadDamagedNotifs[0].data?.kondisi ? `(${unreadDamagedNotifs[0].data.kondisi})` : ''} oleh {unreadDamagedNotifs[0].data?.wakapro_nama || 'Wakapro'}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/kondisi"
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>Buka Monitoring Kerusakan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 4 KPI Main Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-200">
              Inventaris
            </span>
          </div>
          {loading ? (
            <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {(stats?.total_item_sarana || 0).toLocaleString('id-ID')}{' '}
              <span className="text-base font-semibold text-slate-500">Jenis</span>
            </p>
          )}
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Total {(stats?.total_unit || 0).toLocaleString('id-ID')} unit barang fisik</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
              Finansial
            </span>
          </div>
          {loading ? (
            <div className="h-9 w-32 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-tight">
              {formatRupiah(stats?.total_nilai_pembelian_sarana)}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Total nilai pengadaan sarana</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-200">
              Fasilitas
            </span>
          </div>
          {loading ? (
            <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {stats?.total_ruangan_all || stats?.total_ruangan || 0}{' '}
              <span className="text-base font-semibold text-slate-500">Ruangan</span>
            </p>
          )}
          <p className="text-sm text-slate-500 mt-1.5 font-medium">{stats?.total_gedung || 0} Gedung &amp; 5 Workshop Jurusan</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2.5 py-1 rounded-full border border-purple-200">
              Pengadaan
            </span>
          </div>
          {loading ? (
            <div className="h-9 w-28 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight leading-tight">
              {formatRupiah(stats?.total_belanja)}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-1.5 font-medium">{stats?.total_item_belanja || 0} usulan rencana belanja</p>
        </div>
      </div>

      {/* ── Table Sarana Terbaru & Log Aktivitas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentSaranaTable
            recentSarana={recentSarana}
            loading={loading}
            viewAllHref="/dashboard/sarana-prasarana"
            title="Aset Sarana Prasarana Terbaru"
          />
        </div>

        {/* Riwayat Aktivitas Sistem (sinkron /api/histories) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HistoryIcon className="h-4 w-4 text-indigo-600" />
              Riwayat Aktivitas Sistem
            </h3>
            <Link href="/dashboard/history" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5 flex-1">
            {recentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
                <HistoryIcon className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
                Belum ada riwayat aktivitas.
              </div>
            ) : (
              recentHistory.map((h: any, idx: number) => {
                const style = getAksiColor(h.aksi);
                return (
                  <div key={h.id || idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition-colors">
                    <div className={`mt-0.5 p-1.5 rounded-lg bg-white border border-slate-200 shadow-xs`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}>
                          {h.aksi}
                        </span>
                        {h.aset?.kode_aset && (
                          <span className="text-[10px] font-mono text-slate-400">{h.aset.kode_aset}</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {h.aset?.nama_aset || h.keterangan || 'Aktivitas sistem'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {h.created_at ? formatHistoryDate(h.created_at) : '—'}
                        {h.user?.name && <span className="ml-1 font-medium text-slate-500">· {h.user.name}</span>}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
