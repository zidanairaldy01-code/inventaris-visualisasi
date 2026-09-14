'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/login', { username, password });
      if (response.data.access_token && response.data.user) {
        Cookies.set('auth_token', response.data.access_token, { expires: 7 });

        const userRole = response.data.user.role;
        let redirectPath = '/dashboard';

        if (userRole === 'petugas') {
          redirectPath = '/petugas-input';
        } else if (userRole === 'wakapro') {
          redirectPath = '/wakapro';
        } else if (userRole === 'wakasek') {
          redirectPath = '/wakasek';
        } else {
          redirectPath = '/dashboard';
        }

        router.push(redirectPath);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Username atau password salah.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftInner}>
          <img
            src="/smk-pgri-telagasari.png"
            alt="Logo SMK PGRI Telagasari"
            style={styles.logo}
          />
          <h2 style={styles.schoolName}>SMK PGRI Telagasari</h2>
          <p style={styles.schoolSub}>Sistem Informasi Manajemen Aset</p>
          <div style={styles.divider} />
          <p style={styles.leftNote}>
            Portal ini khusus untuk pengelola dan petugas inventaris aset sekolah.
            Hubungi administrator jika Anda mengalami kendala akses.
          </p>
        </div>
        <p style={styles.copyright}>&copy; {new Date().getFullYear()} SMK PGRI Telagasari</p>
      </div>

      {/* Right panel — form */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          <h1 style={styles.formTitle}>Masuk ke Portal</h1>
          <p style={styles.formSub}>Silakan masukkan kredensial Anda</p>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Masukkan username"
                style={styles.input}
                onFocus={(e) => Object.assign(e.currentTarget.style, styles.inputFocus)}
                onBlur={(e) => Object.assign(e.currentTarget.style, styles.inputBlur)}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="login-password">
                Password
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  style={{ ...styles.input, paddingRight: '40px' }}
                  onFocus={(e) => Object.assign(e.currentTarget.style, styles.inputFocus)}
                  onBlur={(e) => Object.assign(e.currentTarget.style, styles.inputBlur)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              style={isLoading ? { ...styles.submitBtn, ...styles.submitBtnDisabled } : styles.submitBtn}
            >
              {isLoading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    backgroundColor: '#f4f5f7',
  },

  // --- Left Panel ---
  leftPanel: {
    width: '380px',
    flexShrink: 0,
    backgroundColor: '#1a3a6b',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '48px 40px 32px',
  },
  leftInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  logo: {
    width: '64px',
    height: '64px',
    borderRadius: '8px',
    objectFit: 'cover',
    marginBottom: '20px',
    border: '2px solid rgba(255,255,255,0.2)',
  },
  schoolName: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 4px',
    color: '#fff',
    lineHeight: '1.3',
  },
  schoolSub: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.65)',
    margin: '0',
  },
  divider: {
    width: '40px',
    height: '2px',
    backgroundColor: 'rgba(255,255,255,0.25)',
    margin: '28px 0',
  },
  leftNote: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: '1.7',
    margin: '0',
  },
  copyright: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
    margin: '0',
  },

  // --- Right Panel ---
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  formCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '40px 36px',
    border: '1px solid #e2e4e9',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  formTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 6px',
  },
  formSub: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 28px',
  },

  // --- Error ---
  errorBox: {
    backgroundColor: '#fff5f5',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '20px',
  },

  // --- Form Fields ---
  fieldGroup: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 12px',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  inputFocus: {
    borderColor: '#2563eb',
    boxShadow: '0 0 0 3px rgba(37,99,235,0.1)',
  },
  inputBlur: {
    borderColor: '#d1d5db',
    boxShadow: 'none',
  },

  // --- Password ---
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    top: '50%',
    right: '10px',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
  },

  // --- Submit ---
  submitBtn: {
    width: '100%',
    marginTop: '8px',
    padding: '10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#1a3a6b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  submitBtnDisabled: {
    backgroundColor: '#6b7280',
    cursor: 'not-allowed',
  },
};
