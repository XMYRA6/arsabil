'use client'

import { useMemo, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import harita from '@/data/tr-il-harita.json'
import { kademeHesapla, MIN_EMSAL } from '@/components/home/TurkiyeHaritasi'
import haritaStyles from '@/components/home/TurkiyeHaritasi.module.css'
import { guvenDuzeyi, Guven } from './areaSeoParts'
import styles from './iller.module.css'

export type IlKarti = { slug: string; ad: string; medyan: number | null; emsal: number }

type Sekme = 'pahali' | 'ucuz' | 'veri'
type TabloSirasi = 'ad' | 'fiyat' | 'emsal'

const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
const SEKMELER: { id: Sekme; etiket: string }[] = [
  { id: 'pahali', etiket: 'En pahalı' },
  { id: 'ucuz', etiket: 'En ucuz' },
  { id: 'veri', etiket: 'En çok emsal' },
]
const SIRALAMA_UZUNLUK = 8
const ILK_SATIR = 15

/** Türkçe-duyarlı sadeleştirme: "İ/ı/Ş…" ile yazılmış aramalar ASCII karşılıklarıyla da bulunur. */
function sadelestir(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
}

const yeterliMi = (i: IlKarti) => i.medyan != null && i.medyan > 0 && i.emsal >= MIN_EMSAL

/**
 * Arsa fiyatları · İller: renkli Türkiye haritası + seçili il paneli, sekmeli sıralamalar
 * ve aranabilir/sıralanabilir kompakt il tablosu. Harita ve sıralamalar yalnız yeterli
 * emsalli (>= MIN_EMSAL) illeri öne çıkarır; az emsalli iller tabloda "düşük güven" ile görünür.
 */
export function IllerListesi({ iller }: { iller: IlKarti[] }) {
  const [secili, setSecili] = useState<string | null>(null)
  const [onizleme, setOnizleme] = useState<string | null>(null)
  const [sekme, setSekme] = useState<Sekme>('pahali')
  const [q, setQ] = useState('')
  const [sira, setSira] = useState<TabloSirasi>('emsal')
  const [hepsi, setHepsi] = useState(false)

  const bySlug = useMemo(() => new Map(iller.map((i) => [i.slug, i])), [iller])
  const kademe = useMemo(
    () => kademeHesapla(iller.map((i) => ({ slug: i.slug, medyan: i.medyan, emsal: i.emsal }))),
    [iller],
  )
  const yeterli = useMemo(() => iller.filter(yeterliMi), [iller])
  const fiyataGore = useMemo(() => [...yeterli].sort((a, b) => (b.medyan ?? 0) - (a.medyan ?? 0)), [yeterli])

  const gosterilenSlug = onizleme ?? secili
  const gosterilen = gosterilenSlug ? bySlug.get(gosterilenSlug) ?? null : null
  const gosterilenHarita = gosterilenSlug ? harita.iller.find((i) => i.slug === gosterilenSlug) ?? null : null
  const sirasi = gosterilen && yeterliMi(gosterilen) ? fiyataGore.findIndex((i) => i.slug === gosterilen.slug) + 1 : null

  const siralama = useMemo(() => {
    if (sekme === 'pahali') return fiyataGore.slice(0, SIRALAMA_UZUNLUK)
    if (sekme === 'ucuz') return [...fiyataGore].reverse().slice(0, SIRALAMA_UZUNLUK)
    return [...iller].sort((a, b) => b.emsal - a.emsal).slice(0, SIRALAMA_UZUNLUK)
  }, [sekme, fiyataGore, iller])
  const enBuyuk = sekme === 'veri'
    ? Math.max(1, ...siralama.map((i) => i.emsal))
    : Math.max(1, ...fiyataGore.map((i) => i.medyan ?? 0))

  const tablo = useMemo(() => {
    const aranan = sadelestir(q.trim())
    const f = aranan ? iller.filter((i) => sadelestir(i.ad).includes(aranan)) : iller
    return [...f].sort((a, b) => {
      if (sira === 'ad') return a.ad.localeCompare(b.ad, 'tr')
      if (sira === 'fiyat') return (b.medyan ?? -1) - (a.medyan ?? -1)
      return b.emsal - a.emsal
    })
  }, [iller, q, sira])

  const tus = (slug: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSecili(slug)
    }
  }

  const enPahali = fiyataGore[0]
  const enUcuz = fiyataGore[fiyataGore.length - 1]

  return (
    <div className={styles.kok}>
      <div className={styles.ust}>
        <section className={styles.haritaKart} aria-label="Türkiye arsa fiyat haritası">
          <svg
            viewBox={`0 0 ${harita.w} ${harita.h}`}
            className={haritaStyles.svg}
            role="group"
            aria-label="Türkiye il haritası, fiyata göre renklendirilmiş"
          >
            {harita.iller.map((il) => {
              const k = bySlug.get(il.slug)
              const etiket = k && yeterliMi(k) ? `${il.ad}, ${trNum.format(k.medyan!)} lira metrekare` : `${il.ad}, yeterli emsal yok`
              return (
                <g
                  key={il.slug}
                  role="button"
                  tabIndex={0}
                  aria-label={etiket}
                  aria-pressed={secili === il.slug}
                  className={styles.ilGrup}
                  onClick={() => setSecili(il.slug)}
                  onKeyDown={tus(il.slug)}
                  onMouseEnter={() => setOnizleme(il.slug)}
                  onMouseLeave={() => setOnizleme(null)}
                  onFocus={() => setOnizleme(il.slug)}
                  onBlur={() => setOnizleme(null)}
                >
                  <path
                    d={il.d}
                    className={`${haritaStyles.il} ${haritaStyles[`k${kademe(il.slug)}`]} ${gosterilenSlug === il.slug ? haritaStyles.aktif : ''}`}
                  />
                </g>
              )
            })}
          </svg>
          <div className={styles.olcek} aria-hidden="true">
            <span>Düşük</span>
            {[1, 2, 3, 4, 5].map((k) => <i key={k} className={`${haritaStyles.sw} ${haritaStyles[`k${k}`]}`} />)}
            <span>Yüksek</span>
            <span className={styles.olcekNot}>Boz: {MIN_EMSAL} emsalden az</span>
          </div>
        </section>

        <aside className={styles.panel} aria-live="polite" aria-label="Seçili il özeti">
          {gosterilen && gosterilenHarita ? (
            <>
              <h2 className={styles.panelAd}>{gosterilenHarita.ad}</h2>
              {yeterliMi(gosterilen) ? (
                <>
                  <p className={styles.panelFiyat}>
                    ₺{trNum.format(Math.round(gosterilen.medyan!))}<span> /m² medyan</span>
                  </p>
                  <dl className={styles.panelBilgi}>
                    <div><dt>Emsal</dt><dd>{trNum.format(gosterilen.emsal)} ilan</dd></div>
                    <div><dt>Güven</dt><dd><Guven emsal={gosterilen.emsal} /> {guvenDuzeyi(gosterilen.emsal)}</dd></div>
                    {sirasi != null && <div><dt>Fiyat sırası</dt><dd>{sirasi}. / {fiyataGore.length}</dd></div>}
                  </dl>
                </>
              ) : (
                <p className={styles.panelYok}>
                  Yeterli emsal yok ({gosterilen.emsal} ilan). Güvenilir bir medyan için en az {MIN_EMSAL} emsal gerekir.
                </p>
              )}
              <Link href={`/arsa-fiyatlari/${gosterilen.slug}`} className={styles.panelBtn}>
                {gosterilenHarita.ad} fiyatlarını aç →
              </Link>
            </>
          ) : (
            <>
              <h2 className={styles.panelAd}>Bir il seç</h2>
              <p className={styles.panelYok}>Haritada bir ile dokun ya da imleci getir; medyan m² fiyatı ve emsal sayısı burada görünür.</p>
              {enPahali && enUcuz && (
                <ul className={styles.uclar}>
                  <li><button type="button" onClick={() => setSecili(enPahali.slug)}><span>En pahalı</span><strong>{enPahali.ad} · ₺{trNum.format(Math.round(enPahali.medyan!))}</strong></button></li>
                  <li><button type="button" onClick={() => setSecili(enUcuz.slug)}><span>En ucuz</span><strong>{enUcuz.ad} · ₺{trNum.format(Math.round(enUcuz.medyan!))}</strong></button></li>
                </ul>
              )}
            </>
          )}
        </aside>
      </div>

      {yeterli.length > 0 && (
        <section className={styles.bolum} aria-label="Sıralamalar">
          <div className={styles.bolumBas}>
            <h2 className={styles.bolumBaslik}>Sıralamalar</h2>
            <div className={styles.sekmeler} role="group" aria-label="Sıralama türü">
              {SEKMELER.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={sekme === s.id}
                  className={`${styles.sekme} ${sekme === s.id ? styles.sekmeAktif : ''}`}
                  onClick={() => setSekme(s.id)}
                >
                  {s.etiket}
                </button>
              ))}
            </div>
          </div>
          <ol className={styles.siralama}>
            {siralama.map((i, n) => {
              const deger = sekme === 'veri' ? i.emsal : i.medyan ?? 0
              return (
                <li key={`${sekme}-${i.slug}`}>
                  <Link
                    href={`/arsa-fiyatlari/${i.slug}`}
                    className={styles.siraSatir}
                    aria-label={`${i.ad} arsa fiyatları`}
                    onMouseEnter={() => setOnizleme(i.slug)}
                    onMouseLeave={() => setOnizleme(null)}
                  >
                    <span className={styles.siraNo}>{n + 1}</span>
                    <span className={styles.siraAd}>{i.ad}</span>
                    <span className={styles.cubukKap} aria-hidden="true">
                      <span className={styles.cubuk} style={{ width: `${Math.max(3, (deger / enBuyuk) * 100)}%` }} />
                    </span>
                    <span className={styles.siraDeger}>
                      {sekme === 'veri' ? `${trNum.format(i.emsal)} emsal` : `₺${trNum.format(Math.round(i.medyan!))}`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <section className={styles.bolum} aria-label="Tüm iller">
        <div className={styles.bolumBas}>
          <h2 className={styles.bolumBaslik}>Tüm iller <span className={styles.adet}>{tablo.length}</span></h2>
          <div className={styles.arama}>
            <span className={styles.aramaIkon} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              className={styles.aramaInput}
              type="search"
              placeholder="İl ara…"
              aria-label="İl ara"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {tablo.length === 0 ? (
          <p className={styles.bos}>“{q}” ile eşleşen il yok.</p>
        ) : (
          <div className={styles.tabloKap}>
            <table className={styles.tablo}>
              <thead>
                <tr>
                  {([['ad', 'İl', false], ['fiyat', '₺/m²', true], ['emsal', 'Emsal', true]] as const).map(([id, etiket, sag]) => (
                    <th key={id} scope="col" className={sag ? styles.sag : undefined} aria-sort={sira === id ? (id === 'ad' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" className={styles.thBtn} onClick={() => setSira(id)}>
                        {etiket}{sira === id && <span aria-hidden="true"> ↓</span>}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className={styles.sag}>Güven</th>
                </tr>
              </thead>
              <tbody>
                {(hepsi || q.trim() ? tablo : tablo.slice(0, ILK_SATIR)).map((i) => (
                  <tr key={i.slug} className={!yeterliMi(i) ? styles.soluk : undefined}>
                    <td><Link href={`/arsa-fiyatlari/${i.slug}`}>{i.ad}</Link></td>
                    <td className={styles.sag}>{i.medyan != null ? trNum.format(Math.round(i.medyan)) : '—'}</td>
                    <td className={styles.sag}>{trNum.format(i.emsal)}</td>
                    <td className={styles.sag}><Guven emsal={i.emsal} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!hepsi && !q.trim() && tablo.length > ILK_SATIR && (
          <button type="button" className={styles.hepsiBtn} onClick={() => setHepsi(true)}>
            Tüm {tablo.length} ili göster
          </button>
        )}
        <p className={styles.dipnot}>
          Fiyatlar yayındaki ilanların medyanıdır; resmî değerleme değildir. İmarlı arsanın yanında tarla, bağ ve arazi
          ilanlarını da kapsar, bu yüzden kırsal illerde medyan düşük çıkabilir. Güven noktaları emsal sayısına göre
          verilir (10 altı düşük, 30 ve üstü yüksek).
        </p>
      </section>
    </div>
  )
}
