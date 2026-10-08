'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import Link from 'next/link';
import {
  SlidersHorizontal, Search, Plus, Edit2, Trash2,
  CheckCircle2, AlertTriangle, ShieldCheck, X, Save,
  RefreshCw, Info, Sparkles, Building2, Warehouse,
  Package, Wrench, ArrowUpRight, Filter, AlertOctagon,
  Flame, ExternalLink, HelpCircle, Printer, FileText
} from 'lucide-react';
import Toast from '@/components/Toast';

interface Kondisi {
  id: number;
  nama_kondisi: string;
  keterangan: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AsetRusakItem {
  id: number;
  tipe_sumber: 'gedung' | 'workshop' | 'sarana_prasarana';
  tipe_item?: 'sarana_prasarana' | 'aset';
  sumber_label: string;
  kode: string | null;
  nama_barang: string;
  merek: string | null;
  tipe: string | null;
  jumlah: number;
  satuan: string;
  kondisi: string;
  gedung: string;
  ruangan: string;
  lantai: string | null;
  lokasi_detail: string;
  kategori: string;
  foto_thumbnail: string | null;
  deskripsi: string | null;
  link_url: string;
}

interface SummaryRusak {
  total_rusak: number;
  rusak_ringan: number;
  rusak_berat: number;
  tidak_layak_pakai: number;
}

const DEFAULT_KONDISIS = [
  'Baik',
  'Cukup Baik',
  'Rusak Ringan',
  'Rusak Berat',
  'Tidak Layak Pakai',
];

const isDefaultKondisi = (nama: string): boolean => {
  return DEFAULT_KONDISIS.some(d => d.toLowerCase() === nama.trim().toLowerCase());
};

const getKondisiBadge = (nama: string) => {
  const n = nama.toLowerCase();
  if (n === 'baik') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (n === 'cukup baik') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (n === 'rusak ringan') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (n === 'rusak berat') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (n === 'tidak layak pakai') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (n.includes('rusak')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return `${baseUrl}${path}`;
};

export default function MasterKondisiPage() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'master'>('monitoring');

  // Master data kondisi
  const [kondisiList, setKondisiList] = useState<Kondisi[]>([]);
  const [loadingKondisi, setLoadingKondisi] = useState(true);
  const [searchKondisi, setSearchKondisi] = useState('');

  // Monitoring aset rusak
  const [rusakItems, setRusakItems] = useState<AsetRusakItem[]>([]);
  const [summaryRusak, setSummaryRusak] = useState<SummaryRusak>({
    total_rusak: 0,
    rusak_ringan: 0,
    rusak_berat: 0,
    tidak_layak_pakai: 0,
  });
  const [loadingRusak, setLoadingRusak] = useState(true);
  const [filterKerusakan, setFilterKerusakan] = useState<string>('all');
  const [filterLokasi, setFilterLokasi] = useState<string>('all');
  const [searchRusak, setSearchRusak] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Modal form master kondisi
  const [showModal, setShowModal] = useState(false);
  const [editingKondisi, setEditingKondisi] = useState<Kondisi | null>(null);
  const [formData, setFormData] = useState({ nama_kondisi: '', keterangan: '' });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Kondisi | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Teruskan ke Servis
  const [servisModalOpen, setServisModalOpen] = useState(false);
  const [servisTarget, setServisTarget] = useState<AsetRusakItem | null>(null);
  const [servisForm, setServisForm] = useState({
    jenis_perbaikan: '',
    tanggal_servis: new Date().toISOString().split('T')[0],
    biaya_servis: '',
    teknisi_bengkel: '',
    deskripsi_kerusakan: '',
    status: 'Proses' as 'Proses' | 'Selesai',
  });
  const [submittingServis, setSubmittingServis] = useState(false);

  // Modal Surat SPK Servis (Print Preview)
  const [showSuratModal, setShowSuratModal] = useState(false);
  const [suratData, setSuratData] = useState<{
    nomor_spk: string;
    tanggal_spk: string;
    nama_barang: string;
    kode: string | null;
    kondisi: string;
    lokasi_detail: string;
    jumlah: number;
    satuan: string;
    jenis_perbaikan: string;
    biaya_servis: number;
    biaya_formatted: string;
    teknisi: string | null;
    deskripsi: string | null;
  } | null>(null);

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const openServisModal = (item: AsetRusakItem) => {
    setServisTarget(item);
    setServisForm({
      jenis_perbaikan: `Perbaikan Kerusakan - ${item.nama_barang}`,
      tanggal_servis: new Date().toISOString().split('T')[0],
      biaya_servis: '',
      teknisi_bengkel: '',
      deskripsi_kerusakan: item.deskripsi || '',
      status: 'Proses',
    });
    setServisModalOpen(true);
  };

  const handleServisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servisTarget) return;

