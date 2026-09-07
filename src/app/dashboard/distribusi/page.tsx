'use client';

import { useState, useEffect, useRef } from 'react';
import axios from '@/lib/axios';
import {
  Truck, Plus, Search, Filter, Printer, FileText, CheckCircle2,
  Clock, XCircle, Building2, User, ChevronRight, X, AlertCircle,
  Package, Calendar, Eye
} from 'lucide-react';
import Link from 'next/link';

interface DistribusiItem {
  id: number;
  nomor_surat_jalan: string;
  nomor_bast: string | null;
  sarana_prasarana_id: number;
  ruangan_tujuan_id: number;
  petugas_pengirim_id: number;
  wakapro_penerima_id: number | null;
  jumlah: number;
  tanggal_kirim: string;
  tanggal_terima: string | null;
  status: 'menunggu_konfirmasi' | 'diterima' | 'ditolak';
  catatan_pengiriman: string | null;
  catatan_penerimaan: string | null;
  sarana_prasarana?: {
    id: number;
    kode: string;
    nama_barang: string;
    satuan: string;
    kondisi: string;
  };
  ruangan_tujuan?: {
    id: number;
    nama_ruangan: string;
    gedung?: { nama_gedung: string };
  };
  petugas_pengirim?: {
    id: number;
    nama_lengkap: string;
  };
  wakapro_penerima?: {
    id: number;
    nama_lengkap: string;
  };
}

