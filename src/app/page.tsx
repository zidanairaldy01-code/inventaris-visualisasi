'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import PublicNavbar from '@/components/public/PublicNavbar';
import HeroSection from '@/components/public/HeroSection';
import NewsCarousel from '@/components/public/NewsCarousel';
import WorkshopSection from '@/components/public/WorkshopSection';
import AboutSection from '@/components/public/AboutSection';
import CatalogSection from '@/components/public/CatalogSection';
import PublicFooter from '@/components/public/PublicFooter';

interface Stats {
  total_item: number;
  total_unit: number;
  total_nilai: number;
  total_ruangan?: number;
}

export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ruanganCount, setRuanganCount] = useState(0);

  useEffect(() => {
    Promise.all([
      axios.get('/api/stats'),
      axios.get('/api/ruangans'),
    ]).then(([statsRes, ruanganRes]) => {
      const statsData = statsRes.data;
      statsData.total_ruangan = ruanganRes.data.length;
      setStats(statsData);
      setRuanganCount(ruanganRes.data.length);
    }).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicNavbar />
      <HeroSection stats={stats} />
      <NewsCarousel />
      <WorkshopSection />
      <CatalogSection />
      <AboutSection />
      <PublicFooter />
    </div>
  );
}
