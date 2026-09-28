'use client';

import { GraduationCap, Award } from 'lucide-react';

interface Kelas {
  id: number;
  name: string;
  jurusan: string;
  description: string;
  image: string;
  color: string;
}

// Mock data - nanti bisa diganti dengan API call
const kelasData: Kelas[] = [
  {
    id: 1,
    name: 'Teknik Kendaraan Ringan Otomotif',
    jurusan: 'TKRO',
    description: 'Program keahlian yang mempelajari perawatan, perbaikan, dan teknologi kendaraan ringan modern.',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600',
    color: 'blue'
  },
  {
    id: 2,
    name: 'Teknik Komputer dan Jaringan',
    jurusan: 'TKJ',
    description: 'Mempelajari instalasi, konfigurasi, dan troubleshooting sistem komputer serta jaringan.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
    color: 'green'
  },
  {
    id: 3,
    name: 'Teknik Instalasi Tenaga Listrik',
    jurusan: 'TITL',
    description: 'Program keahlian instalasi, perawatan, dan perbaikan sistem kelistrikan industri dan rumah tangga.',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600',
    color: 'yellow'
  },
  {
    id: 4,
    name: 'Teknik Pemesinan',
    jurusan: 'TP',
    description: 'Mempelajari proses manufaktur, pengoperasian mesin konvensional dan CNC.',
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600',
    color: 'red'
  },
  {
    id: 5,
    name: 'Multimedia',
    jurusan: 'MM',
    description: 'Program keahlian desain grafis, video editing, animasi, dan web development.',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600',
    color: 'purple'
  },
  {
    id: 6,
    name: 'Rekayasa Perangkat Lunak',
    jurusan: 'RPL',
    description: 'Mempelajari pemrograman, pengembangan aplikasi, dan sistem informasi berbasis web dan mobile.',
    image: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600',
    color: 'indigo'
  }
];

const colorClasses: any = {
  blue: {
    bg: 'from-blue-500 to-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'bg-blue-600'
  },
  green: {
    bg: 'from-green-500 to-green-600',
    badge: 'bg-green-100 text-green-700',
    icon: 'bg-green-600'
  },
  yellow: {
    bg: 'from-yellow-500 to-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: 'bg-yellow-600'
  },
  red: {
    bg: 'from-red-500 to-red-600',
    badge: 'bg-red-100 text-red-700',
    icon: 'bg-red-600'
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'bg-purple-600'
  },
  indigo: {
    bg: 'from-indigo-500 to-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
    icon: 'bg-indigo-600'
  }
};

export default function KelasSection() {
  return (
    <section id="kelas" className="bg-gray-50 py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Program Keahlian
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Berbagai program keahlian yang tersedia di SMK PGRI Telagasari dengan fasilitas lengkap dan tenaga pengajar profesional
          </p>
        </div>

        {/* Kelas Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kelasData.map((kelas) => {
            const colors = colorClasses[kelas.color];
            return (
              <div
                key={kelas.id}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-300"
              >
                {/* Header with Gradient */}
                <div className={`relative h-32 bg-gradient-to-br ${colors.bg} p-6 flex items-end`}>
                  <div className="absolute top-4 right-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className={`${colors.badge} text-xs font-bold px-3 py-1 rounded-full`}>
                    {kelas.jurusan}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                    {kelas.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {kelas.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Info */}
        <div className="mt-12 bg-white border border-gray-200 rounded-xl p-8">
          <div className="grid md:grid-cols-2 gap-6 text-center max-w-2xl mx-auto">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-bold text-gray-900 mb-1">Akreditasi A</p>
              <p className="text-sm text-gray-600">Semua Jurusan Terakreditasi</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6 text-purple-600" />
              </div>
              <p className="font-bold text-gray-900 mb-1">95% Alumni</p>
              <p className="text-sm text-gray-600">Bekerja & Kuliah</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
