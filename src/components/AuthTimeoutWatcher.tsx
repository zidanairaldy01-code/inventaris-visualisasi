'use client';

import { useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { usePathname } from 'next/navigation';

// Batas timeout maksimal: 2 jam (dalam milidetik)
const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 jam = 7.200.000 ms
const THROTTLE_UPDATE_MS = 30 * 1000; // Simpan aktivitas maksimal setiap 30 detik

export default function AuthTimeoutWatcher() {
  const pathname = usePathname();
  const lastWriteRef = useRef<number>(0);

  useEffect(() => {
    // Fungsi pengecekan apakah sesi sudah expired (lebih dari 2 jam tidak ada aktivitas atau browser ditutup lama)
    const checkTimeout = () => {
      const token = Cookies.get('auth_token');
      if (!token) return;

      const lastActiveStr = localStorage.getItem('auth_last_active');
      const now = Date.now();

      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        if (!isNaN(lastActive) && now - lastActive > TIMEOUT_MS) {
          // Sesi telah kedaluwarsa
          Cookies.remove('auth_token');
          localStorage.removeItem('auth_last_active');

          const isLoginPage = window.location.pathname.startsWith('/login');
          const isLandingPage = window.location.pathname === '/';

          if (!isLoginPage && !isLandingPage) {
            window.location.href = '/login?expired=1';
          }
          return;
        }
      } else {
        // Jika token ada tapi last active belum tercatat, inisialisasi sekarang
        localStorage.setItem('auth_last_active', now.toString());
      }
    };

    // Fungsi pembaruan waktu aktif terakhir saat ada interaksi pengguna
    const updateActivity = () => {
      const token = Cookies.get('auth_token');
      if (!token) return;

      const now = Date.now();
      // Throttle agar tidak menulis ke localStorage setiap milidetik
      if (now - lastWriteRef.current > THROTTLE_UPDATE_MS) {
        lastWriteRef.current = now;
        localStorage.setItem('auth_last_active', now.toString());
      }
    };

    // Jalankan pengecekan pertama kali saat halaman dimuat
    checkTimeout();

    // Event listener interaksi pengguna
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Pengecekan saat tab kembali fokus atau dibuka setelah browser diminimize/ditutup
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkTimeout);

    // Interval rutin setiap 30 detik untuk mengecek timeout jika tab didiamkan terbuka
    const intervalId = setInterval(() => {
      checkTimeout();
    }, 30 * 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkTimeout);
      clearInterval(intervalId);
    };
  }, [pathname]);

  return null;
}
