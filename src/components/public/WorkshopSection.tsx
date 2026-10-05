'use client';

import { Wrench, Laptop, Zap, Cog } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from '@/lib/axios';

interface Workshop {
  id: number;
  nama_workshop: string;
  deskripsi: string;
  icon: string;
  kategori: string;
  foto_url: string | null;
  fasilitas: string[];
}

export default function WorkshopSection() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const fetchWorkshops = async () => {
    try {
      const response = await axios.get('/api/workshops');
      const data = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.data) ? response.data.data : []);
      setWorkshops(data);
    } catch (error) {
      console.error('Error fetching workshops:', error);
      setWorkshops([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const icons: any = {
      wrench: Wrench,
      laptop: Laptop,
      zap: Zap,
      cog: Cog
    };
    const IconComponent = icons[iconName] || Wrench;
    return <IconComponent className="w-6 h-6" />;
  };

  // Fallback image jika foto_url null
  const getImageUrl = (workshop: Workshop) => {
    if (workshop.foto_url) {
      return workshop.foto_url;
    }
    // Default images based on category
    const defaultImages: any = {
      'Otomotif': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600',
      'Teknologi': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600',
      'Listrik': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600',
      'Manufaktur': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600',
      'Multimedia': 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600',
    };
    return defaultImages[workshop.kategori] || 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600';
  };

  return (
    <section id="workshop" className="bg-white py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Workshop & Laboratorium
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Fasilitas workshop dan laboratorium yang lengkap untuk mendukung pembelajaran praktik siswa
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : workshops.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Belum ada workshop yang tersedia</p>
            <p className="text-sm text-gray-400 mt-1">Workshop akan ditampilkan setelah ditambahkan oleh admin</p>
          </div>
        ) : (
          /* Workshop Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((workshop) => (
              <div
                key={workshop.id}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  <img 
                    src={getImageUrl(workshop)} 
                    alt={workshop.nama_workshop}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-blue-600 text-white p-2 rounded-lg shadow-lg">
                    {getIcon(workshop.icon)}
                  </div>
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">
                    {workshop.kategori}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {workshop.nama_workshop}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    {workshop.deskripsi}
                  </p>

                  {/* Facilities */}
                  {workshop.fasilitas && workshop.fasilitas.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Fasilitas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {workshop.fasilitas.map((facility, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
