'use client';

import { useState, useEffect, useRef } from 'react';
import axios from '@/lib/axios';
import {
  Globe, School, Target, Eye, Image as ImageIcon, MapPin,
  Upload, Trash2, Plus, ExternalLink, Save, RefreshCw, RotateCcw,
  Phone, Mail, CheckCircle2, AlertCircle, Info, Sparkles,
  Layers, Map, ArrowRight, X
} from 'lucide-react';
import Toast from '@/components/Toast';

interface FasilitasItem {
  url: string;
  caption: string;
}

interface SiteSettingsForm {
  sekolah_nama: string;
  sekolah_tagline: string;
  sekolah_deskripsi1: string;
  sekolah_deskripsi2: string;
  sekolah_tahun_berdiri: string;
  sekolah_hero_foto: string;
  visi: string;
  misi: string;
  fasilitas_foto: FasilitasItem[];
  kontak_alamat: string;
  kontak_telepon: string;
  kontak_email: string;
  maps_embed_url: string;
}

const defaultSettings: SiteSettingsForm = {
  sekolah_nama: 'SMK PGRI Telagasari',
  sekolah_tagline: 'Pusat Keunggulan Vokasi, Menyiapkan Generasi Siap Kerja & Berakhlak Mulia',
  sekolah_deskripsi1: 'SMK PGRI Telagasari berkomitmen untuk terus berinovasi dalam memberikan pendidikan kejuruan yang relevan dengan perkembangan industri dan teknologi modern.',
  sekolah_deskripsi2: 'Didukung sarana prasarana modern, tenaga pendidik berkompeten, dan kerja sama industri terpercaya untuk memastikan lulusan siap bersaing secara global.',
  sekolah_tahun_berdiri: '1999',
  sekolah_hero_foto: '',
  visi: 'Menjadi SMK unggulan yang menghasilkan lulusan berkompeten, berkarakter, mandiri, dan berdaya saing global.',
  misi: '1. Menyelenggarakan proses pembelajaran berbasis industri.\n2. Mengembangkan sarana dan prasarana yang mutakhir.\n3. Membina budi pekerti luhur dan profesionalisme.\n4. Memperluas jejaring kerja sama dengan dunia usaha dan industri.',
  fasilitas_foto: [
    { url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800', caption: 'Gedung & Area Belajar Modern' },
    { url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800', caption: 'Laboratorium & Workshop Praktik' },
    { url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', caption: 'Lingkungan Sekolah Asri & Nyaman' },
  ],
  kontak_alamat: 'Jl. Raya Telagasari No. 123, Telagasari, Karawang, Jawa Barat 41383',
  kontak_telepon: '(0267) 123-4567',
  kontak_email: 'info@smkpgritelagasari.sch.id',
  maps_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.733777598822!2d107.4087132!3d-6.3000216!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6977be486a439f%3A0xc39f28c11dcff58b!2sSMK%20PGRI%20Telagasari!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid',
};

type TabType = 'profil' | 'visi-misi' | 'fasilitas' | 'kontak';

export default function PengaturanPublikPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profil');
  const [formData, setFormData] = useState<SiteSettingsForm>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingFasilitas, setUploadingFasilitas] = useState(false);

  // New facility item input state
  const [newFasilitasUrl, setNewFasilitasUrl] = useState('');
  const [newFasilitasCaption, setNewFasilitasCaption] = useState('');

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const fasilitasFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch settings on load
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/site-settings');
      if (res.data) {
        setFormData({
          sekolah_nama: res.data.sekolah_nama ?? defaultSettings.sekolah_nama,
          sekolah_tagline: res.data.sekolah_tagline ?? defaultSettings.sekolah_tagline,
          sekolah_deskripsi1: res.data.sekolah_deskripsi1 ?? defaultSettings.sekolah_deskripsi1,
          sekolah_deskripsi2: res.data.sekolah_deskripsi2 ?? defaultSettings.sekolah_deskripsi2,
          sekolah_tahun_berdiri: res.data.sekolah_tahun_berdiri ?? defaultSettings.sekolah_tahun_berdiri,
          sekolah_hero_foto: res.data.sekolah_hero_foto ?? defaultSettings.sekolah_hero_foto,
          visi: res.data.visi ?? defaultSettings.visi,
          misi: res.data.misi ?? defaultSettings.misi,
          fasilitas_foto: Array.isArray(res.data.fasilitas_foto) && res.data.fasilitas_foto.length > 0
            ? res.data.fasilitas_foto
            : defaultSettings.fasilitas_foto,
          kontak_alamat: res.data.kontak_alamat ?? defaultSettings.kontak_alamat,
          kontak_telepon: res.data.kontak_telepon ?? defaultSettings.kontak_telepon,
          kontak_email: res.data.kontak_email ?? defaultSettings.kontak_email,
          maps_embed_url: res.data.maps_embed_url ?? defaultSettings.maps_embed_url,
        });
      }
    } catch (err: any) {
      console.error('Gagal mengambil pengaturan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save all settings
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/api/site-settings', formData);
      setToast({
        show: true,
        message: 'Pengaturan halaman publik berhasil disimpan dan diperbarui!',
        type: 'success',
      });
    } catch (err: any) {
      setToast({
        show: true,
        message: err.response?.data?.message || 'Gagal menyimpan pengaturan.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Upload hero file
  const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ show: true, message: 'Ukuran foto maksimal 5MB', type: 'warning' });
      return;
    }

    const body = new FormData();
    body.append('foto', file);

    setUploadingHero(true);
    try {
      const res = await axios.post('/api/site-settings/upload-hero', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setFormData(prev => ({ ...prev, sekolah_hero_foto: res.data.url }));
        setToast({ show: true, message: 'Foto gedung sekolah berhasil diunggah!', type: 'success' });
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err.response?.data?.message || 'Gagal mengunggah foto gedung.',
        type: 'error',
      });
    } finally {
      setUploadingHero(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = '';
    }
  };

  // Upload facility file
  const handleFasilitasFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ show: true, message: 'Ukuran foto maksimal 5MB', type: 'warning' });
      return;
    }

    const body = new FormData();
    body.append('foto', file);

    setUploadingFasilitas(true);
    try {
      const res = await axios.post('/api/site-settings/upload-fasilitas', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        const caption = newFasilitasCaption.trim() || 'Fasilitas Sekolah';
        setFormData(prev => ({
          ...prev,
          fasilitas_foto: [...prev.fasilitas_foto, { url: res.data.url, caption }],
        }));
        setNewFasilitasCaption('');
        setToast({ show: true, message: 'Foto fasilitas berhasil ditambahkan!', type: 'success' });
      }
    } catch (err: any) {
      setToast({
        show: true,
        message: err.response?.data?.message || 'Gagal mengunggah foto fasilitas.',
        type: 'error',
      });
    } finally {
      setUploadingFasilitas(false);
      if (fasilitasFileInputRef.current) fasilitasFileInputRef.current.value = '';
    }
  };

  // Add facility by URL
  const handleAddFasilitasUrl = () => {
    if (!newFasilitasUrl.trim()) {
      setToast({ show: true, message: 'Masukkan URL gambar terlebih dahulu', type: 'warning' });
      return;
    }
    setFormData(prev => ({
      ...prev,
      fasilitas_foto: [
        ...prev.fasilitas_foto,
        {
          url: newFasilitasUrl.trim(),
          caption: newFasilitasCaption.trim() || 'Fasilitas Sekolah',
        },
      ],
    }));
    setNewFasilitasUrl('');
    setNewFasilitasCaption('');
    setToast({ show: true, message: 'Foto fasilitas berhasil ditambahkan ke daftar.', type: 'success' });
  };

  // Remove facility photo
  const handleRemoveFasilitas = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fasilitas_foto: prev.fasilitas_foto.filter((_, i) => i !== index),
    }));
  };

  // Update facility caption
  const handleUpdateFasilitasCaption = (index: number, caption: string) => {
    setFormData(prev => {
      const updated = [...prev.fasilitas_foto];
      updated[index] = { ...updated[index], caption };
      return { ...prev, fasilitas_foto: updated };
    });
  };

  // Clean iframe embed input if user pasted entire <iframe ...> tag
  const handleMapsInput = (val: string) => {
    let cleanUrl = val.trim();
    if (cleanUrl.includes('<iframe') && cleanUrl.includes('src="')) {
      const match = cleanUrl.match(/src="([^"]+)"/);
      if (match && match[1]) {
        cleanUrl = match[1];
      }
    }
    setFormData(prev => ({ ...prev, maps_embed_url: cleanUrl }));
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'profil', label: 'Profil & Foto Utama', icon: School },
    { id: 'visi-misi', label: 'Visi & Misi', icon: Target },
    { id: 'fasilitas', label: 'Foto Fasilitas & Lingkungan', icon: ImageIcon },
    { id: 'kontak', label: 'Kontak & Peta Lokasi', icon: MapPin },
  ];

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 sm:p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Portal Publik Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Pengaturan Halaman Publik
            </h1>
            <p className="mt-1 text-xs sm:text-sm md:text-base text-blue-100/80 max-w-2xl leading-relaxed">
              Ubah foto gedung, visi misi, galeri fasilitas lingkungan, dan peta lokasi yang ditampilkan kepada masyarakat di halaman beranda depan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <a
              href="/#tentang"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-semibold transition backdrop-blur-sm shadow-sm text-center"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="truncate">Lihat Halaman Publik</span>
            </a>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/30 transition disabled:opacity-50 text-center"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-1 border-b border-white/10">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Memuat pengaturan halaman publik...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: PROFIL & FOTO HERO */}
          {activeTab === 'profil' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Informasi Dasar Sekolah</h3>
                      <p className="text-xs text-slate-500">Nama, slogan, serta deskripsi yang tampil di header & profil</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Nama Sekolah
                      </label>
                      <input
                        type="text"
                        value={formData.sekolah_nama}
                        onChange={e => setFormData({ ...formData, sekolah_nama: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        placeholder="Contoh: SMK PGRI Telagasari"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Tahun Berdiri
                      </label>
                      <input
                        type="number"
                        value={formData.sekolah_tahun_berdiri}
                        onChange={e => setFormData({ ...formData, sekolah_tahun_berdiri: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        placeholder="Contoh: 1999"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        Otomatis menghitung badge "X+ Tahun Pengalaman" di samping foto.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tagline / Slogan Sekolah
                    </label>
                    <input
                      type="text"
                      value={formData.sekolah_tagline}
                      onChange={e => setFormData({ ...formData, sekolah_tagline: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                      placeholder="Contoh: SMK PGRI Telagasari - Mencetak Generasi Terampil..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Deskripsi Profil Paragraf 1
                    </label>
                    <textarea
                      rows={3}
                      value={formData.sekolah_deskripsi1}
                      onChange={e => setFormData({ ...formData, sekolah_deskripsi1: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                      placeholder="Jelaskan ringkasan profil sekolah..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Deskripsi Profil Paragraf 2
                    </label>
                    <textarea
                      rows={3}
                      value={formData.sekolah_deskripsi2}
                      onChange={e => setFormData({ ...formData, sekolah_deskripsi2: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                      placeholder="Jelaskan fasilitas, keunggulan, atau prospek lulusan..."
                    />
                  </div>
                </div>
              </div>

              {/* Foto Gedung Sekolah (Hero) */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Foto Utama Gedung Sekolah</h3>
                      <p className="text-xs text-slate-500">Tampil besar di bagian 'Tentang Sekolah'</p>
                    </div>
                  </div>

                  {/* Preview Foto */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner group">
                    {formData.sekolah_hero_foto ? (
                      <img
                        src={formData.sekolah_hero_foto}
                        alt="Hero Gedung Sekolah"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                        <ImageIcon className="w-10 h-10 mb-2 stroke-1" />
                        <p className="text-xs">Belum ada foto utama.</p>
                      </div>
                    )}

                    {uploadingHero && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-semibold gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                        Mengunggah foto...
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div>
                    <input
                      ref={heroFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleHeroFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingHero}
                      onClick={() => heroFileInputRef.current?.click()}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingHero ? 'Mengunggah...' : 'Unggah Foto Gedung Baru'}
                    </button>
                    <p className="text-center text-[11px] text-slate-400 mt-1.5">
                      Format JPG, PNG, atau WebP (Maksimal 5MB)
                    </p>
                  </div>

                  {/* Atau Input Link URL Manual */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Atau Gunakan URL Gambar Langsung:
                    </label>
                    <input
                      type="text"
                      value={formData.sekolah_hero_foto}
                      onChange={e => setFormData({ ...formData, sekolah_hero_foto: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISI & MISI */}
          {activeTab === 'visi-misi' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Visi Sekolah</h3>
                      <p className="text-xs text-slate-500">Cita-cita dan arah tujuan besar sekolah</p>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={formData.visi}
                    onChange={e => setFormData({ ...formData, visi: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition leading-relaxed"
                    placeholder="Tuliskan visi sekolah di sini..."
                  />

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Info className="w-4 h-4 text-amber-500 shrink-0" />
                    Tulis visi dalam kalimat yang padat, inspiratif, dan jelas.
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Misi Sekolah</h3>
                      <p className="text-xs text-slate-500">Poin-poin tindakan nyata untuk mewujudkan visi</p>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={formData.misi}
                    onChange={e => setFormData({ ...formData, misi: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition leading-relaxed"
                    placeholder="1. Poin misi pertama&#10;2. Poin misi kedua&#10;3. Poin misi ketiga..."
                  />

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Info className="w-4 h-4 text-blue-500 shrink-0" />
                    Gunakan format penomoran (1., 2., 3.) atau baris baru per misi agar rapi.
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl space-y-6 border border-slate-800">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Preview Tampilan Publik</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/20">
                      Card Visi & Misi
                    </span>
                  </div>

                  {/* Visi Card Preview */}
                  <div className="bg-blue-950/60 border border-blue-700/40 rounded-xl p-5 relative overflow-hidden">
                    <div className="flex items-center gap-2.5 text-blue-300 font-bold text-sm mb-2">
                      <Target className="w-4 h-4 text-blue-400" />
                      Visi Sekolah
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed italic">
                      "{formData.visi || 'Visi belum diisi...'}"
                    </p>
                  </div>

                  {/* Misi Card Preview */}
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 text-slate-200 font-bold text-sm mb-3">
                      <Eye className="w-4 h-4 text-amber-400" />
                      Misi Sekolah
                    </div>
                    <div className="text-xs text-slate-300 space-y-2 whitespace-pre-line leading-relaxed">
                      {formData.misi || 'Misi belum diisi...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GALERI FASILITAS & LINGKUNGAN */}
          {activeTab === 'fasilitas' && (
            <div className="space-y-6">
              {/* Tambah Foto Fasilitas Bar */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Tambah Foto Fasilitas & Lingkungan</h3>
                      <p className="text-xs text-slate-500">Unggah foto laboratorium, bengkel, ruang kelas, sarana olahraga, atau area sekolah</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    Total: {formData.fasilitas_foto.length} Foto
                  </span>
                </div>

                <div className="grid md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Keterangan / Caption Foto
                    </label>
                    <input
                      type="text"
                      value={newFasilitasCaption}
                      onChange={e => setNewFasilitasCaption(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                      placeholder="Contoh: Bengkel Praktik TBSM"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Atau Tambahkan URL Foto
                    </label>
                    <input
                      type="text"
                      value={newFasilitasUrl}
                      onChange={e => setNewFasilitasUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="md:col-span-3 flex gap-2">
                    <input
                      ref={fasilitasFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFasilitasFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingFasilitas}
                      onClick={() => fasilitasFileInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingFasilitas ? 'Mengunggah...' : 'Unggah File'}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddFasilitasUrl}
                      disabled={!newFasilitasUrl.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid Foto Fasilitas */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {formData.fasilitas_foto.map((foto, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col group"
                  >
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      <img
                        src={foto.url}
                        alt={foto.caption || `Fasilitas ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=600';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFasilitas(index)}
                        className="absolute top-3 right-3 p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-xl shadow-lg transition opacity-90 hover:opacity-100"
                        title="Hapus foto ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[11px] font-bold backdrop-blur-xs">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-white">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Caption / Keterangan
                        </label>
                        <input
                          type="text"
                          value={foto.caption}
                          onChange={e => handleUpdateFasilitasCaption(index, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                          placeholder="Nama fasilitas..."
                        />
                      </div>

                      <div className="text-[10px] text-slate-400 truncate" title={foto.url}>
                        {foto.url}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.fasilitas_foto.length === 0 && (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800">Belum Ada Foto Fasilitas</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Tambahkan foto fasilitas untuk memperkenalkan lingkungan dan kelengkapan sekolah kepada publik.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: KONTAK & PETA LOKASI */}
          {activeTab === 'kontak' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Form Kontak */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Kontak Sekolah</h3>
                      <p className="text-xs text-slate-500">Alamat fisik, nomor telepon, dan email resmi</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Alamat Lengkap
                    </label>
                    <textarea
                      rows={3}
                      value={formData.kontak_alamat}
                      onChange={e => setFormData({ ...formData, kontak_alamat: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                      placeholder="Jalan, RT/RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, Kode Pos..."
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Telepon
                      </label>
                      <input
                        type="text"
                        value={formData.kontak_telepon}
                        onChange={e => setFormData({ ...formData, kontak_telepon: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        placeholder="(0267) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        Email Resmi
                      </label>
                      <input
                        type="email"
                        value={formData.kontak_email}
                        onChange={e => setFormData({ ...formData, kontak_email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        placeholder="info@smkpgritelagasari.sch.id"
                      />
                    </div>
                  </div>
                </div>

                {/* Google Maps Embed Input */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <Map className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Sematkan Peta Google Maps</h3>
                      <p className="text-xs text-slate-500">URL iframe embed dari Google Maps</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      URL Embed Google Maps
                    </label>
                    <textarea
                      rows={3}
                      value={formData.maps_embed_url}
                      onChange={e => handleMapsInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                      placeholder="Paste link https://www.google.com/maps/embed?... atau seluruh tag <iframe>"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-600" />
                      Cara Mengambil Link Google Maps Embed:
                    </p>
                    <ol className="text-xs text-slate-600 list-decimal pl-4 space-y-1">
                      <li>Buka Google Maps dan cari lokasi sekolah Anda.</li>
                      <li>Klik tombol <strong>Bagikan (Share)</strong>.</li>
                      <li>Pilih tab <strong>Sematkan peta (Embed a map)</strong>.</li>
                      <li>Klik <strong>Salin HTML</strong>, lalu tempelkan langsung ke kolom di atas.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Preview Peta */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">Preview Tampilan Peta</h3>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Interaktif
                    </span>
                  </div>

                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    {formData.maps_embed_url ? (
                      <iframe
                        src={formData.maps_embed_url}
                        className="w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                        <Map className="w-12 h-12 mb-2 stroke-1" />
                        <p className="text-xs font-medium">Belum ada peta yang disematkan.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Masukkan URL Google Maps di samping untuk melihat preview.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="sticky bottom-3 sm:bottom-4 z-20 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="leading-relaxed">Semua perubahan disimpan ke database dan langsung aktif di halaman depan publik.</span>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={fetchSettings}
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition active:scale-95 disabled:opacity-50 text-center"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 text-center"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 shrink-0" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
