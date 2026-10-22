'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';
import { Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck, Lock, User, CheckCircle2, RefreshCw } from 'lucide-react';

interface LoginAlert {
  title: string;
  message: string;
  field: 'username' | 'password' | 'captcha' | 'status' | 'general';
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [alertInfo, setAlertInfo] = useState<LoginAlert | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
    captcha?: string;
  }>({});
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validasi Penjumlahan (Math Captcha)
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [isRefreshingCaptcha, setIsRefreshingCaptcha] = useState(false);

  const generateCaptcha = () => {
    setIsRefreshingCaptcha(true);
    const n1 = Math.floor(Math.random() * 9) + 1; // 1-9
    const n2 = Math.floor(Math.random() * 9) + 1; // 1-9
    setNum1(n1);
    setNum2(n2);
    setCaptchaAnswer('');
    setTimeout(() => setIsRefreshingCaptcha(false), 250);
  };

  useEffect(() => {
    generateCaptcha();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('expired') === '1') {
        setIsExpired(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertInfo(null);
    setIsExpired(false);
    setFieldErrors({});

    // 1. VALIDASI PENJUMLAHAN
    if (!captchaAnswer.trim()) {
      setAlertInfo({
        title: 'Penjumlahan Belum Diisi',
        message: 'Silakan isi hasil penjumlahan di bawah terlebih dahulu.',
        field: 'captcha',
      });
      setFieldErrors({ captcha: 'Wajib diisi' });
      return;
    }

    const expectedAnswer = num1 + num2;
    if (parseInt(captchaAnswer.trim(), 10) !== expectedAnswer) {
      setAlertInfo({
        title: 'Penjumlahan Salah',
        message: `Jawaban penjumlahan yang Anda masukkan salah (${num1} + ${num2} ≠ ${captchaAnswer}). Soal baru telah dibuat.`,
        field: 'captcha',
      });
      setFieldErrors({ captcha: 'Jawaban salah' });
      generateCaptcha();
      return;
    }

    // 2. VALIDASI FORM INPUT
    if (!username.trim()) {
      setAlertInfo({
        title: 'Username Kosong',
        message: 'Silakan masukkan username akun Anda.',
        field: 'username',
      });
      setFieldErrors({ username: 'Username wajib diisi' });
      return;
    }

    if (!password) {
      setAlertInfo({
        title: 'Password Kosong',
        message: 'Silakan masukkan password akun Anda.',
        field: 'password',
      });
      setFieldErrors({ password: 'Password wajib diisi' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('/api/login', { username, password });
      if (response.data.access_token && response.data.user) {
        // Set cookie kedaluwarsa dalam 2 jam (2/24 hari)
        Cookies.set('auth_token', response.data.access_token, { 
          expires: new Date(Date.now() + 2 * 60 * 60 * 1000) 
        });
        // Catat timestamp aktivitas login
        localStorage.setItem('auth_last_active', Date.now().toString());

        const userRole = response.data.user.role;
        let redirectPath = '/dashboard';

        if (userRole === 'petugas') {
          redirectPath = '/petugas-input';
        } else if (userRole === 'wakapro') {
          redirectPath = '/wakapro';
        } else if (userRole === 'wakasek') {
          redirectPath = '/wakasek';
        } else {
          redirectPath = '/dashboard';
        }

        router.push(redirectPath);
      }
    } catch (err: any) {
      const serverField = err.response?.data?.field;
      const serverTitle = err.response?.data?.title;
      const serverMessage = err.response?.data?.message || 'Terjadi kesalahan saat masuk.';

      // Deteksi spesifik berdasarkan response backend
      if (serverField === 'username' || serverMessage.toLowerCase().includes('username')) {
        setAlertInfo({
          title: serverTitle || 'Username Salah',
          message: serverMessage || 'Username tidak terdaftar dalam sistem.',
          field: 'username',
        });
        setFieldErrors({ username: 'Username tidak terdaftar' });
      } else if (serverField === 'password' || serverMessage.toLowerCase().includes('password')) {
        setAlertInfo({
          title: serverTitle || 'Password Salah',
          message: serverMessage || 'Password yang Anda masukkan salah.',
          field: 'password',
        });
        setFieldErrors({ password: 'Password salah' });
      } else if (serverField === 'status' || serverMessage.toLowerCase().includes('dinonaktifkan')) {
        setAlertInfo({
          title: serverTitle || 'Akun Dinonaktifkan',
          message: serverMessage || 'Akun Anda dinonaktifkan oleh Administrator.',
          field: 'status',
        });
        setFieldErrors({ username: 'Akun dinonaktifkan' });
      } else {
        setAlertInfo({
          title: 'Login Gagal',
          message: serverMessage,
          field: 'general',
        });
      }

      generateCaptcha(); // Ganti soal baru jika login gagal
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* =========================================
          LEFT BRANDING PANEL (Desktop & Tablet Lg)
          ========================================= */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-linear-to-br from-[#0d1e3a] via-[#1a3a6b] to-[#122b54] text-white p-8 xl:p-12 flex-col justify-between relative overflow-hidden shrink-0">
        {/* Decorative ambient background lights */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        
        {/* Brand Top Header */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all mb-10 w-fit"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <img
              src="/smk-pgri-telagasari.png"
              alt="Logo SMK PGRI Telagasari"
              className="w-14 h-14 rounded-xl object-cover bg-white p-1 shadow-lg shadow-black/20 ring-2 ring-white/20 shrink-0"
            />
            <div>
              <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-blue-200 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/20 mb-1">
                Portal Inventaris
              </span>
              <h2 className="text-xl font-bold text-white leading-tight">
                SMK PGRI Telagasari
              </h2>
            </div>
          </div>

          <p className="text-sm text-blue-100/80 leading-relaxed mb-8">
            Sistem Informasi Manajemen Aset &amp; Inventaris Terintegrasi. Mengoptimalkan pencatatan, pendistribusian, pemeliharaan, serta monitoring fasilitas sekolah secara akurat.
          </p>

          {/* Highlights */}
          <div className="space-y-3.5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3 text-xs text-blue-100/90">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <span>Manajemen aset ruangan &amp; gedung real-time</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-blue-100/90">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <span>Pencatatan distribusi &amp; peminjaman terstruktur</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-blue-100/90">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                <ShieldCheck size={14} />
              </div>
              <span>Akses aman multi-peran dengan enkripsi token</span>
            </div>
          </div>
        </div>

        {/* Brand Bottom Footer */}
        <div className="relative z-10 pt-8 border-t border-white/10 text-xs text-white/50 flex flex-col gap-1">
          <p className="text-white/70">Butuh bantuan akun?</p>
          <p>Hubungi Administrator SIM Aset SMK PGRI Telagasari.</p>
          <p className="mt-2 text-[11px] text-white/40">&copy; {new Date().getFullYear()} SMK PGRI Telagasari</p>
        </div>
      </div>

      {/* =========================================
          RIGHT MAIN PANEL (Mobile, Tablet, Desktop)
          ========================================= */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 lg:p-12 relative min-h-screen overflow-hidden">
        {/* Background Image: Foto Cover Sekolah (Penuh, tidak di-zoom) */}
        <div
          className="absolute inset-0 bg-no-repeat bg-center transition-all duration-500"
          style={{
            backgroundImage: "url('/img/photo%20cover.jpeg')",
            backgroundSize: '100% 100%',
          }}
        />
        {/* Overlay gelap 30% */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* Mobile Header (Only visible on small/medium screens < lg) */}
        <div className="w-full max-w-md lg:hidden mb-6 flex flex-col items-center text-center relative z-10">
          <div className="w-full flex items-center justify-between mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-700 bg-white/90 backdrop-blur-md hover:bg-white px-3 py-2 rounded-xl border border-white/40 shadow-sm transition-all"
            >
              <ArrowLeft size={15} />
              <span>Beranda</span>
            </Link>
            <span className="text-[11px] font-semibold text-blue-100 bg-blue-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-blue-400/30 shadow-sm">
              SIM Aset Sekolah
            </span>
          </div>

          <div className="flex flex-col items-center mt-1">
            <img
              src="/smk-pgri-telagasari.png"
              alt="Logo SMK PGRI Telagasari"
              className="w-14 h-14 rounded-2xl object-cover bg-white p-1 shadow-lg ring-2 ring-white/30 mb-2.5"
            />
            <h2 className="text-lg font-bold text-white drop-shadow-md leading-snug">
              SMK PGRI Telagasari
            </h2>
            <p className="text-xs text-blue-100/90 drop-shadow">
              Sistem Informasi Manajemen Aset
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-9 border border-white/60 shadow-2xl shadow-slate-950/25 relative z-10">
          {/* Desktop Back Link */}
          <div className="hidden lg:block mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700 transition-colors group"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Masuk ke Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Silakan masukkan kredensial akun Anda untuk melanjutkan
            </p>
          </div>

          {/* Expired Session Alert */}
          {isExpired && !alertInfo && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-start gap-3 animate-fadeInUp">
              <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold block mb-0.5">Sesi Berakhir</span>
                Sesi login Anda telah habis demi keamanan. Silakan masuk kembali.
              </div>
            </div>
          )}

          {/* Error Alert — Sangat Jelas & Spesifik */}
          {alertInfo && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50/95 border-2 border-rose-300 text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-rose-900 leading-tight">
                    {alertInfo.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-rose-700 mt-1 leading-relaxed">
                    {alertInfo.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            {/* Username Field */}
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={17} />
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }
                    if (alertInfo?.field === 'username') setAlertInfo(null);
                  }}
                  required
                  autoComplete="username"
                  placeholder="Masukkan username"
                  className={`w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl border ${
                    fieldErrors.username
                      ? 'border-rose-400 bg-rose-50/40 ring-4 ring-rose-500/10 text-rose-950 font-medium'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900'
                  } text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none`}
                />
              </div>
              {fieldErrors.username && (
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1.5 animate-fadeIn">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{fieldErrors.username}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={17} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                    if (alertInfo?.field === 'password') setAlertInfo(null);
                  }}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  className={`w-full h-11 sm:h-12 pl-10 pr-11 rounded-xl border ${
                    fieldErrors.password
                      ? 'border-rose-400 bg-rose-50/40 ring-4 ring-rose-500/10 text-rose-950 font-medium'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900'
                  } text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center text-slate-400 hover:text-slate-700 focus:outline-none transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1.5 animate-fadeIn">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* Validasi Penjumlahan (Math Captcha Sederhana) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-captcha"
                  className="block text-xs sm:text-sm font-semibold text-slate-700"
                >
                  Validasi Penjumlahan
                </label>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  title="Ganti Soal Penjumlahan"
                  className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} className={isRefreshingCaptcha ? 'animate-spin' : ''} />
                  <span>Ganti Soal</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Kotak Soal Penjumlahan */}
                <div className={`flex-1 h-11 sm:h-12 px-3.5 rounded-xl border ${
                  fieldErrors.captcha ? 'border-rose-300 bg-rose-50/60' : 'border-blue-200/90 bg-blue-50/70'
                } flex items-center justify-center font-mono font-bold text-base sm:text-lg text-blue-900 tracking-wider select-none shadow-xs`}>
                  <span>{num1}</span>
                  <span className="mx-2.5 text-blue-600 font-extrabold">+</span>
                  <span>{num2}</span>
                  <span className="mx-2.5 text-slate-400">=</span>
                  <span className="text-slate-400 font-normal text-sm">?</span>
                </div>

                {/* Input Jawaban */}
                <div className="w-28 sm:w-32 relative">
                  <input
                    id="login-captcha"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={captchaAnswer}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setCaptchaAnswer(val);
                      if (fieldErrors.captcha) {
                        setFieldErrors((prev) => ({ ...prev, captcha: undefined }));
                      }
                      if (alertInfo?.field === 'captcha') setAlertInfo(null);
                    }}
                    required
                    placeholder="Jawaban"
                    className={`w-full h-11 sm:h-12 px-3 text-center rounded-xl border ${
                      fieldErrors.captcha
                        ? 'border-rose-400 bg-rose-50/40 ring-4 ring-rose-500/10 text-rose-700 font-bold'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 font-bold'
                    } text-sm sm:text-base focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none`}
                  />
                </div>
              </div>

              {fieldErrors.captcha && (
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1.5 animate-fadeIn">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{fieldErrors.captcha}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className={`w-full h-11 sm:h-12 mt-2 rounded-xl font-semibold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                isLoading
                  ? 'bg-slate-400 shadow-none cursor-not-allowed'
                  : 'bg-linear-to-r from-[#1a3a6b] to-[#245296] hover:from-[#152e55] hover:to-[#1b3e73] shadow-blue-900/15 hover:shadow-lg hover:shadow-blue-900/25 active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk ke Akun</span>
              )}
            </button>
          </form>

          {/* Mobile Information / Help */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center lg:hidden">
            <p className="text-[11px] text-slate-500">
              Mengalami kendala login? Hubungi administrator SIM Aset.
            </p>
          </div>
        </div>

        {/* Footer info for mobile */}
        <div className="w-full max-w-md mt-6 text-center text-[11px] text-white/80 drop-shadow relative z-10 lg:hidden">
          &copy; {new Date().getFullYear()} SMK PGRI Telagasari. Hak Cipta Dilindungi.
        </div>
      </div>
    </div>
  );
}

