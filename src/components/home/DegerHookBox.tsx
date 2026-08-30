import Link from 'next/link'
import styles from './DegerHookBox.module.css'

export function DegerHookBox() {
  return (
    <section className={styles.box}>
      <h2 className={styles.title}>Arsanın değeri ne kadar?</h2>
      <p className={styles.desc}>
        Ada/parsel gir, saniyeler içinde tahmini piyasa değeri, ₺/m² ve deprem/taşkın riskini gör.
      </p>
      <Link href="/deger" className={styles.link}>
        Değeri Öğren →
      </Link>
    </section>
  )
}
