'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, User, X, BookOpen } from 'lucide-react';
import axios from '@/lib/axios';

interface NewsItem {
  id: number;
  title: string;
  description: string;
  content?: string;
  image: string;
  date: string;
  author: string;
}

const defaultNewsData: NewsItem[] = [
  {
    id: 1,
    title: 'Peresmian Laboratorium Komputer Baru',
    description: 'SMK PGRI Telagasari meresmikan laboratorium komputer dengan 40 unit PC terbaru yang dilengkapi dengan software pendukung pembelajaran programming dan desain grafis.',
    content: 'SMK PGRI Telagasari meresmikan fasilitas laboratorium komputer terbaru dengan 40 unit PC spesifikasi modern. Laboratorium ini dilengkapi dengan software pendukung pembelajaran programming, desain grafis, dan animasi untuk mendukung kompetensi siswa dalam menghadapi era digital.',
    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800',
    date: '15 Januari 2024',
    author: 'Kepala Sekolah'
  },
  {
    id: 2,
    title: 'Workshop Industri 4.0 untuk Siswa',
    description: 'Kegiatan workshop bertema Industri 4.0 diikuti oleh 150 siswa dengan menghadirkan praktisi dari berbagai perusahaan teknologi terkemuka.',
    content: 'Kegiatan workshop bertema Industri 4.0 diikuti oleh 150 siswa kejuruan dengan menghadirkan praktisi ahli dari perusahaan manufaktur dan teknologi terkemuka. Siswa diajarkan mengenai otomatisasi sistem dan IoT di dunia industri modern.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    date: '20 Januari 2024',
    author: 'Tim Humas'
  },
  {
    id: 3,
    title: 'Renovasi Gedung Workshop Teknik',
    description: 'Gedung workshop teknik telah selesai direnovasi dengan penambahan peralatan modern untuk mendukung pembelajaran praktik siswa jurusan teknik.',
    content: 'Gedung workshop teknik telah selesai direnovasi total dengan standarisasi industri dan penambahan peralatan mesin modern untuk mendukung pembelajaran praktik siswa kejuruan agar siap kerja.',
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800',
    date: '25 Januari 2024',
    author: 'Kepala Jurusan'
  },
  {
    id: 4,
    title: 'Penambahan Koleksi Buku Perpustakaan',
    description: 'Perpustakaan sekolah menambah 500 judul buku baru untuk mendukung literasi siswa dan referensi pembelajaran di berbagai bidang studi.',
    content: 'Perpustakaan sekolah menambah 500 judul buku referensi dan modul kejuruan baru untuk mendukung gerakan literasi siswa dan memperluas wawasan keilmuan di era global.',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
    date: '1 Februari 2024',
    author: 'Kepala Perpustakaan'
  }
];

function formatTanggalIndo(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function NewsCarousel() {
  const [newsList, setNewsList] = useState<NewsItem[]>(defaultNewsData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    // Ambil berita langsung dari API backend publik
    axios.get('/api/beritas')
      .then(res => {
        const raw = res.data?.data;
        if (Array.isArray(raw) && raw.length > 0) {
          const mapped: NewsItem[] = raw.map((item: any) => ({
            id: item.id,
            title: item.judul,
            description: item.ringkasan || item.konten || '',
            content: item.konten || item.ringkasan || '',
            image: item.gambar_url || item.gambar || 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800',
            date: formatTanggalIndo(item.tanggal),
            author: item.penulis || 'Super Admin'
          }));
          setNewsList(mapped);
          setCurrentIndex(0);
        }
      })
      .catch(err => {
        console.warn('Gagal memuat berita dari server, menggunakan data fallback:', err);
      });
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || newsList.length <= 1) return;
    
    const interval = setInterval(() => {
      setDirection('right');
      setCurrentIndex((prev) => (prev + 1) % newsList.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, newsList.length]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setDirection('left');
    setCurrentIndex((prev) => (prev - 1 + newsList.length) % newsList.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setDirection('right');
    setCurrentIndex((prev) => (prev + 1) % newsList.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setDirection(index > currentIndex ? 'right' : 'left');
    setCurrentIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsAutoPlaying(false);
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrevious();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  if (newsList.length === 0) {
    return null;
  }

  return (
    <section id="berita" className="bg-gray-50 py-16 md:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Berita &amp; Pengumuman
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Informasi terkini seputar kegiatan, pencapaian, dan perkembangan fasilitas di SMK PGRI Telagasari
          </p>
        </div>

        {/* Carousel */}
        <div className="relative bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="relative w-full h-full">
            {/* Slides Container */}
            <div
              className="flex transition-transform duration-700 ease-in-out" 
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {newsList.map((news) => (
                <div key={news.id} className="min-w-full grid md:grid-cols-2 gap-0">
                  {/* Image Side */}
                  <div className="relative h-64 md:h-auto md:min-h-[460px] bg-slate-900 overflow-hidden">
                    <img 
                      src={news.image} 
                      alt={news.title}
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800';
                      }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent md:hidden" />
                  </div>

                  {/* Content Side */}
                  <div className="p-6 sm:p-8 md:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mb-4 flex-wrap">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        <Calendar className="w-3.5 h-3.5" />
                        {news.date}
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {news.author}
                      </span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4 leading-tight">
                      {news.title}
                    </h3>

                    <p className="text-gray-600 leading-relaxed mb-6 line-clamp-4">
                      {news.description}
                    </p>

                    <div>
                      <button
                        onClick={() => setSelectedNews(news)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg shadow-blue-500/20 active:scale-95"
                      >
                        Baca Selengkapnya
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Buttons (hanya jika > 1 berita) */}
            {newsList.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-3 top-32 -translate-y-1/2 md:left-4 md:top-1/2 z-10 w-9 h-9 md:w-11 md:h-11 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-3 top-32 -translate-y-1/2 md:right-4 md:top-1/2 z-10 w-9 h-9 md:w-11 md:h-11 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                  aria-label="Berikutnya"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Slide Indicators - diletakkan di luar card agar tidak menutupi tombol atau teks */}
        {newsList.length > 1 && (
          <div className="flex justify-center items-center gap-2 mt-5">
            {newsList.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-7 bg-blue-600' 
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Baca Selengkapnya */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-scaleUp">
            <div className="relative h-64 sm:h-72 w-full bg-slate-900">
              <img 
                src={selectedNews.image} 
                alt={selectedNews.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800';
                }}
              />
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors backdrop-blur-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  <Calendar className="w-3.5 h-3.5" />
                  {selectedNews.date}
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {selectedNews.author}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {selectedNews.title}
              </h2>

              <div className="border-t border-slate-100 pt-4 text-slate-700 leading-relaxed space-y-3 whitespace-pre-line text-sm sm:text-base">
                {selectedNews.content || selectedNews.description}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedNews(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
