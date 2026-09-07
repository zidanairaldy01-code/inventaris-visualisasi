'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Warehouse, CheckCircle2, AlertTriangle, Clock, ArrowRight,
  Cpu, Search, Package, Wrench, Printer, ShieldAlert,
  Inbox, Check, X, FileText
} from 'lucide-react';
import axios from '@/lib/axios';

interface WakaproStats {
  ruangan: any;
  total_unit: number;
  total_item_jenis: number;
  kondisi_baik: number;
  kondisi_rusak: number;
  menunggu_konfirmasi: number;
  menunggu_list: any[];
  aset_list: any[];
  distribusi_terbaru: any[];
}

interface WakaproDashboardProps {
  user: any;
  wakaproStats: WakaproStats;
  loading: boolean;
  onRefresh: () => void;
}

export default function WakaproDashboard({ user, wakaproStats, loading, onRefresh }: WakaproDashboardProps) {
  const [wakaproSearch, setWakaproSearch] = useState('');
  const [wakaproFilter, setWakaproFilter] = useState<'all' | 'Baik' | 'Rusak'>('all');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [showKirModal, setShowKirModal] = useState(false);

  const ruangan = user?.ruangan || wakaproStats.ruangan;
  const kesiapanPersen = wakaproStats.total_unit > 0
    ? Math.round((wakaproStats.kondisi_baik / wakaproStats.total_unit) * 100)
    : 100;

  const handleConfirmReceipt = async (distribusiId: number) => {
    try {
      setConfirmingId(distribusiId);
      await axios.post(`/distribusi/${distribusiId}/konfirmasi`, {
        status_bast: 'disetujui'
      });
      alert('Penerimaan sarana berhasil dikonfirmasi dan BAST resmi diterbitkan!');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengonfirmasi penerimaan sarana.');
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredAsetList = wakaproStats.aset_list.filter((item: any) => {
    const sarana = item.sarana_prasarana;
    const matchSearch =
      (sarana?.nama_barang || '').toLowerCase().includes(wakaproSearch.toLowerCase()) ||
      (sarana?.kode || '').toLowerCase().includes(wakaproSearch.toLowerCase()) ||
      (sarana?.merek || '').toLowerCase().includes(wakaproSearch.toLowerCase());

    if (wakaproFilter === 'Baik') {
      return matchSearch && (sarana?.kondisi || 'Baik') === 'Baik';
    }
    if (wakaproFilter === 'Rusak') {
      return matchSearch && (sarana?.kondisi || '') !== 'Baik';
    }
    return matchSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* ── Banner Utama Wakapro (Kepala Bengkel Jurusan) ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none translate-y-16" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                <Warehouse className="h-3.5 w-3.5 text-indigo-400" />
                WAKAPRO • KEPALA BENGKEL JURUSAN
              </span>
              {ruangan?.gedung?.nama_gedung && (
                <span className="text-xs text-slate-400 font-medium">
                  {ruangan.gedung.nama_gedung}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {user?.nama_lengkap || 'Kepala Bengkel Jurusan'}
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Pengelolaan mandiri untuk{' '}
              <strong className="text-indigo-200 font-bold">
                {ruangan?.nama_ruangan || 'Bengkel / Workshop Jurusan'}
              </strong>
              . Pantau kelaikan alat praktik, konfirmasi BAST barang masuk, dan pastikan fasilitas siap pakai untuk pembelajaran siswa.
            </p>
          </div>

          {/* Quick Actions Wakapro */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowKirModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Cetak KIR Workshop
            </button>
            <Link
              href="/dashboard/kondisi"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Wrench className="h-4 w-4 text-slate-400" />
              Lapor Perbaikan Alat
            </Link>
          </div>
        </div>
      </div>

      {/* ── Warning Banner jika ada Kiriman Masuk yang Menunggu Konfirmasi BAST ── */}
      {wakaproStats.menunggu_konfirmasi > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0 mt-0.5 animate-bounce">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                Ada {wakaproStats.menunggu_konfirmasi} Kiriman Barang Baru Menunggu Verifikasi &amp; Tanda Tangan BAST!
              </h3>
              <p className="text-xs text-amber-800/90 mt-1 max-w-xl">
                Petugas Sarpras telah mengirimkan sarana ke workshop ini. Harap periksa fisik unit dan lakukan konfirmasi penerimaan agar dokumen BAST sah.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/penerimaan"
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <Inbox className="h-4 w-4" />
            Verifikasi Barang Sekarang
          </Link>
        </div>
      )}

      {/* ── 4 KPI Stats Card khusus Bengkel Wakapro ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Unit di Bengkel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Cpu className="h-4 w-4" />
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              Total Bengkel
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {wakaproStats.total_unit.toLocaleString('id-ID')}{' '}
              <span className="text-sm font-semibold text-slate-500">Unit</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Terbagi dalam {wakaproStats.total_item_jenis} jenis peralatan
          </p>
        </div>

        {/* Card 2: Kondisi Siap Praktik (Baik) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Siap Praktik
              </span>
            </div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <p className="text-2xl font-black text-emerald-600 tracking-tight">
                {wakaproStats.kondisi_baik.toLocaleString('id-ID')}{' '}
                <span className="text-sm font-semibold text-slate-500">Unit Baik</span>
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kesiapanPersen}%` }} />
            </div>
            <span className="text-[11px] font-bold text-emerald-600">{kesiapanPersen}%</span>
          </div>
        </div>

        {/* Card 3: Perlu Servis / Rusak */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                Maintenance
              </span>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {wakaproStats.kondisi_rusak.toLocaleString('id-ID')}{' '}
                <span className="text-sm font-semibold text-rose-500">Unit Rusak</span>
              </p>
            )}
          </div>
          <Link
            href="/dashboard/kondisi"
            className="text-xs text-rose-600 hover:text-rose-700 font-medium mt-2 flex items-center justify-between"
          >
            <span>Lapor / Jadwal Servis</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Card 4: Menunggu ACC BAST */}
        <Link
          href="/dashboard/penerimaan"
          className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                Penerimaan
              </span>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-amber-100 rounded-lg animate-pulse" />
            ) : (
              <p className="text-2xl font-black text-amber-950 tracking-tight">
                {wakaproStats.menunggu_konfirmasi}{' '}
                <span className="text-sm font-semibold text-amber-800">Menunggu ACC</span>
              </p>
            )}
          </div>
          <p className="text-xs text-amber-700 mt-2 font-medium flex items-center justify-between">
            <span>Periksa fisik barang</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>
      </div>

      {/* ── Tabel Aset Bengkel & Sidebar Profil Ruang ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri (2/3): Daftar Peralatan & Mesin Praktik di Bengkel Ini */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-indigo-600" />
                  Daftar Peralatan &amp; Mesin Praktik di Bengkel Ini
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inventaris sarana praktik resmi yang dialokasikan di {ruangan?.nama_ruangan || 'Bengkel'}
                </p>
              </div>

              {/* Filter Kondisi */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-semibold">
                <button
                  onClick={() => setWakaproFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    wakaproFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua ({wakaproStats.aset_list.length})
                </button>
                <button
                  onClick={() => setWakaproFilter('Baik')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    wakaproFilter === 'Baik' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kondisi Baik
                </button>
                <button
                  onClick={() => setWakaproFilter('Rusak')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    wakaproFilter === 'Rusak' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Perlu Servis
                </button>
              </div>
            </div>

            {/* Input Pencarian */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama alat praktik, mesin, nomor seri, atau kode aset..."
                value={wakaproSearch}
                onChange={(e) => setWakaproSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>

            {/* Tabel Daftar Aset */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredAsetList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                {wakaproSearch
                  ? 'Tidak ada peralatan yang cocok dengan kata kunci pencarian.'
                  : 'Belum ada peralatan yang terdistribusi ke bengkel ini.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Nama Alat &amp; Spesifikasi</th>
                      <th className="py-2.5 px-3">Kode Aset</th>
                      <th className="py-2.5 px-3 text-center">Jumlah Unit</th>
                      <th className="py-2.5 px-3 text-center">Kondisi Fisik</th>
                      <th className="py-2.5 px-3">Legalitas Dokumen</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAsetList.map((item: any) => {
                      const sarana = item.sarana_prasarana;
                      const isBaik = (sarana?.kondisi || 'Baik') === 'Baik';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{sarana?.nama_sarana || sarana?.nama_barang || 'Aset Bengkel'}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Merek: {sarana?.merek || '-'}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {sarana?.kode_sarana || sarana?.kode || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                              {item.jumlah || 1} Unit
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isBaik ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                Siap Praktik
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="h-3 w-3 text-rose-500" />
                                {sarana?.kondisi || 'Perlu Servis'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-700 text-[11px]">{item.nomor_bast || 'BAST Diterbitkan'}</p>
                            <p className="text-[10px] text-slate-400">
                              Terima: {item.tanggal_terima ? new Date(item.tanggal_terima).toLocaleDateString('id-ID') : '-'}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              href="/dashboard/kondisi"
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                            >
                              <Wrench className="h-3 w-3" />
                              Kondisi
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Menampilkan {filteredAsetList.length} dari {wakaproStats.aset_list.length} item peralatan</span>
            <button
              onClick={() => setShowKirModal(true)}
              className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak Kartu Inventaris Ruangan (KIR)
            </button>
          </div>
        </div>

        {/* Kolom Kanan (1/3): Profil Spesifikasi Bengkel & Riwayat Masuk */}
        <div className="space-y-6">
          {/* Profil Workshop Ruangan */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Warehouse className="h-4 w-4 text-indigo-600" />
              Spesifikasi Ruangan Bengkel
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Nama Workshop:</span>
                <span className="font-bold text-slate-800 text-right">{ruangan?.nama_ruangan || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Kode Ruangan:</span>
                <span className="font-mono font-bold text-slate-800">{ruangan?.kode_ruangan || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Lokasi Gedung:</span>
                <span className="font-bold text-slate-800">{ruangan?.gedung?.nama_gedung || 'Gedung Workshop'}</span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Kapasitas Praktik:</span>
                <span className="font-bold text-slate-800">{ruangan?.kapasitas || 36} Siswa</span>
              </div>
            </div>
          </div>

          {/* Menunggu Konfirmasi BAST Widget */}
          {wakaproStats.menunggu_list.length > 0 && (
            <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6">
              <h3 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-amber-600" />
                Kiriman Menunggu Konfirmasi ({wakaproStats.menunggu_list.length})
              </h3>
              <div className="space-y-3">
                {wakaproStats.menunggu_list.map((m: any) => (
                  <div key={m.id} className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{m.sarana_prasarana?.nama_sarana || m.sarana_prasarana?.nama_barang}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{m.nomor_bast || 'BAST Pending'}</p>
                      </div>
                      <span className="font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                        {m.jumlah} Unit
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/40">
                      <button
                        disabled={confirmingId === m.id}
                        onClick={() => handleConfirmReceipt(m.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        {confirmingId === m.id ? 'Memproses...' : 'Terima & TTD BAST'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cetak Kartu Inventaris Ruangan (KIR) */}
      {showKirModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Printer className="h-4 w-4 text-indigo-600" />
                Cetak Kartu Inventaris Ruangan (KIR)
              </h3>
              <button onClick={() => setShowKirModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <p>Dokumen KIR akan memuat daftar lengkap seluruh peralatan di <strong>{ruangan?.nama_ruangan}</strong> beserta nomor registrasi dan status kelaikan fisik.</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 font-mono text-[11px]">
                <p><strong>BENGKEL:</strong> {ruangan?.nama_ruangan || '-'}</p>
                <p><strong>GEDUNG:</strong> {ruangan?.gedung?.nama_gedung || '-'}</p>
                <p><strong>KEPALA BENGKEL:</strong> {user?.nama_lengkap || '-'}</p>
                <p><strong>TOTAL ASET:</strong> {wakaproStats.total_unit} Unit</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowKirModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Cetak Dokumen Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
