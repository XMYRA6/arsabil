import Link from 'next/link';
import styles from './MobileLegalLine.module.css';

/** Mobilde tam footer gizli (alt menü var); yasal uyarı ve bağlantılar bu tek satırla kalır. */
export function MobileLegalLine() {
    return (
        <p className={styles.line}>
            Veriler bilgilendirme amaçlıdır; resmi değerleme veya yatırım tavsiyesi yerine geçmez.{' '}
            <Link href="/privacy">Gizlilik</Link> · <Link href="/terms">Koşullar</Link> · <Link href="/contact">İletişim</Link>
        </p>
    );
}
