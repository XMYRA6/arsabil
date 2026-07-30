import React from 'react';
import { ReportDocument, ReportInput } from './ReportDocument';
import { downloadPdfBlob } from './downloadPdf';

export type { ReportInput };

export async function generatePdfReport(input: ReportInput): Promise<void> {
  // Cast needed: @react-pdf's ReactElement type diverges from React's
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ReportDocument, { input }) as any;
  await downloadPdfBlob(element, 'ArsaBilRapor');
}
