'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import Cookies from 'js-cookie';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const token = Cookies.get('auth_token');
      if (!token) {
        console.log('No token found, redirecting to login...');
        router.push('/login');
        return;
      }

      console.log('Token found, fetching user data...');
      const userRes = await axios.get('/api/user');
      const role = userRes.data?.role;
      
      console.log('Dashboard: User role detected:', role);
      setUser(userRes.data);

      // Redirect non-super_admin users to their dashboards
      if (role === 'petugas') {
        console.log('Redirecting to petugas dashboard...');
        router.push('/petugas-input');
        return;
      } else if (role === 'wakapro') {
        console.log('Redirecting to wakapro dashboard...');
        router.push('/wakapro');
        return;
      } else if (role === 'wakasek') {
        console.log('Redirecting to wakasek dashboard...');
        router.push('/wakasek');
        return;
      } else if (role === 'super_admin') {
        // Super admin stays here - load dashboard data
        console.log('Loading super admin dashboard...');
        setIsChecking(false);
        await loadDashboardData();
      } else {
        // Unknown role - redirect to login
        console.warn('Unknown role:', role);
        Cookies.remove('auth_token');
        router.push('/login');
      }
    } catch (err: any) {
      console.error('Error checking user role:', err);
      console.error('Error status:', err.response?.status);
      
      // If 401, token is invalid
      if (err.response?.status === 401) {
        console.log('Token invalid (401), clearing and redirecting to login...');
        Cookies.remove('auth_token');
        router.push('/login');
      } else {
        // Other errors, still redirect to login for safety
        console.log('Unknown error, redirecting to login...');
        Cookies.remove('auth_token');
        router.push('/login');
      }
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    
    // For now, just use default stats to avoid 401 errors
    // TODO: Create proper admin stats endpoint in backend
    setStats(getDefaultStats());
    setLoading(false);
    
    /* Commented out until backend stats endpoint is fixed
    try {
      const statsRes = await axios.get('/api/stats').catch(() => null);
      
      if (statsRes?.data) {
        setStats(statsRes.data);
      } else {
        await loadFallbackStats();
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setStats(getDefaultStats());
    } finally {
      setLoading(false);
    }
    */
  };

  const getDefaultStats = () => ({
    total_item: 0,
    total_unit: 0,
    total_nilai: 0,
    total_ruangan: 0,
    total_ruangan_all: 0,
    total_ruangan_gedung: 0,
    total_ruangan_workshop: 0,
    total_gedung: 0,
    total_belanja: 0,
    total_item_belanja: 0,
    total_nilai_pembelian_sarana: 0,
    total_nilai_sekarang_sarana: 0,
    total_item_sarana: 0,
    total_peminjaman_aktif: 0,
    total_servis_proses: 0,
  });

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
          <p className="text-gray-600 text-sm font-medium">Memproses akun Anda...</p>
        </div>
      </div>
    );
  }

  // Super admin dashboard
  if (user?.role === 'super_admin') {
    const greeting = (() => {
      const hour = new Date().getHours();
      if (hour < 11) return 'Selamat Pagi';
      if (hour < 15) return 'Selamat Siang';
      if (hour < 18) return 'Selamat Sore';
      return 'Selamat Malam';
    })();

    return (
      <AdminDashboard
        user={user}
        greeting={greeting}
        stats={stats || getDefaultStats()}
        recentActivity={[]}
        recentBelanja={[]}
        recentSarana={[]}
        loading={loading}
      />
    );
  }

  // Fallback
  return null;
}
