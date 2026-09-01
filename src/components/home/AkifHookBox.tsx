import Link from 'next/link'
import styles from './AkifHookBox.module.css'

export function AkifHookBox() {
  return (
    <section className={styles.box}>
      <h2 className={styles.title}>Akif Usta&apos;ya sor</h2>
      <p className={styles.desc}>
        Arsanı, emsali ve müteahhit payını yaz; iki kat-karşılığı senaryosunu hesaplayıp sade
        dille anlatsın.
      </p>
      <Link href="/akif" className={styles.link}>
        Akif&apos;e Sor →
      </Link>
    </section>
  )
}
