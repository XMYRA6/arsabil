'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconPin, IconFile, IconChart } from '@/components/icons'
import { listTurler, resolveScene, type Tur } from '@/lib/dioramas/scene'
import { TurkiyeHaritasi } from './TurkiyeHaritasi'
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

/** Hedef değere, görünür olunca bir kez sayarak çıkar (azaltılmış harekette doğrudan hedef). */
function useCountUp(hedef: number, oynat: boolean, ms = 1400): number {
  const [deger, setDeger] = useState(0)
  useEffect(() => {
    if (!oynat) return
    const azalt = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (azalt) { setDeger(hedef); return }
    const t0 = performance.now()
    let raf = 0
    const adim = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setDeger(hedef * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(adim)
    }
    raf = requestAnimationFrame(adim)
    return () => cancelAnimationFrame(raf)
  }, [hedef, oynat, ms])
  return deger
}

const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

/** Ürün kartı: görünür olunca içindeki örnek çıktı canlanır. */
function ProductCard({ children, tur, zaman }: { children: (oynat: boolean) => React.ReactNode; tur: Tur; zaman: 'gunduz' | 'gece' }) {
  const [ref, gorundu] = useInViewOnce<HTMLElement>()
  return (
    <article ref={ref} className={styles.product} data-play={gorundu ? '' : undefined}>
      {children(gorundu)}
      <div className={styles.productStage} aria-hidden="true">
        <span className={styles.productGround} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.productImg} src={sceneSrc(tur, zaman)} alt="" loading="lazy" />
      </div>
    </article>
  )
}

function DegerOzet({ oynat }: { oynat: boolean }) {
  const fiyat = useCountUp(2450, oynat)
  return (
    <div className={styles.readout} aria-label="Örnek değerleme çıktısı">
      <small>Örnek çıktı</small>
      <strong className={styles.readoutBig}>₺{trNum.format(fiyat)}<em> / m²</em></strong>
      <div className={styles.readoutRow}>
        <span><i className={styles.okDot} />Fay riski düşük</span>
        <span><i className={styles.okDot} />İmar: konut</span>
      </div>
    </div>
  )
}

function KatOzet({ oynat }: { oynat: boolean }) {
  const pay = useCountUp(46, oynat)
  return (
    <div className={styles.readout} aria-label="Örnek arsa payı dağılımı">
      <small>Örnek çıktı</small>
      <strong className={styles.readoutBig}>Arsa payı %{Math.round(pay)}</strong>
      <div className={styles.split} aria-hidden="true">
        <i className={styles.splitA} />
        <i className={styles.splitB} />
      </div>
      <div className={styles.readoutRow}>
        <span><i className={styles.dotAmber} />Arsa sahibi %46</span>
        <span><i className={styles.dotInk} />Müteahhit %54</span>
      </div>
    </div>
  )
}

