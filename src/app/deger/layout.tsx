import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Arsa Değer Kartı — Tahmini Piyasa Değeri ve Risk | ArsaBil',
  description:
    'Ada/parsel girin; arsanızın tahmini piyasa değeri, ₺/m² ve deprem/taşkın riskini saniyeler içinde görün.',
}

export default function DegerLayout({ children }: { children: React.ReactNode }) {
  return children
}
