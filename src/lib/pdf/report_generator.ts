import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ReportDocument, ReportInput } from './ReportDocument';

export type { ReportInput };

export async function generatePdfReport(input: ReportInput): Promise<void> {
  // Cast needed: @react-pdf's ReactElement type diverges from React's
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ReportDocument, { input }) as any;
  const blob = await pdf(element).toBlob();

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `ArsaBilRapor_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
