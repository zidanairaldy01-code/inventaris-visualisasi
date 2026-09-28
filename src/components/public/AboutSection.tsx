'use client';

import { MapPin, Phone, Mail, School, Target, Eye } from 'lucide-react';

export default function AboutSection() {
  return (
    <section id="tentang" className="bg-white py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Tentang Sekolah
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            SMK PGRI Telagasari - Mencetak Generasi Terampil dan Berakhlak Mulia
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Image Side */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1562774053-701939374585?w=800"
                alt="SMK PGRI Telagasari"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating Stats */}
            <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-xl p-6 border border-gray-100">
              <p className="text-4xl font-bold text-blue-600 mb-1">25+</p>
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
              SMK PGRI Telagasari
            </h3>

            <p className="text-gray-600 leading-relaxed mb-6">
              SMK PGRI Telagasari adalah institusi pendidikan kejuruan yang telah berdiri sejak tahun 1999. 
              Kami berkomitmen untuk menghasilkan lulusan yang kompeten, profesional, dan siap kerja dengan 
              membekali siswa dengan keterampilan praktis dan pengetahuan teori yang seimbang.
            </p>

            <p className="text-gray-600 leading-relaxed mb-6">
              Dengan fasilitas workshop dan laboratorium yang lengkap serta tenaga pengajar berpengalaman, 
              kami memastikan setiap siswa mendapatkan pendidikan berkualitas tinggi yang sesuai dengan 
              kebutuhan industri saat ini.
            </p>

            {/* Vision & Mission Cards */}
            <div className="grid gap-4">
              <div className="flex gap-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Visi</p>
                  <p className="text-sm text-gray-700">
                    Menjadi SMK unggul dalam menghasilkan lulusan yang kompeten, berakhlak mulia, dan berdaya saing global.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Misi</p>
                  <p className="text-sm text-gray-700">
                    Menyelenggarakan pendidikan kejuruan berbasis kompetensi dengan fasilitas modern dan kerjasama industri.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Facility Images Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Fasilitas & Lingkungan Sekolah
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="aspect-[4/3] rounded-xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=600"
                alt="Gedung Sekolah"
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600"
                alt="Ruang Kelas"
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600"
                alt="Area Sekolah"
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-6">Hubungi Kami</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Alamat</p>
                    <p className="text-blue-100 text-sm">
                      Jl. Raya Telagasari No. 123<br />
                      Telagasari, Karawang, Jawa Barat 41383
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Telepon</p>
                    <p className="text-blue-100 text-sm">(0267) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Email</p>
                    <p className="text-blue-100 text-sm">info@smkpgritelagasari.sch.id</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6">Lokasi</h3>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  {/* Placeholder for map - bisa diganti dengan Google Maps embed */}
                  <img 
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600"
                    alt="Map"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
