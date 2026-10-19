'use client';

import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, School, Target, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

import axios from '@/lib/axios';

interface SiteSettings {
  sekolah_nama?: string;
  sekolah_tagline?: string;
  sekolah_deskripsi1?: string;
  sekolah_deskripsi2?: string;
  sekolah_tahun_berdiri?: string;
  sekolah_hero_foto?: string;
  visi?: string;
  misi?: string;
  fasilitas_foto?: { url: string; caption: string }[];
  kontak_alamat?: string;
  kontak_telepon?: string;
  kontak_email?: string;
  maps_embed_url?: string;
}

export default function AboutSection() {
  const [s, setS] = useState<SiteSettings>({});
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    axios.get('/api/site-settings')
      .then(res => setS(res.data))
      .catch(() => {});
  }, []);

  const fotos: { url: string; caption: string }[] = Array.isArray(s.fasilitas_foto) && s.fasilitas_foto.length > 0
    ? s.fasilitas_foto
    : [
        { url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=600', caption: 'Gedung Sekolah' },
        { url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600', caption: 'Ruang Kelas' },
        { url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600', caption: 'Area Sekolah' },
      ];

  const totalSlides = Math.ceil(fotos.length / 3);
  const visibleFotos = fotos.slice(slideIndex * 3, slideIndex * 3 + 3);

  const prevSlide = () => setSlideIndex(i => (i - 1 + totalSlides) % totalSlides);
  const nextSlide = () => setSlideIndex(i => (i + 1) % totalSlides);

  const tahunBerdiri = s.sekolah_tahun_berdiri || '1999';
  const tahunPengalaman = new Date().getFullYear() - parseInt(tahunBerdiri) + '+';

  return (
    <section id="tentang" className="bg-white py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tentang Sekolah</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {s.sekolah_tagline || 'SMK PGRI Telagasari - Mencetak Generasi Terampil dan Berakhlak Mulia'}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Image Side */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={s.sekolah_hero_foto || 'https://images.unsplash.com/photo-1562774053-701939374585?w=800'}
                alt={s.sekolah_nama || 'SMK PGRI Telagasari'}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating Stats */}
            <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-xl p-6 border border-gray-100">
              <p className="text-4xl font-bold text-blue-600 mb-1">{tahunPengalaman}</p>
              <p className="text-sm text-gray-600">Tahun Pengalaman</p>
            </div>
          </div>

          {/* Content Side */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
              <School className="w-4 h-4" />
              SMK Unggulan
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              {s.sekolah_nama || 'SMK PGRI Telagasari'}
            </h3>

            {s.sekolah_deskripsi1 && (
              <p className="text-gray-600 leading-relaxed mb-6">{s.sekolah_deskripsi1}</p>
            )}
            {s.sekolah_deskripsi2 && (
              <p className="text-gray-600 leading-relaxed mb-6">{s.sekolah_deskripsi2}</p>
            )}

            {/* Visi & Misi */}
            <div className="grid gap-4">
              <div className="flex gap-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Visi</p>
                  <p className="text-sm text-gray-700">
                    {s.visi || 'Menjadi SMK unggul dalam menghasilkan lulusan yang kompeten, berakhlak mulia, dan berdaya saing global.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Misi</p>
                  <p className="text-sm text-gray-700">
                    {s.misi || 'Menyelenggarakan pendidikan kejuruan berbasis kompetensi dengan fasilitas modern dan kerjasama industri.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Facility Images — Carousel / Grid */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Fasilitas &amp; Lingkungan Sekolah</h3>
            {fotos.length > 3 && (
              <div className="flex items-center gap-2">
                <button onClick={prevSlide} className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500">{slideIndex + 1} / {totalSlides}</span>
                <button onClick={nextSlide} className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {visibleFotos.map((foto, idx) => (
              <div key={idx} className="aspect-[4/3] rounded-xl overflow-hidden group relative">
                <img
                  src={foto.url}
                  alt={foto.caption || `Fasilitas ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {foto.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/60 to-transparent px-3 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm font-medium">{foto.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          {fotos.length > 3 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === slideIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contact & Location */}
        <div className="bg-linear-to-br from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-6">Hubungi Kami</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Alamat</p>
                    <p className="text-blue-100 text-sm whitespace-pre-line">
                      {s.kontak_alamat || 'Jl. Raya Telagasari No. 123\nTelagasari, Karawang, Jawa Barat 41383'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Telepon</p>
                    <p className="text-blue-100 text-sm">{s.kontak_telepon || '(0267) 123-4567'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Email</p>
                    <p className="text-blue-100 text-sm">{s.kontak_email || 'info@smkpgritelagasari.sch.id'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6">Lokasi</h3>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-200">
                  {s.maps_embed_url ? (
                    <iframe
                      src={s.maps_embed_url}
                      className="w-full h-full"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <img
                      src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600"
                      alt="Lokasi Sekolah"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
