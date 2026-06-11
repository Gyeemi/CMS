import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useInvoicePrintStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const style = document.createElement('style');
    style.id = 'groovx-invoice-print';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
        #invoice-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 210mm !important;
          margin: 0 auto !important;
          padding: 10mm 12mm !important;
          border: none !important;
          box-shadow: none !important;
          gap: 10px !important;
        }
        @page {
          size: A4;
          margin: 8mm;
        }
        #invoice-actions, #invoice-gst-toggle { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
}
