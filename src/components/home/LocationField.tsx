'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import styles from './LocationField.module.css'

interface Item { id: number; text: string }
export interface LocationValue { il: string; ilce: string }

interface Props {
  value: LocationValue
  onChange: (v: LocationValue) => void
}

/** Türkçe karakterlere duyarsız karşılaştırma anahtarı. */
export function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

let ilCache: Item[] | null = null
const ilceCache = new Map<number, Item[]>()

async function loadIller(): Promise<Item[]> {
  if (ilCache) return ilCache
  const r = await fetch('/api/tkgm/il')
  if (!r.ok) throw new Error('il')
  const j = (await r.json()) as { iller?: Item[] }
  ilCache = j.iller ?? []
  return ilCache
}

async function loadIlceler(ilId: number): Promise<Item[]> {
  const hit = ilceCache.get(ilId)
  if (hit) return hit
  const r = await fetch(`/api/tkgm/ilce?ilId=${ilId}`)
  if (!r.ok) throw new Error('ilce')
  const j = (await r.json()) as { ilceler?: Item[] }
  const list = j.ilceler ?? []
  ilceCache.set(ilId, list)
  return list
}

/** İl → ilçe seçimi yapılan arama alanı + "konumumu kullan" düğmesi. */
export function LocationField({ value, onChange }: Props) {
  const inputId = useId()
  const listId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [iller, setIller] = useState<Item[]>([])
  const [ilceler, setIlceler] = useState<Item[]>([])
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const secilenIl = useMemo(() => iller.find((i) => i.text === value.il) ?? null, [iller, value.il])
  const asama: 'il' | 'ilce' = value.il && !value.ilce ? 'ilce' : 'il'

  // İlçe aşamasında seçili ilin ilçelerini yükle.
  useEffect(() => {
    if (asama !== 'ilce' || !secilenIl) return
    let iptal = false
    loadIlceler(secilenIl.id).then((l) => { if (!iptal) setIlceler(l) }).catch(() => { if (!iptal) setMsg('İlçe listesi alınamadı.') })
    return () => { iptal = true }
  }, [asama, secilenIl])

  // Dışarı tıklayınca kapat.
  useEffect(() => {
    const kapat = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', kapat)
    return () => document.removeEventListener('mousedown', kapat)
  }, [])

  const secenekler = useMemo(() => {
    const kaynak = asama === 'il' ? iller : ilceler
    const q = norm(query)
    return (q ? kaynak.filter((i) => norm(i.text).includes(q)) : kaynak).slice(0, 8)
  }, [asama, iller, ilceler, query])

  const ac = () => {
    setOpen(true)
    if (!iller.length) loadIller().then(setIller).catch(() => setMsg('İl listesi alınamadı.'))
  }

  const sec = (item: Item) => {
    setQuery('')
    setActive(0)
    if (asama === 'il') {
      onChange({ il: item.text, ilce: '' })
    } else {
      onChange({ il: value.il, ilce: item.text })
      setOpen(false)
    }
  }

  const geri = () => { onChange({ il: '', ilce: '' }); setQuery(''); setIlceler([]) }

  const konumum = () => {
    setMsg(null)
    if (!navigator.geolocation) { setMsg('Tarayıcın konum özelliğini desteklemiyor.'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(`/api/parcel/lookup?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
          const j = (await r.json()) as { status?: string; parcel?: { il?: string; ilce?: string } }
          if (j.status === 'verified' && j.parcel?.il) {
            onChange({ il: j.parcel.il, ilce: j.parcel.ilce ?? '' })
            setOpen(false)
          } else {
            setMsg('Bu konum için il ve ilçe bulunamadı.')
          }
        } catch {
          setMsg('Konum çözümlenemedi, tekrar dene.')
        } finally {
          setBusy(false)
        }
      },
      () => { setBusy(false); setMsg('Konum izni alınamadı.') },
      { timeout: 10000 },
    )
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); ac(); setActive((a) => Math.min(a + 1, secenekler.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && open && secenekler[active]) { e.preventDefault(); sec(secenekler[active]) }
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Backspace' && !query && value.il) { e.preventDefault(); if (value.ilce) onChange({ il: value.il, ilce: '' }); else geri() }
  }

  const etiket = value.il ? `${value.il}${value.ilce ? ` · ${value.ilce}` : ' ·'}` : ''

  return (
    <div className={styles.wrap} ref={boxRef}>
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>İl · İlçe</label>
        <div className={styles.row}>
          {etiket && <span className={styles.chosen}>{etiket}</span>}
          <input
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && secenekler[active] ? `${listId}-${active}` : undefined}
            className={styles.input}
            value={query}
            placeholder={value.il ? (value.ilce ? '' : 'İlçe ara') : 'Trabzon · Akçaabat'}
            autoComplete="off"
            onFocus={ac}
            onChange={(e) => { setQuery(e.target.value); setActive(0); ac() }}
            onKeyDown={onKey}
          />
          {(value.il || value.ilce) && (
            <button type="button" className={styles.clear} aria-label="Konumu temizle" onClick={geri}>×</button>
          )}
          <button type="button" className={styles.locate} aria-label="Konumumu kullan" disabled={busy} onClick={konumum}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        </div>
      </div>
      {open && secenekler.length > 0 && (
        <ul id={listId} role="listbox" className={styles.list} aria-label={asama === 'il' ? 'İller' : 'İlçeler'}>
          {secenekler.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? `${styles.opt} ${styles.optOn}` : styles.opt}
              onMouseDown={(e) => { e.preventDefault(); sec(s) }}
              onMouseEnter={() => setActive(i)}
            >
              {s.text}
            </li>
          ))}
        </ul>
      )}
      {open && secenekler.length === 0 && !msg && (
        <div className={styles.list} role="status">
          <p className={styles.empty}>{(asama === 'il' ? iller : ilceler).length === 0 ? 'Yükleniyor…' : 'Sonuç bulunamadı'}</p>
        </div>
      )}
      <p className={styles.msg} role="status" aria-live="polite">{msg}</p>
    </div>
  )
}