/** "Arsanı değerle. Sonra kat karşılığına karar ver." — iki ürün kartı + üç küçük özellik. */
export function ProductsSection() {
  const zaman = useThemeZaman()
  const [miniRef, miniGorundu] = useInViewOnce<HTMLDivElement>()
  return (
    <section className={styles.section} aria-labelledby="urunler-baslik">
      <div className={styles.inner}>
        <h2 id="urunler-baslik" className={styles.h2}>
          Arsanı değerle.
          <span>Sonra kat karşılığına karar ver.</span>
        </h2>

        <div className={styles.productGrid}>
          <ProductCard tur="arsa" zaman={zaman}>
            {(oynat) => (
              <>
                <div className={styles.productText}>
                  <h3>Arsa Değerleme</h3>
                  <p>Konum, arazi türü ve m² ile gerçek piyasa değeri; emsal, risk ve imar özeti tek ekranda.</p>
                  <DegerOzet oynat={oynat} />
                </div>
                <Link href="/deger" className={styles.btnPrimary}>Değerini hesapla <Arrow /></Link>
              </>
            )}
          </ProductCard>

          <ProductCard tur="kat" zaman={zaman}>
            {(oynat) => (
              <>
                <div className={styles.productText}>
                  <h3>Kat Karşılığı Fizibilite</h3>
                  <p>Arsa payı, müteahhit kâr marjı ve risk: iki tarafın da kabul edeceği adil teklif.</p>
                  <KatOzet oynat={oynat} />
                </div>
                <Link href="/hesapla" className={styles.btnPrimary}>Fizibilite hesapla <Arrow /></Link>
              </>
            )}
          </ProductCard>
        </div>

        <div ref={miniRef} className={styles.miniGrid} data-play={miniGorundu ? '' : undefined}>
          <Link href="/marketplace" className={styles.mini}>
            <span className={`${styles.miniIcon} ${styles.sage}`} aria-hidden="true"><IconPin size={22} /></span>
            <h3>Pazar yeri</h3>
            <p>Haritada kabartma görünümüyle ilan ve teklifler; fiyat çipleri.</p>
            <div className={styles.miniViz} aria-hidden="true">
              {['₺2,4 M', '₺860 B', '₺1,2 M'].map((t, i) => (
                <span key={t} className={styles.priceChip} style={{ '--i': i } as React.CSSProperties}>{t}</span>
              ))}
            </div>
          </Link>
          <Link href="/hesapla" className={styles.mini}>
            <span className={`${styles.miniIcon} ${styles.amber}`} aria-hidden="true"><IconFile size={22} /></span>
            <h3>Akıllı rapor</h3>
            <p>Tek tıkla PDF: emsal, risk, kat karşılığı özeti.</p>
            <div className={styles.miniViz} aria-hidden="true">
              <div className={styles.sheet}>
                <i className={styles.sheetLine} style={{ '--i': 0, width: '55%' } as React.CSSProperties} />
                <i className={styles.sheetLine} style={{ '--i': 1, width: '90%' } as React.CSSProperties} />
                <i className={styles.sheetLine} style={{ '--i': 2, width: '72%' } as React.CSSProperties} />
              </div>
              <span className={styles.pdfTag}>PDF</span>
            </div>
          </Link>
          <Link href="/arsa-fiyatlari" className={styles.mini}>
            <span className={`${styles.miniIcon} ${styles.blue}`} aria-hidden="true"><IconChart size={22} /></span>
            <h3>Fiyat bildirimi</h3>
            <p>Takip ettiğin bölgede fiyat değişince WhatsApp’tan haber.</p>
            <div className={styles.miniViz} aria-hidden="true">
              <svg className={styles.sparkSvg} viewBox="0 0 200 48" preserveAspectRatio="none">
                <path className={styles.spark} pathLength={1} d="M2 40 L36 33 L70 37 L104 22 L138 27 L196 6" />
              </svg>
              <span className={styles.deltaChip}>+%6,2</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

interface TurBilgi {
  alt: string
  kriterler: [string, string][]
  ozet: [string, string][]
  cta: string
  href: string
}

/** Tür başına değerlendirme kriterleri ve örnek rapor özeti (vitrin; gerçek değerler hesaptan gelir). */
const TUR_BILGI: Record<Tur, TurBilgi> = {
  arsa: {
    alt: 'İmarlı arsada değeri imar hakkı, konum ve çevre belirler.',
    kriterler: [['Emsal ve imar durumu', 'KAKS, TAKS ve kat sayısı'], ['Yola cephe ve konum', 'Cadde, ulaşım ve çevre'], ['Risk durumu', 'Fay, taşkın ve heyelan']],
    ozet: [['Fiyat', '₺2.450 / m²'], ['Risk', 'Düşük'], ['Emsal', '0,60']],
    cta: 'Arsanı değerle', href: '/deger',
  },
  tarla: {
    alt: 'Tarlada değeri toprak, su ve erişim belirler.',
    kriterler: [['Toprak sınıfı ve verim', 'Tarım sınıfı, parsel bütünlüğü'], ['Su ve sulama', 'Kanal, kuyu ve yağış'], ['Eğim ve erişim', 'Yol ve makine girişi']],
    ozet: [['Fiyat', '₺380 / m²'], ['Verim', 'Yüksek'], ['Sınıf', 'II']],
    cta: 'Tarlanı değerle', href: '/deger',
  },
  villa: {
    alt: 'Villa arsasında değeri manzara ve yapılaşma hakkı belirler.',
    kriterler: [['Konum ve manzara', 'Deniz, orman ve yükseklik'], ['Yapılaşma hakkı', 'TAKS, kat ve inşaat alanı'], ['Çevre ve erişim', 'Site, yol ve altyapı']],
    ozet: [['Fiyat', '₺6.200 / m²'], ['Manzara', 'Deniz'], ['TAKS', '0,30']],
    cta: 'Arsanı değerle', href: '/deger',
  },
  ticari: {
    alt: 'Ticari arsada değeri cephe ve imar hakkı belirler.',
    kriterler: [['Cephe ve görünürlük', 'Cadde, yaya ve araç akışı'], ['İmar ve kat sayısı', 'Ticaret, ofis ve otopark'], ['Çevre ve talep', 'Komşu işletmeler, kira potansiyeli']],
    ozet: [['Fiyat', '₺9.800 / m²'], ['Cephe', 'Ana cadde'], ['Emsal', '1,20']],
    cta: 'Arsanı değerle', href: '/deger',
  },
  bag: {
    alt: 'Bağ-bahçede değeri ürün, su ve arazi yapısı belirler.',
    kriterler: [['Ürün ve ağaç', 'Tür, yaş ve verim'], ['Su ve sulama', 'Kuyu, kanal ve damla'], ['Arazi yapısı', 'Eğim, toprak ve erişim']],
    ozet: [['Fiyat', '₺720 / m²'], ['Su', 'Kuyu var'], ['Ağaç', '180 adet']],
    cta: 'Bağını değerle', href: '/deger',
  },
  kat: {
    alt: 'Kat karşılığında önemli olan arsa payı ve maliyet dengesidir.',
    kriterler: [['Arsa payı önerisi', 'Müteahhitle adil paylaşım'], ['Maliyet ve kâr marjı', 'İnşaat, satış ve risk'], ['Daire karması', 'Kat, daire sayısı ve bölüm']],
    ozet: [['Fiyat', '₺4.600 / m²'], ['Arsa payı', '%46'], ['Marj', '%18']],
    cta: 'Fizibilite hesapla', href: '/hesapla',
  },
}

const TUR_SURESI = 5000

function azaltilmisHareket(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function turEtiketi(k: Tur, l: string) {
  return k === 'bag' ? 'Bağ · Bahçe' : l
}

/** "Her arazi, kendi mantığıyla." — altı arazi türü kartı + seçili türün kriter paneli. */
export function LandTypesSection() {
  const zaman = useThemeZaman()
  const [secili, setSecili] = useState<Tur>('arsa')
  const [secildi, setSecildi] = useState(false)
  const turler = listTurler()
  const bilgi = TUR_BILGI[secili]
  const seciliEtiket = turEtiketi(secili, turler.find((t) => t.key === secili)?.label ?? '')

  // Kullanıcı seçmediyse türler sırayla kendiliğinden döner.
  useEffect(() => {
    if (secildi || azaltilmisHareket()) return
    const sira = listTurler().map((t) => t.key)
    const id = setInterval(() => setSecili((t) => sira[(sira.indexOf(t) + 1) % sira.length]), TUR_SURESI)
    return () => clearInterval(id)
  }, [secildi])

  return (
    <section className={`${styles.section} ${styles.tint}`} aria-labelledby="turler-baslik">
      <div className={styles.inner}>
        <h2 id="turler-baslik" className={styles.h2}>Her arazi, kendi mantığıyla.</h2>
        <p className={styles.lead}>
          Tarla ile villa arsası aynı fiyatlanmaz. ArsaBil arazi türüne göre emsal, imar ve risk kriterlerini değiştirir.
        </p>
        <div className={styles.turGrid} role="group" aria-label="Arazi türleri">
          {turler.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={secili === t.key}
              className={secili === t.key ? `${styles.turCard} ${styles.turOn}` : styles.turCard}
              onClick={() => { setSecildi(true); setSecili(t.key) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sceneSrc(t.key, zaman)} alt="" loading="lazy" />
              <strong>{turEtiketi(t.key, t.label)}</strong>
              <small>{TUR_ALT[t.key]}</small>
            </button>
          ))}
        </div>

        <div className={styles.panel} aria-live="polite">
          <div className={styles.panelScene}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={secili} className={styles.swapIn} src={sceneSrc(secili, zaman)} alt="" />
          </div>
          <div key={secili} className={`${styles.panelBody} ${styles.swapIn}`}>
            <p className={styles.eyebrow}>{seciliEtiket.toLocaleUpperCase('tr')} NELERE GÖRE DEĞERLENİR</p>
            <h3 className={styles.panelTitle}>{seciliEtiket}</h3>
            <p className={styles.panelSub}>{bilgi.alt}</p>
            <ul className={styles.criteria}>
              {bilgi.kriterler.map(([k, d]) => (
                <li key={k}><strong>{k}</strong><span>{d}</span></li>
              ))}
            </ul>
            <div className={styles.panelFoot}>
              <div>
                <small className={styles.sampleLabel}>Örnek rapor özeti</small>
                <div className={styles.tiles}>
                  {bilgi.ozet.map(([k, v]) => (
                    <div key={k} className={styles.tile}><small>{k}</small><strong>{v}</strong></div>
                  ))}
                </div>
              </div>
              <Link href={bilgi.href} className={styles.btnPrimary}>{bilgi.cta} <Arrow /></Link>
            </div>
          </div>
          <div className={styles.dots} aria-hidden="true">
            {turler.map((t) => <i key={t.key} className={t.key === secili ? styles.dotOn : undefined} />)}
            {!secildi && <small>Seçmezsen 5 sn’de bir değişir</small>}
          </div>
        </div>

        <p className={styles.caption}>
          Sahne seçilen türe göre değişir: toprak kesiti, ekin sırası, çatı, otopark, vinç… Güneş, bulut ve hava durumu canlı animasyonlu.
        </p>
      </div>
    </section>
  )
}


/** Türkiye il haritası: medyan m² fiyatına göre tonlanır, il tıklanınca fiyat sayfasına gider. */
export function PriceMapTeaser() {
  return (
    <section className={styles.section} aria-labelledby="harita-baslik">
      <div className={styles.inner}>
        <h2 id="harita-baslik" className={styles.h2}>Türkiye arsa fiyat haritası</h2>
        <p className={styles.lead}>81 ilde metrekare fiyatı. İl, ilçe ve mahalle bazında emsal fiyatlara bak.</p>
        <TurkiyeHaritasi />
        <div className={styles.cta}>
          <Link href="/arsa-fiyatlari" className={styles.btnPrimary}>Arsa fiyatlarını gör <Arrow /></Link>
        </div>
      </div>
    </section>
  )
}

/** Eleman ekrana girince bir kez true olur (IntersectionObserver yoksa hemen true). */
function useInViewOnce<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [gorundu, setGorundu] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setGorundu(true); return }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setGorundu(true); io.disconnect() }
    }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, gorundu]
}

