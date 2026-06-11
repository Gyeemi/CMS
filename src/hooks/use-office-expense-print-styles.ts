import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useOfficeExpensePrintStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const style = document.createElement('style');
    style.id = 'groovx-office-expense-print';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #office-expense-print-area, #office-expense-print-area * { visibility: visible !important; }
        #office-expense-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
        }
        #office-expense-actions { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
}
