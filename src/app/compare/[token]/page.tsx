import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ScenarioCompare } from '@/components/ScenarioCompare'
import styles from './page.module.css'

interface Scenario {
    id: string
    name: string
    luxLevel: number
    apartmentSize: number
    landShareRatio: number
    totalApartments?: number | null
    riskLevel: number
    builderProfit: number
    fdTotal: number
    fdPerM2: number
    mi: number
    ma: number
    totalCost: number
    fa?: number | null
    sdx?: number | null
}

async function getCompare(token: string): Promise<{ scenarios: Scenario[]; createdAt: string } | null> {
    try {
        const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const res = await fetch(`${base}/api/compare/${token}`, { cache: 'no-store' })
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

export default async function ComparePage({ params }: { params: { token: string } }) {
    const data = await getCompare(params.token)
    if (!data) notFound()

    const dateStr = new Date(data.createdAt).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Senaryo Karşılaştırması</h1>
                <p className={styles.subtitle}>{data.scenarios.length} senaryo · {dateStr} tarihinde paylaşıldı</p>
            </div>

            <div className={styles.card}>
                <ScenarioCompare scenarios={data.scenarios} />
            </div>

            <div className={styles.cta}>
                <Link href="/hesapla" className={styles.ctaBtn}>ArsaBil&apos;de Kendi Hesabını Yap →</Link>
            </div>
        </div>
    )
}
