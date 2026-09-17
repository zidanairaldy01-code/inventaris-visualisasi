/**
 * printDokumen.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Library terpusat untuk mencetak Surat Jalan dan BAST (Berita Acara Serah
 * Terima) menggunakan jsPDF + jspdf-autotable.
 *
 * Keduanya dipanggil dengan data yang sudah di-fetch dari backend:
 *   GET /api/distribusi-asets/{id}/surat-jalan  → SuratJalanData
 *   GET /api/distribusi-asets/{id}/bast         → BastApiResponse
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

export interface SuratJalanData {
  id: number
  nomor_surat_jalan: string
  nomor_bast: string | null
  jumlah: number
  tanggal_kirim: string
  tanggal_terima: string | null
  status: string
  catatan_pengiriman: string | null
  catatan_penerimaan: string | null
  sarana_prasarana: {
    nama_barang: string
    kode: string
    kondisi: string
    folder?: { nama_folder: string } | null
  }
  ruangan_tujuan: {
    nama_ruangan: string
    gedung: { nama_gedung: string }
  }
  petugas_pengirim: {
    nama_lengkap: string
  }
  wakapro_penerima: {
    nama_lengkap: string
  } | null
}

export interface BastApiResponse {
  distribusi: SuratJalanData
  wakasek: { nama_lengkap: string; jabatan?: string } | null
}

// Response dari endpoint /bulk/{nomor_pengiriman}/surat-jalan
export interface SuratJalanBulkApiResponse {
  nomor_pengiriman: string
  items: SuratJalanData[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtTanggal = (d: string | null): string => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const fmtStatus = (s: string) => {
  const map: Record<string, string> = {
    menunggu_konfirmasi: 'Menunggu Konfirmasi',
    diterima: 'Diterima',
    ditolak: 'Ditolak',
  }
  return map[s] ?? s
}

/** Gambar blok tanda tangan (label + garis + nama).
 *  @param x       sudut kiri (mm)
 *  @param y       posisi vertikal awal (mm)
 *  @param w       lebar blok (mm)
 *  @param label   mis. "Pengirim," atau "Penerima (Wakapro)"
 *  @param name    nama yang sudah terisi (atau '' jika belum)
 */
const drawSignatureBlock = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  name: string,
  showNip = false,
) => {
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)

  // Label atas
  doc.text(label, x + w / 2, y, { align: 'center' })

  // Ruang tanda tangan (24 mm tinggi)
  const signH = 24
  doc.setDrawColor(180, 180, 180)
  doc.setLineDashPattern([1, 1], 0)
  doc.rect(x, y + 2, w, signH)
  doc.setLineDashPattern([], 0)

  // Garis tanda tangan di bawah ruang
  const lineY = y + 2 + signH + 8
  doc.setDrawColor(80, 80, 80)
  doc.line(x + 5, lineY, x + w - 5, lineY)

  // Nama di bawah garis
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  if (name) {
    doc.text(name, x + w / 2, lineY + 4, { align: 'center' })
    if (showNip) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text('NIP. ___________________', x + w / 2, lineY + 8, { align: 'center' })
    }
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(150, 150, 150)
    doc.text('(belum dikonfirmasi)', x + w / 2, lineY + 4, { align: 'center' })
    doc.setTextColor(50, 50, 50)
  }
}

/** Gambar header kop surat sekolah */
const drawKopSurat = (doc: jsPDF, judulDokumen: string, nomorDokumen: string) => {
  const pw = doc.internal.pageSize.getWidth()

  // Garis tebal atas
  doc.setFillColor(30, 64, 175) // biru-800
  doc.rect(0, 0, pw, 6, 'F')

  // Nama sekolah
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('SMKN 1 CONTOH', pw / 2, 16, { align: 'center' })

  // Subjudul sekolah
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(
    'Jl. Pendidikan No. 1, Kota Contoh  |  Telp. (0xx) 000-0000  |  inventaris@smkn1contoh.sch.id',
    pw / 2,
    21,
    { align: 'center' },
  )

  // Garis pemisah
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.7)
  doc.line(10, 25, pw - 10, 25)
  doc.setLineWidth(0.2)
  doc.line(10, 26.5, pw - 10, 26.5)

  // Judul dokumen
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text(judulDokumen, pw / 2, 34, { align: 'center' })

  // Nomor dokumen
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`Nomor: ${nomorDokumen}`, pw / 2, 40, { align: 'center' })

  return 46 // posisi Y setelah header
}

