'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios, { getStorageUrl } from '@/lib/axios';
import {
  Package, Building2, Warehouse, ArrowUpRight, TrendingUp,
  DollarSign, Layers, ShoppingCart, Handshake, Wrench, Clock,
  ChevronRight, FileText, Sparkles, Plus, Users, ArrowRight, ShieldCheck,
  AlertTriangle
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
  const [unreadDamagedNotifs, setUnreadDamagedNotifs] = useState<any[]>([]);

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
    fetchNotifs();
  }, []);

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

      {/* ── Alert Notifikasi Kerusakan Workshop (Jika ada laporan dari Wakapro) ── */}
      {unreadDamagedNotifs.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md flex-shrink-0 animate-bounce">
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
            <div className="flex items-center gap-2 flex-shrink-0">
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
              {(stats?.total_item_sarana || 0).toLocaleString('id-ID')}{' '}
              <span className="text-sm font-semibold text-slate-500">Jenis</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Total {(stats?.total_unit || 0).toLocaleString('id-ID')} unit barang fisik</p>
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
              {formatRupiah(stats?.total_nilai_pembelian_sarana)}
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
              {stats?.total_ruangan_all || stats?.total_ruangan || 0}{' '}
              <span className="text-sm font-semibold text-slate-500">Ruangan</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">{stats?.total_gedung || 0} Gedung &amp; 5 Workshop Jurusan</p>
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
              {formatRupiah(stats?.total_belanja)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">{stats?.total_item_belanja || 0} usulan rencana belanja</p>
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
            <Link href="/dashboard/sarana-prasarana" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentSarana.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <Package className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Belum ada data sarana prasarana</p>
              <Link href="/dashboard/sarana-prasarana" className="mt-3 text-xs font-bold text-indigo-600 hover:underline">
                + Tambah sekarang
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSarana.map((s: any, idx: number) => {
                const kondisi = (s.kondisi || 'baik').toLowerCase();
                const kondisiBadge = kondisi.includes('rusak berat')
                  ? 'bg-red-100 text-red-700'
                  : kondisi.includes('rusak')
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-emerald-100 text-emerald-700';
                const namaBarang = s.nama_sarana || s.nama_barang || '-';
                const kode = s.kode_sarana || s.kode || null;
                const jumlah = s.luas_jumlah || (s.stok_akhir ? `${s.stok_akhir} ${s.satuan || 'Unit'}` : `1 ${s.satuan || 'Unit'}`);
                const harga = s.harga_pembelian ?? s.nilai_harga_pembelian ?? 0;
                const thumbnail = s.fotos?.find((f: any) => f.is_thumbnail) || s.fotos?.[0];

                return (
                  <Link
                    key={s.id}
                    href="/dashboard/sarana-prasarana"
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-indigo-50/60 transition-colors group border border-transparent hover:border-indigo-100"
                  >
                    {/* Foto thumbnail / nomor */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {thumbnail ? (
                        <img src={getStorageUrl(thumbnail.url_foto)} alt={namaBarang} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                      )}
                    </div>

                    {/* Info utama */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                        {namaBarang}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {kode && <span className="text-[10px] font-mono text-slate-400">{kode}</span>}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${kondisiBadge}`}>
                          {s.kondisi || 'Baik'}
                        </span>
                      </div>
                    </div>

                    {/* Jumlah */}
                    <div className="flex-shrink-0 text-center">
                      <p className="text-xs font-bold text-slate-700">{jumlah}</p>
                    </div>

                    {/* Harga */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-semibold text-emerald-600">{formatRupiah(harga)}</p>
                      {s.created_at && (
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
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
