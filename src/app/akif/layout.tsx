import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Akif Usta'ya Sor — Kat Karşılığı Danışmanı | ArsaBil",
  description:
    'Arsanı, emsali ve müteahhit payını yaz; Akif Usta iki senaryoyu deterministik motorla hesaplayıp sade dille anlatsın.',
}

export default function AkifLayout({ children }: { children: React.ReactNode }) {
  return children
}
