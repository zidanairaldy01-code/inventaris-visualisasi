'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { Package, Map, Building2, FileText, ArrowUpRight, TrendingUp, Activity, DollarSign, Layers, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

interface StatsData {
  total_item: number;
  total_unit: number;
  total_nilai: number;
  per_kategori: Record<string, { jumlah: number; nilai: number }>;
  total_ruangan: number;
  total_gedung: number;
  total_kategori: number;
  total_belanja: number;
  total_item_belanja: number;
  total_nilai_pembelian_sarana: number;
  total_nilai_sekarang_sarana: number;
  total_item_sarana: number;
}

const defaultStats: StatsData = {
  total_item: 0, total_unit: 0, total_nilai: 0, per_kategori: {},
  total_ruangan: 0, total_gedung: 0, total_kategori: 0,
  total_belanja: 0, total_item_belanja: 0,
  total_nilai_pembelian_sarana: 0, total_nilai_sekarang_sarana: 0, total_item_sarana: 0,
};

export default function DashboardPage() {
  const [data, setData] = useState<StatsData>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/stats')
      .then(res => setData({ ...defaultStats, ...res.data }))
      .catch(err => {
        console.error('Gagal memuat statistik', err);
        setError('Gagal memuat data dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { name: 'Jenis Aset',       value: data.total_item,     icon: Package,   href: '/dashboard/aset',     gradient: 'from-blue-600 to-indigo-600',   bg: 'bg-blue-50',    iconColor: 'text-blue-600',   badge: 'Item'  },
    { name: 'Ruangan Workshop', value: data.total_ruangan,  icon: Map,       href: '/dashboard/ruangan',  gradient: 'from-emerald-500 to-teal-500',  bg: 'bg-emerald-50', iconColor: 'text-emerald-600', badge: 'Ruang' },
    { name: 'Total Gedung',     value: data.total_gedung,   icon: Building2, href: '/dashboard/gedung',   gradient: 'from-violet-600 to-purple-600', bg: 'bg-violet-50',  iconColor: 'text-violet-600',  badge: 'Unit'  },
    { name: 'Kategori Aset',    value: data.total_kategori, icon: FileText,  href: '/dashboard/kategori', gradient: 'from-orange-500 to-amber-500',  bg: 'bg-orange-50',  iconColor: 'text-orange-600',  badge: 'Jenis' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeInUp">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Ikhtisar Sistem</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Pantau seluruh aset sekolah dalam satu tampilan.</p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 w-fit">
          <Activity className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-600">Sistem Aktif</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
      )}

      {/* Value Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Nilai Pembelian Sarana */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-blue-500/20">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-3">
              <DollarSign className="h-4 w-4 text-blue-200" />
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Total Nilai Pembelian</p>
            </div>
            {loading ? <div className="h-8 w-32 bg-white/20 rounded-lg skeleton" /> : (
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight">{formatRupiah(data.total_nilai_pembelian_sarana)}</p>
            )}
            <p className="text-xs text-blue-200 mt-1">{data.total_item_sarana} item sarana &amp; prasarana</p>
          </div>
        </div>

        {/* Total Nilai Pembelian */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-emerald-500/20">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-3">
              <ShoppingCart className="h-4 w-4 text-emerald-200" />
              <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Total Nilai Pembelian</p>
            </div>
            {loading ? <div className="h-8 w-32 bg-white/20 rounded-lg skeleton" /> : (
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight">{formatRupiah(data.total_belanja)}</p>
            )}
            <p className="text-xs text-emerald-200 mt-1">{data.total_item_belanja} item dalam daftar belanja</p>
          </div>
        </div>

        {/* Total Unit */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2 mb-3">
            <Layers className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Unit Aset</p>
          </div>
          {loading ? <div className="h-8 w-24 skeleton rounded-lg" /> : (
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.total_unit.toLocaleString('id-ID')}</p>
              <p className="text-xs text-slate-400 mt-1">Unit dari {data.total_item} jenis aset</p>
            </div>
          )}
        </div>

        {/* Nilai Harga Sekarang Sarana */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nilai Harga Sekarang</p>
          </div>
          {loading ? <div className="h-8 w-24 skeleton rounded-lg" /> : (
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {formatRupiah(data.total_nilai_sekarang_sarana)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Harga terkini sarana &amp; prasarana</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        {statCards.map((item, index) => (
          <Link key={item.name} href={item.href} className="block group" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="relative bg-white overflow-hidden rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 cursor-pointer">
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${item.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${item.bg} ${item.iconColor}`}>
                  {item.badge}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">{item.name}</p>
                {loading ? <div className="h-8 w-16 skeleton rounded-lg" /> : (
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{item.value}</p>
                )}
              </div>
              <div className="flex items-center mt-3 text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
                <span>Lihat detail</span>
                <ArrowUpRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Per Kategori Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-5 flex items-center">
            <Package className="h-4 w-4 mr-2 text-blue-500" />
            Nilai Aset per Kategori
          </h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 skeleton rounded-xl" />)}</div>
          ) : Object.keys(data.per_kategori).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Belum ada data aset.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.per_kategori).map(([nama, d]) => {
                const pct = data.total_nilai > 0 ? Math.round((d.nilai / data.total_nilai) * 100) : 0;
                return (
                  <div key={nama} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="w-full sm:w-32 shrink-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{nama}</p>
                      <p className="text-[11px] text-slate-400">{d.jumlah} jenis</p>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-full sm:w-24 text-left sm:text-right shrink-0">
                      <p className="text-xs font-bold text-slate-700">{formatRupiah(d.nilai)}</p>
                      <p className="text-[10px] text-slate-400">{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl shadow-lg p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full opacity-10 blur-2xl -translate-y-8 translate-x-8 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs font-bold text-white mb-1">Aksi Cepat</p>
            <p className="text-xs text-slate-400 mb-5">Navigasi ke menu yang sering digunakan.</p>
            <div className="space-y-2">
              {[
                { label: 'Sarana & Prasarana', href: '/dashboard/sarana-prasarana' },
                { label: 'Data Inventaris',     href: '/dashboard/inventaris' },
                { label: 'Data Gedung',         href: '/dashboard/gedung' },
                { label: 'Ruangan Workshop',    href: '/dashboard/ruangan' },
              ].map((action) => (
                <Link key={action.label} href={action.href} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-200 group">
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">{action.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
