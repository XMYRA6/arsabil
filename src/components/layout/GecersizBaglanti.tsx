import Link from 'next/link';
import styles from '@/app/not-found.module.css';

/**
 * Paylaşım bağlantısı (karşılaştırma / teklif) bulunamadığında genel 404 yerine gösterilir:
 * kullanıcı neyin ters gittiğini ve ne yapabileceğini görür.
 */
export function GecersizBaglanti({ konu }: { konu: string }) {
    return (
        <main className={styles.main}>
            <h1 className={styles.title}>Bu bağlantı artık geçerli değil</h1>
            <p className={styles.text}>
                {konu} silinmiş, süresi dolmuş ya da bağlantı eksik kopyalanmış olabilir.
                Paylaşan kişiden yeni bir bağlantı isteyebilir veya kendi hesabını yapabilirsin.
            </p>
            <div className={styles.actions}>
                <Link href="/hesapla" className={styles.primary}>Kendi hesabımı yap</Link>
                <Link href="/" className={styles.soft}>Ana sayfaya dön</Link>
            </div>
        </main>
    );
}
