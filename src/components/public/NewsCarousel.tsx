'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';

interface NewsItem {
  id: number;
  title: string;
  description: string;
  image: string;
  date: string;
  author: string;
}

// Mock data - nanti bisa diganti dengan API call
const newsData: NewsItem[] = [
  {
    id: 1,
    title: 'Peresmian Laboratorium Komputer Baru',
    description: 'SMK PGRI Telagasari meresmikan laboratorium komputer dengan 40 unit PC terbaru yang dilengkapi dengan software pendukung pembelajaran programming dan desain grafis.',
    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800',
    date: '15 Januari 2024',
    author: 'Kepala Sekolah'
  },
  {
    id: 2,
    title: 'Workshop Industri 4.0 untuk Siswa',
    description: 'Kegiatan workshop bertema Industri 4.0 diikuti oleh 150 siswa dengan menghadirkan praktisi dari berbagai perusahaan teknologi terkemuka.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    date: '20 Januari 2024',
    author: 'Tim Humas'
  },
  {
    id: 3,
    title: 'Renovasi Gedung Workshop Teknik',
    description: 'Gedung workshop teknik telah selesai direnovasi dengan penambahan peralatan modern untuk mendukung pembelajaran praktik siswa jurusan teknik.',
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800',
    date: '25 Januari 2024',
    author: 'Kepala Jurusan'
  },
  {
    id: 4,
    title: 'Penambahan Koleksi Buku Perpustakaan',
    description: 'Perpustakaan sekolah menambah 500 judul buku baru untuk mendukung literasi siswa dan referensi pembelajaran di berbagai bidang studi.',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
    date: '1 Februari 2024',
    author: 'Kepala Perpustakaan'
  }
];

export default function NewsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setDirection('right');
      setCurrentIndex((prev) => (prev + 1) % newsData.length);
    }, 5000); // Durasi 5 detik

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setDirection('left');
    setCurrentIndex((prev) => (prev - 1 + newsData.length) % newsData.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setDirection('right');
    setCurrentIndex((prev) => (prev + 1) % newsData.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setDirection(index > currentIndex ? 'right' : 'left');
    setCurrentIndex(index);
  };

  const currentNews = newsData[currentIndex];

  return (
    <section id="berita" className="bg-gray-50 py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Berita & Pengumuman
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Informasi terkini seputar kegiatan, pencapaian, dan perkembangan fasilitas di SMK PGRI Telagasari
          </p>
        </div>

        {/* Carousel */}
        <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="relative w-full h-full">
            {/* Slides Container */}
            <div className="flex transition-transform duration-700 ease-in-out" 
                 style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
              {newsData.map((news, index) => (
                <div key={news.id} className="min-w-full grid md:grid-cols-2 gap-0">
                  {/* Image Side */}
                  <div className="relative h-64 md:h-auto md:min-h-[500px] bg-gray-900 overflow-hidden">
                    <img 
                      src={news.image} 
                      alt={news.title}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                  </div>

                  {/* Content Side */}
                  <div className="p-8 md:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {news.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {news.author}
                      </span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                      {news.title}
                    </h3>

                    <p className="text-gray-600 leading-relaxed mb-6">
                      {news.description}
                    </p>

                    <button className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                      Baca Selengkapnya
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {newsData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'w-8 bg-white' 
                      : 'w-2 bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
