'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Map, Search, Plus, Edit2, Trash2, RefreshCw,
  MapPin, Layers, X, Save, AlertTriangle, Building2,
  Package, Eye, Info
} from 'lucide-react';
import Toast from '@/components/Toast';

/* ─────────────────────── Types ─────────────────────── */
interface Ruangan {
  id: number;
  id_gedung: number;
  nama_ruangan: string;
  kode_ruangan: string | null;
  lantai: number | null;
  luas_ruangan: number | null;
  deskripsi: string | null;
  foto_ruangan: string | null;
  asets_count?: number;
  gedung?: {
    id: number;
    nama_gedung: string;
    kode_gedung: string | null;
  };
  created_at?: string;
}

interface Gedung {
  id: number;
  nama_gedung: string;
  kode_gedung: string | null;
}

interface RuanganFormData {
  id_gedung: string;
  nama_ruangan: string;
  kode_ruangan: string;
  lantai: string;
  luas_ruangan: string;
  deskripsi: string;
}

/* ─────────────────────── Helpers ─────────────────────── */
const emptyForm = (): RuanganFormData => ({
  id_gedung: '',
  nama_ruangan: '',
  kode_ruangan: '',
  lantai: '',
  luas_ruangan: '',
  deskripsi: '',
});

const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

/* ══════════════════════ MAIN COMPONENT ══════════════════════ */
export default function RuanganWorkshopPage() {
  const [ruangans, setRuangans] = useState<Ruangan[]>([]);
  const [gedungs, setGedungs] = useState<Gedung[]>([]);
  const [filtered, setFiltered] = useState<Ruangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGedung, setSelectedGedung] = useState<string>('all');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Ruangan | null>(null);
  const [formData, setFormData] = useState<RuanganFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<Ruangan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailTarget, setDetailTarget] = useState<Ruangan | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, message, type });
  }, []);

  /* ── Fetch Data ── */
  const fetchRuangans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ruangans');
      setRuangans(res.data);
      setFiltered(res.data);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data ruangan', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchGedungs = useCallback(async () => {
    try {
      const res = await axios.get('/api/gedungs');
      setGedungs(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchRuangans();
    fetchGedungs();
  }, [fetchRuangans, fetchGedungs]);

  /* ── Filter & Search ── */
  useEffect(() => {
    let result = ruangans;
    
    // Filter by gedung
    if (selectedGedung !== 'all') {
      result = result.filter(r => r.id_gedung === parseInt(selectedGedung));
    }
    
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.nama_ruangan.toLowerCase().includes(q) ||
        r.kode_ruangan?.toLowerCase().includes(q) ||
        r.gedung?.nama_gedung.toLowerCase().includes(q) ||
        (r.lantai?.toString() ?? '').includes(q)
      );
    }
    
    setFiltered(result);
  }, [ruangans, searchQuery, selectedGedung]);

  /* ── CRUD Handlers ── */
  const openCreateModal = () => {
    setEditTarget(null);
    setFormData(emptyForm());
    setFoto(null);
    setFotoPreview(null);
    setShowModal(true);
  };

  const openEditModal = (ruangan: Ruangan) => {
    setEditTarget(ruangan);
    setFormData({
      id_gedung: String(ruangan.id_gedung),
      nama_ruangan: ruangan.nama_ruangan,
      kode_ruangan: ruangan.kode_ruangan ?? '',
      lantai: ruangan.lantai ? String(ruangan.lantai) : '',
      luas_ruangan: ruangan.luas_ruangan ? String(ruangan.luas_ruangan) : '',
      deskripsi: ruangan.deskripsi ?? '',
    });
    setFoto(null);
    setFotoPreview(ruangan.foto_ruangan ? getImageUrl(ruangan.foto_ruangan) : null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nama_ruangan.trim()) {
      showToast('Nama ruangan wajib diisi', 'error');
      return;
    }
    if (!formData.id_gedung) {
      showToast('Gedung wajib dipilih', 'error');
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('id_gedung', formData.id_gedung);
      fd.append('nama_ruangan', formData.nama_ruangan);
      if (formData.kode_ruangan) fd.append('kode_ruangan', formData.kode_ruangan);
      if (formData.lantai) fd.append('lantai', formData.lantai);
      if (formData.luas_ruangan) fd.append('luas_ruangan', formData.luas_ruangan);
      if (formData.deskripsi) fd.append('deskripsi', formData.deskripsi);
      if (foto) fd.append('foto_ruangan', foto);

      if (editTarget) {
        await axios.post(`/api/ruangans/${editTarget.id}?_method=PUT`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Ruangan workshop berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/ruangans', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Ruangan workshop baru berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      fetchRuangans();
    } catch (err) {
      showToast('Gagal menyimpan ruangan workshop', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/ruangans/${deleteTarget.id}`);
      showToast('Ruangan workshop berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchRuangans();
    } catch {
      showToast('Gagal menghapus ruangan workshop', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  /* ── Statistics ── */
  const totalRuangans = ruangans.length;
  const totalGedungs = gedungs.length;
  const totalAsets = ruangans.reduce((sum, r) => sum + (r.asets_count ?? 0), 0);

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="p-6 space-y-6">
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
        <div className="flex items-center justify-between relative z-10 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
              <Map className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Ruangan Workshop</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                  Data Master
                </span>
              </div>
              <p className="text-emerald-100 text-sm mt-1">Kelola data ruangan workshop dan lokasi aset di sekolah</p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="h-4 w-4 text-emerald-600" /> Tambah Ruangan
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Ruangan', value: totalRuangans, icon: Map, from: 'from-emerald-500', to: 'to-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900' },
          { label: 'Total Gedung', value: totalGedungs, icon: Building2, from: 'from-blue-500', to: 'to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
          { label: 'Total Aset', value: totalAsets, icon: Package, from: 'from-purple-500', to: 'to-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
        ].map(({ label, value, icon: Icon, from, to, bg, border, text }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-2 bg-gradient-to-br ${from} ${to} rounded-lg`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className={`text-[11px] font-semibold ${text} uppercase tracking-wide`}>{label}</p>
            </div>
            <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama ruangan, kode, gedung..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
          
          <select
            value={selectedGedung}
            onChange={e => setSelectedGedung(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 min-w-[200px]"
          >
            <option value="all">Semua Gedung</option>
            {gedungs.map(g => (
              <option key={g.id} value={g.id}>{g.nama_gedung}</option>
            ))}
          </select>

          <button
            onClick={fetchRuangans}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Ruangan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Kode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Gedung</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lantai</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Luas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Aset</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Memuat data...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Map className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-700 mb-1">
                      {searchQuery || selectedGedung !== 'all' ? 'Tidak Ada Hasil' : 'Belum Ada Ruangan'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {searchQuery || selectedGedung !== 'all' 
                        ? 'Coba ubah filter atau kata kunci pencarian'
                        : 'Tambahkan ruangan workshop pertama untuk memulai'
                      }
                    </p>
                    {!searchQuery && selectedGedung === 'all' && (
                      <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold"
                      >
                        <Plus className="h-4 w-4" /> Tambah Ruangan
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.foto_ruangan ? (
                          <img
                            src={getImageUrl(r.foto_ruangan)!}
                            alt={r.nama_ruangan}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                            <Map className="h-5 w-5 text-emerald-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{r.nama_ruangan}</p>
                          {r.deskripsi && (
                            <p className="text-xs text-slate-500 truncate max-w-xs">{r.deskripsi}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.kode_ruangan || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.gedung?.nama_gedung || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.lantai ? `Lantai ${r.lantai}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.luas_ruangan ? `${r.luas_ruangan} m²` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
                        <Package className="h-3 w-3" />
                        {r.asets_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailTarget(r)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Map className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  {editTarget ? 'Edit Ruangan Workshop' : 'Tambah Ruangan Workshop'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Gedung */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Gedung <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.id_gedung}
                  onChange={e => setFormData(f => ({ ...f, id_gedung: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                >
                  <option value="">Pilih Gedung</option>
                  {gedungs.map(g => (
                    <option key={g.id} value={g.id}>{g.nama_gedung}</option>
                  ))}
                </select>
              </div>

              {/* Nama Ruangan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Ruangan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama_ruangan}
                  onChange={e => setFormData(f => ({ ...f, nama_ruangan: e.target.value }))}
                  placeholder="e.g. Workshop Otomotif"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              {/* Kode & Lantai */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kode Ruangan</label>
                  <input
                    type="text"
                    value={formData.kode_ruangan}
                    onChange={e => setFormData(f => ({ ...f, kode_ruangan: e.target.value }))}
                    placeholder="e.g. WSP-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lantai</label>
                  <input
                    type="number"
                    value={formData.lantai}
                    onChange={e => setFormData(f => ({ ...f, lantai: e.target.value }))}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Luas Ruangan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Luas Ruangan (m²)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.luas_ruangan}
                  onChange={e => setFormData(f => ({ ...f, luas_ruangan: e.target.value }))}
                  placeholder="e.g. 48"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi</label>
                <textarea
                  value={formData.deskripsi}
                  onChange={e => setFormData(f => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Deskripsi ruangan workshop..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Foto Ruangan</label>
                {fotoPreview && (
                  <div className="mb-2">
                    <img src={fotoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-slate-200" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-4 flex gap-3 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Hapus Ruangan?</h3>
                  <p className="text-sm text-slate-600 mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Nama:</span> {deleteTarget.nama_ruangan}
                </p>
                {deleteTarget.asets_count! > 0 && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Ruangan ini memiliki {deleteTarget.asets_count} aset
                  </p>
                )}
              </div>
            </div>
            <div className="bg-slate-50 p-4 flex gap-3 border-t border-slate-200 rounded-b-2xl">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-white transition-colors text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Modal */}
      {detailTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Detail Ruangan Workshop</h2>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailTarget.foto_ruangan && (
                <img
                  src={getImageUrl(detailTarget.foto_ruangan)!}
                  alt={detailTarget.nama_ruangan}
                  className="w-full h-48 object-cover rounded-lg border border-slate-200"
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Nama Ruangan</p>
                  <p className="text-sm text-slate-800 font-semibold">{detailTarget.nama_ruangan}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Kode</p>
                  <p className="text-sm text-slate-800">{detailTarget.kode_ruangan || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Gedung</p>
                  <p className="text-sm text-slate-800">{detailTarget.gedung?.nama_gedung || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Lantai</p>
                  <p className="text-sm text-slate-800">{detailTarget.lantai ? `Lantai ${detailTarget.lantai}` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Luas Ruangan</p>
                  <p className="text-sm text-slate-800">{detailTarget.luas_ruangan ? `${detailTarget.luas_ruangan} m²` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Jumlah Aset</p>
                  <p className="text-sm text-slate-800 font-semibold">{detailTarget.asets_count ?? 0} item</p>
                </div>
              </div>

              {detailTarget.deskripsi && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Deskripsi</p>
                  <p className="text-sm text-slate-700">{detailTarget.deskripsi}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200">
              <button
                onClick={() => setDetailTarget(null)}
                className="w-full px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
