'use client';

import Link from 'next/link';
import {
  FileText, Building2, Warehouse, CheckCircle2, AlertTriangle,
  ArrowRight, ShieldCheck, CheckSquare, Layers
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

export default function WakasekDashboard({ user, greeting, wakasekStats, loading }: WakasekDashboardProps) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* ── Banner Eksekutif Wakasek Sarpras ── */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden border border-teal-900/40">
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
              Pemantauan komprehensif kelaikan fasilitas di 5 workshop jurusan kejuruan, audit legalitas Berita Acara Serah Terima (BAST), dan rekapitulasi sarpras sekolah.
            </p>
          </div>

          {/* Quick Actions Wakasek */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/dashboard/laporan"
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Rekap Laporan Sarpras
            </Link>
            <Link
              href="/dashboard/ruangan"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Building2 className="h-4 w-4 text-slate-400" />
              Data Ruangan &amp; Bengkel
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

      {/* ── Matriks Monitoring 5 Bengkel Jurusan ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-teal-600" />
              Kesiapan Sarana di 5 Workshop Kejuruan (TP, TMI, TPL, RPL, TKR)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring fasilitas peralatan fisik dan kepala bengkel penanggung jawab
            </p>
          </div>
          <Link href="/dashboard/ruangan" className="text-xs font-bold text-teal-600 hover:text-teal-700">
            Lihat Detail
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wakasekStats.bengkel_list.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-2xl border border-slate-100 hover:border-teal-200 bg-slate-50/50 hover:bg-white transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{b.nama_ruangan}</h4>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {b.kode_ruangan}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">{b.nama_gedung}</p>

                  <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1.5 text-xs mb-3">
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
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                      style={{ width: `${b.kesiapan_persen}%` }}
                    />
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
          <Link href="/dashboard/distribusi" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            Lihat Semua Distribusi
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
    </div>
  );
}
