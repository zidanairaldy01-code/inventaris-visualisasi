'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import WakasekDashboard from '@/components/dashboard/WakasekDashboard';
import { useRouter } from 'next/navigation';

interface WakasekStats {
  total_unit_bengkel: number;
  total_baik: number;
  total_rusak: number;
  rasio_kelaikan: number;
  total_bast_sah: number;
  total_surat_jalan: number;
  bengkel_list: {
    id: number;
    nama_ruangan: string;
    kode_ruangan: string;
    nama_gedung: string;
    wakapro: string;
    total_unit: number;
    kondisi_baik: number;
    kondisi_rusak: number;
    kesiapan_persen: number;
  }[];
  bast_terbaru: any[];
}

const defaultWakasekStats: WakasekStats = {
  total_unit_bengkel: 0,
  total_baik: 0,
  total_rusak: 0,
  rasio_kelaikan: 100,
  total_bast_sah: 0,
  total_surat_jalan: 0,
  bengkel_list: [],
  bast_terbaru: [],
};

export default function WakasekDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wakasekStats, setWakasekStats] = useState<WakasekStats>(defaultWakasekStats);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  const fetchAllStats = () => {
    setLoading(true);
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setGreeting('Selamat Pagi');
    else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang');
    else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');

    Promise.all([
      axios.get('/api/user').catch(() => ({ data: null })),
      axios.get('/api/stats/wakasek').catch(() => ({ data: defaultWakasekStats })),
    ])
      .then(([userRes, wakasekStatsRes]) => {
        setUser(userRes.data);
        
        // Verify user role is wakasek
        if (userRes.data && userRes.data.role !== 'wakasek') {
          router.push('/');
          return;
        }
        
        setWakasekStats({ ...defaultWakasekStats, ...wakasekStatsRes.data });
      })
      .catch(err => {
        console.error('Gagal memload statistik dashboard wakasek', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  if (!user && !loading) {
    return null;
  }

  return (
    <WakasekDashboard
      user={user}
      greeting={greeting}
      wakasekStats={wakasekStats}
      loading={loading}
    />
  );
}