/** Akif: yapay zekâ asistanı + WhatsApp. */
export function AkifSection() {
  const [phoneRef, gorundu] = useInViewOnce<HTMLDivElement>()
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

        <div ref={phoneRef} className={styles.phone} data-play={gorundu ? '' : undefined} aria-hidden="true">
          <div className={styles.phoneBar}>
            <span className={styles.avatar}>A</span>
            <span><b>Akif · ArsaBil</b><small>çevrimiçi</small></span>
          </div>
          <div className={styles.chat}>
            <p className={`${styles.me} ${styles.msg}`} style={{ '--i': 0 } as React.CSSProperties}>Akçaabat’ta 1.250 m² imarlı arsa ne eder?</p>
            <p className={`${styles.bot} ${styles.msg}`} style={{ '--i': 1 } as React.CSSProperties}>Yıldızlı Mah. emsallerine göre yaklaşık <b>₺2.450/m²</b> · toplam ≈ <b>₺3,06 M</b>. Fay riski düşük.</p>
            <p className={`${styles.bot} ${styles.msg}`} style={{ '--i': 2 } as React.CSSProperties}>Kat karşılığı için arsa payı önerisi <b>%46</b>. Fizibiliteyi hesaplayayım mı?</p>
            <div className={`${styles.quick} ${styles.msg}`} style={{ '--i': 3 } as React.CSSProperties}><span>Evet, hesapla</span><span>Emsalleri göster</span></div>
          </div>
          <div className={styles.composer}>
            <span className={styles.composerInput}>Akif’e sor…</span>
            <span className={styles.mic}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </span>
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
