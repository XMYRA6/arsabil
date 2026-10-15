import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ message: 'Giriş gerekli.' }, { status: 401 })

  const rows = await prisma.projeKarti.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      inputs: true,
      createdAt: true,
      updatedAt: true,
      parseller: { select: { parselDosyasi: { select: { il: true, ilce: true, mahalle: true, ada: true, parsel: true } } } },
      revizyonlar: {
        orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
        take: 30,
        select: { field: true, oldValue: true, newValue: true, changedAt: true, channel: true },
      },
    },
  })

  return NextResponse.json({
    projects: rows.map((r) => ({
      id: r.id,
      name: r.name,
      inputs: r.inputs,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      parcels: r.parseller.map(
        (p) => `${p.parselDosyasi.il}/${p.parselDosyasi.ilce}/${p.parselDosyasi.mahalle} ada ${p.parselDosyasi.ada} parsel ${p.parselDosyasi.parsel}`,
      ),
      revisions: r.revizyonlar,
    })),
  })
}
