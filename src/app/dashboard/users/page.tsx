'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import {
  Users, Plus, Search, Filter, Edit, Trash2, ShieldCheck,
  Building2, UserCheck, Key, AlertCircle, X, ChevronRight,
  Lock, CheckCircle2, Eye, EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { 
  MobileCard, 
  MobileCardHeader, 
  MobileCardRow, 
  MobileCardActions 
} from '@/components/MobileCard';

interface UserItem {
  id: number;
  nama_lengkap: string;
  username: string;
  email: string;
  role: 'super_admin' | 'petugas' | 'wakasek' | 'wakapro';
  ruangan_id: number | null;
  status: boolean;
  ruangan?: {
    id: number;
    nama_ruangan: string;
    jenis: string;
  };
}

// Helper functions
const getRoleInfo = (role: string) => {
  const roles = {
    super_admin: { label: 'Super Admin', color: 'bg-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    petugas: { label: 'Petugas Input', color: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    wakasek: { label: 'Wakasek Sarpras', color: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    wakapro: { label: 'Wakapro Bengkel', color: 'bg-amber-600', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  };
  return roles[role as keyof typeof roles] || { label: role, color: 'bg-slate-600', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
};

export default function UsersPage() {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [ruangans, setRuangans] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    username: '',
    email: '',
    password: '',
    role: 'petugas',
    ruangan_id: '',
    status: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  useEffect(() => {
    axios.get('/api/user')
      .then(res => setCurrentUser(res.data))
      .catch(() => {});

    axios.get('/api/ruangans')
      .then(res => {
        const data = res.data?.data || res.data || [];
        setRuangans(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    let url = `/api/users?search=${encodeURIComponent(search)}`;
    if (roleFilter) url += `&role=${roleFilter}`;

    axios.get(url)
      .then(res => setUsers(res.data))
      .catch(err => console.error('Gagal mengambil data user', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedUser(null);
    setFormData({
      nama_lengkap: '',
      username: '',
      email: '',
      password: '',
      role: 'petugas',
      ruangan_id: '',
      status: true,
    });
    setFormError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: UserItem) => {
    setIsEditMode(true);
    setSelectedUser(u);
    setFormData({
      nama_lengkap: u.nama_lengkap,
      username: u.username,
      email: u.email,
      password: '', // Kosongkan password jika tidak ingin ganti
      role: u.role,
      ruangan_id: u.ruangan_id ? u.ruangan_id.toString() : '',
      status: u.status,
    });
    setFormError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (isEditMode && selectedUser) {
        await axios.put(`/api/users/${selectedUser.id}`, formData);
        setSuccessMessage('Data pengguna berhasil diperbarui.');
      } else {
        await axios.post('/api/users', formData);
        setSuccessMessage('Pengguna baru berhasil ditambahkan.');
      }

      setIsModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan data pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await axios.delete(`/api/users/${userToDelete.id}`);
      setUserToDelete(null);
      fetchUsers();
      setSuccessMessage('Pengguna berhasil dihapus.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menghapus pengguna.');
    }
  };

  // Jika bukan super_admin, beri peringatan izin
  if (currentUser && currentUser.role !== 'super_admin') {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl inline-block mb-3">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Menu Manajemen Pengguna hanya dapat diakses oleh akun dengan role <strong>Super Admin</strong>.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Kelola Pengguna</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-blue-600" />
            Manajemen Pengguna &amp; Role Sistem
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola hak akses 4 role: Super Admin, Petugas Input, Wakasek Sarpras, dan Wakapro Bengkel.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tambah Pengguna Baru
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, username, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-700 w-full sm:w-auto"
          >
            <option value="">Semua Peran (Role)</option>
            <option value="super_admin">Super Admin</option>
            <option value="petugas">Petugas Input</option>
            <option value="wakasek">Wakasek Sarpras</option>
            <option value="wakapro">Wakapro (Kepala Bengkel)</option>
          </select>
        </div>
      </div>

      {/* ── User Table / Mobile Cards ── */}
      {isMobile ? (
        /* Mobile Card View */
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">Tidak ada pengguna</p>
              <p className="text-xs mt-1 text-slate-400">Tidak ada yang sesuai pencarian</p>
            </div>
          ) : (
            users.map((u) => {
              const roleInfo = getRoleInfo(u.role);
              const isWakapro = u.role === 'wakapro';

              return (
                <MobileCard key={u.id}>
                  <MobileCardHeader
                    title={u.nama_lengkap}
                    subtitle={`@${u.username}`}
                    badge={
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${roleInfo.badge}`}>
                        {roleInfo.label}
                      </span>
                    }
                    icon={
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm text-white ${roleInfo.color}`}>
                        {u.nama_lengkap.charAt(0).toUpperCase()}
                      </div>
                    }
                  />

                  <div className="space-y-2">
                    <MobileCardRow
                      label="Email"
                      value={<span className="text-[11px]">{u.email}</span>}
                    />
                    <MobileCardRow
                      label="Status"
                      value={
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.status ? '✓ Aktif' : 'Nonaktif'}
                        </span>
                      }
                    />
                    {u.ruangan && (
                      <MobileCardRow
                        label="Workshop"
                        value={
                          <span className="font-semibold text-blue-700 flex items-center gap-1 justify-end">
                            <Building2 className="h-3 w-3" />
                            {u.ruangan.nama_ruangan}
                          </span>
                        }
                      />
                    )}
                    {isWakapro && !u.ruangan && (
                      <div className="text-[10px] text-red-600 font-bold italic flex items-center gap-1 bg-red-50 p-2 rounded-lg border border-red-200">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>Belum ditentukan — distribusi tidak akan tampil!</span>
                      </div>
                    )}
                    {u.id === currentUser?.id && (
                      <div className="text-[10px] text-blue-600 font-semibold bg-blue-50 p-2 rounded-lg text-center">
                        👤 Akun Anda
                      </div>
                    )}
                  </div>

                  <MobileCardActions>
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-xs font-bold shadow-sm"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => setUserToDelete(u)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all text-xs font-bold shadow-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                    )}
                  </MobileCardActions>
                </MobileCard>
              );
            })
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Pengguna</th>
                  <th className="py-3.5 px-4">Username &amp; Email</th>
                  <th className="py-3.5 px-4">Peran (Role)</th>
                  <th className="py-3.5 px-4">Penugasan Bengkel</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                      <p>Memuat data pengguna...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                      Tidak ada pengguna yang sesuai dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSuper = u.role === 'super_admin';
                    const isPetugas = u.role === 'petugas';
                    const isWakasek = u.role === 'wakasek';
                    const isWakapro = u.role === 'wakapro';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm ${isSuper ? 'bg-purple-600 text-white' : isPetugas ? 'bg-blue-600 text-white' : isWakasek ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                              {u.nama_lengkap.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.nama_lengkap}</p>
                              {u.id === currentUser?.id && (
                                <span className="text-[10px] text-blue-600 font-semibold">(Akun Anda)</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <p className="font-mono text-[11px] text-slate-800">{u.username}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          {isSuper && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Super Admin
                            </span>
                          )}
                          {isPetugas && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Petugas Input
                            </span>
                          )}
                          {isWakasek && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Wakasek Sarpras
                            </span>
                          )}
                          {isWakapro && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Wakapro Bengkel
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {u.ruangan ? (
                            <div className="flex items-center gap-1.5 font-semibold text-blue-700">
                              <Building2 className="h-3.5 w-3.5 text-blue-500" />
                              <span>{u.ruangan.nama_ruangan}</span>
                            </div>
                          ) : isWakapro ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-red-600 font-bold italic flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                Belum ditentukan — distribusi tidak akan tampil!
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {u.status ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit Pengguna"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {u.id !== currentUser?.id && (
                              <button
                                onClick={() => setUserToDelete(u)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="h-4 w-4" />
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
      )}

      {/* ── MODAL TAMBAH / EDIT PENGGUNA ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEditMode ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Tentukan nama, kredensial login, dan perannya</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Ahmad Fauzi, S.Kom"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Username login"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@sekolah.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEditMode ? 'Password Baru (Kosongkan jika tidak diganti)' : 'Password Login *'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!isEditMode}
                    placeholder={isEditMode ? '•••••••• (tetap gunakan password lama)' : 'Minimal 6 karakter'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Peran (Role) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value, ruangan_id: '' })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    <option value="petugas">Petugas Input</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="wakapro">Wakapro (Kepala Bengkel)</option>
                    <option value="wakasek">Wakasek Sarpras</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Status Akun
                  </label>
                  <select
                    value={formData.status ? '1' : '0'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value === '1' })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>
              </div>

              {formData.role === 'wakapro' && (
                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1.5">
                    Ruangan Bengkel yang Dibawahi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.ruangan_id}
                    onChange={(e) => setFormData({ ...formData, ruangan_id: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-xs border border-amber-300 rounded-xl bg-amber-50/50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800"
                  >
                    <option value="">-- Pilih Bengkel / Workshop --</option>
                    {ruangans.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama_ruangan} ({r.jenis || 'Ruangan'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-amber-700 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Wajib diisi — digunakan untuk membatasi data distribusi yang dapat dilihat wakapro ini.
                  </p>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS ── */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl inline-block mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Hapus Pengguna Ini?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong>{userToDelete.nama_lengkap}</strong> ({userToDelete.username})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
