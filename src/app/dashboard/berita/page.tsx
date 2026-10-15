'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Newspaper, Plus, Search, Edit2, Trash2, Eye, EyeOff,
  Calendar, User, ExternalLink, RefreshCw, X, Loader2,
  Upload, Image as ImageIcon, CheckCircle2, AlertTriangle, Link as LinkIcon
} from 'lucide-react';
import Toast from '@/components/Toast';

interface BeritaItem {
  id: number;
  judul: string;
  slug?: string;
  ringkasan?: string | null;
  konten?: string | null;
  gambar?: string | null;
  gambar_url?: string | null;
  tanggal?: string | null;
  penulis: string;
  is_active: boolean;
  urutan?: number;
  created_at?: string;
  updated_at?: string;
}

interface FormData {
  judul: string;
  ringkasan: string;
  konten: string;
  tanggal: string;
  penulis: string;
  is_active: boolean;
  image_type: 'file' | 'url';
  gambar_url: string;
  foto_file: File | null;
}

const emptyForm = (defaultAuthor = 'Super Admin'): FormData => ({
  judul: '',
  ringkasan: '',
  konten: '',
  tanggal: new Date().toISOString().split('T')[0],
  penulis: defaultAuthor,
  is_active: true,
  image_type: 'url',
  gambar_url: '',
  foto_file: null,
});

function formatTanggalIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function KelolaBeritaPage() {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [beritas, setBeritas] = useState<BeritaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'hidden'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBerita, setEditingBerita] = useState<BeritaItem | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<BeritaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle Loading
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
  };

  // Fetch current user
  useEffect(() => {
    axios.get('/api/user')
      .then(res => setCurrentUser(res.data))
      .catch(() => {});
  }, []);

  // Fetch Berita
  const fetchBeritas = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get('/api/admin/beritas');
      const data = res.data?.data || [];
      setBeritas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching beritas:', err);
      showToast('Gagal memuat data berita.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBeritas();
  }, []);

  // Filtered Beritas
  const filtered = useMemo(() => {
    return beritas.filter(item => {
      // Filter status
      if (statusFilter === 'published' && !item.is_active) return false;
      if (statusFilter === 'hidden' && item.is_active) return false;

      // Filter search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.judul.toLowerCase().includes(q);
        const matchAuthor = (item.penulis || '').toLowerCase().includes(q);
        const matchSummary = (item.ringkasan || '').toLowerCase().includes(q);
        const matchContent = (item.konten || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchSummary && !matchContent) return false;
      }

      return true;
    });
  }, [beritas, statusFilter, search]);

  // Statistics
  const totalBerita = beritas.length;
  const totalPublished = beritas.filter(b => b.is_active).length;
  const totalHidden = beritas.filter(b => !b.is_active).length;

  // Open Modal Tambah
  const openAddModal = () => {
    setEditingBerita(null);
    const authorName = currentUser?.nama_lengkap || 'Super Admin';
    setFormData(emptyForm(authorName));
    setImagePreview('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const openEditModal = (item: BeritaItem) => {
    setEditingBerita(item);
    const imgUrl = item.gambar_url || item.gambar || '';
    setFormData({
      judul: item.judul,
      ringkasan: item.ringkasan || '',
      konten: item.konten || item.ringkasan || '',
      tanggal: item.tanggal ? item.tanggal.split('T')[0] : new Date().toISOString().split('T')[0],
      penulis: item.penulis || 'Super Admin',
      is_active: item.is_active,
      image_type: 'url',
      gambar_url: imgUrl,
      foto_file: null,
    });
    setImagePreview(imgUrl);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Handle Image File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file maksimal 5MB', 'warning');
        return;
      }
      setFormData(prev => ({ ...prev, foto_file: file, image_type: 'file' }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Form (Add / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.judul.trim()) {
      setFormErrors({ judul: 'Judul berita wajib diisi.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('judul', formData.judul);
      payload.append('ringkasan', formData.ringkasan);
      payload.append('konten', formData.konten || formData.ringkasan);
      payload.append('tanggal', formData.tanggal);
      payload.append('penulis', formData.penulis);
      payload.append('is_active', formData.is_active ? '1' : '0');

      if (formData.image_type === 'file' && formData.foto_file) {
        payload.append('foto', formData.foto_file);
      } else if (formData.gambar_url.trim()) {
        payload.append('gambar', formData.gambar_url.trim());
      }

      if (editingBerita) {
        // Menggunakan POST dengan endpoint update untuk menangani multipart
        await axios.post(`/api/beritas/${editingBerita.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Berita berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/beritas', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Berita baru berhasil ditambahkan', 'success');
      }

      setIsModalOpen(false);
      fetchBeritas();
    } catch (err: any) {
      console.error('Error saving berita:', err);
      const errors = err?.response?.data?.errors;
      if (errors) {
        const mappedErrors: Record<string, string> = {};
        Object.keys(errors).forEach(key => {
          mappedErrors[key] = errors[key][0];
        });
        setFormErrors(mappedErrors);
      } else {
        showToast(err?.response?.data?.message || 'Gagal menyimpan berita', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Hide / Show (Status)
  const handleToggleStatus = async (item: BeritaItem) => {
    setTogglingId(item.id);
    try {
      const res = await axios.patch(`/api/beritas/${item.id}/toggle-status`);
      const newStatus = res.data?.data?.is_active;
      setBeritas(prev => prev.map(b => b.id === item.id ? { ...b, is_active: newStatus } : b));
      showToast(
        newStatus ? `Berita "${item.judul}" kini ditampilkan di publik` : `Berita "${item.judul}" disembunyikan`,
        'success'
      );
    } catch {
      showToast('Gagal mengubah status berita', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Berita
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/beritas/${deleteTarget.id}`);
      showToast(`Berita "${deleteTarget.judul}" berhasil dihapus`, 'success');
      setBeritas(prev => prev.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      showToast('Gagal menghapus berita', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(t => ({ ...t, show: false }))}
        />
      )}

      {/* ════════ HEADER BANNER ════════ */}
      <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30 text-white shadow-inner">
              <Newspaper className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Kelola Berita &amp; Pengumuman
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-white/20 text-white rounded-full backdrop-blur-sm border border-white/20">
                  Super Admin
                </span>
              </div>
              <p className="text-blue-100 text-sm mt-1">
                Atur seluruh berita, artikel fasilitas, dan pengumuman yang tampil pada carousel halaman utama (publik)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchBeritas(true)}
              disabled={refreshing}
              className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-xl transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <a
              href="/#berita"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Lihat di Web Publik</span>
            </a>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Berita</span>
            </button>
          </div>
        </div>
      </div>

      {/* ════════ STATS CARDS ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Semua Berita</span>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalBerita}</p>
            <p className="text-xs text-slate-500 mt-0.5">Konten tersimpan di database</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Newspaper className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Tampil di Publik</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalPublished}</p>
            <p className="text-xs text-slate-500 mt-0.5">Aktif di carousel web publik</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Eye className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Disembunyikan (Hide)</span>
            <p className="text-2xl font-black text-amber-600 mt-1">{totalHidden}</p>
            <p className="text-xs text-slate-500 mt-0.5">Tidak tampil di web publik</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <EyeOff className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ════════ FILTER & SEARCH BAR ════════ */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul berita, penulis, atau ringkasan..."
            className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-700 cursor-pointer"
          >
            <option value="all">Semua Status ({beritas.length})</option>
            <option value="published">Hanya Tampil ({totalPublished})</option>
            <option value="hidden">Hanya Disembunyikan ({totalHidden})</option>
          </select>
        </div>
      </div>

      {/* ════════ DAFTAR BERITA TABLE ════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-indigo-600" />
            <span>Daftar Berita ({filtered.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            {search || statusFilter !== 'all' ? `Filter aktif (${filtered.length} dari ${beritas.length})` : 'Semua data'}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Memuat data berita...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Newspaper className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-600">Tidak ada berita yang ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? 'Coba ubah kata kunci pencarian Anda' : 'Silakan klik tombol "Tambah Berita" untuk menambahkan berita baru.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No</th>
                  <th className="px-4 py-3.5 w-32">Gambar</th>
                  <th className="px-4 py-3.5">Judul &amp; Ringkasan Berita</th>
                  <th className="px-4 py-3.5 w-44">Penulis &amp; Tanggal</th>
                  <th className="px-4 py-3.5 w-36 text-center">Status Publik</th>
                  <th className="px-4 py-3.5 w-36 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((item, index) => {
                  const imgUrl = item.gambar_url || item.gambar;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        !item.is_active ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center text-slate-400 text-xs font-mono">
                        {index + 1}
                      </td>

                      {/* Thumbnail Gambar */}
                      <td className="px-4 py-3.5">
                        <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm relative group-hover:scale-105 transition-transform">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={item.judul}
                              className="w-full h-full object-cover object-center"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Judul & Ringkasan */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-base line-clamp-1">
                          {item.judul}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.ringkasan || item.konten || 'Tidak ada deskripsi singkat.'}
                        </p>
                      </td>

                      {/* Penulis & Tanggal */}
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <User className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{item.penulis || 'Super Admin'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatTanggalIndo(item.tanggal)}</span>
                        </div>
                      </td>

                      {/* Status Hide/Show Badge */}
                      <td className="px-4 py-3.5 text-center">
                        {item.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                            <Eye className="h-3 w-3" /> Tampil
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                            <EyeOff className="h-3 w-3" /> Disembunyikan
                          </span>
                        )}
                      </td>

                      {/* Tombol Aksi */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Toggle Hide/Unhide */}
                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={togglingId === item.id}
                            className={`p-2 rounded-xl border transition-all ${
                              item.is_active
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={item.is_active ? 'Sembunyikan dari Publik' : 'Tampilkan ke Publik'}
                          >
                            {togglingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : item.is_active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl transition-all"
                            title="Edit Berita"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all"
                            title="Hapus Berita"
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

      {/* ════════ MODAL TAMBAH / EDIT BERITA ════════ */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Newspaper className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {editingBerita ? 'Edit Berita & Pengumuman' : 'Tambah Berita Baru'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingBerita ? 'Perbarui informasi dan publikasi berita' : 'Buat berita baru yang akan tampil di halaman utama'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Judul Berita */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Berita <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
                  placeholder="Contoh: Peresmian Laboratorium Komputer Baru"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-semibold"
                  required
                />
                {formErrors.judul && <p className="text-xs text-rose-500 mt-1">{formErrors.judul}</p>}
              </div>

              {/* Grid: Penulis & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Penulis / Instansi
                  </label>
                  <input
                    type="text"
                    value={formData.penulis}
                    onChange={(e) => setFormData(prev => ({ ...prev, penulis: e.target.value }))}
                    placeholder="Contoh: Kepala Sekolah / Tim Humas"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Publikasi
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>

              {/* Ringkasan Singkat (Muncul di Carousel Depan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ringkasan Singkat (Tampil pada Slide Carousel)
                </label>
                <textarea
                  value={formData.ringkasan}
                  onChange={(e) => setFormData(prev => ({ ...prev, ringkasan: e.target.value }))}
                  rows={2}
                  placeholder="Ringkasan 1-2 kalimat untuk menarik pembaca pada slide carousel depan..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none"
                />
              </div>

              {/* Konten Lengkap (Muncul saat Baca Selengkapnya) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konten Lengkap Berita (Baca Selengkapnya)
                </label>
                <textarea
                  value={formData.konten}
                  onChange={(e) => setFormData(prev => ({ ...prev, konten: e.target.value }))}
                  rows={4}
                  placeholder="Tuliskan isi berita atau pengumuman secara lengkap..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* Bagian Gambar Berita */}
              <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Gambar Berita
                  </label>
                  <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_type: 'url' }))}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        formData.image_type === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Input URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_type: 'file' }))}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        formData.image_type === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Upload File
                    </button>
                  </div>
                </div>

                {formData.image_type === 'url' ? (
                  <div>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="url"
                        value={formData.gambar_url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({ ...prev, gambar_url: val }));
                          setImagePreview(val);
                        }}
                        placeholder="https://images.unsplash.com/... atau URL gambar lainnya"
                        className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer bg-white transition-all group"
                    >
                      <Upload className="h-6 w-6 mx-auto text-slate-400 group-hover:text-indigo-600 transition-colors mb-1" />
                      <p className="text-xs font-semibold text-slate-700">
                        {formData.foto_file ? formData.foto_file.name : 'Klik untuk memilih file foto (JPG, PNG, WebP)'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Maksimal ukuran file 5MB</p>
                    </div>
                  </div>
                )}

                {/* Preview Gambar */}
                {imagePreview && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 h-36 bg-slate-900 group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setImagePreview('')}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview('');
                        setFormData(prev => ({ ...prev, gambar_url: '', foto_file: null }));
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                      title="Hapus Gambar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status Publikasi Switch (Hide / Publish) */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Status Tampil di Halaman Publik
                  </h4>
                  <p className="text-xs text-slate-500">
                    {formData.is_active
                      ? 'Berita ini AKTIF dan akan langsung tampil pada carousel halaman depan.'
                      : 'Berita ini DISEMBUNYIKAN (tidak akan muncul di halaman publik).'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingBerita ? 'Simpan Perubahan' : 'Terbitkan Berita'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ MODAL KONFIRMASI HAPUS ════════ */}
      {mounted && deleteTarget && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl my-auto animate-scaleUp space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Konfirmasi Hapus Berita</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus berita <strong className="text-slate-900">&quot;{deleteTarget.judul}&quot;</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Hapus Berita</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
