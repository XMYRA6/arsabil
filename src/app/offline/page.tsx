import Link from 'next/link'
import { MobileScreen } from '@/components/mobile/MobileScreen'
import { MobileState } from '@/components/mobile/MobileState'
import styles from './page.module.css'

export default function OfflinePage() {
    return (
        <MobileScreen hasBottomNav={false} className={styles.screen}>
            <main className={styles.main}>
                <MobileState
                    variant="offline"
                    title="Çevrimdışısınız"
                    description="Bağlantı geri geldiğinde kaldığınız yerden devam edin."
                    action={<Link href="/" className={styles.action}>Ana sayfa</Link>}
                />
            </main>
        </MobileScreen>
    )
}
