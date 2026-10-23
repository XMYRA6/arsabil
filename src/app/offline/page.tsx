'use client'

import styles from './page.module.css'

export default function OfflinePage() {
    return (
        <main className={styles.main}>
            <div className={styles.iconCircle} aria-hidden="true">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
            <div role="alert" aria-live="assertive" className={styles.copy}>
                <h1 className={styles.title}>Çevrimdışısınız</h1>
                <p className={styles.text}>İnternet bağlantın yok gibi görünüyor. Kayıtlı raporların ve son hesabın görüntülenebilir; yeni sorgular için bağlantını kontrol et.</p>
            </div>
            <button type="button" className={styles.retry} onClick={() => window.location.reload()}>Yeniden dene</button>
        </main>
    )
}
