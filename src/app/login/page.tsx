'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';
import { Lock, User, Loader2, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/login', { username, password });
      if (response.data.access_token) {
        Cookies.set('auth_token', response.data.access_token, { expires: 7 });
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login gagal. Periksa kembali username dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col font-sans">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center text-xs font-semibold text-gray-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
          Kembali ke Katalog Publik
        </Link>
        <span className="text-xs text-gray-400 font-medium">SMK PGRI Telagasari</span>
      </div>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Top Banner Box */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="h-1.5 bg-blue-700 w-full" />
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-700 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-3 shadow-sm">
                SMK
              </div>
              <h1 className="text-xl font-bold text-gray-900">Portal Administrator</h1>
              <p className="text-xs text-gray-500 mt-1">
                Sistem Informasi Manajemen Aset — SMK PGRI Telagasari
              </p>
            </div>

            <div className="px-6 pb-6">
              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      className="block w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-700 transition-all"
                      placeholder="Masukkan username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="block w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-700 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mt-2"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    'Masuk ke Sistem'
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 text-gray-400" />
            <span>Akses terbatas hanya untuk pengelola &amp; petugas aset</span>
          </div>

        </div>
      </div>
    </div>
  );
}
