export interface ErrorInfo {
  title: string;
  message: string;
  details: string[];
  statusCode?: number | string;
}

/**
 * Mengekstrak informasi error dari respon API (Axios), error JavaScript, atau teks string.
 */
export function extractErrorInfo(
  err: unknown,
  fallbackTitle: string = 'Terjadi Kesalahan',
  fallbackMessage: string = 'Permintaan tidak dapat diselesaikan oleh sistem.'
): ErrorInfo {
  // 1. Jika err adalah string biasa (misal validasi manual form: "Pilih sarana prasarana...")
  if (typeof err === 'string') {
    return {
      title: fallbackTitle,
      message: err,
      details: [],
    };
  }

  // 2. Jika err null atau undefined
  if (!err) {
    return {
      title: fallbackTitle,
      message: fallbackMessage,
      details: [],
    };
  }

  const anyErr = err as any;
  const response = anyErr.response;
  const status = response?.status;
  const data = response?.data;

  let title = fallbackTitle;
  let message = fallbackMessage;
  const details: string[] = [];

  // Tangani kode status HTTP
  if (status) {
    if (status === 400) {
      title = fallbackTitle !== 'Terjadi Kesalahan' ? fallbackTitle : 'Permintaan Tidak Valid (400)';
    } else if (status === 401) {
      title = 'Sesi Berakhir (401)';
      message = 'Sesi login Anda telah berakhir. Silakan login kembali.';
    } else if (status === 403) {
      title = 'Akses Ditolak (403)';
      message = 'Anda tidak memiliki izin/hak akses untuk melakukan tindakan ini.';
    } else if (status === 404) {
      title = 'Data Tidak Ditemukan (404)';
      message = 'Data atau aset yang diminta tidak ditemukan di database.';
    } else if (status === 422) {
      title = fallbackTitle !== 'Terjadi Kesalahan' ? fallbackTitle : 'Validasi Gagal (422)';
      message = 'Beberapa data yang dimasukkan tidak memenuhi ketentuan.';
    } else if (status >= 500) {
      title = 'Kesalahan Server (500)';
      message = 'Terjadi gangguan internal pada server. Silakan hubungi admin jika masalah berlanjut.';
    }
  }

  // Ambil pesan utama dari backend jika tersedia
  if (data?.message && typeof data.message === 'string') {
    // Jika pesan bukan generic Laravel 422 "The given data was invalid.", pakai pesan tersebut
    if (data.message !== 'The given data was invalid.' && data.message.trim() !== '') {
      message = data.message;
    }
  }

  // Ambil validation errors dari Laravel (format: { field: ["error 1", "error 2"] })
  if (data?.errors && typeof data.errors === 'object') {
    Object.entries(data.errors).forEach(([field, msgs]) => {
      const fieldFormatted = field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      if (Array.isArray(msgs)) {
        msgs.forEach((m) => {
          if (typeof m === 'string') {
            details.push(`${fieldFormatted}: ${m}`);
          }
        });
      } else if (typeof msgs === 'string') {
        details.push(`${fieldFormatted}: ${msgs}`);
      }
    });
  }

  // Ambil detail exception backend jika ada (misal $e->getMessage() di field 'error')
  if (data?.error && typeof data.error === 'string' && data.error !== data.message) {
    details.push(`Keterangan Teknis: ${data.error}`);
  }

  // Jika tidak ada response (Network Error / Offline / Timeout)
  if (!response) {
    if (anyErr.code === 'ECONNABORTED' || anyErr.message?.toLowerCase().includes('timeout')) {
      title = 'Waktu Permintaan Habis';
      message = 'Server terlalu lama merespons. Periksa koneksi jaringan Anda.';
    } else if (anyErr.message === 'Network Error' || !window.navigator.onLine) {
      title = 'Koneksi Terputus';
      message = 'Tidak dapat terhubung ke server backend. Pastikan koneksi internet aktif.';
    } else if (anyErr.message && typeof anyErr.message === 'string') {
      message = anyErr.message;
    }
  }

  return {
    title,
    message,
    details,
    statusCode: status,
  };
}

/**
 * Menampilkan Pop-up Dialog Error secara global di seluruh aplikasi.
 * Dapat dipanggil dari mana saja (komponen, hook, async function, interceptor).
 */
export function showErrorAlert(
  err: unknown,
  fallbackTitle: string = 'Terjadi Kesalahan',
  fallbackMessage?: string
) {
  if (typeof window === 'undefined') return;

  const info = extractErrorInfo(err, fallbackTitle, fallbackMessage);
  window.dispatchEvent(
    new CustomEvent('app:show-error-modal', {
      detail: info,
    })
  );
}
