import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Arsa Değer Kartı — Tahmini Piyasa Değeri ve Risk | ArsaBil',
  description:
    'Ada/parsel gir; arsanın tahmini piyasa değeri, ₺/m² ve deprem/taşkın riskini saniyeler içinde gör.',
}

export default function DegerLayout({ children }: { children: React.ReactNode }) {
  return children
}