// ─── Generate Surat Jalan ─────────────────────────────────────────────────────

/**
 * Buat dan unduh PDF Surat Jalan.
 * Surat jalan diterbitkan oleh admin/petugas saat mengirim barang.
 * Berisi kolom tanda tangan: Pengirim & Penerima (Wakapro).
 */
export const generateSuratJalan = (data: SuratJalanData): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()  // 210
  const ph = doc.internal.pageSize.getHeight() // 297
  const margin = 15

  let y = drawKopSurat(doc, 'SURAT JALAN', data.nomor_surat_jalan)

  // ── Info pengiriman ───────────────────────────────────────────────────────
  y += 6
  const infoRows: [string, string][] = [
    ['Tanggal Pengiriman', fmtTanggal(data.tanggal_kirim)],
    ['Tujuan Pengiriman', `${data.ruangan_tujuan.nama_ruangan} – ${data.ruangan_tujuan.gedung.nama_gedung}`],
    ['Dikirim Oleh', data.petugas_pengirim.nama_lengkap],
    ['Penerima (Wakapro)', data.wakapro_penerima?.nama_lengkap ?? '(belum dikonfirmasi)'],
  ]

  doc.setFontSize(8.5)
  infoRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    doc.text(`: ${val}`, margin + 52, y)
    y += 6
  })

  // ── Tabel barang ──────────────────────────────────────────────────────────
  y += 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text('DAFTAR BARANG YANG DIKIRIM', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [['No', 'Kode Barang', 'Nama Barang', 'Kategori', 'Kondisi', 'Jumlah']],
    body: [
      [
        '1',
        data.sarana_prasarana.kode,
        data.sarana_prasarana.nama_barang,
        data.sarana_prasarana.folder?.nama_folder ?? '-',
        data.sarana_prasarana.kondisi,
        `${data.jumlah} Unit`,
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 55 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [235, 241, 255] },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // ── Catatan pengiriman ────────────────────────────────────────────────────
  if (data.catatan_pengiriman) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('Catatan Pengiriman:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    const lines = doc.splitTextToSize(data.catatan_pengiriman, pw - margin * 2 - 52)
    doc.text(lines, margin + 52, y)
    y += lines.length * 5 + 4
  }

  // ── Status surat jalan ────────────────────────────────────────────────────
  y += 2
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60, 60, 60)
  doc.text('Status:', margin, y)
  const statusColor: Record<string, [number, number, number]> = {
    menunggu_konfirmasi: [161, 98, 7],
    diterima: [5, 122, 85],
    ditolak: [185, 28, 28],
  }
  const [r, g, b] = statusColor[data.status] ?? [60, 60, 60]
  doc.setTextColor(r, g, b)
  doc.text(fmtStatus(data.status), margin + 52, y)
  doc.setTextColor(20, 20, 20)

  // ── Blok tanda tangan ─────────────────────────────────────────────────────
  // Pastikan tidak terlalu rendah — geser ke halaman baru jika perlu
  const sigY = Math.max(y + 14, ph - 80)
  const colW = 55
  const gap = 10
  const totalW = colW * 3 + gap * 2
  const startX = (pw - totalW) / 2

  // Tanggal & tempat
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(
    `Diterbitkan pada: ${fmtTanggal(data.tanggal_kirim)}`,
    pw - margin,
    sigY - 4,
    { align: 'right' },
  )

  drawSignatureBlock(doc, startX, sigY, colW, 'Kepala Sekolah / Wakasek Sarpras,', '', true)
  drawSignatureBlock(doc, startX + colW + gap, sigY, colW, 'Pengirim,', data.petugas_pengirim.nama_lengkap, true)
  drawSignatureBlock(
    doc,
    startX + (colW + gap) * 2,
    sigY,
    colW,
    'Penerima (Wakapro),',
    data.wakapro_penerima?.nama_lengkap ?? '',
    true,
  )

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}   |   Dokumen ini sah tanpa tanda tangan basah apabila sudah diverifikasi sistem`,
    pw / 2,
    ph - 8,
    { align: 'center' },
  )
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, ph - 12, pw - margin, ph - 12)

  doc.save(`surat-jalan_${data.nomor_surat_jalan.replace(/\//g, '-')}.pdf`)
}

// ─── Generate BAST ────────────────────────────────────────────────────────────

/**
 * Buat dan unduh PDF BAST (Berita Acara Serah Terima).
 * BAST hanya ada setelah wakapro mengkonfirmasi penerimaan (status = diterima).
 * Berisi kolom tanda tangan: Wakapro Penerima (kiri) & Wakasek Sarpras (kanan, mengetahui).
 */
export const generateBast = (response: BastApiResponse): void => {
  const { distribusi: data, wakasek } = response

  if (!data.nomor_bast) {
    console.warn('generateBast: nomor_bast kosong, BAST belum diterbitkan')
    return
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const margin = 15

  let y = drawKopSurat(doc, 'BERITA ACARA SERAH TERIMA (BAST)', data.nomor_bast)

  // ── Paragraf pembuka ──────────────────────────────────────────────────────
  y += 7
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  const intro = doc.splitTextToSize(
    `Pada hari ini, ${fmtTanggal(data.tanggal_terima)}, telah dilaksanakan serah terima barang/peralatan dari Bagian Sarana dan Prasarana kepada ${data.ruangan_tujuan.nama_ruangan} (${data.ruangan_tujuan.gedung.nama_gedung}), dengan rincian sebagai berikut:`,
    pw - margin * 2,
  )
  doc.text(intro, margin, y)
  y += intro.length * 5.5 + 4

  // ── Info dokumen ──────────────────────────────────────────────────────────
  const infoRows: [string, string][] = [
    ['No. Surat Jalan',      data.nomor_surat_jalan],
    ['No. BAST',             data.nomor_bast],
    ['Tanggal Pengiriman',   fmtTanggal(data.tanggal_kirim)],
    ['Tanggal Penerimaan',   fmtTanggal(data.tanggal_terima)],
    ['Ruangan Tujuan',       `${data.ruangan_tujuan.nama_ruangan} – ${data.ruangan_tujuan.gedung.nama_gedung}`],
    ['Pihak Pengirim',       data.petugas_pengirim.nama_lengkap],
    ['Pihak Penerima',       data.wakapro_penerima?.nama_lengkap ?? '-'],
  ]

  doc.setFontSize(8.5)
  infoRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    doc.text(`: ${val}`, margin + 52, y)
    y += 6
  })

  // ── Tabel barang ──────────────────────────────────────────────────────────
  y += 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(5, 122, 85)
  doc.text('BARANG YANG DISERAHTERIMAKAN', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [['No', 'Kode Barang', 'Nama Barang', 'Kategori', 'Kondisi Diterima', 'Jumlah']],
    body: [
      [
        '1',
        data.sarana_prasarana.kode,
        data.sarana_prasarana.nama_barang,
        data.sarana_prasarana.folder?.nama_folder ?? '-',
        data.sarana_prasarana.kondisi,
        `${data.jumlah} Unit`,
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: {
      fillColor: [5, 122, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 55 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [220, 252, 231] },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // ── Catatan penerimaan ────────────────────────────────────────────────────
  if (data.catatan_penerimaan) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('Catatan Penerimaan:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    const lines = doc.splitTextToSize(data.catatan_penerimaan, pw - margin * 2 - 52)
    doc.text(lines, margin + 52, y)
    y += lines.length * 5 + 4
  }

  // ── Paragraf penutup ──────────────────────────────────────────────────────
  y += 2
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  const closing = doc.splitTextToSize(
    'Demikian Berita Acara Serah Terima ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.',
    pw - margin * 2,
  )
  doc.text(closing, margin, y)
  y += closing.length * 5.5

  // ── Blok tanda tangan ─────────────────────────────────────────────────────
  const sigY = Math.max(y + 12, ph - 85)
  const colW = 70
  const gap = 20
  const totalW = colW * 2 + gap
  const startX = (pw - totalW) / 2

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(
    `Diterbitkan pada: ${fmtTanggal(data.tanggal_terima ?? data.tanggal_kirim)}`,
    pw - margin,
    sigY - 4,
    { align: 'right' },
  )

  // Kiri: Penerima (Wakapro)
  drawSignatureBlock(
    doc,
    startX,
    sigY,
    colW,
    'Penerima,',
    data.wakapro_penerima?.nama_lengkap ?? '',
    true,
  )

  // Kanan: Mengetahui (Wakasek)
  drawSignatureBlock(
    doc,
    startX + colW + gap,
    sigY,
    colW,
    'Mengetahui,\nWakil Kepala Sekolah Sarpras',
    wakasek?.nama_lengkap ?? '',
    true,
  )

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}   |   Dokumen ini sah tanpa tanda tangan basah apabila sudah diverifikasi sistem`,
    pw / 2,
    ph - 8,
    { align: 'center' },
  )
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, ph - 12, pw - margin, ph - 12)

  doc.save(`bast_${data.nomor_bast.replace(/\//g, '-')}.pdf`)
}

// ─── Generate Surat Jalan Bulk ────────────────────────────────────────────────

/**
 * Buat dan unduh PDF Surat Jalan untuk seluruh batch (nomor_pengiriman).
 * Semua barang dalam satu pengiriman bulk tampil dalam satu dokumen.
 */
export const generateSuratJalanBulk = (response: SuratJalanBulkApiResponse): void => {
  const { nomor_pengiriman, items } = response
  if (!items.length) return

  const first = items[0]
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const margin = 15

  let y = drawKopSurat(doc, 'SURAT JALAN (PENGIRIMAN BULK)', nomor_pengiriman)

  // ── Info pengiriman ───────────────────────────────────────────────────────
  y += 6
  const infoRows: [string, string][] = [
    ['Nomor Pengiriman', nomor_pengiriman],
    ['Tanggal Pengiriman', fmtTanggal(first.tanggal_kirim)],
    ['Tujuan Pengiriman', `${first.ruangan_tujuan.nama_ruangan} – ${first.ruangan_tujuan.gedung.nama_gedung}`],
    ['Dikirim Oleh', first.petugas_pengirim.nama_lengkap],
    ['Penerima (Wakapro)', first.wakapro_penerima?.nama_lengkap ?? '(belum dikonfirmasi)'],
    ['Jumlah Jenis Barang', `${items.length} jenis (${items.reduce((s, i) => s + i.jumlah, 0)} unit total)`],
  ]

  doc.setFontSize(8.5)
  infoRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    doc.text(`: ${val}`, margin + 52, y)
    y += 6
  })

  // ── Tabel barang ──────────────────────────────────────────────────────────
  y += 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text('DAFTAR BARANG YANG DIKIRIM', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [['No', 'No. Surat Jalan', 'Kode Barang', 'Nama Barang', 'Kategori', 'Kondisi', 'Jumlah']],
    body: items.map((item, idx) => [
      String(idx + 1),
      item.nomor_surat_jalan,
      item.sarana_prasarana.kode,
      item.sarana_prasarana.nama_barang,
      item.sarana_prasarana.folder?.nama_folder ?? '-',
      item.sarana_prasarana.kondisi,
      `${item.jumlah} Unit`,
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 50 },
      4: { cellWidth: 25 },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [235, 241, 255] },
    // Baris total di bawah
    foot: [[
      '', '', '', '',
      { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
      { content: `${items.length} jenis`, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: `${items.reduce((s, i) => s + i.jumlah, 0)} Unit`, styles: { fontStyle: 'bold', halign: 'center' } },
    ]],
    footStyles: {
      fillColor: [235, 241, 255],
      textColor: [30, 64, 175],
      fontStyle: 'bold',
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // ── Catatan pengiriman ────────────────────────────────────────────────────
  if (first.catatan_pengiriman) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('Catatan Pengiriman:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    const lines = doc.splitTextToSize(first.catatan_pengiriman, pw - margin * 2 - 52)
    doc.text(lines, margin + 52, y)
    y += lines.length * 5 + 4
  }

  // ── Blok tanda tangan ─────────────────────────────────────────────────────
  const sigY = Math.max(y + 14, ph - 80)
  const colW = 55
  const gap = 10
  const totalW = colW * 3 + gap * 2
  const startX = (pw - totalW) / 2

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(
    `Diterbitkan pada: ${fmtTanggal(first.tanggal_kirim)}`,
    pw - margin,
    sigY - 4,
    { align: 'right' },
  )

  drawSignatureBlock(doc, startX, sigY, colW, 'Kepala Sekolah / Wakasek Sarpras,', '', true)
  drawSignatureBlock(doc, startX + colW + gap, sigY, colW, 'Pengirim,', first.petugas_pengirim.nama_lengkap, true)
  drawSignatureBlock(
    doc,
    startX + (colW + gap) * 2,
    sigY,
    colW,
    'Penerima (Wakapro),',
    first.wakapro_penerima?.nama_lengkap ?? '',
    true,
  )

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}   |   Halaman ${i} dari ${pageCount}   |   Dokumen ini sah tanpa tanda tangan basah apabila sudah diverifikasi sistem`,
      pw / 2,
      ph - 8,
      { align: 'center' },
    )
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, ph - 12, pw - margin, ph - 12)
  }

  doc.save(`surat-jalan-bulk_${nomor_pengiriman.replace(/\//g, '-')}.pdf`)
}