    if (!servisForm.jenis_perbaikan.trim()) {
      showToast('Jenis perbaikan wajib diisi', 'error');
      return;
    }
    if (!servisForm.biaya_servis || Number(servisForm.biaya_servis) < 0) {
      showToast('Biaya servis wajib diisi dengan benar', 'error');
      return;
    }

    try {
      setSubmittingServis(true);
      const tipeItem = servisTarget.tipe_item || (servisTarget.tipe_sumber === 'sarana_prasarana' ? 'sarana_prasarana' : 'aset');
      const payload: any = {
        jenis_perbaikan: servisForm.jenis_perbaikan,
        tanggal_servis: servisForm.tanggal_servis,
        biaya_servis: Number(servisForm.biaya_servis),
        teknisi_bengkel: servisForm.teknisi_bengkel.trim() || null,
        deskripsi_kerusakan: servisForm.deskripsi_kerusakan.trim() || null,
        status: servisForm.status,
      };

      if (tipeItem === 'aset') {
        payload.id_aset = servisTarget.id;
      } else {
        payload.sarana_prasarana_id = servisTarget.id;
      }

      await axios.post('/api/servises', payload);

      const generatedNomorSpk = `SPK/SRV/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;
      const biayaNumber = Number(servisForm.biaya_servis) || 0;

      const spkPayload = {
        nomor_spk: generatedNomorSpk,
        tanggal_spk: servisForm.tanggal_servis,
        nama_barang: servisTarget.nama_barang,
        kode: servisTarget.kode,
        kondisi: servisTarget.kondisi,
        lokasi_detail: servisTarget.lokasi_detail,
        jumlah: servisTarget.jumlah,
        satuan: servisTarget.satuan,
        jenis_perbaikan: servisForm.jenis_perbaikan,
        biaya_servis: biayaNumber,
        biaya_formatted: formatRupiah(biayaNumber),
        teknisi: servisForm.teknisi_bengkel.trim() || null,
        deskripsi: servisForm.deskripsi_kerusakan.trim() || null,
      };

      setSuratData(spkPayload);
      setServisModalOpen(false);
      setShowSuratModal(true);
      showToast('Berhasil diteruskan ke servis! Surat SPK siap dicetak.', 'success');

      // Refresh data
      fetchAsetRusak();
    } catch (err: any) {
      console.error('Error forwarding to servis:', err);
      const msg = err.response?.data?.message || 'Gagal meneruskan ke servis';
      showToast(msg, 'error');
    } finally {
      setSubmittingServis(false);
    }
  };

  const handlePrint = () => {
    if (!suratData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Gagal membuka jendela cetak. Pastikan pop-up diizinkan di browser Anda.', 'error');
      return;
    }

    const tglFormatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(suratData.tanggal_spk));

    const content = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Surat Perintah Kerja (SPK) Servis - ${suratData.nomor_spk}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #111;
            margin: 0;
            padding: 15px;
            line-height: 1.4;
            font-size: 13px;
            background: #fff;
          }
          .kop-surat {
            text-align: center;
            border-bottom: 3px double #111;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }
          .kop-surat h3 {
            margin: 0;
            font-size: 13px;
            font-weight: normal;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .kop-surat h2 {
            margin: 3px 0;
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .kop-surat h1 {
            margin: 3px 0;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .kop-surat p {
            margin: 2px 0;
            font-size: 11px;
            color: #333;
          }
          .judul-surat {
            text-align: center;
            margin: 15px 0 20px 0;
          }
          .judul-surat h4 {
            margin: 0;
            font-size: 15px;
            font-weight: bold;
            text-decoration: underline;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .judul-surat p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #222;
          }
          .intro-p {
            margin: 12px 0;
            text-align: justify;
            font-size: 12.5px;
          }
          .table-info {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 15px 0;
          }
          .table-info td {
            padding: 5px 4px;
            vertical-align: top;
            font-size: 12.5px;
          }
          .table-info td.lbl {
            width: 28%;
            font-weight: bold;
          }
          .table-info td.col {
            width: 3%;
            text-align: center;
          }
          .table-biaya {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0 20px 0;
          }
          .table-biaya th, .table-biaya td {
            border: 1px solid #111;
            padding: 8px 10px;
            font-size: 12px;
          }
          .table-biaya th {
            background-color: #f2f2f2;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
          }
          .catatan-box {
            font-size: 11px;
            color: #444;
            margin: 15px 0;
            font-style: italic;
          }
          .signatures {
            width: 100%;
            margin-top: 35px;
            page-break-inside: avoid;
            border-collapse: collapse;
          }
          .signatures td {
            text-align: center;
            vertical-align: top;
            width: 33.33%;
            padding: 0 8px;
            font-size: 12px;
          }
          .sign-space {
            height: 70px;
          }
          .sign-name {
            font-weight: bold;
            text-decoration: underline;
            margin: 0;
          }
          .sign-nip {
            font-size: 10.5px;
            color: #555;
            margin: 2px 0 0 0;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="kop-surat">
          <h3>PEMERINTAH DAERAH PROVINSI JAWA BARAT</h3>
          <h2>DINAS PENDIDIKAN</h2>
          <h1>SMK NEGERI 1 INVENTARIS SISTEM</h1>
          <p>Jl. Pendidikan No. 45, Telp: (021) 87654321 | Email: sarpras@smkn1-inventaris.sch.id</p>
        </div>

        <div class="judul-surat">
          <h4>SURAT PERINTAH KERJA (SPK) SERVIS & PERBAIKAN ASET</h4>
          <p>Nomor: <strong>${suratData.nomor_spk}</strong></p>
        </div>

        <p class="intro-p">
          Berdasarkan hasil laporan monitoring kondisi aset rusak, melalui surat ini Administrator Sarana & Prasarana memberikan instruksi pelaksanaan servis / perbaikan peralatan inventaris sebagai berikut:
        </p>

        <table class="table-info">
          <tr>
            <td class="lbl">Nama Barang / Aset</td>
            <td class="col">:</td>
            <td><strong>${suratData.nama_barang}</strong></td>
          </tr>
          <tr>
            <td class="lbl">Kode / Register Aset</td>
            <td class="col">:</td>
            <td>${suratData.kode || '-'}</td>
          </tr>
          <tr>
            <td class="lbl">Unit / Lokasi Aset</td>
            <td class="col">:</td>
            <td>${suratData.lokasi_detail}</td>
          </tr>
          <tr>
            <td class="lbl">Kondisi Kerusakan</td>
            <td class="col">:</td>
            <td><strong>${suratData.kondisi}</strong></td>
          </tr>
          <tr>
            <td class="lbl">Jumlah Volume</td>
            <td class="col">:</td>
            <td>${suratData.jumlah} ${suratData.satuan}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal SPK</td>
            <td class="col">:</td>
            <td>${tglFormatted}</td>
          </tr>
          <tr>
            <td class="lbl">Pihak Rekanan / Teknisi</td>
            <td class="col">:</td>
            <td><strong>${suratData.teknisi || 'Teknisi / Rekanan Eksternal'}</strong></td>
          </tr>
        </table>

        <div style="font-weight: bold; font-size: 12.5px; margin-top: 15px; margin-bottom: 6px;">
          Rincian Tindakan Servis & Estimasi Biaya:
        </div>

        <table class="table-biaya">
          <thead>
            <tr>
              <th style="width: 6%;">No</th>
              <th style="width: 44%;">Uraian Jenis Perbaikan / Servis</th>
              <th style="width: 25%;">Catatan Kerusakan</th>
              <th style="width: 25%;">Biaya Servis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td><strong>${suratData.jenis_perbaikan}</strong></td>
              <td>${suratData.deskripsi || 'Sesuai instruksi teknis kerusakan'}</td>
              <td style="text-align: right; font-weight: bold;">${suratData.biaya_formatted}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right; font-weight: bold; background-color: #f7f7f7;">
                TOTAL BIAYA SERVIS
              </td>
              <td style="text-align: right; font-weight: bold; font-size: 13px; background-color: #f7f7f7;">
                ${suratData.biaya_formatted}
              </td>
            </tr>
          </tbody>
        </table>

        <p class="catatan-box">
          * Catatan: Surat Perintah Kerja ini berfungsi sebagai dokumen resmi instruksi perbaikan dan acuan verifikasi Berita Acara Penyelesaian Servis serta realisasi anggaran pemeliharaan sarana prasarana.
        </p>

        <table class="signatures">
          <tr>
            <td>
              <p style="margin: 0 0 4px 0;">Mengetahui,<br>Kepala Sekolah / KPA</p>
              <div class="sign-space"></div>
              <p class="sign-name">( ........................................ )</p>
              <p class="sign-nip">NIP. ........................................</p>
            </td>
            <td>
              <p style="margin: 0 0 4px 0;">Pelaksana Servis / Bengkel,<br>Teknisi Rekanan</p>
              <div class="sign-space"></div>
              <p class="sign-name">${suratData.teknisi ? `( ${suratData.teknisi} )` : '( ........................................ )'}</p>
              <p class="sign-nip">Tanda Tangan & Cap Bengkel</p>
            </td>
            <td>
              <p style="margin: 0 0 4px 0;">Penanggung Jawab Sarpras,<br>Administrator Inventaris</p>
              <div class="sign-space"></div>
              <p class="sign-name">( ........................................ )</p>
              <p class="sign-nip">NIP. ........................................</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
  }, []);

  /* ── Fetch Master Kondisi ── */
  const fetchKondisis = useCallback(async () => {
    try {
      setLoadingKondisi(true);
      const res = await axios.get('/api/kondisis');
      setKondisiList(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Gagal memuat master data kondisi', 'error');
    } finally {
      setLoadingKondisi(false);
    }
  }, [showToast]);

  /* ── Fetch Aset Rusak & Filter ── */
  const fetchAsetRusak = useCallback(async () => {
    try {
      setLoadingRusak(true);
      const res = await axios.get('/api/kondisis/aset-rusak', {
        params: {
          kondisi: filterKerusakan,
          lokasi: filterLokasi,
          search: searchRusak,
        },
      });
      if (res.data?.status === 'success') {
        setRusakItems(res.data.data || []);
        if (res.data.summary) {
          setSummaryRusak(res.data.summary);
        }
      }
    } catch {
      showToast('Gagal memuat data aset rusak', 'error');
    } finally {
      setLoadingRusak(false);
    }
  }, [filterKerusakan, filterLokasi, searchRusak, showToast]);

  useEffect(() => {
    fetchKondisis();
  }, [fetchKondisis]);

  useEffect(() => {
    fetchAsetRusak();
  }, [fetchAsetRusak]);

  const openCreateModal = () => {
    setEditingKondisi(null);
    setFormData({ nama_kondisi: '', keterangan: '' });
    setShowModal(true);
  };

  const openEditModal = (k: Kondisi) => {
    setEditingKondisi(k);
    setFormData({
      nama_kondisi: k.nama_kondisi,
      keterangan: k.keterangan || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kondisi.trim()) {
      showToast('Nama kondisi wajib diisi', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingKondisi) {
        await axios.put(`/api/kondisis/${editingKondisi.id}`, formData);
        showToast(`Kondisi "${formData.nama_kondisi}" berhasil diperbarui`, 'success');
      } else {
        await axios.post('/api/kondisis', formData);
        showToast(`Kondisi "${formData.nama_kondisi}" berhasil ditambahkan`, 'success');
      }
      setShowModal(false);
      fetchKondisis();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message || 'Gagal menyimpan data kondisi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (isDefaultKondisi(deleteTarget.nama_kondisi)) {
      showToast('Kondisi bawaan sistem tidak dapat dihapus', 'warning');
      setDeleteTarget(null);
      return;
    }

    try {
      setDeleting(true);
      await axios.delete(`/api/kondisis/${deleteTarget.id}`);
      showToast(`Kondisi "${deleteTarget.nama_kondisi}" berhasil dihapus`, 'success');
      setDeleteTarget(null);
      fetchKondisis();
    } catch {
      showToast('Gagal menghapus kondisi', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredKondisi = kondisiList.filter(k =>
    k.nama_kondisi.toLowerCase().includes(searchKondisi.toLowerCase()) ||
    (k.keterangan && k.keterangan.toLowerCase().includes(searchKondisi.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-indigo-100 mb-1 border border-white/20">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Kondisi &amp; Pemantauan Aset</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Kondisi &amp; Aset Rusak</h1>
          <p className="text-sm text-indigo-100 max-w-xl">
            Pantau seluruh inventaris yang mengalami kerusakan (Ringan, Berat, Tidak Layak Pakai) beserta rincian asal lokasi (Gedung, Ruangan, Workshop, Sarana Prasarana).
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'monitoring') fetchAsetRusak();
              else fetchKondisis();
            }}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all shadow-sm flex items-center gap-2 text-xs font-semibold"
            title="Muat Ulang"
          >
            <RefreshCw className={`h-4 w-4 ${(loadingKondisi || loadingRusak) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
          {activeTab === 'master' && (
            <button
              onClick={openCreateModal}
              className="px-5 py-3 bg-white text-indigo-600 font-bold rounded-2xl shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Tambah Kondisi
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2.5 ${
            activeTab === 'monitoring'
              ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-200'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className={`h-4 w-4 ${activeTab === 'monitoring' ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>Monitoring Aset Rusak</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
            activeTab === 'monitoring' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {summaryRusak.total_rusak}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('master')}
          className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2.5 ${
            activeTab === 'master'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className={`h-4 w-4 ${activeTab === 'master' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Master Kondisi Aset</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
            activeTab === 'master' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {kondisiList.length}
          </span>
        </button>
      </div>

      {/* ════════ TAB 1: MONITORING ASET RUSAK ════════ */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Rusak */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-rose-100 text-rose-600 rounded-2xl">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Rusak</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">{summaryRusak.total_rusak}</span>
                  <span className="text-xs font-semibold text-rose-600">Unit Barang</span>
                </div>
              </div>
            </div>

            {/* Rusak Ringan */}
            <div
              onClick={() => setFilterKerusakan(filterKerusakan === 'Rusak Ringan' ? 'all' : 'Rusak Ringan')}
              className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
                filterKerusakan === 'Rusak Ringan' ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/30' : 'border-slate-200/80 hover:border-amber-300'
              }`}
            >
              <div className="p-3.5 bg-amber-100 text-amber-600 rounded-2xl">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rusak Ringan</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-amber-700">{summaryRusak.rusak_ringan}</span>
                  <span className="text-xs text-slate-400">Dapat diservis</span>
                </div>
              </div>
            </div>

            {/* Rusak Berat */}
            <div
              onClick={() => setFilterKerusakan(filterKerusakan === 'Rusak Berat' ? 'all' : 'Rusak Berat')}
              className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
                filterKerusakan === 'Rusak Berat' ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/30' : 'border-slate-200/80 hover:border-rose-300'
              }`}
            >
              <div className="p-3.5 bg-rose-100 text-rose-600 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rusak Berat</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-rose-700">{summaryRusak.rusak_berat}</span>
                  <span className="text-xs text-slate-400">Perbaikan berat</span>
                </div>
              </div>
            </div>

            {/* Tidak Layak Pakai */}
            <div
              onClick={() => setFilterKerusakan(filterKerusakan === 'Tidak Layak Pakai' ? 'all' : 'Tidak Layak Pakai')}
              className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
                filterKerusakan === 'Tidak Layak Pakai' ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/30' : 'border-slate-200/80 hover:border-purple-300'
              }`}
            >
              <div className="p-3.5 bg-purple-100 text-purple-600 rounded-2xl">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tidak Layak Pakai</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-purple-700">{summaryRusak.tidak_layak_pakai}</span>
                  <span className="text-xs text-slate-400">Siap dihapuskan</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchRusak}
                onChange={e => setSearchRusak(e.target.value)}
                placeholder="Cari nama barang, kode, gedung, atau ruangan..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-slate-50/50"
              />
              {searchRusak && (
                <button onClick={() => setSearchRusak('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
              {/* Filter Kerusakan */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={filterKerusakan}
                  onChange={e => setFilterKerusakan(e.target.value)}
                  className="w-full sm:w-44 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-700 cursor-pointer"
                >
                  <option value="all">Semua Kerusakan</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                  <option value="Tidak Layak Pakai">Tidak Layak Pakai</option>
                </select>
              </div>

              {/* Filter Asal Lokasi */}
              <select
                value={filterLokasi}
                onChange={e => setFilterLokasi(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Asal Lokasi</option>
                <option value="gedung">🏢 Gedung &amp; Ruangan</option>
                <option value="workshop">🔧 Ruangan Workshop</option>
                <option value="sarana_prasarana">📦 Sarana &amp; Prasarana</option>
              </select>
            </div>
          </div>

          {/* Table Aset Rusak */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Daftar Barang Rusak &amp; Asal Lokasinya
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {rusakItems.length} item terdaftar dalam kondisi bermasalah
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loadingRusak ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-rose-600" />
                  <p className="text-sm font-medium">Memuat data barang rusak...</p>
                </div>
              ) : rusakItems.length === 0 ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-800">Tidak Ada Barang Rusak Ditemukan</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {searchRusak || filterKerusakan !== 'all' || filterLokasi !== 'all'
                        ? 'Tidak ada barang rusak yang cocok dengan filter atau kata kunci pencarian saat ini.'
                        : 'Luar biasa! Seluruh aset gedung, ruangan workshop, dan sarana prasarana saat ini berada dalam kondisi baik.'}
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 w-12 text-center">No</th>
                      <th className="px-5 py-3.5">Barang &amp; Kode</th>
                      <th className="px-5 py-3.5 text-center">Kategori Kerusakan</th>
                      <th className="px-5 py-3.5">Asal Barang (Lokasi)</th>
                      <th className="px-5 py-3.5 text-center">Jumlah</th>
                      <th className="px-5 py-3.5">Deskripsi / Keterangan</th>
                      <th className="px-5 py-3.5 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rusakItems.map((item, idx) => (
                      <tr key={`${item.tipe_sumber}-${item.id}`} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-5 py-3.5 text-center text-xs text-slate-400 font-semibold">{idx + 1}</td>

                        {/* Info Barang */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-start gap-3">
                            {item.foto_thumbnail ? (
                              <img
                                src={getImageUrl(item.foto_thumbnail)!}
                                alt={item.nama_barang}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 border border-slate-200">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {item.nama_barang}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.kode && (
                                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {item.kode}
                                  </span>
                                )}
                                {(item.merek || item.tipe) && (
                                  <span className="text-xs text-slate-400">
                                    {item.merek} {item.tipe ? `/ ${item.tipe}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Kategori Kerusakan */}
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getKondisiBadge(item.kondisi)}`}>
                            {item.kondisi}
                          </span>
                        </td>

                        {/* Asal Barang (Lokasi: Gedung, Ruangan, Workshop, Sarana Prasarana) */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            {item.tipe_sumber === 'workshop' ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Warehouse className="h-3 w-3 text-amber-600" /> Workshop: {item.ruangan}
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {item.gedung} {item.lantai ? `· ${item.lantai}` : ''}
                                </p>
                              </div>
                            ) : item.tipe_sumber === 'gedung' ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <Building2 className="h-3 w-3 text-blue-600" /> Gedung: {item.gedung}
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Ruangan: <strong>{item.ruangan}</strong> {item.lantai ? `(${item.lantai})` : ''}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Package className="h-3 w-3 text-emerald-600" /> Sarana &amp; Prasarana
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {item.ruangan}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Jumlah */}
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-bold text-slate-900">{item.jumlah}</span>
                          <span className="text-xs text-slate-400 ml-1">{item.satuan}</span>
                        </td>

                        {/* Keterangan */}
                        <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs">
                          {item.deskripsi ? (
                            <div className="line-clamp-2" title={item.deskripsi}>
                              {item.deskripsi}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Tidak ada catatan kerusakan</span>
                          )}
                        </td>

                        {/* Aksi: Teruskan ke Servis */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openServisModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border border-amber-300 rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                            title="Teruskan aset rusak ini ke bagian servis untuk perbaikan & buat SPK"
                          >
                            <Wrench className="h-3.5 w-3.5 text-amber-600" />
                            <span>Teruskan ke Servis</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB 2: MASTER KONDISI ASET ════════ */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          {/* Info Banner: Kondisi Bawaan Sistem */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4.5 sm:p-5 shadow-sm flex items-start gap-4">
            <div className="p-2.5 bg-blue-100 rounded-xl flex-shrink-0 text-blue-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-blue-950 flex items-center gap-2">
                Kondisi Bawaan Sistem (Standar)
                <span className="text-[11px] font-semibold bg-blue-200/80 text-blue-800 px-2 py-0.5 rounded-full">
                  5 Terproteksi
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                Sistem menyediakan 5 kondisi standar baku: <strong>Baik, Cukup Baik, Rusak Ringan, Rusak Berat, Tidak Layak Pakai</strong>.
                Kondisi standar ini selalu tersedia di form pengisian Aset Gedung, Workshop, dan Sarana Prasarana serta tidak dapat dihapus demi konsistensi data.
              </p>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchKondisi}
                onChange={e => setSearchKondisi(e.target.value)}
                placeholder="Cari nama kondisi atau keterangan..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
              />
              {searchKondisi && (
                <button onClick={() => setSearchKondisi('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total <strong>{kondisiList.length}</strong> Kondisi ({DEFAULT_KONDISIS.length} Standar, {Math.max(0, kondisiList.length - DEFAULT_KONDISIS.length)} Custom)
            </div>
          </div>

          {/* Main Table Master Kondisi */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loadingKondisi ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-medium">Memuat data master kondisi...</p>
                </div>
              ) : filteredKondisi.length === 0 ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <SlidersHorizontal className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-slate-600">Tidak ada kondisi ditemukan</p>
                  <p className="text-xs text-slate-400">Silakan sesuaikan kata kunci pencarian atau tambah kondisi baru.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 w-16">No</th>
                      <th className="px-6 py-4">Nama Kondisi</th>
                      <th className="px-6 py-4">Tipe Kondisi</th>
                      <th className="px-6 py-4">Keterangan</th>
                      <th className="px-6 py-4 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredKondisi.map((k, idx) => {
                      const isDefault = isDefaultKondisi(k.nama_kondisi);
                      return (
                        <tr key={k.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 text-xs font-semibold text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getKondisiBadge(k.nama_kondisi)}`}>
                                {k.nama_kondisi}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {isDefault ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Standar Sistem
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
                                <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Custom
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-xs max-w-md">
                            {k.keterangan || <span className="text-slate-400 italic">Tidak ada keterangan</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(k)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Edit Kondisi"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => !isDefault && setDeleteTarget(k)}
                                disabled={isDefault}
                                className={`p-2 rounded-xl transition-colors ${
                                  isDefault
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-rose-600 hover:bg-rose-50'
                                }`}
                                title={isDefault ? 'Kondisi bawaan sistem tidak dapat dihapus' : 'Hapus Kondisi'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah / Edit Master Kondisi */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingKondisi ? 'Edit Kondisi Aset' : 'Tambah Kondisi Baru'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kondisi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama_kondisi}
                  onChange={e => setFormData(f => ({ ...f, nama_kondisi: e.target.value }))}
                  placeholder="Contoh: Sangat Baik, Rusak Total..."
                  required
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Definisi
                </label>
                <textarea
                  rows={3}
                  value={formData.keterangan}
                  onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Deskripsi kondisi aset dan panduan penggunaannya..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {editingKondisi && isDefaultKondisi(editingKondisi.nama_kondisi) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                  <Info className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
                  <span>Ini adalah kondisi standar bawaan sistem. Anda dapat memperbarui keterangannya bila diperlukan.</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hapus Kondisi?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus kondisi <strong className="text-slate-800 font-semibold">{deleteTarget.nama_kondisi}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-md shadow-rose-600/20"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL: TERUSKAN KE SERVIS ════════ */}
      {servisModalOpen && servisTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Teruskan ke Servis</h3>
                  <p className="text-xs text-slate-500">Buat instruksi perbaikan & cetak Surat Perintah Kerja (SPK)</p>
                </div>
              </div>
              <button
                onClick={() => setServisModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleServisSubmit} className="overflow-y-auto p-6 space-y-4">
              {/* Asset Highlight Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Barang / Aset yang Diservis</span>
                    <h4 className="font-bold text-slate-900 text-sm">{servisTarget.nama_barang}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{servisTarget.kode || 'Tanpa Kode Register'}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${getKondisiBadge(servisTarget.kondisi)}`}>
                    {servisTarget.kondisi}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Lokasi: </span>
                    <strong className="text-slate-700">{servisTarget.lokasi_detail}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Volume: </span>
                    <strong className="text-slate-700">{servisTarget.jumlah} {servisTarget.satuan}</strong>
                  </div>
                </div>
              </div>

              {/* Jenis Perbaikan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Perbaikan / Tindakan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penggantian sparepart mesin, perbaikan motherboard..."
                  value={servisForm.jenis_perbaikan}
                  onChange={(e) => setServisForm({ ...servisForm, jenis_perbaikan: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                />
              </div>

              {/* Tanggal & Biaya */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Servis / Pengajuan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={servisForm.tanggal_servis}
                    onChange={(e) => setServisForm({ ...servisForm, tanggal_servis: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estimasi Biaya Servis (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    placeholder="0"
                    value={servisForm.biaya_servis}
                    onChange={(e) => setServisForm({ ...servisForm, biaya_servis: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-semibold"
                  />
                  {servisForm.biaya_servis && (
                    <p className="text-[11px] text-amber-700 font-bold mt-1">
                      {formatRupiah(servisForm.biaya_servis)}
                    </p>
                  )}
                </div>
              </div>

              {/* Teknisi / Bengkel & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teknisi / Bengkel Rekanan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: CV Jaya Teknik / Teknisi Sarpras"
                    value={servisForm.teknisi_bengkel}
                    onChange={(e) => setServisForm({ ...servisForm, teknisi_bengkel: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Pengerjaan
                  </label>
                  <select
                    value={servisForm.status}
                    onChange={(e) => setServisForm({ ...servisForm, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 bg-white"
                  >
                    <option value="Proses">Sedang Diproses (Proses)</option>
                    <option value="Selesai">Langsung Selesai</option>
                  </select>
                </div>
              </div>

              {/* Deskripsi Kerusakan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Rincian Kerusakan
                </label>
                <textarea
                  rows={3}
                  placeholder="Rincian kerusakan atau catatan untuk teknisi..."
                  value={servisForm.deskripsi_kerusakan}
                  onChange={(e) => setServisForm({ ...servisForm, deskripsi_kerusakan: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setServisModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingServis}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Wrench className="h-4 w-4" />
                  <span>{submittingServis ? 'Memproses...' : 'Teruskan & Buat SPK'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ MODAL: SURAT SPK SERVIS PREVIEW ════════ */}
      {showSuratModal && suratData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Surat Perintah Kerja (SPK) Servis</h3>
                  <p className="text-xs text-slate-500">Nomor: {suratData.nomor_spk}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSuratModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Document Body Preview */}
            <div className="overflow-y-auto p-6 space-y-5 bg-slate-50/50">
              {/* Paper Preview */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-slate-800 text-xs space-y-4 font-serif">
                {/* Kop */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-0.5">
                  <p className="text-[11px] font-sans tracking-wider text-slate-600 uppercase">PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
                  <p className="text-xs font-sans font-bold text-slate-700 uppercase">DINAS PENDIDIKAN</p>
                  <h2 className="text-base font-sans font-extrabold text-slate-900 tracking-wide uppercase">SMK NEGERI 1 INVENTARIS SISTEM</h2>
                  <p className="text-[10px] font-sans text-slate-500">Jl. Pendidikan No. 45, Telp: (021) 87654321 | sarpras@smkn1-inventaris.sch.id</p>
                </div>

                {/* Judul & Nomor */}
                <div className="text-center pt-2">
                  <h3 className="font-bold text-sm tracking-wide text-slate-900 underline uppercase">
                    SURAT PERINTAH KERJA (SPK) SERVIS & PERBAIKAN ASET
                  </h3>
                  <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                    Nomor: <span className="font-semibold">{suratData.nomor_spk}</span>
                  </p>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-700">
                  Diberikan perintah kerja pelaksanaan servis dan perbaikan aset inventaris sarana prasarana sekolah dengan rincian teknis sebagai berikut:
                </p>

                {/* Info Rincian */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 font-sans">
                  <div>
                    <span className="text-slate-500">Nama Aset:</span>
                    <p className="font-bold text-slate-900">{suratData.nama_barang}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Kode / Register:</span>
                    <p className="font-mono font-bold text-slate-900">{suratData.kode || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Lokasi Penempatan:</span>
                    <p className="font-semibold text-slate-800">{suratData.lokasi_detail}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Kondisi Kerusakan:</span>
                    <p className="font-bold text-rose-700">{suratData.kondisi}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Volume:</span>
                    <p className="font-bold text-slate-900">{suratData.jumlah} {suratData.satuan}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Teknisi / Rekanan:</span>
                    <p className="font-bold text-slate-900">{suratData.teknisi || 'Teknisi Rekanan'}</p>
                  </div>
                </div>

                {/* Tabel Biaya */}
                <div className="pt-2 font-sans">
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left">Jenis Tindakan / Perbaikan</th>
                          <th className="px-3 py-2 text-left">Catatan Kerusakan</th>
                          <th className="px-3 py-2 text-right">Biaya Servis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{suratData.jenis_perbaikan}</td>
                          <td className="px-3 py-2.5 text-slate-600">{suratData.deskripsi || '-'}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{suratData.biaya_formatted}</td>
                        </tr>
                        <tr className="bg-slate-50/70 font-bold">
                          <td colSpan={2} className="px-3 py-2 text-right text-slate-700 uppercase text-[10px]">Total Estimasi Biaya</td>
                          <td className="px-3 py-2 text-right text-slate-900 text-xs">{suratData.biaya_formatted}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tanda Tangan Preview */}
                <div className="pt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-sans text-slate-700 border-t border-slate-200/60">
                  <div>
                    <p className="font-semibold">Mengetahui,<br />Kepala Sekolah</p>
                    <div className="h-12"></div>
                    <p className="font-bold underline text-slate-900">( ........................................ )</p>
                  </div>
                  <div>
                    <p className="font-semibold">Pelaksana Teknis,<br />Teknisi / Bengkel</p>
                    <div className="h-12"></div>
                    <p className="font-bold underline text-slate-900">
                      {suratData.teknisi ? `( ${suratData.teknisi} )` : '( ........................................ )'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Pengelola Sarpras,<br />Administrator</p>
                    <div className="h-12"></div>
                    <p className="font-bold underline text-slate-900">( ........................................ )</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
              <Link
                href="/petugas-input/servis"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Buka Menu Servis</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSuratModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak Surat SPK (Print)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
