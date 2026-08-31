'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from '@/lib/axios';
import Toast from '@/components/Toast';
import {
  User, KeyRound, ShieldCheck, Save, Loader2, CheckCircle2,
  Lock, Mail, UserCheck, Calendar, AlertCircle, Eye, EyeOff, Sparkles
} from 'lucide-react';

function ProfileContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'password' ? 'password' : 'info';

  const [activeTab, setActiveTab] = useState<'info' | 'password'>(initialTab);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile info form state
  const [namaLengkap, setNamaLengkap] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);

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
    if (searchParams.get('tab') === 'password') {
      setActiveTab('password');
    }
  }, [searchParams]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/user');
      setUser(res.data);
      setNamaLengkap(res.data.nama_lengkap || '');
      setUsername(res.data.username || '');
      setEmail(res.data.email || '');
    } catch (err) {
      console.error(err);
      setToast({ message: 'Gagal memuat data profil.', type: 'error' });
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

      setUser(res.data.user);
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
      year: 'numeric'
    });
  };

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

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-extrabold shadow-2xl border-4 border-white/20 tracking-wider">
              {user?.nama_lengkap?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-xl ring-4 ring-slate-950 shadow-md">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{user?.nama_lengkap}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.role || 'Admin'}
              </span>
            </div>
            <p className="text-slate-300 text-sm">{user?.email || 'admin@smkpgri.sch.id'} · @{user?.username}</p>
            
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Terdaftar: {formatDate(user?.created_at)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Status Akun: <strong className="text-emerald-400">Aktif</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1 space-y-2">
          <button
            onClick={() => { setActiveTab('info'); setErrors({}); }}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl font-medium text-sm transition-all duration-200 text-left ${
              activeTab === 'info'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span>Informasi Akun</span>
          </button>

          <button
            onClick={() => { setActiveTab('password'); setErrors({}); }}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl font-medium text-sm transition-all duration-200 text-left ${
              activeTab === 'password'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <KeyRound className="h-5 w-5 flex-shrink-0" />
            <span>Ubah Password</span>
          </button>

          {/* Quick Info Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-3 mt-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Catatan Keamanan</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pastikan informasi profil Anda selalu diperbarui. Gunakan password kombinasi huruf, angka, dan karakter khusus demi menjaga keamanan akun SIM Aset.
            </p>
          </div>
        </div>

        {/* Tab Form Content */}
        <div className="lg:col-span-3">
          {activeTab === 'info' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Edit Informasi Profil</h2>
                <p className="text-xs text-slate-400 mt-1">Perbarui nama lengkap, username, dan email akun Anda.</p>
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
                        placeholder="email@sekolah.sch.id"
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

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingInfo}
                    className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {isSubmittingInfo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Ubah Password Akun</h2>
                <p className="text-xs text-slate-400 mt-1">Ganti password lama Anda untuk menjaga keamanan akses akun.</p>
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
                      className={`block w-full pl-10 pr-10 py-2.5 bg-slate-50 border ${
                        errors.current_password ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                      } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                      placeholder="Masukkan password saat ini"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`block w-full pl-10 pr-10 py-2.5 bg-slate-50 border ${
                          errors.password ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                        placeholder="Minimal 6 karakter"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        className={`block w-full pl-10 pr-10 py-2.5 bg-slate-50 border ${
                          errors.password_confirmation ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                        } rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                        placeholder="Ulangi password baru"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {isSubmittingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Update Password</span>
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

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Memuat profil...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
