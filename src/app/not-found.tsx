import Link from 'next/link'
import { MobileScreen } from '@/components/mobile/MobileScreen'
import { MobileState } from '@/components/mobile/MobileState'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import styles from './not-found.module.css'

export default function NotFound() {
    return (
        <MobileScreen hasBottomNav={false} className={styles.screen}>
            <div className={styles.themeToggle}>
                <ThemeToggle />
            </div>
            <main className={styles.main}>
                <MobileState
                    variant="empty"
                    title="Sayfa bulunamadı"
                    description="Bu adrese bağlı bir sayfa yok. Ana sayfadan yeniden başlayabilirsiniz."
                    action={<Link href="/" className={styles.action}>Ana sayfa</Link>}
                />
            </main>
        </MobileScreen>
    )
}
