'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from '@/lib/axios';
import Toast from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { showErrorAlert } from '@/utils/errorHandler';
import {
  User, KeyRound, ShieldCheck, Save, Loader2, CheckCircle2,
  Lock, Mail, UserCheck, Calendar, AlertCircle, Eye, EyeOff, Sparkles,
  Camera, Upload, Trash2, Image as ImageIcon, RefreshCw, X, Check
} from 'lucide-react';

interface UserProfileEditorProps {
  baseRolePath?: string;
}

export default function UserProfileEditor({ baseRolePath }: UserProfileEditorProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'password'
    ? 'password'
    : searchParams.get('tab') === 'foto' || searchParams.get('tab') === 'photo'
    ? 'photo'
    : 'info';

  const [activeTab, setActiveTab] = useState<'info' | 'photo' | 'password'>(initialTab);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile info form state
  const [namaLengkap, setNamaLengkap] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);

  // Photo form state
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Toast & error feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'password') {
      setActiveTab('password');
    } else if (tabParam === 'foto' || tabParam === 'photo') {
      setActiveTab('photo');
    }
  }, [searchParams]);

  // Clean up blob URL preview when component unmounts or selectedPhoto changes
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const notifyUserUpdated = (updatedUser: any) => {
    setUser(updatedUser);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUser }));
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/user');
      setUser(res.data);
      setNamaLengkap(res.data.nama_lengkap || '');
      setUsername(res.data.username || '');
      setEmail(res.data.email || '');
    } catch (err) {
      showErrorAlert(err, 'Gagal Memuat Data Profil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingInfo(true);
    setErrors({});

    try {
      const res = await axios.put('/api/profile', {
        nama_lengkap: namaLengkap,
        username: username,
        email: email,
      });

      notifyUserUpdated(res.data.user);
      setToast({ message: res.data.message || 'Profil berhasil diperbarui.', type: 'success' });
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errObj: Record<string, string> = {};
        Object.keys(err.response.data.errors).forEach((key) => {
          errObj[key] = err.response.data.errors[key][0];
        });
        setErrors(errObj);
      } else {
        setToast({ message: err.response?.data?.message || 'Gagal memperbarui profil.', type: 'error' });
      }
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    // Validasi tipe file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setToast({ message: 'Format file tidak didukung. Harap pilih gambar JPEG, PNG, atau WEBP.', type: 'error' });
      return;
    }

    // Validasi ukuran file (maksimal 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Ukuran file terlalu besar. Maksimal ukuran gambar adalah 5MB.', type: 'error' });
      return;
    }

    setSelectedPhoto(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUploadPhoto = async () => {
    if (!selectedPhoto) {
      setToast({ message: 'Pilih foto terlebih dahulu.', type: 'warning' });
      return;
    }

    setIsSubmittingPhoto(true);
    const formData = new FormData();
    formData.append('foto', selectedPhoto);

    try {
      const res = await axios.post('/api/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      notifyUserUpdated(res.data.user);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setToast({ message: res.data.message || 'Foto profil berhasil diperbarui.', type: 'success' });
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || 'Gagal mengunggah foto profil.',
        type: 'error',
      });
    } finally {
      setIsSubmittingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    setIsDeletingPhoto(true);
    try {
      const res = await axios.delete('/api/profile/photo');
      notifyUserUpdated(res.data.user);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setToast({ message: res.data.message || 'Foto profil berhasil dihapus.', type: 'success' });
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || 'Gagal menghapus foto profil.',
        type: 'error',
      });
    } finally {
      setIsDeletingPhoto(false);
      setShowDeleteConfirm(false);
    }
  };

  const cancelPhotoSelection = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPassword(true);
    setErrors({});

    try {
      const res = await axios.put('/api/profile/password', {
        current_password: currentPassword,
        password: password,
        password_confirmation: passwordConfirmation,
      });

      setToast({ message: res.data.message || 'Password berhasil diperbarui.', type: 'success' });
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errObj: Record<string, string> = {};
        Object.keys(err.response.data.errors).forEach((key) => {
          errObj[key] = err.response.data.errors[key][0];
        });
        setErrors(errObj);
      } else {
        setToast({ message: err.response?.data?.message || 'Gagal memperbarui password.', type: 'error' });
      }
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const roleLabel = (role?: string) => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'petugas') return 'Petugas Input';
    if (role === 'wakapro') return 'Waka Program';
    if (role === 'wakasek') return 'Waka Sarpras';
    return role || 'Pengguna';
  };

  const currentPhotoUrl = photoPreview || user?.foto_url || user?.foto;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Memuat profil pengguna...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Hapus Foto Profil?"
          message="Foto profil Anda saat ini akan dihapus permanen. Avatar Anda akan kembali menggunakan inisial nama."
          type="danger"
          confirmText={isDeletingPhoto ? 'Menghapus...' : 'Ya, Hapus Foto'}
          cancelText="Batal"
          onConfirm={handleDeletePhoto}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Hidden File Input for quick upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar with Quick Edit Overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-extrabold shadow-2xl border-4 border-white/20 tracking-wider overflow-hidden ring-4 ring-black/10">
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt={user?.nama_lengkap || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.nama_lengkap?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>

            {/* Camera Button Badge */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('photo');
                fileInputRef.current?.click();
              }}
              title="Ganti Foto Profil"
              className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl ring-4 ring-slate-950 shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate max-w-full">
                {user?.nama_lengkap}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {roleLabel(user?.role)}
              </span>
            </div>

            <p className="text-slate-300 text-sm">
              {user?.email || 'admin@smkpgri.sch.id'} · @{user?.username}
            </p>

            {user?.ruangan && (
              <p className="text-xs text-blue-200 font-medium">
                Ruangan Penugasan: <span className="text-white font-semibold">{user.ruangan.nama_ruangan}</span>
                {user.ruangan.gedung && ` (${user.ruangan.gedung.nama_gedung})`}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Terdaftar: {formatDate(user?.created_at)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Status Akun: <strong className="text-emerald-400">Aktif</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => { setActiveTab('info'); setErrors({}); }}
            className={`flex items-center space-x-2.5 sm:space-x-3 px-4 py-3 sm:py-3.5 rounded-2xl font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 lg:w-full ${
              activeTab === 'info'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <User className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
            <span>Informasi Akun</span>
          </button>

          <button
            onClick={() => { setActiveTab('photo'); setErrors({}); }}
            className={`flex items-center space-x-2.5 sm:space-x-3 px-4 py-3 sm:py-3.5 rounded-2xl font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 lg:w-full ${
              activeTab === 'photo'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <Camera className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
            <span>Foto Profil</span>
          </button>

          <button
            onClick={() => { setActiveTab('password'); setErrors({}); }}
            className={`flex items-center space-x-2.5 sm:space-x-3 px-4 py-3 sm:py-3.5 rounded-2xl font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 lg:w-full ${
              activeTab === 'password'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <KeyRound className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
            <span>Ubah Password</span>
          </button>

          {/* Quick Info Card */}
          <div className="hidden lg:block bg-linear-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-3 mt-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Catatan Keamanan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pastikan foto profil dan data kontak Anda selalu diperbarui. Gunakan password kombinasi huruf, angka, dan simbol demi menjaga keamanan akun SIM Aset.
            </p>
          </div>
        </div>

        {/* Tab Form Content */}
        <div className="lg:col-span-3">
          {/* TAB 1: INFORMASI PROFIL */}
          {activeTab === 'info' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Edit Informasi Profil</h2>
                  <p className="text-xs text-slate-400 mt-1">Perbarui nama lengkap, username, dan email akun Anda.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('photo')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors w-fit cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kelola Foto Profil</span>
                </button>
              </div>

              <form onSubmit={handleUpdateInfo} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                      type="text"
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                      className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                        errors.nama_lengkap ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                      } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                      placeholder="Masukkan nama lengkap"
                      required
                    />
                  </div>
                  {errors.nama_lengkap && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.nama_lengkap}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`block w-full pl-8 pr-4 py-2.5 bg-slate-50 border ${
                          errors.username ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                        placeholder="username"
                        required
                      />
                    </div>
                    {errors.username && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.username}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                          errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                        placeholder="nama@smkpgri.sch.id"
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingInfo}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingInfo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: FOTO PROFIL */}
          {activeTab === 'photo' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Edit Foto Profil</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Unggah foto profil Anda untuk memudahkan pengenalan di sidebar, header, dan riwayat aktivitas sistem.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Kolom Kiri: Preview Besar & Live Context */}
                <div className="md:col-span-1 flex flex-col items-center p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4 text-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-extrabold shadow-xl overflow-hidden ring-4 ring-white">
                      {currentPhotoUrl ? (
                        <img
                          src={currentPhotoUrl}
                          alt="Preview Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{user?.nama_lengkap?.[0]?.toUpperCase() || 'U'}</span>
                      )}
                    </div>
                    {photoPreview && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-md animate-pulse">
                        Baru
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-700">Tampilan Avatar</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {photoPreview ? 'Pratinjau sebelum disimpan' : (user?.foto ? 'Foto aktif saat ini' : 'Inisial nama bawaan')}
                    </p>
                  </div>

                  {/* Context Previews */}
                  <div className="w-full pt-3 border-t border-slate-200/70 space-y-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-left">
                      Tampilan di Menu
                    </p>
                    <div className="flex items-center justify-around bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold overflow-hidden shadow-xs">
                          {currentPhotoUrl ? (
                            <img src={currentPhotoUrl} alt="H" className="w-full h-full object-cover" />
                          ) : (
                            user?.nama_lengkap?.[0]?.toUpperCase() || 'U'
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400">Header</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-xs">
                          {currentPhotoUrl ? (
                            <img src={currentPhotoUrl} alt="S" className="w-full h-full object-cover" />
                          ) : (
                            user?.nama_lengkap?.[0]?.toUpperCase() || 'U'
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400">Sidebar</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan: Upload Dropzone & Actions */}
                <div className="md:col-span-2 space-y-4">
                  {/* Dropzone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60 bg-slate-50/30'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Klik untuk memilih foto atau seret ke sini
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Mendukung format JPEG, PNG, WEBP (maks. 5MB). Disarankan foto persegi (1:1) dengan resolusi minimal 300x300 piksel.
                    </p>

                    {selectedPhoto && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>File terpilih: {selectedPhoto.name} ({(selectedPhoto.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      {user?.foto && !selectedPhoto && (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={isDeletingPhoto}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isDeletingPhoto ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Hapus Foto</span>
                        </button>
                      )}

                      {selectedPhoto && (
                        <button
                          type="button"
                          onClick={cancelPhotoSelection}
                          disabled={isSubmittingPhoto}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Batal</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmittingPhoto}
                        className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        Pilih File Lain
                      </button>

                      <button
                        type="button"
                        onClick={handleUploadPhoto}
                        disabled={!selectedPhoto || isSubmittingPhoto}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmittingPhoto ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Simpan Foto Profil</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UBAH PASSWORD */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Ubah Password Akun</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Amankan akun Anda dengan mengganti password secara berkala.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Password Saat Ini
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`block w-full pl-10 pr-12 py-2.5 bg-slate-50 border ${
                        errors.current_password ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                      } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                      placeholder="Masukkan password saat ini"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.current_password && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.current_password}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Password Baru
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`block w-full pl-10 pr-12 py-2.5 bg-slate-50 border ${
                          errors.password ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                        placeholder="Minimal 6 karakter"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        className={`block w-full pl-10 pr-12 py-2.5 bg-slate-50 border ${
                          errors.password_confirmation ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                        placeholder="Ulangi password baru"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password_confirmation && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.password_confirmation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Memperbarui...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Perbarui Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
