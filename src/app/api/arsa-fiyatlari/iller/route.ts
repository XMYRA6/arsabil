import { NextResponse } from 'next/server'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'

export const revalidate = 86400

/** Ana sayfa haritası için il bazında medyan m² fiyatı ve emsal sayısı (herkese açık, özet veri). */
export async function GET() {
  try {
    const iller = await getSeoAreas('il')
    return NextResponse.json(
      iller.map((e) => ({ slug: e.ilSlug, medyan: e.medianPricePerSqm, emsal: e.sampleCount })),
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' } },
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'İl fiyatları getirilemedi.' }, { status: 500 })
  }
}
