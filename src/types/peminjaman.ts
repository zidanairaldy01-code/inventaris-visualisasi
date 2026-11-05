export interface PengembalianItem {
  id: number;
  peminjaman_id: number;
  jumlah_kembali: number;
  tanggal_kembali: string;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Hilang';
  keterangan: string | null;
  id_user?: number | null;
  created_at?: string;
  user?: {
    id: number;
    nama_lengkap: string;
    role: string;
  };
}

export interface PeminjamanItem {
  id: number;
  id_aset?: number | null;
  sarana_prasarana_id?: number | null;
  nama_peminjam: string;
  role_peminjam: string;
  jumlah: number;
  total_dikembalikan?: number;
  sisa_pinjam?: number;
  tanggal_pinjam: string;
  tanggal_kembali_rencana: string | null;
  tanggal_kembali_aktual: string | null;
  keperluan: string | null;
  status: 'Dipinjam' | 'Dikembalikan Sebagian' | 'Dikembalikan' | 'Terlambat';
  aset?: {
    id: number;
    nama_aset: string;
    kode_aset: string | null;
    satuan: string;
    ruangan?: { nama_ruangan: string };
  };
  sarana_prasarana?: {
    id: number;
    nama_barang: string;
    kode: string | null;
    satuan: string | null;
    folder?: { nama_folder: string };
  };
  pengembalians?: PengembalianItem[];
}

