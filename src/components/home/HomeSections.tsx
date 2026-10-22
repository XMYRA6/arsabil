'use client'

import { useState } from 'react'
import Link from 'next/link'
import { listTurler, resolveScene, type Tur } from '@/lib/dioramas/scene'
import { useThemeZaman } from './useThemeZaman'
import styles from './HomeSections.module.css'

const TUR_ALT: Record<Tur, string> = {
  arsa: 'İmarlı arsa',
  tarla: 'Tarım arazisi',
  villa: 'Villa arsası',
  ticari: 'Ticari / iş yeri',
  bag: 'Meyve & bağ',
  kat: 'Apartman projesi',
}

function sceneSrc(tur: Tur, zaman: 'gunduz' | 'gece') {
  return resolveScene({ tur, egim: 'duz', zaman }).src800
}

function Arrow() {
  return <span aria-hidden="true">→</span>
}

/** "Arsanı değerle. Sonra kat karşılığına karar ver." — iki ürün kartı + üç küçük özellik. */
export function ProductsSection() {
  const zaman = useThemeZaman()
  return (
    <section className={styles.section} aria-labelledby="urunler-baslik">
      <div className={styles.inner}>
        <h2 id="urunler-baslik" className={styles.h2}>
          Arsanı değerle.
          <span>Sonra kat karşılığına karar ver.</span>
        </h2>

        <div className={styles.productGrid}>
          <article className={styles.product}>
            <div className={styles.productText}>
              <h3>Arsa Değerleme</h3>
              <p>Konum, arazi türü ve m² ile gerçek piyasa değeri.</p>
              <ul>
                <li>Emsal ilan ve fiyat</li>
                <li>Fay ve taşkın riski</li>
                <li>İmar durumu özeti</li>
              </ul>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.productImg} src={sceneSrc('arsa', zaman)} alt="" loading="lazy" />
            <Link href="/deger" className={styles.btnPrimary}>Değerini hesapla <Arrow /></Link>
          </article>

          <article className={styles.product}>
            <div className={styles.productText}>
              <h3>Kat Karşılığı Fizibilite</h3>
              <p>Arsa payı, müteahhit kâr marjı ve risk: adil teklif.</p>
              <ul>
                <li>Arsa payı önerisi</li>
                <li>Kâr marjı ve maliyet</li>
                <li>PDF rapor</li>
              </ul>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.productImg} src={sceneSrc('kat', zaman)} alt="" loading="lazy" />
            <Link href="/hesapla" className={styles.btnPrimary}>Fizibilite hesapla <Arrow /></Link>
          </article>
        </div>

        <div className={styles.miniGrid}>
          <Link href="/marketplace" className={styles.mini}>
            <span className={`${styles.miniIcon} ${styles.sage}`} aria-hidden="true" />
            <h3>Pazar yeri</h3>
            <p>Haritada kabartma görünümüyle ilan ve teklifler; fiyat çipleri.</p>
          </Link>
          <Link href="/hesapla" className={styles.mini}>
            <span className={`${styles.miniIcon} ${styles.amber}`} aria-hidden="true" />
            <h3>Akıllı rapor</h3>
            <p>Tek tıkla PDF: emsal, risk, kat karşılığı özeti.</p>
          </Link>
          <Link href="/arsa-fiyatlari" className={styles.mini}>
            <span className={`${styles.miniIcon} ${styles.blue}`} aria-hidden="true" />
            <h3>Fiyat bildirimi</h3>
            <p>Takip ettiğin bölgede fiyat değişince WhatsApp’tan haber.</p>
          </Link>
        </div>
      </div>
    </section>
  )
}

/** "Her arazi, kendi mantığıyla." — altı arazi türü kartı. */
export function LandTypesSection() {
  const zaman = useThemeZaman()
  const [secili, setSecili] = useState<Tur>('arsa')
  return (
    <section className={`${styles.section} ${styles.tint}`} aria-labelledby="turler-baslik">
      <div className={styles.inner}>
        <h2 id="turler-baslik" className={styles.h2}>Her arazi, kendi mantığıyla.</h2>
        <p className={styles.lead}>
          Tarla ile villa arsası aynı fiyatlanmaz. ArsaBil arazi türüne göre emsal, imar ve risk kriterlerini değiştirir.
        </p>
        <div className={styles.turGrid} role="group" aria-label="Arazi türleri">
          {listTurler().map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={secili === t.key}
              className={secili === t.key ? `${styles.turCard} ${styles.turOn}` : styles.turCard}
              onClick={() => setSecili(t.key)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sceneSrc(t.key, zaman)} alt="" loading="lazy" />
              <strong>{t.key === 'bag' ? 'Bağ · Bahçe' : t.label}</strong>
              <small>{TUR_ALT[t.key]}</small>
            </button>
          ))}
        </div>
        <p className={styles.caption}>
          Sahne seçilen türe göre değişir: toprak kesiti, ekin sırası, çatı, otopark, vinç… Güneş, bulut ve hava durumu canlı animasyonlu.
        </p>
      </div>
    </section>
  )
}