export default function DistribusiPage() {
  const [items, setItems] = useState<DistribusiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal State
  const [isModalKirimOpen, setIsModalKirimOpen] = useState(false);
  const [selectedSuratJalan, setSelectedSuratJalan] = useState<DistribusiItem | null>(null);
  const [selectedBast, setSelectedBast] = useState<{ distribusi: DistribusiItem; wakasek: any } | null>(null);

  // Form State
  const [saranaList, setSaranaList] = useState<any[]>([]);
  const [ruanganList, setRuanganList] = useState<any[]>([]);
  const [formKirim, setFormKirim] = useState({
    sarana_prasarana_id: '',
    ruangan_tujuan_id: '',
    jumlah: 1,
    catatan_pengiriman: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  const fetchDistribusi = () => {
    setLoading(true);
    let url = `/api/distribusi-asets?search=${encodeURIComponent(search)}`;
    if (statusFilter) url += `&status=${statusFilter}`;
    
    axios.get(url)
      .then(res => setItems(res.data))
      .catch(err => console.error('Gagal mengambil data distribusi', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDistribusi();
  }, [search, statusFilter]);

  // Load Sarana dan Ruangan untuk form
  useEffect(() => {
    axios.get('/api/sarana-prasaranas').then(res => {
      const data = res.data?.data || res.data || [];
      setSaranaList(Array.isArray(data) ? data : []);
    }).catch(() => {});

    axios.get('/api/ruangans').then(res => {
      const data = res.data?.data || res.data || [];
      setRuanganList(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const handleKirimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formKirim.sarana_prasarana_id || !formKirim.ruangan_tujuan_id) {
      setFormError('Pilih sarana prasarana dan ruangan tujuan terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/distribusi-asets', formKirim);
      setIsModalKirimOpen(false);
      setFormKirim({
        sarana_prasarana_id: '',
        ruangan_tujuan_id: '',
        jumlah: 1,
        catatan_pengiriman: '',
      });
      fetchDistribusi();
      // Langsung buka modal cetak surat jalan untuk pengiriman yang baru
      if (res.data?.data) {
        setSelectedSuratJalan(res.data.data);
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Gagal mengirimkan aset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBukaSuratJalan = (item: DistribusiItem) => {
    axios.get(`/api/distribusi-asets/${item.id}/surat-jalan`)
      .then(res => setSelectedSuratJalan(res.data))
      .catch(() => setSelectedSuratJalan(item));
  };

  const handleBukaBast = (item: DistribusiItem) => {
    axios.get(`/api/distribusi-asets/${item.id}/bast`)
      .then(res => setSelectedBast(res.data))
      .catch(() => setSelectedBast({ distribusi: item, wakasek: null }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── Header & Breadcrumbs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Distribusi &amp; BAST</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-blue-600" />
            Distribusi Aset &amp; Berita Acara (BAST)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Catat alokasi pengiriman aset ke bengkel, cetak Surat Jalan, dan pantau terbitnya BAST resmi.
          </p>
        </div>

        <button
          onClick={() => setIsModalKirimOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Kirim Aset ke Bengkel
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no. surat jalan, BAST, atau nama aset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-700 w-full sm:w-auto"
          >
            <option value="">Semua Status Pengiriman</option>
            <option value="menunggu_konfirmasi">Menunggu Konfirmasi Wakapro</option>
            <option value="diterima">Diterima &amp; BAST Terbit</option>
            <option value="ditolak">Ditolak / Catatan Kendala</option>
          </select>
        </div>
      </div>

      {/* ── Table List ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">No. Surat Jalan</th>
                <th className="py-3.5 px-4">Aset &amp; Jumlah</th>
                <th className="py-3.5 px-4">Bengkel Tujuan</th>
                <th className="py-3.5 px-4">Pengirim &amp; Tanggal</th>
                <th className="py-3.5 px-4">Status &amp; Dokumen</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Memuat data distribusi aset...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    Belum ada riwayat pengiriman aset ke bengkel.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isPending = item.status === 'menunggu_konfirmasi';
                  const isAccepted = item.status === 'diterima';
                  const isRejected = item.status === 'ditolak';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          <span>{item.nomor_surat_jalan}</span>
                        </div>
                        {item.nomor_bast && (
                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {item.nomor_bast}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">
                          {item.sarana_prasarana?.nama_barang || 'Aset Terdaftar'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Kode: {item.sarana_prasarana?.kode || '-'} • {item.jumlah} {item.sarana_prasarana?.satuan || 'Unit'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.ruangan_tujuan?.nama_ruangan || '-'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Wakapro: {item.wakapro_penerima?.nama_lengkap || 'Belum ditugaskan'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{new Date(item.tanggal_kirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Oleh: {item.petugas_pengirim?.nama_lengkap || '-'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3 animate-spin text-amber-500" />
                            Menunggu Wakapro
                          </span>
                        )}
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Diterima (BAST)
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="h-3 w-3 text-rose-600" />
                            Ditolak
                          </span>
                        )}
                        {item.catatan_penerimaan && (
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs truncate" title={item.catatan_penerimaan}>
                            Ket: {item.catatan_penerimaan}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Cetak Surat Jalan */}
                          <button
                            onClick={() => handleBukaSuratJalan(item)}
                            title="Cetak Surat Jalan / Bukti Kirim"
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] transition-colors flex items-center gap-1"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Surat Jalan</span>
                          </button>

                          {/* Tombol BAST jika sudah diterima */}
                          {isAccepted && (
                            <button
                              onClick={() => handleBukaBast(item)}
                              title="Buka Dokumen BAST Resmi"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition-colors flex items-center gap-1"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>BAST</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL KIRIM ASET KE BENGKEL ── */}
      {isModalKirimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Form Pengiriman Aset ke Bengkel</h3>
                  <p className="text-[11px] text-slate-500">Menerbitkan nomor Surat Jalan otomatis ke Wakapro</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalKirimOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleKirimSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Aset / Sarana Prasarana *
                </label>
                <select
                  value={formKirim.sarana_prasarana_id}
                  onChange={(e) => setFormKirim({ ...formKirim, sarana_prasarana_id: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                >
                  <option value="">-- Pilih Aset yang Akan Dikirim --</option>
                  {saranaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_barang} ({s.kode}) - Kondisi: {s.kondisi || 'Baik'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ruangan / Bengkel Tujuan *
                  </label>
                  <select
                    value={formKirim.ruangan_tujuan_id}
                    onChange={(e) => setFormKirim({ ...formKirim, ruangan_tujuan_id: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    <option value="">-- Pilih Bengkel --</option>
                    {ruanganList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama_ruangan} ({r.jenis || 'Ruang'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jumlah Unit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formKirim.jumlah}
                    onChange={(e) => setFormKirim({ ...formKirim, jumlah: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Pengiriman (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Diserahkan lengkap dengan kabel power dan buku manual..."
                  value={formKirim.catatan_pengiriman}
                  onChange={(e) => setFormKirim({ ...formKirim, catatan_pengiriman: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalKirimOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Terbitkan Surat Jalan & Kirim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CETAK SURAT JALAN ── */}
      {selectedSuratJalan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-bold text-slate-800">Pratinjau Surat Jalan Pengiriman</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak Dokumen
                </button>
                <button
                  onClick={() => setSelectedSuratJalan(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-8 overflow-y-auto print:p-0 text-slate-900" ref={printRef}>
              {/* Kop Surat Resmi */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-6">
                <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-900">SMK PGRI TELAGASARI</h2>
                <h3 className="text-xs font-bold text-slate-700 uppercase">Sistem Informasi Manajemen Sarana &amp; Prasarana</h3>
                <p className="text-[10px] text-slate-500">Jl. Syech Quro No. 12, Telagasari, Karawang, Jawa Barat</p>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-sm font-black uppercase underline tracking-wide">SURAT JALAN PENGIRIMAN ASET</h1>
                <p className="text-xs font-bold text-slate-600 mt-0.5">Nomor: {selectedSuratJalan.nomor_surat_jalan}</p>
              </div>

              {/* Info Header */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase">Tanggal Pengiriman:</p>
                  <p className="font-semibold text-slate-800">
                    {new Date(selectedSuratJalan.tanggal_kirim).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase mt-2">Petugas Pengirim:</p>
                  <p className="font-semibold text-slate-800">{selectedSuratJalan.petugas_pengirim?.nama_lengkap || 'Petugas Sarpras'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase">Ruangan / Bengkel Tujuan:</p>
                  <p className="font-semibold text-blue-700">{selectedSuratJalan.ruangan_tujuan?.nama_ruangan || '-'}</p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase mt-2">Wakapro / Penanggung Jawab:</p>
                  <p className="font-semibold text-slate-800">{selectedSuratJalan.wakapro_penerima?.nama_lengkap || 'Kepala Bengkel Terkait'}</p>
                </div>
              </div>

              {/* Rincian Barang */}
              <table className="w-full text-left text-xs border border-slate-300 mb-6">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                    <th className="py-2 px-3 border-r border-slate-300">Kode &amp; Nama Aset</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-center">Jumlah</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-center">Kondisi Awal</th>
                    <th className="py-2 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 px-3 border-r border-slate-300 text-center">1</td>
                    <td className="py-3 px-3 border-r border-slate-300">
                      <p className="font-bold text-slate-900">{selectedSuratJalan.sarana_prasarana?.nama_barang || 'Mesin / Alat Praktek'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Kode: {selectedSuratJalan.sarana_prasarana?.kode || '-'}</p>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 text-center font-bold">
                      {selectedSuratJalan.jumlah} {selectedSuratJalan.sarana_prasarana?.satuan || 'Unit'}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                        {selectedSuratJalan.sarana_prasarana?.kondisi || 'Baik'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600">
                      {selectedSuratJalan.catatan_pengiriman || 'Kondisi lengkap dan siap dioperasikan.'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12 pt-4">
                <div>
                  <p className="text-slate-500 mb-16">Yang Menyerahkan (Petugas Pengirim),</p>
                  <p className="font-bold text-slate-900 underline">{selectedSuratJalan.petugas_pengirim?.nama_lengkap || 'Ahmad Fauzi'}</p>
                  <p className="text-[10px] text-slate-500">Staf Tata Usaha Sarpras</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-16">Yang Membawa / Menerima Awal,</p>
                  <p className="font-bold text-slate-900 underline">( ............................................ )</p>
                  <p className="text-[10px] text-slate-500">Tanda Tangan &amp; Nama Terang</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CETAK BAST RESMI (3 TANDA TANGAN) ── */}
      {selectedBast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800">Berita Acara Serah Terima (BAST) Resmi</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak BAST
                </button>
                <button
                  onClick={() => setSelectedBast(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* BAST Content */}
            <div className="p-8 overflow-y-auto text-slate-900">
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-6">
                <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-900">SMK PGRI TELAGASARI</h2>
                <h3 className="text-xs font-bold text-slate-700 uppercase">Bagian Pengelolaan Sarana &amp; Prasarana Sekolah</h3>
                <p className="text-[10px] text-slate-500">Jl. Syech Quro No. 12, Telagasari, Karawang, Jawa Barat</p>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-sm font-black uppercase underline tracking-wide">BERITA ACARA SERAH TERIMA ASET</h1>
                <p className="text-xs font-bold text-slate-700 mt-0.5">Nomor: {selectedBast.distribusi.nomor_bast || 'BAST-2026/DRAFT'}</p>
                <p className="text-[10px] text-slate-500">Berdasarkan Surat Jalan No: {selectedBast.distribusi.nomor_surat_jalan}</p>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 mb-4">
                Pada hari ini, tanggal <strong>{new Date(selectedBast.distribusi.tanggal_terima || selectedBast.distribusi.tanggal_kirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah dilaksanakan serah terima sarana prasarana sekolah antara:
              </p>

              <div className="text-xs space-y-1.5 mb-4 pl-4 border-l-2 border-blue-500">
                <p><strong>PIHAK PERTAMA (Yang Menyerahkan):</strong></p>
                <p>Nama: {selectedBast.distribusi.petugas_pengirim?.nama_lengkap || 'Petugas Sarpras'}</p>
                <p>Jabatan: Pengelola / Operator Sarpras Sekolah</p>
              </div>

              <div className="text-xs space-y-1.5 mb-4 pl-4 border-l-2 border-emerald-500">
                <p><strong>PIHAK KEDUA (Yang Menerima):</strong></p>
                <p>Nama: {selectedBast.distribusi.wakapro_penerima?.nama_lengkap || 'Wakapro / Kepala Bengkel'}</p>
                <p>Jabatan: Penanggung Jawab Ruangan {selectedBast.distribusi.ruangan_tujuan?.nama_ruangan}</p>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 mb-4">
                PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA telah memeriksa fisik serta menerima barang inventaris sebagai berikut:
              </p>

              <table className="w-full text-left text-xs border border-slate-300 mb-4">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                    <th className="py-2 px-3 border-r border-slate-300">Nama Sarana &amp; Kode</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-center">Jumlah</th>
                    <th className="py-2 px-3">Kondisi Diterima</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 px-3 border-r border-slate-300 text-center">1</td>
                    <td className="py-2.5 px-3 border-r border-slate-300">
                      <p className="font-bold">{selectedBast.distribusi.sarana_prasarana?.nama_barang}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Kode: {selectedBast.distribusi.sarana_prasarana?.kode || '-'}</p>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 text-center font-bold">
                      {selectedBast.distribusi.jumlah} {selectedBast.distribusi.sarana_prasarana?.satuan || 'Unit'}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-700 font-semibold">
                      {selectedBast.distribusi.catatan_penerimaan || 'Diterima dalam kondisi baik dan lengkap.'}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="text-xs leading-relaxed text-slate-600 mb-8">
                Demikian Berita Acara Serah Terima ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya.
              </p>

              {/* 3 Kolom Tanda Tangan */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs mt-6">
                <div>
                  <p className="text-slate-500 mb-14">PIHAK PERTAMA,</p>
                  <p className="font-bold text-slate-900 underline">{selectedBast.distribusi.petugas_pengirim?.nama_lengkap || 'Ahmad Fauzi'}</p>
                  <p className="text-[10px] text-slate-400">Petugas Sarpras</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-14">Mengetahui,<br />Wakasek Sarpras,</p>
                  <p className="font-bold text-slate-900 underline">{selectedBast.wakasek?.nama_lengkap || 'Drs. H. Mulyadi, M.Pd'}</p>
                  <p className="text-[10px] text-slate-400">NIP. ................................</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-14">PIHAK KEDUA,</p>
                  <p className="font-bold text-slate-900 underline">{selectedBast.distribusi.wakapro_penerima?.nama_lengkap || 'Kepala Bengkel'}</p>
                  <p className="text-[10px] text-slate-400">Wakapro Penanggung Jawab</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
