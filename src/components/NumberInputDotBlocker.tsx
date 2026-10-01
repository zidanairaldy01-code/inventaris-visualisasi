'use client';

import { useEffect } from 'react';

/**
 * Komponen global untuk memblokir input titik (.) dan koma (,) pada semua input angka/nilai.
 * Bekerja pada level capture window sehingga mencakup seluruh form modal, tabel inline,
 * dan input dinamis di seluruh aplikasi.
 */
export default function NumberInputDotBlocker() {
  useEffect(() => {
    const isTargetNumeric = (target: EventTarget | null): target is HTMLInputElement => {
      if (!target || !(target instanceof HTMLInputElement)) return false;
      if (target.type === 'number') return true;
      if (target.inputMode === 'numeric') return true;
      if (target.dataset.noDot === 'true' || target.dataset.type === 'number') return true;

      // Cek atribut name / id jika relevan dengan nilai angka
      const identifier = `${target.name || ''} ${target.id || ''} ${target.className || ''}`.toLowerCase();
      if (
        identifier.includes('harga') ||
        identifier.includes('tarif') ||
        identifier.includes('volume') ||
        identifier.includes('jumlah') ||
        identifier.includes('stok') ||
        identifier.includes('nominal') ||
        identifier.includes('biaya')
      ) {
        return true;
      }

      return false;
    };

    // 1. Blokir penekanan tombol titik (.) dan koma (,) via keyboard (termasuk Numpad)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTargetNumeric(e.target)) return;

      const isDotOrComma =
        e.key === '.' ||
        e.key === ',' ||
        e.key === 'Decimal' ||
        e.code === 'NumpadDecimal' ||
        e.code === 'Period' ||
        e.code === 'Comma' ||
        e.keyCode === 190 || // period
        e.keyCode === 188 || // comma
        e.keyCode === 110;   // numpad decimal

      const isScientificE = e.key === 'e' || e.key === 'E';

      if (isDotOrComma || isScientificE) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 2. Blokir input titik sebelum masuk ke input DOM (efektif untuk keyboard virtual di HP / tablet)
    const handleBeforeInput = (e: InputEvent) => {
      if (!isTargetNumeric(e.target)) return;

      if (e.data && (e.data.includes('.') || e.data.includes(',') || e.data.toLowerCase().includes('e'))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 3. Tangani paste (jika user menempelkan angka berformat "10.000.000" atau "50.00")
    const handlePaste = (e: ClipboardEvent) => {
      const input = e.target;
      if (!isTargetNumeric(input)) return;

      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && (pastedText.includes('.') || pastedText.includes(','))) {
        e.preventDefault();
        e.stopPropagation();

        // Bersihkan seluruh titik dan koma
        const cleanText = pastedText.replace(/[.,]/g, '');

        // Coba gunakan execCommand agar history undo/redo & event React tetap terpicu
        let success = false;
        try {
          success = document.execCommand('insertText', false, cleanText);
        } catch {
          success = false;
        }

        // Fallback jika execCommand tidak didukung
        if (!success) {
          const start = input.selectionStart ?? 0;
          const end = input.selectionEnd ?? 0;
          const currentValue = input.value;
          const newValue = currentValue.slice(0, start) + cleanText + currentValue.slice(end);

          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          )?.set;

          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, newValue);
          } else {
            input.value = newValue;
          }

          const newCursorPos = start + cleanText.length;
          try {
            input.setSelectionRange(newCursorPos, newCursorPos);
          } catch {
            // Beberapa tipe input mungkin tidak mendukung setSelectionRange
          }

          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };

    // 4. Pengaman akhir pada event input
    const handleInput = (e: Event) => {
      const input = e.target;
      if (!isTargetNumeric(input)) return;

      if (input.value && (input.value.includes('.') || input.value.includes(','))) {
        const cleaned = input.value.replace(/[.,]/g, '');
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, cleaned);
        } else {
          input.value = cleaned;
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    // Menggunakan capture phase (true) agar dieksekusi sebelum handler input individual
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeinput', handleBeforeInput as EventListener, true);
    window.addEventListener('paste', handlePaste, true);
    window.addEventListener('input', handleInput, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeinput', handleBeforeInput as EventListener, true);
      window.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('input', handleInput, true);
    };
  }, []);

  return null;
}
