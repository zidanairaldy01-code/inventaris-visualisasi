import { redirect } from 'next/navigation';

export default function InventarisRootPage() {
  // Default ke belanja (format lama yang sudah ada)
  redirect('/dashboard/inventaris/belanja');
  
  // Atau bisa ke barang untuk format baru:
  // redirect('/dashboard/inventaris/barang');
}
