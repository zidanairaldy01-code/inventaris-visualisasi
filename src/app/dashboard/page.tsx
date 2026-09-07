'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import WakaproDashboard from '@/components/dashboard/WakaproDashboard';
import WakasekDashboard from '@/components/dashboard/WakasekDashboard';
import PetugasDashboard from '@/components/dashboard/PetugasDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

interface StatsData {
  total_item: number;
  total_unit: number;
  total_nilai: number;
  total_ruangan: number;
  total_ruangan_all: number;
  total_ruangan_gedung: number;
  total_ruangan_workshop: number;
  total_gedung: number;
  total_belanja: number;
  total_item_belanja: number;
  total_nilai_pembelian_sarana: number;
  total_nilai_sekarang_sarana: number;
  total_item_sarana: number;
  total_peminjaman_aktif: number;
  total_servis_proses: number;
}

interface PetugasStats {
  total_diinput: number;
  input_bulan_ini: number;
  menunggu_konfirmasi: number;
  selesai_serah_terima: number;
  distribusi_terbaru: any[];
  input_terbaru: any[];
  sebaran_bengkel: { nama_ruangan: string; total_aset: number }[];
}

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

const defaultStats: StatsData = {
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
};

const defaultPetugasStats: PetugasStats = {
  total_diinput: 0,
  input_bulan_ini: 0,
  menunggu_konfirmasi: 0,
  selesai_serah_terima: 0,
  distribusi_terbaru: [],
  input_terbaru: [],
  sebaran_bengkel: [],
};

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

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<StatsData>(defaultStats);
  const [petugasStats, setPetugasStats] = useState<PetugasStats>(defaultPetugasStats);
  const [wakaproStats, setWakaproStats] = useState<WakaproStats>(defaultWakaproStats);
  const [wakasekStats, setWakasekStats] = useState<WakasekStats>(defaultWakasekStats);
  const [histories, setHistories] = useState<any[]>([]);
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
      axios.get('/api/stats').catch(() => ({ data: defaultStats })),
      axios.get('/api/stats/petugas').catch(() => ({ data: defaultPetugasStats })),
      axios.get('/api/stats/wakapro').catch(() => ({ data: defaultWakaproStats })),
      axios.get('/api/stats/wakasek').catch(() => ({ data: defaultWakasekStats })),
      axios.get('/api/histories').catch(() => ({ data: [] })),
    ])
      .then(([userRes, statsRes, petugasStatsRes, wakaproStatsRes, wakasekStatsRes, historyRes]) => {
        setUser(userRes.data);
        setData({ ...defaultStats, ...statsRes.data });
        setPetugasStats({ ...defaultPetugasStats, ...petugasStatsRes.data });
        setWakaproStats({ ...defaultWakaproStats, ...wakaproStatsRes.data });
        setWakasekStats({ ...defaultWakasekStats, ...wakasekStatsRes.data });
        const rawHistory = Array.isArray(historyRes.data) ? historyRes.data : (historyRes.data?.data ?? []);
        setHistories(rawHistory.slice(0, 5));
      })
      .catch(err => {
        console.error('Gagal memuat statistik dashboard', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  const isPetugas = user?.role === 'petugas';
  const isWakapro = user?.role === 'wakapro';
  const isWakasek = user?.role === 'wakasek';

  // 1. Dedicated Dashboard for Wakapro (Kepala Bengkel Jurusan)
  if (isWakapro) {
    return (
      <WakaproDashboard
        user={user}
        wakaproStats={wakaproStats}
        loading={loading}
        onRefresh={fetchAllStats}
      />
    );
  }

  // 2. Dedicated Dashboard for Wakasek (Executive Monitoring Sarpras)
  if (isWakasek) {
    return (
      <WakasekDashboard
        user={user}
        greeting={greeting}
        wakasekStats={wakasekStats}
        loading={loading}
      />
    );
  }

  // 3. Dedicated Dashboard for Petugas Input Sarpras
  if (isPetugas) {
    return (
      <PetugasDashboard
        user={user}
        greeting={greeting}
        petugasStats={petugasStats}
        loading={loading}
      />
    );
  }

  // 4. Dedicated Master Dashboard for Super Admin & Admin
  return (
    <AdminDashboard
      user={user}
      greeting={greeting}
      stats={data}
      recentActivity={histories}
      recentBelanja={[]}
      recentSarana={wakaproStats.aset_list || []}
      loading={loading}
    />
  );
}
