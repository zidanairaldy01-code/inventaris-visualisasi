'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, X, Copy, Check } from 'lucide-react';
import { ErrorInfo } from '@/utils/errorHandler';

export default function GlobalErrorModal() {
  const [modalData, setModalData] = useState<ErrorInfo | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleShowModal = (event: Event) => {
      const customEvent = event as CustomEvent<ErrorInfo>;
      if (customEvent.detail) {
        setModalData(customEvent.detail);
        setCopied(false);
      }
    };

    window.addEventListener('app:show-error-modal', handleShowModal);

    const handleSuccessToast = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        setSuccessMsg(customEvent.detail);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    };
    window.addEventListener('app:show-success-toast', handleSuccessToast);

    return () => {
      window.removeEventListener('app:show-error-modal', handleShowModal);
      window.removeEventListener('app:show-success-toast', handleSuccessToast);
    };
  }, []);

  const handleClose = useCallback(() => {
    setModalData(null);
  }, []);

  // Tutup dengan keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalData) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalData, handleClose]);

  const handleCopy = () => {
    if (!modalData) return;
    const textToCopy = [
      `[${modalData.title}]`,
      modalData.statusCode ? `Status Code: ${modalData.statusCode}` : '',
      `Pesan: ${modalData.message}`,
      modalData.details.length > 0
        ? `Detail Error:\n${modalData.details.map((d) => `- ${d}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  return (
    <>
      {/* ── Success Toast ── */}
      {successMsg && createPortal(
        <div className="fixed top-20 right-4 z-[99999] animate-in slide-in-from-right-5 duration-300">
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-lg p-4 min-w-[320px] max-w-md backdrop-blur-sm">
            <div className="flex-shrink-0 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1 text-sm font-medium text-emerald-900 leading-relaxed">
              {successMsg}
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="flex-shrink-0 text-emerald-600 hover:opacity-70 transition-opacity"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Error Modal ── */}
      {modalData && createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="error-modal-title" className="text-base font-bold tracking-tight">
                {modalData.title}
              </h3>
              {modalData.statusCode && (
                <span className="text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  Kode Status: {modalData.statusCode}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Pesan Utama */}
          <div className="text-sm text-slate-700 leading-relaxed font-medium">
            {modalData.message}
          </div>

          {/* Kotak Detail Keterangan Error */}
          {modalData.details.length > 0 && (
            <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center justify-between">
                <span>Keterangan Error:</span>
                <span className="text-[10px] bg-red-200/80 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                  {modalData.details.length} Catatan
                </span>
              </div>
              <ul className="text-xs text-red-800 space-y-1.5 list-disc pl-4 max-h-48 overflow-y-auto pr-1">
                {modalData.details.map((detail, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95"
            title="Salin keterangan error untuk pelaporan"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Tersalin ke Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Salin Keterangan</span>
              </>
            )}
          </button>

          <button
            onClick={handleClose}
            type="button"
            className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>,
    document.body
      )}
    </>
  );
}
