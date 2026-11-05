'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import { showErrorAlert } from '@/utils/errorHandler';
import { X, RotateCcw, AlertTriangle, Info, CheckCircle2, Loader2, Package, User } from 'lucide-react';
import { PeminjamanItem } from '@/types/peminjaman';

interface PengembalianModalProps {
  isOpen: boolean;
  onClose: () => void;
  peminjaman: PeminjamanItem | null;
  onSuccess: () => void;
}

export default function PengembalianModal({
  isOpen,
  onClose,
  peminjaman,
  onSuccess,
}: PengembalianModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalKembali = peminjaman?.total_dikembalikan ?? (
    peminjaman?.pengembalians ? peminjaman.pengembalians.reduce((acc, p) => acc + Number(p.jumlah_kembali), 0) : 0
  );
  const sisaPinjam = peminjaman ? Math.max(0, peminjaman.jumlah - totalKembali) : 0;

  const [formData, setFormData] = useState({
    jumlah_kembali: 1,
    tanggal_kembali: new Date().toISOString().split('T')[0],
    kondisi: 'Baik' as 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Hilang',
    keterangan: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (peminjaman) {
      setFormData({
        jumlah_kembali: sisaPinjam > 0 ? sisaPinjam : 1,
        tanggal_kembali: new Date().toISOString().split('T')[0],
        kondisi: 'Baik',
        keterangan: '',
      });
    }
  }, [peminjaman, sisaPinjam]);

  if (!isOpen || !mounted || !peminjaman) return null;

  const namaBarang = peminjaman.sarana_prasarana?.nama_barang || peminjaman.aset?.nama_aset || 'Barang';
  const satuan = peminjaman.sarana_prasarana?.satuan || peminjaman.aset?.satuan || 'Unit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const jumlah = Number(formData.jumlah_kembali);
    if (!jumlah || jumlah < 1) {
      showErrorAlert('Jumlah yang dikembalikan minimal 1 unit.', 'Validasi Pengembalian');
      return;
    }

    if (jumlah > sisaPinjam) {
      showErrorAlert(
        `Jumlah yang dikembalikan (${jumlah}) tidak boleh melebihi sisa pinjaman (${sisaPinjam} ${satuan}).`,
        'Validasi Pengembalian'
      );
      return;
    }

    if (!formData.tanggal_kembali) {
      showErrorAlert('Tanggal pengembalian wajib diisi.', 'Validasi Pengembalian');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`/api/peminjamans/${peminjaman.id}/pengembalian`, {
        jumlah_kembali: jumlah,
        tanggal_kembali: formData.tanggal_kembali,
        kondisi: formData.kondisi,
        keterangan: formData.keterangan || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Gagal mencatat pengembalian:', err);
      showErrorAlert(err, 'Gagal Mencatat Pengembalian');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-linear-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pengembalian Barang</h3>
              <p className="text-xs text-slate-500">Form pengembalian bertahap maupun penuh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Ringkasan Pinjaman */}
        <div className="p-5 pb-0">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center">
                <User className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Peminjam:
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {peminjaman.nama_peminjam} ({peminjaman.role_peminjam})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center">
                <Package className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Barang:
              </span>
              <span className="text-xs font-semibold text-indigo-900">
                {namaBarang}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Total Pinjam</p>
                <p className="text-sm font-extrabold text-slate-800">{peminjaman.jumlah} <span className="text-[10px] font-normal">{satuan}</span></p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Sudah Kembali</p>
                <p className="text-sm font-extrabold text-emerald-600">{totalKembali} <span className="text-[10px] font-normal">{satuan}</span></p>
              </div>
              <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                <p className="text-[10px] text-amber-700 uppercase font-bold">Sisa Pinjaman</p>
                <p className="text-sm font-extrabold text-amber-700">{sisaPinjam} <span className="text-[10px] font-normal">{satuan}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Jumlah yang Dikembalikan <span className="text-red-500">*</span>
              </label>
              {sisaPinjam > 1 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, jumlah_kembali: sisaPinjam })}
                  className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 underline"
                >
                  Kembalikan Semua ({sisaPinjam})
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={sisaPinjam}
                required
                value={formData.jumlah_kembali}
                onChange={(e) => setFormData({ ...formData, jumlah_kembali: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-800"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                {satuan} (Maks: {sisaPinjam})
              </span>
            </div>
            {Number(formData.jumlah_kembali) < sisaPinjam && Number(formData.jumlah_kembali) > 0 && (
              <p className="text-[11px] text-blue-600 mt-1 flex items-center">
                <Info className="h-3 w-3 mr-1 shrink-0" />
                Pengembalian sebagian: Masih tersisa {sisaPinjam - Number(formData.jumlah_kembali)} {satuan} yang dipinjam.
              </p>
            )}
            {Number(formData.jumlah_kembali) === sisaPinjam && sisaPinjam > 0 && (
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                Pengembalian penuh: Peminjaman ini akan dinyatakan selesai/lunas dikembalikan.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Pengembalian <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.tanggal_kembali}
              onChange={(e) => setFormData({ ...formData, tanggal_kembali: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kondisi Barang Saat Dikembalikan <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.kondisi}
              onChange={(e) => setFormData({ ...formData, kondisi: e.target.value as any })}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 cursor-pointer"
            >
              <option value="Baik">Baik (Normal / Siap Pakai)</option>
              <option value="Rusak Ringan">Rusak Ringan (Perlu Servis Ringan)</option>
              <option value="Rusak Berat">Rusak Berat (Tidak Berfungsi)</option>
              <option value="Hilang">Hilang (Tidak Kembali Fisik)</option>
            </select>

            {/* Alert Kondisi Hilang */}
            {formData.kondisi === 'Hilang' && (
              <div className="mt-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start space-x-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Perhatian: Pengurangan Stok Otomatis</p>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    Barang yang dinyatakan <strong>Hilang</strong> sejumlah {formData.jumlah_kembali} {satuan} akan otomatis <strong>mengurangi stok fisik</strong> di master inventaris sarana prasarana.
                  </p>
                </div>
              </div>
            )}

            {/* Info Kondisi Rusak */}
            {(formData.kondisi === 'Rusak Ringan' || formData.kondisi === 'Rusak Berat') && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start space-x-2 text-xs">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Catatan Kerusakan</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Stok fisik barang tetap dipertahankan dan riwayat kondisi dicatat dalam sistem. Tuliskan detail kerusakan pada kolom catatan di bawah.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Keterangan Tambahan
            </label>
            <textarea
              rows={2}
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              placeholder="Contoh: Kabel charger lengkap, atau catatan kondisi barang saat diterima..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || sisaPinjam <= 0}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Konfirmasi Pengembalian
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

