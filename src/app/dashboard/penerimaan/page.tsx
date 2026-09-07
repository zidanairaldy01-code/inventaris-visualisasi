'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import {
  Inbox, CheckCircle2, XCircle, Clock, Search, Filter,
  Building2, User, FileText, Printer, ChevronRight, AlertCircle,
  X, Check, AlertTriangle
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

export default function PenerimaanPage() {
  const [items, setItems] = useState<DistribusiItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal Konfirmasi
  const [selectedItem, setSelectedItem] = useState<DistribusiItem | null>(null);
  const [aksi, setAksi] = useState<'terima' | 'tolak'>('terima');
  const [kondisiDiterima, setKondisiDiterima] = useState('Baik');
  const [catatanPenerimaan, setCatatanPenerimaan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal BAST
  const [selectedBast, setSelectedBast] = useState<{ distribusi: DistribusiItem; wakasek: any } | null>(null);

  useEffect(() => {
    axios.get('/api/user')
      .then(res => setCurrentUser(res.data))
      .catch(() => {});
  }, []);

  const fetchPenerimaan = () => {
    setLoading(true);
    let url = `/api/distribusi-asets?search=${encodeURIComponent(search)}`;
    if (statusFilter) url += `&status=${statusFilter}`;

    axios.get(url)
      .then(res => setItems(res.data))
      .catch(err => console.error('Gagal mengambil data penerimaan', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPenerimaan();
  }, [search, statusFilter]);

  const handleOpenKonfirmasi = (item: DistribusiItem) => {
    setSelectedItem(item);
    setAksi('terima');
    setKondisiDiterima(item.sarana_prasarana?.kondisi || 'Baik');
    setCatatanPenerimaan('Barang telah diperiksa fisik dan berfungsi dengan baik.');
    setErrorMsg('');
  };

  const handleSubmitKonfirmasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await axios.post(`/api/distribusi-asets/${selectedItem.id}/konfirmasi`, {
        aksi,
        catatan_penerimaan: catatanPenerimaan,
        kondisi_diterima: aksi === 'terima' ? kondisiDiterima : null,
      });

      setSuccessMsg(res.data?.message || 'Konfirmasi penerimaan berhasil disimpan.');
      setSelectedItem(null);
      fetchPenerimaan();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Gagal menyimpan konfirmasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBukaBast = (item: DistribusiItem) => {
    axios.get(`/api/distribusi-asets/${item.id}/bast`)
      .then(res => setSelectedBast(res.data))
      .catch(() => setSelectedBast({ distribusi: item, wakasek: null }));
  };

  const handlePrint = () => {
    window.print();
  };

  const pendingCount = items.filter(i => i.status === 'menunggu_konfirmasi').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Penerimaan Barang</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Inbox className="h-6 w-6 text-emerald-600" />
            Penerimaan &amp; Pemeriksaan Fisik Barang Bengkel
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Verifikasi fisik barang yang dikirim oleh Petugas Sarpras, konfirmasi penerimaan, dan terbitkan Berita Acara (BAST).
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-2 shrink-0">
            <Clock className="h-4 w-4 text-amber-600 animate-spin" />
            <span>{pendingCount} Barang Menunggu Pemeriksaan</span>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari surat jalan, BAST, atau nama aset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-700 w-full sm:w-auto"
          >
            <option value="">Semua Status</option>
            <option value="menunggu_konfirmasi">Menunggu Pemeriksaan</option>
            <option value="diterima">Telah Diterima &amp; ACC</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* ── Table Penerimaan ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Surat Jalan</th>
                <th className="py-3.5 px-4">Barang Masuk</th>
                <th className="py-3.5 px-4">Bengkel Tujuan</th>
                <th className="py-3.5 px-4">Pengirim &amp; Tanggal</th>
                <th className="py-3.5 px-4">Status &amp; BAST</th>
                <th className="py-3.5 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mb-2" />
                    <p>Memuat daftar barang masuk...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    Tidak ada kiriman barang untuk ruangan Anda.
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
                        <div className="flex items-center gap-1.5 font-mono">
                          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          <span>{item.nomor_surat_jalan}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">
                          {item.sarana_prasarana?.nama_barang || 'Aset Sekolah'}
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
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <p className="font-semibold text-slate-800">
                          {new Date(item.tanggal_kirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Oleh: {item.petugas_pengirim?.nama_lengkap || 'Petugas'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3 animate-spin text-amber-500" />
                            Perlu Pemeriksaan Fisik
                          </span>
                        )}
                        {isAccepted && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Diterima &amp; ACC
                            </span>
                            {item.nomor_bast && (
                              <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                                No: {item.nomor_bast}
                              </p>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="h-3 w-3 text-rose-600" />
                            Ditolak
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => handleOpenKonfirmasi(item)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Konfirmasi Terima</span>
                            </button>
                          )}

                          {isAccepted && (
                            <button
                              onClick={() => handleBukaBast(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition-colors flex items-center gap-1"
                              title="Buka Dokumen BAST"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Cetak BAST</span>
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

      {/* ── MODAL KONFIRMASI PEMERIKSAAN FISIK ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pemeriksaan Fisik &amp; Serah Terima</h3>
                  <p className="text-[11px] text-slate-500">No. Surat Jalan: {selectedItem.nomor_surat_jalan}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitKonfirmasi} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Rincian Barang */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <p className="text-slate-400 text-[10px] uppercase font-bold">Barang yang Diterima:</p>
                <p className="font-bold text-slate-900 text-sm">{selectedItem.sarana_prasarana?.nama_barang}</p>
                <p className="text-slate-500">
                  Kode: {selectedItem.sarana_prasarana?.kode} • Jumlah: {selectedItem.jumlah} {selectedItem.sarana_prasarana?.satuan}
                </p>
                <p className="text-slate-500">Ruangan Tujuan: <strong>{selectedItem.ruangan_tujuan?.nama_ruangan}</strong></p>
                {selectedItem.catatan_pengiriman && (
                  <p className="text-[11px] text-blue-600 mt-1 italic">
                    Catatan Pengirim: "{selectedItem.catatan_pengiriman}"
                  </p>
                )}
              </div>

              {/* Keputusan Terima / Tolak */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Hasil Pemeriksaan Fisik di Bengkel *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAksi('terima')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      aksi === 'terima'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Terima Barang (ACC)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAksi('tolak')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      aksi === 'tolak'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    Tolak / Retur
                  </button>
                </div>
              </div>

              {aksi === 'terima' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kondisi Fisik Saat Tiba di Bengkel
                  </label>
                  <select
                    value={kondisiDiterima}
                    onChange={(e) => setKondisiDiterima(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    <option value="Baik">Baik (Normal &amp; Lengkap)</option>
                    <option value="Rusak Ringan">Rusak Ringan (Ada kendala minor)</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {aksi === 'terima' ? 'Catatan Berita Acara (BAST)' : 'Alasan Penolakan Barang *'}
                </label>
                <textarea
                  rows={3}
                  required={aksi === 'tolak'}
                  placeholder={aksi === 'terima' ? 'Misal: Barang berfungsi baik dan telah diletakkan di meja praktek 1...' : 'Misal: Kabel putus atau spesifikasi mesin tidak sesuai permohonan...'}
                  value={catatanPenerimaan}
                  onChange={(e) => setCatatanPenerimaan(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 ${
                    aksi === 'terima'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  }`}
                >
                  {submitting ? 'Menyimpan...' : aksi === 'terima' ? 'Terbitkan BAST & Terima' : 'Konfirmasi Tolak Barang'}
                </button>
              </div>
            </form>
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
                <span className="text-sm font-bold text-slate-800">Berita Acara Serah Terima (BAST)</span>
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

            {/* BAST Sheet */}
            <div className="p-8 overflow-y-auto text-slate-900">
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-6">
                <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-900">SMK PGRI TELAGASARI</h2>
                <h3 className="text-xs font-bold text-slate-700 uppercase">Bagian Pengelolaan Sarana &amp; Prasarana Sekolah</h3>
                <p className="text-[10px] text-slate-500">Jl. Syech Quro No. 12, Telagasari, Karawang, Jawa Barat</p>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-sm font-black uppercase underline tracking-wide">BERITA ACARA SERAH TERIMA ASET</h1>
                <p className="text-xs font-bold text-slate-700 mt-0.5">Nomor: {selectedBast.distribusi.nomor_bast || 'BAST-2026/09/0001'}</p>
                <p className="text-[10px] text-slate-500">Berdasarkan Surat Jalan: {selectedBast.distribusi.nomor_surat_jalan}</p>
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
