'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import WakaproDashboard from '@/components/dashboard/WakaproDashboard';
import { useRouter } from 'next/navigation';

interface WakaproStats {
  ruangan: any;
  total_unit: number;
  total_item_jenis: number;
  kondisi_baik: number;
  kondisi_rusak: number;
  menunggu_konfirmasi: number;
  menunggu_list: any[];
  aset_list: any[];
  distribusi_terbaru: any[];
}

const defaultWakaproStats: WakaproStats = {
  ruangan: null,
  total_unit: 0,
  total_item_jenis: 0,
  kondisi_baik: 0,
  kondisi_rusak: 0,
  menunggu_konfirmasi: 0,
  menunggu_list: [],
  aset_list: [],
  distribusi_terbaru: [],
};

export default function WakaproDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wakaproStats, setWakaproStats] = useState<WakaproStats>(defaultWakaproStats);
  const [loading, setLoading] = useState(true);

  const fetchAllStats = () => {
    setLoading(true);

    Promise.all([
      axios.get('/api/user').catch(() => ({ data: null })),
      axios.get('/api/stats/wakapro').catch(() => ({ data: defaultWakaproStats })),
    ])
      .then(([userRes, wakaproStatsRes]) => {
        setUser(userRes.data);
        
        // Verify user role is wakapro
        if (userRes.data && userRes.data.role !== 'wakapro') {
          router.push('/');
          return;
        }
        
        setWakaproStats({ ...defaultWakaproStats, ...wakaproStatsRes.data });
      })
      .catch(err => {
        console.error('Gagal memuat statistik dashboard wakapro', err);
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
    <WakaproDashboard
      user={user}
      wakaproStats={wakaproStats}
      loading={loading}
      onRefresh={fetchAllStats}
    />
  );
}
