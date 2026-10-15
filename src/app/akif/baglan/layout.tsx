import type { Metadata } from 'next'
import type React from 'react'

// Tek kullanımlık ?t= token'ı Referer ile sızmasın.
export const metadata: Metadata = { referrer: 'no-referrer' }

export default function BaglanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
