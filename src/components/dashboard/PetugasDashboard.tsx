'use client';

import Link from 'next/link';
import {
  HardHat, Plus, Truck, Clock, CheckCircle2, ArrowRight,
  Package, Inbox, ArrowUpRight, ChevronRight
} from 'lucide-react';

interface PetugasStats {
  total_diinput: number;
  input_bulan_ini: number;
  menunggu_konfirmasi: number;
  selesai_serah_terima: number;
  distribusi_terbaru: any[];
  input_terbaru: any[];
  sebaran_bengkel: { nama_ruangan: string; total_aset: number }[];
}

interface PetugasDashboardProps {
  user: any;
  greeting: string;
  petugasStats: PetugasStats;
  loading: boolean;
}

export default function PetugasDashboard({ user, greeting, petugasStats, loading }: PetugasDashboardProps) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* ── Banner Petugas Input Sarpras ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -translate-y-16 translate-x-16" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                <HardHat className="h-3.5 w-3.5 text-indigo-400" />
                PETUGAS INPUT SARPRAS &amp; LOGISTIK
              </span>
              <span className="text-xs text-slate-400">SMK PGRI Telagasari</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {greeting}, {user?.nama_lengkap || 'Petugas Input Sarpras'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Pencatatan sarana prasarana baru, pendistribusian peralatan ke workshop kejuruan, dan pelacakan verifikasi Berita Acara Serah Terima (BAST).
            </p>
          </div>

          {/* Quick Actions Petugas */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/dashboard/sarana-prasarana"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Input Sarana Baru
            </Link>
            <Link
              href="/dashboard/distribusi"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Truck className="h-4 w-4 text-slate-400" />
              Distribusi ke Bengkel
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4 KPI Stats Petugas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              Total Input
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {petugasStats.total_diinput.toLocaleString('id-ID')}{' '}
              <span className="text-sm font-semibold text-slate-500">Sarana</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Item sarana prasarana yang diinput</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Bulan Ini
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-blue-600 tracking-tight">
              {petugasStats.input_bulan_ini}{' '}
              <span className="text-sm font-semibold text-slate-500">Item Baru</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Ditambahkan bulan berjalan</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
              Pending BAST
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-amber-600 tracking-tight">
              {petugasStats.menunggu_konfirmasi}{' '}
              <span className="text-sm font-semibold text-amber-700">Distribusi</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Menunggu konfirmasi Wakapro</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Tersetujui
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-emerald-600 tracking-tight">
              {petugasStats.selesai_serah_terima}{' '}
              <span className="text-sm font-semibold text-slate-500">BAST Sah</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Selesai serah terima fisik</p>
        </div>
      </div>

      {/* ── Distribusi Terbaru & Sebaran Bengkel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-600" />
              Riwayat Distribusi Barang Ke Workshop
            </h3>
            <Link href="/dashboard/distribusi" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              Kelola Distribusi
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : petugasStats.distribusi_terbaru.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada riwayat distribusi barang.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Sarana</th>
                    <th className="py-2.5 px-3">Tujuan Bengkel</th>
                    <th className="py-2.5 px-3 text-center">Jumlah</th>
                    <th className="py-2.5 px-3 text-right">Status BAST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {petugasStats.distribusi_terbaru.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {d.sarana_prasarana?.nama_sarana || d.sarana_prasarana?.nama_barang}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {d.ruangan?.nama_ruangan || 'Bengkel'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {d.jumlah} Unit
                      </td>
                      <td className="py-3 px-3 text-right">
                        {d.status_bast === 'disetujui' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Disetujui Wakapro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Menunggu Konfirmasi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sebaran Bengkel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-indigo-600" />
            Sebaran Aset di Workshop
          </h3>
          <div className="space-y-3">
            {petugasStats.sebaran_bengkel.map((sb, idx) => (
              <div key={idx} className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{sb.nama_ruangan}</span>
                <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {sb.total_aset} Unit
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
