'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import PetugasDashboard from '@/components/dashboard/PetugasDashboard';
import { useRouter } from 'next/navigation';

interface PetugasStats {
  total_diinput: number;
  input_bulan_ini: number;
  menunggu_konfirmasi: number;
  selesai_serah_terima: number;
  distribusi_terbaru: any[];
  input_terbaru: any[];
  sebaran_bengkel: { nama_ruangan: string; total_aset: number }[];
}

const defaultPetugasStats: PetugasStats = {
  total_diinput: 0,
  input_bulan_ini: 0,
  menunggu_konfirmasi: 0,
  selesai_serah_terima: 0,
  distribusi_terbaru: [],
  input_terbaru: [],
  sebaran_bengkel: [],
};

export default function PetugasInputDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [petugasStats, setPetugasStats] = useState<PetugasStats>(defaultPetugasStats);
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
      axios.get('/api/stats/petugas').catch(() => ({ data: defaultPetugasStats })),
    ])
      .then(([userRes, petugasStatsRes]) => {
        setUser(userRes.data);
        
        // Verify user role is petugas
        if (userRes.data && userRes.data.role !== 'petugas') {
          router.push('/');
          return;
        }
        
        setPetugasStats({ ...defaultPetugasStats, ...petugasStatsRes.data });
      })
      .catch(err => {
        console.error('Gagal memuat statistik dashboard petugas', err);
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
    <PetugasDashboard
      user={user}
      greeting={greeting}
      petugasStats={petugasStats}
      loading={loading}
    />
  );
}
