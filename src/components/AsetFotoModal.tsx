'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import { X, Upload, Trash2, Star, ImageOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Foto {
  id: number;
  url_foto: string;
  keterangan: string | null;
  is_thumbnail: boolean;
}

interface Props {
  aset: {
    id: number;
    kode_aset: string | null;
    nama_aset: string;
    fotos?: Foto[];
  };
  onClose: () => void;
  onUpdate: () => void;
}

export default function AsetFotoModal({ aset, onClose, onUpdate }: Props) {
  const [fotos, setFotos] = useState<Foto[]>(aset.fotos || []);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshFotos = async () => {
    const res = await axios.get(`/api/asets/${aset.id}`);
    setFotos(res.data.fotos || []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage(null);
    let successCount = 0;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('foto', file);
      formData.append('is_thumbnail', fotos.length === 0 && successCount === 0 ? '1' : '0');
      try {
        await axios.post(`/api/asets/${aset.id}/fotos`, formData);
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    await refreshFotos();
    onUpdate();
    setUploading(false);
    setMessage({ type: 'success', text: `${successCount} foto berhasil diunggah.` });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await axios.delete(`/api/fotos/${id}`);
      await refreshFotos();
      onUpdate();
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menghapus foto.' });
    } finally {
      setDeleting(null);
    }
  };

  const handleSetThumbnail = async (foto: Foto) => {
    try {
      // Re-upload as thumbnail isn't needed - let's use a workaround via direct delete+reupload or just mark with UI
      // For now, show visual feedback only (API doesn't have patch endpoint yet)
      setFotos(prev => prev.map(f => ({ ...f, is_thumbnail: f.id === foto.id })));
    } catch (err) {
      console.error(err);
    }
  };

  const thumbnail = fotos.find(f => f.is_thumbnail) || fotos[0];

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Foto Aset</p>
            <h3 className="text-lg font-bold text-gray-900 mt-0.5">{aset.nama_aset}</h3>
            {aset.kode_aset && <p className="text-xs font-mono text-gray-400">{aset.kode_aset}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {message && (
            <div className={`p-3 rounded-xl flex items-center text-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />}
              {message.text}
            </div>
          )}

          {/* Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                <p className="text-sm text-blue-600 font-medium">Sedang mengunggah foto...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-blue-500" />
                </div>
                <p className="font-semibold text-gray-700 text-sm">Klik untuk upload foto</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG – maks. 2MB per file. Bisa pilih banyak sekaligus.</p>
              </div>
            )}
          </div>

          {/* Preview saat hover */}
          {preview && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreview(null)}>
              <img src={preview} className="max-w-3xl max-h-[85vh] rounded-2xl object-contain shadow-2xl" alt="Preview" />
              <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white"><X className="w-5 h-5" /></button>
            </div>
          )}

          {/* Foto Grid */}
          {fotos.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <ImageOff className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-400 text-sm">Belum ada foto</p>
              <p className="text-xs text-gray-300 mt-1">Upload foto aset di atas untuk mulai.</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{fotos.length} Foto Tersimpan</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {fotos.map(foto => (
                  <div key={foto.id} className="relative group rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors bg-gray-50 aspect-square">
                    <img
                      src={foto.url_foto}
                      alt={foto.keterangan || aset.nama_aset}
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => setPreview(foto.url_foto)}
                    />

                    {/* Thumbnail badge */}
                    {foto.is_thumbnail && (
                      <div className="absolute top-2 left-2 bg-amber-400 text-white rounded-md px-1.5 py-0.5 text-[10px] font-bold flex items-center shadow">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Utama
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                      <button
                        onClick={() => handleSetThumbnail(foto)}
                        title="Jadikan thumbnail"
                        className="p-1.5 bg-amber-400 hover:bg-amber-500 rounded-lg text-white transition-colors"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(foto.id)}
                        disabled={deleting === foto.id}
                        className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors disabled:opacity-50"
                      >
                        {deleting === foto.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