/** Haritaya geçiş bandı: il sınırı verisi yayına alınana kadar fiyat sayfasına bağlanır. */
export function PriceMapTeaser() {
  return (
    <section className={styles.section} aria-labelledby="harita-baslik">
      <div className={styles.inner}>
        <h2 id="harita-baslik" className={styles.h2}>Türkiye arsa fiyat haritası</h2>
        <p className={styles.lead}>81 ilde metrekare fiyatı. İl, ilçe ve mahalle bazında emsal fiyatlara bak.</p>
        <div className={styles.cta}>
          <Link href="/arsa-fiyatlari" className={styles.btnPrimary}>Arsa fiyatlarını gör <Arrow /></Link>
        </div>
      </div>
    </section>
  )
}

/** Akif: yapay zekâ asistanı + WhatsApp. */
export function AkifSection() {
  return (
    <section className={`${styles.section} ${styles.tintDeep}`} aria-labelledby="akif-baslik">
      <div className={`${styles.inner} ${styles.akifGrid}`}>
        <div>
          <p className={styles.pill}><span className={styles.liveDot} aria-hidden="true" />Akif · yapay zekâ asistanı</p>
          <h2 id="akif-baslik" className={styles.h2big}>
            Arsa danışmanın,
            <span>cebinde.</span>
          </h2>
          <p className={styles.lead}>
            Yaz ya da sesli sor: “Akçaabat’ta 1.250 m² arsa ne eder?” Akif emsalleri, riski ve kat karşılığı fizibilitesini saniyeler içinde özetler.
          </p>
          <ul className={styles.feat}>
            <li><strong>Sesli ve yazılı</strong><small>Konuşarak ya da yazarak sor</small></li>
            <li><strong>Gerçek veriye dayalı</strong><small>Emsal, risk ve imar özeti</small></li>
            <li><strong>7/24 WhatsApp’ta</strong><small>Uygulama açmadan, sohbetten</small></li>
            <li><strong>Fiyat bildirimi</strong><small>Bölgende fiyat değişince haber</small></li>
          </ul>
          <div className={styles.wa}>
            <div className={styles.waText}>
              <small>WhatsApp’ta Akif’e yaz</small>
              <strong>+90 850 000 00 00</strong>
              <em>örnek numara · yayında gerçek hat tanımlanacak</em>
            </div>
            <Link href="/akif" className={styles.waBtn}>Sohbeti başlat</Link>
          </div>
        </div>

        <div className={styles.phone} aria-hidden="true">
          <div className={styles.phoneBar}><b>Akif · ArsaBil</b><small>çevrimiçi</small></div>
          <div className={styles.chat}>
            <p className={styles.me}>Akçaabat’ta 1.250 m² imarlı arsa ne eder?</p>
            <p className={styles.bot}>Yıldızlı Mah. emsallerine göre yaklaşık ₺2.450/m² · toplam ≈ ₺3,06 M. Fay riski düşük.</p>
            <p className={styles.bot}>Kat karşılığı için arsa payı önerisi %46. Fizibiliteyi hesaplayayım mı?</p>
            <div className={styles.quick}><span>Evet, hesapla</span><span>Emsalleri göster</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** "Üç adımda karar." */
export function StepsSection() {
  const adimlar = [
    ['01', 'Konumu seç', 'İl, ilçe, mahalle; ya da haritada parseline dokun.'],
    ['02', 'Türü ve metrekareyi gir', 'Arsa, tarla, villa, ticari ya da bağ-bahçe. Sahne ona göre değişir.'],
    ['03', 'Raporunu al', 'Fiyat, risk, imar özeti ve kat karşılığı fizibilitesi; PDF veya WhatsApp.'],
  ]
  return (
    <section className={styles.section} aria-labelledby="adimlar-baslik">
      <div className={styles.inner}>
        <h2 id="adimlar-baslik" className={styles.h2}>Üç adımda karar.</h2>
        <p className={styles.lead}>Kayıt gerekmeden başla; ihtiyacın olursa hesabınla devam et.</p>
        <ol className={styles.steps}>
          {adimlar.map(([n, t, d]) => (
            <li key={n} className={styles.step}>
              <span className={styles.stepNum}>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ol>
        <div className={styles.cta}>
          <Link href="/register" className={styles.btnAmber}>Ücretsiz dene <Arrow /></Link>
          <small>Kredi kartı yok · 10 saniye</small>
        </div>
      </div>
    </section>
  )
}
