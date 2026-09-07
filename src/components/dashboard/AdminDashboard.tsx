'use client';

import Link from 'next/link';
import {
  Package, Building2, Warehouse, ArrowUpRight, TrendingUp,
  DollarSign, Layers, ShoppingCart, Handshake, Wrench, Clock,
  ChevronRight, FileText, Sparkles, Plus, Users, ArrowRight, ShieldCheck
} from 'lucide-react';

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
  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* ── Banner Master Admin ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden border border-indigo-900/40">
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

      {/* ── 4 KPI Main Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              Inventaris
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.total_item_sarana.toLocaleString('id-ID')}{' '}
              <span className="text-sm font-semibold text-slate-500">Jenis</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Total {stats.total_unit.toLocaleString('id-ID')} unit barang fisik</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Finansial
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
              {formatRupiah(stats.total_nilai_pembelian_sarana)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Total nilai pengadaan sarana</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Fasilitas
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.total_ruangan_all || stats.total_ruangan}{' '}
              <span className="text-sm font-semibold text-slate-500">Ruangan</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">{stats.total_gedung} Gedung &amp; 5 Workshop Jurusan</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
              Pengadaan
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
              {formatRupiah(stats.total_belanja)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">{stats.total_item_belanja} usulan rencana belanja</p>
        </div>
      </div>

      {/* ── Table Sarana Terbaru & Log Aktivitas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              Aset Sarana Prasarana Terbaru
            </h3>
            <Link href="/dashboard/sarana-prasarana" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              Lihat Semua
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Kode &amp; Nama Sarana</th>
                    <th className="py-2.5 px-3">Merek / Spek</th>
                    <th className="py-2.5 px-3 text-center">Jumlah</th>
                    <th className="py-2.5 px-3 text-right">Nilai Pembelian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSarana.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{s.nama_sarana || s.nama_barang}</p>
                        <p className="text-[10px] font-mono text-slate-400">{s.kode_sarana || s.kode}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {s.merek || s.spesifikasi || '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {s.jumlah || 1} Unit
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                        {formatRupiah(s.harga_pembelian)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Log / Aktivitas Terbaru */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            Aktivitas Sistem Terbaru
          </h3>
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((act: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1 text-xs">
                <p className="font-bold text-slate-800">{act.deskripsi || act.action || 'Aktivitas Pengguna'}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {act.created_at ? new Date(act.created_at).toLocaleString('id-ID') : 'Baru saja'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
