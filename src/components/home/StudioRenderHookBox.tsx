import Link from 'next/link'
import Image from 'next/image'
import styles from './StudioRenderHookBox.module.css'

const DEMO_IMAGE_SRC = '/studio-assets/showcase/demo-01.jpg'

export function StudioRenderHookBox() {
  return (
    <section className={styles.box}>
      <div className={styles.imageWrap}>
        <Image
          src={DEMO_IMAGE_SRC}
          alt="ArsaBil Studio ile üretilmiş fotogerçekçi bina görseli örneği"
          width={640}
          height={400}
          className={styles.image}
        />
      </div>
      <h2 className={styles.title}>Arsanın üzerindeki binayı fotoğraf gibi gör</h2>
      <p className={styles.desc}>
        Kütleni Studio&apos;da oluştur, Premium ile o binanın arsandaki fotogerçekçi görselini saniyeler içinde üret.
      </p>
      <Link href="/hesapla" className={styles.link}>
        Studio&apos;yu Dene →
      </Link>
    </section>
  )
}
