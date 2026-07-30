import React from 'react';
import { SavedReportDocument, SavedReportInput } from './SavedReportDocument';
import { downloadPdfBlob } from './downloadPdf';

export type { SavedReportInput };

/**
 * Kayitli bir raporun PDF ozeti (spec K6).
 *
 * `report_generator.ts`'teki `generatePdfReport`'un aksine, burada motor
 * yeniden calistirilmiyor ve hicbir deger uydurulmuyor: yalnizca Report DB
 * kaydinin sakladigi alanlar basiliyor. Detay: SavedReportDocument.tsx.
 */
export async function generateSavedReportPdf(input: SavedReportInput): Promise<void> {
  // Cast needed: @react-pdf's ReactElement type diverges from React's
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(SavedReportDocument, { input }) as any;
  await downloadPdfBlob(element, 'ArsaBilRaporOzeti');
}
