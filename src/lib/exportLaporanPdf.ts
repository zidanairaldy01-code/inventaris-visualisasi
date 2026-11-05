import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportLaporanPdfParams {
  tipe: 'sarana-prasarana' | 'servis' | 'peminjaman';
  label: string;
  dari: string;
  sampai: string;
  columns: { key: string; label: string; align?: 'right' }[];
  data: Record<string, any>[];
  ringkasan?: {
    total_item?: number;
    total_unit?: number;
    total_nilai?: number;
    total_nilai_pembelian?: number;
    total_nilai_sekarang?: number;
    per_kategori?: Record<string, { jumlah_item: number; total_unit: number; total_nilai: number }>;
    per_kondisi?: Record<string, number>;
    total_catatan?: number;
    total_biaya?: number;
    per_status?: Record<string, number>;
    total_transaksi?: number;
    per_role?: Record<string, number>;
  };
}

const formatTglIndo = (dateStr?: string) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const formatRupiah = (val?: number | string) => {
  if (val === undefined || val === null || val === '') return '-'
  const num = typeof val === 'string' ? parseFloat(val) : val
  if (isNaN(num)) return String(val)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num)
}

export function exportLaporanPdf({
  tipe,
  label,
  dari,
  sampai,
  columns,
  data,
  ringkasan,
}: ExportLaporanPdfParams) {
  // Gunakan orientasi Landscape A4 agar kolom-kolom laporan lapang dan mudah dibaca
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pw = doc.internal.pageSize.getWidth() // 297 mm
  const ph = doc.internal.pageSize.getHeight() // 210 mm
  const margin = 12

  // ─── 1. Kop Surat Resmi Sekolah ─────────────────────────────────────────────
  // Garis tebal atas warna biru identitas
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pw, 5, 'F')

  // Nama Sekolah
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('SMK PGRI TELAGASARI', pw / 2, 14, { align: 'center' })

  // Subjudul / Alamat Sekolah
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(75, 85, 99)
  doc.text(
    'Jl. Raya Telagasari - Kosambi No. 67, Telagasari, Karawang, Jawa Barat 41381  |  Telp. (0267) 510365',
    pw / 2,
    19,
    { align: 'center' }
  )
  doc.text(
    'Website: smkpgritelagasari.sch.id  |  Email: info@smkpgritelagasari.sch.id',
    pw / 2,
    23,
    { align: 'center' }
  )

  // Garis Pemisah Kop Surat (Ganda)
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.8)
  doc.line(margin, 26, pw - margin, 26)
  doc.setLineWidth(0.2)
  doc.line(margin, 27.2, pw - margin, 27.2)

  // ─── 2. Judul Dokumen & Periode ──────────────────────────────────────────────
  let y = 34
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text(label.toUpperCase(), pw / 2, y, { align: 'center' })

  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  const periodeStr = `Periode: ${formatTglIndo(dari)} s/d ${formatTglIndo(sampai)}`
  doc.text(periodeStr, pw / 2, y, { align: 'center' })

  y += 6

  // ─── 3. Ringkasan Eksekutif (Summary Box) ──────────────────────────────────
  if (ringkasan) {
    const boxW = pw - margin * 2
    const summaryItems: { label: string; value: string }[] = []

    if (tipe === 'sarana-prasarana') {
      summaryItems.push({ label: 'Total Jenis Barang', value: `${ringkasan.total_item ?? 0} Jenis` })
      summaryItems.push({ label: 'Total Unit Fisik', value: `${(ringkasan.total_unit ?? 0).toLocaleString('id-ID')} Unit` })
      if (ringkasan.total_nilai_pembelian !== undefined || ringkasan.total_nilai !== undefined) {
        summaryItems.push({
          label: 'Total Nilai Pembelian',
          value: formatRupiah(ringkasan.total_nilai_pembelian ?? ringkasan.total_nilai ?? 0),
        })
      }
      if (ringkasan.total_nilai_sekarang !== undefined) {
        summaryItems.push({
          label: 'Total Nilai Sekarang',
          value: formatRupiah(ringkasan.total_nilai_sekarang ?? 0),
        })
      }
      if (ringkasan.per_kondisi && Object.keys(ringkasan.per_kondisi).length > 0) {
        const kondisiStr = Object.entries(ringkasan.per_kondisi)
          .map(([k, count]) => `${k}: ${count}`)
          .join(' | ')
        summaryItems.push({ label: 'Kondisi Fisik', value: kondisiStr })
      }
    } else if (tipe === 'servis') {
      summaryItems.push({ label: 'Total Catatan Servis', value: `${ringkasan.total_catatan ?? 0} Transaksi` })
      if (ringkasan.total_biaya !== undefined) {
        summaryItems.push({ label: 'Total Biaya Servis', value: formatRupiah(ringkasan.total_biaya) })
      }
      if (ringkasan.per_status && Object.keys(ringkasan.per_status).length > 0) {
        const statusStr = Object.entries(ringkasan.per_status)
          .map(([s, c]) => `${s}: ${c}`)
          .join(' | ')
        summaryItems.push({ label: 'Rincian Status', value: statusStr })
      }
    } else if (tipe === 'peminjaman') {
      summaryItems.push({ label: 'Total Transaksi Pinjam', value: `${ringkasan.total_transaksi ?? 0} Transaksi` })
      if (ringkasan.per_status && Object.keys(ringkasan.per_status).length > 0) {
        const statusStr = Object.entries(ringkasan.per_status)
          .map(([s, c]) => `${s}: ${c}`)
          .join(' | ')
        summaryItems.push({ label: 'Status Peminjaman', value: statusStr })
      }
      if (ringkasan.per_role && Object.keys(ringkasan.per_role).length > 0) {
        const roleStr = Object.entries(ringkasan.per_role)
          .map(([r, c]) => `${r}: ${c}`)
          .join(' | ')
        summaryItems.push({ label: 'Kategori Peminjam', value: roleStr })
      }
    }

    if (summaryItems.length > 0) {
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(margin, y, boxW, 11, 2, 2, 'FD')

      const colWidth = boxW / summaryItems.length
      summaryItems.forEach((item, idx) => {
        const itemX = margin + idx * colWidth + colWidth / 2
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)
        doc.text(item.label.toUpperCase(), itemX, y + 4, { align: 'center' })

        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 23, 42)
        doc.text(item.value, itemX, y + 8.5, { align: 'center' })
      })

      y += 14
    }
  }

  // ─── 4. Tabel Data (jsPDF AutoTable) ─────────────────────────────────────────
  const tableHead = [
    ['No', ...columns.map(c => c.label)]
  ]

  const tableBody = data.map((row, index) => {
    return [
      String(index + 1),
      ...columns.map(c => {
        const raw = row[c.key]
        if (raw === null || raw === undefined) return '-'
        if (c.key.includes('harga') || c.key.includes('biaya') || c.key.includes('nilai')) {
          return formatRupiah(raw)
        }
        if (c.key.startsWith('tanggal') || c.key.includes('_at')) {
          return formatTglIndo(raw)
        }
        return String(raw)
      })
    ]
  })

  // Set style per column (alignment)
  const colStyles: Record<number, any> = {
    0: { halign: 'center', cellWidth: 10 },
  }
  columns.forEach((c, i) => {
    if (c.align === 'right' || c.key.includes('harga') || c.key.includes('biaya') || c.key.includes('nilai')) {
      colStyles[i + 1] = { halign: 'right' }
    } else if (c.key === 'kondisi' || c.key === 'status' || c.key === 'satuan' || c.key.startsWith('tanggal')) {
      colStyles[i + 1] = { halign: 'center' }
    }
  })

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: colStyles,
    margin: { left: margin, right: margin, bottom: 25 },
    didDrawPage: (dataHook) => {
      // Footer di setiap halaman
      const totalPages = (doc as any).internal.getNumberOfPages()
      const currentPage = dataHook.pageNumber

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.setDrawColor(226, 232, 240)
      doc.line(margin, ph - 10, pw - margin, ph - 10)

      doc.text(
        `Dicetak melalui Sistem Inventaris Aset SMK PGRI Telagasari pada ${new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })} WIB`,
        margin,
        ph - 6
      )

      doc.text(
        `Halaman ${currentPage} dari ${totalPages}`,
        pw - margin,
        ph - 6,
        { align: 'right' }
      )
    },
  })

  // ─── 5. Blok Tanda Tangan Resmi ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 8

  // Jika sisa halaman di bawah 38mm, tambahkan halaman baru agar ttd tidak terpotong
  if (finalY > ph - 42) {
    doc.addPage()
    finalY = 20
  }

  const signColWidth = 65
  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Sisi Kanan (Mengetahui / Penanggung Jawab)
  const rightX = pw - margin - signColWidth
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text(`Karawang, ${dateFormatted}`, rightX + signColWidth / 2, finalY, { align: 'center' })
  doc.text('Wakasek Bidang Sarana & Prasarana,', rightX + signColWidth / 2, finalY + 5, { align: 'center' })

  // Garis TTD
  doc.setDrawColor(100, 116, 139)
  doc.line(rightX + 5, finalY + 26, rightX + signColWidth - 5, finalY + 26)
  doc.setFont('helvetica', 'bold')
  doc.text('( ...................................................... )', rightX + signColWidth / 2, finalY + 30, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('NIP. ...................................................', rightX + signColWidth / 2, finalY + 34, { align: 'center' })

  // Sisi Kiri (Petugas Pengelola / Penginput Laporan)
  const leftX = margin
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Mengetahui / Petugas Pelapor,', leftX + signColWidth / 2, finalY + 5, { align: 'center' })

  doc.line(leftX + 5, finalY + 26, leftX + signColWidth - 5, finalY + 26)
  doc.setFont('helvetica', 'bold')
  doc.text('( ...................................................... )', leftX + signColWidth / 2, finalY + 30, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Petugas Administrasi Sarpras', leftX + signColWidth / 2, finalY + 34, { align: 'center' })

  // ─── 6. Simpan / Download File ───────────────────────────────────────────────
  const fileName = `Laporan_${tipe}_${dari}_sd_${sampai}.pdf`
  doc.save(fileName)
}

export interface ExportFolderSaranaPdfParams {
  folderName: string;
  items: any[];
}

export function exportFolderSaranaPdf({ folderName, items }: ExportFolderSaranaPdfParams) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pw = doc.internal.pageSize.getWidth() // 297 mm
  const ph = doc.internal.pageSize.getHeight() // 210 mm
  const margin = 12

  // 1. Kop Surat Resmi Sekolah
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pw, 5, 'F')

  doc.setTextColor(30, 64, 175)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('SMK PGRI TELAGASARI', pw / 2, 14, { align: 'center' })

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(75, 85, 99)
  doc.text(
    'Jl. Raya Telagasari - Kosambi No. 67, Telagasari, Karawang, Jawa Barat 41381  |  Telp. (0267) 510365',
    pw / 2,
    19,
    { align: 'center' }
  )
  doc.text(
    'Website: smkpgritelagasari.sch.id  |  Email: info@smkpgritelagasari.sch.id',
    pw / 2,
    23,
    { align: 'center' }
  )

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.8)
  doc.line(margin, 26, pw - margin, 26)
  doc.setLineWidth(0.2)
  doc.line(margin, 27.2, pw - margin, 27.2)

  // 2. Judul Dokumen
  let y = 34
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text('DAFTAR INVENTARIS SARANA & PRASARANA', pw / 2, y, { align: 'center' })

  y += 5
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text(`Kategori / Folder: ${folderName.toUpperCase()}`, pw / 2, y, { align: 'center' })

  y += 6

  // 3. Ringkasan Eksekutif
  const boxW = pw - margin * 2
  const totalJenis = items.length
  const totalUnit = items.reduce((s: number, a: any) => s + (Number(a.stok_akhir) || 0), 0)
  const totalBeli = items.reduce((s: number, a: any) => s + (Number(a.nilai_harga_pembelian) || 0), 0)
  const totalKini = items.reduce((s: number, a: any) => s + (Number(a.nilai_harga_sekarang) || 0), 0)

  const summaryItems = [
    { label: 'Total Jenis Barang', value: `${totalJenis} Jenis` },
    { label: 'Total Unit Fisik', value: `${totalUnit.toLocaleString('id-ID')} Unit` },
    { label: 'Total Nilai Pembelian', value: formatRupiah(totalBeli) },
    { label: 'Total Nilai Sekarang', value: formatRupiah(totalKini) },
  ]

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, boxW, 11, 2, 2, 'FD')

  const colWidth = boxW / summaryItems.length
  summaryItems.forEach((item, idx) => {
    const itemX = margin + idx * colWidth + colWidth / 2
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(item.label.toUpperCase(), itemX, y + 4, { align: 'center' })

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(item.value, itemX, y + 8.5, { align: 'center' })
  })

  y += 14

  // 4. Tabel Data
  const tableHead = [
    ['No', 'Jenis Kekayaan / Nama Barang', 'Kondisi', 'Luas / Jumlah', 'Nilai Pembelian', 'Nilai Sekarang', 'Keterangan']
  ]

  const tableBody = items.map((a: any, i: number) => [
    String(i + 1),
    a.nama_barang || '-',
    a.kondisi || 'Baik',
    a.luas_jumlah || (a.stok_akhir !== undefined ? `${a.stok_akhir} ${a.satuan || 'Unit'}` : '-'),
    formatRupiah(a.nilai_harga_pembelian || 0),
    formatRupiah(a.nilai_harga_sekarang || 0),
    a.keterangan || '-'
  ])

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 70 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 38 },
      5: { halign: 'right', cellWidth: 38 },
      6: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin, bottom: 25 },
    didDrawPage: (dataHook) => {
      const totalPages = (doc as any).internal.getNumberOfPages()
      const currentPage = dataHook.pageNumber

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.setDrawColor(226, 232, 240)
      doc.line(margin, ph - 10, pw - margin, ph - 10)

      doc.text(
        `Dicetak melalui Sistem Inventaris Aset SMK PGRI Telagasari pada ${new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })} WIB`,
        margin,
        ph - 6
      )

      doc.text(
        `Halaman ${currentPage} dari ${totalPages}`,
        pw - margin,
        ph - 6,
        { align: 'right' }
      )
    },
  })

  // 5. Tanda Tangan Resmi
  let finalY = (doc as any).lastAutoTable.finalY + 8
  if (finalY > ph - 42) {
    doc.addPage()
    finalY = 20
  }

  const signColWidth = 65
  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const rightX = pw - margin - signColWidth
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text(`Karawang, ${dateFormatted}`, rightX + signColWidth / 2, finalY, { align: 'center' })
  doc.text('Wakasek Bidang Sarana & Prasarana,', rightX + signColWidth / 2, finalY + 5, { align: 'center' })

  doc.setDrawColor(100, 116, 139)
  doc.line(rightX + 5, finalY + 26, rightX + signColWidth - 5, finalY + 26)
  doc.setFont('helvetica', 'bold')
  doc.text('( ...................................................... )', rightX + signColWidth / 2, finalY + 30, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('NIP. ...................................................', rightX + signColWidth / 2, finalY + 34, { align: 'center' })

  const leftX = margin
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Mengetahui / Petugas Administrasi,', leftX + signColWidth / 2, finalY + 5, { align: 'center' })

  doc.line(leftX + 5, finalY + 26, leftX + signColWidth - 5, finalY + 26)
  doc.setFont('helvetica', 'bold')
  doc.text('( ...................................................... )', leftX + signColWidth / 2, finalY + 30, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Petugas Administrasi Sarpras', leftX + signColWidth / 2, finalY + 34, { align: 'center' })

  const safeName = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_')
  doc.save(`Sarana_Prasarana_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`)
}

