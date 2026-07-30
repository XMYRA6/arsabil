import { pdf } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

/**
 * PDF blob'unu uretip tarayicida indirmeyi baslatan ortak adim.
 *
 * Hem hesaplama ekranindaki tam fizibilite raporu (`report_generator.ts`)
 * hem de kayitli rapor ozeti (`saved_report_generator.ts`) bu adimi
 * PAYLASIR — ikisi de kendi <Document> agacini kurup burada indirir.
 */
export async function downloadPdfBlob(
  element: ReactElement<DocumentProps>,
  filenamePrefix: string,
): Promise<void> {
  const blob = await pdf(element).toBlob();

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
