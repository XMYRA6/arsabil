// Akif sohbet arayüzü — üç sütunlu kabuk (kenar çubuğu | sohbet | çalışma paneli).
// ≥1280: panel sabit · 900–1280: panel düğmeyle açılır · <900: kenar çubuğu çekmece,
// panel alt sayfa ("Senaryo" çipi). Kenar çubuğu ve panel DOM'da tek kez çizilir;
// kırılımlar yalnız CSS ile değişir (öğe kopyalanmaz, durum kaybolmaz).
'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import s from './AkifShell.module.css'

export interface AkifShellProps {
  sidebar: ReactNode
  panel: ReactNode
  children: ReactNode
  title: string
  onTitle(title: string): void
  onVoice(): void
  /** Mobil üst çubukta başlık yerine gösterilecek kısa metin (opsiyonel). */
  mobileTitle?: string
  /** Ses görünümü açıkken "Sesli konuş" düğmesi gizlenir. */
  voiceActive?: boolean
  /** Değiştiğinde mobil çekmece kapanır (sohbet açıldı / yeni sohbet / senaryo). */
  closeSignal?: number
}

const svg = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const
const MenuIcon = () => (
  <svg {...svg}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
)
const MicIcon = () => (
  <svg {...svg} width={16} height={16}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
)
const PanelIcon = () => (
  <svg {...svg}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M14.5 4.5v15" />
  </svg>
)
const CloseIcon = () => (
  <svg {...svg}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function AkifShell(p: AkifShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const shellRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const chipRef = useRef<HTMLButtonElement>(null)
  const titleBtnRef = useRef<HTMLButtonElement>(null)
  const editDone = useRef(false)
  const refocusTitle = useRef(false)

  const closeDrawer = (refocus: boolean) => {
    setDrawerOpen(false)
    if (refocus) menuBtnRef.current?.focus()
  }
  const closeSheet = (refocus: boolean) => {
    setSheetOpen(false)
    if (refocus) chipRef.current?.focus()
  }

  // Yapışkan Navbar'ın yüksekliği oturuma göre değişir (misafir 92px, avatarlı 100px):
  // kabuğun belge içindeki üst ofseti ölçülür, yükseklik buna göre kısılır. Ölçüm
  // yoksa CSS'teki varsayılan geçerli kalır.
  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const measure = () => {
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY))
      if (top > 0) el.style.setProperty('--akif-top', `${top}px`)
      else el.style.removeProperty('--akif-top')
    }
    measure()
    window.addEventListener('resize', measure)
    const nav = el.previousElementSibling ?? el.parentElement?.previousElementSibling ?? null
    const ro = typeof ResizeObserver !== 'undefined' && nav ? new ResizeObserver(measure) : null
    if (ro && nav) ro.observe(nav)
    return () => {
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [])

  // Çekmece açılınca odak içeri taşınır.
  useEffect(() => {
    if (!drawerOpen) return
    drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [drawerOpen])

  // Esc: önce çekmece, sonra alt sayfa. Kenar çubuğunun kendi menüsü/yeniden
  // adlandırma alanı Esc'i kendisi işler; oradan gelen tuşu yutmayız.
  useEffect(() => {
    if (!drawerOpen && !sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const t = e.target as Element | null
      if (t?.closest?.('[data-akif-menu]') || t?.tagName === 'INPUT') return
      if (drawerOpen) {
        setDrawerOpen(false)
        menuBtnRef.current?.focus()
      } else {
        setSheetOpen(false)
        chipRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen, sheetOpen])

  // Sohbet açılınca / yeni sohbette çekmece kapanır.
  const firstSignal = useRef(true)
  useEffect(() => {
    if (firstSignal.current) {
      firstSignal.current = false
      return
    }
    setDrawerOpen(false)
  }, [p.closeSignal])

  useEffect(() => {
    if (!editing && refocusTitle.current) {
      refocusTitle.current = false
      titleBtnRef.current?.focus()
    }
  }, [editing])

  // Odak tuzağı (hafif): çekmece açıkken Tab çekmecenin içinde döner.
  const trapTab = (e: React.KeyboardEvent) => {
    if (!drawerOpen || e.key !== 'Tab') return
    const items = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (items.length === 0) return
    const first = items[0]!
    const last = items[items.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const startEdit = () => {
    editDone.current = false
    setDraft(p.title)
    setEditing(true)
  }
  const finishEdit = (save: boolean, refocus: boolean) => {
    if (editDone.current) return
    editDone.current = true
    const v = draft.trim()
    refocusTitle.current = refocus
    setEditing(false)
    if (save && v && v !== p.title) p.onTitle(v)
  }

  return (
    <div
      ref={shellRef}
      className={s.shell}
      data-drawer-open={drawerOpen ? '' : undefined}
      data-sheet-open={sheetOpen ? '' : undefined}
      data-panel-open={panelOpen ? '' : undefined}
    >
      <div id="akif-drawer" ref={drawerRef} className={s.side} onKeyDown={trapTab}>
        {p.sidebar}
      </div>

      {(drawerOpen || sheetOpen) && (
        <div
          className={s.scrim}
          data-testid="akif-shell-scrim"
          aria-hidden="true"
          onClick={() => {
            closeDrawer(drawerOpen)
            closeSheet(!drawerOpen && sheetOpen)
          }}
        />
      )}

      <section className={s.main}>
        <header className={s.top}>
          <button
            ref={menuBtnRef}
            type="button"
            className={`${s.iconBtn} ${s.menuBtn}`}
            aria-label="Sohbetleri aç"
            aria-expanded={drawerOpen}
            aria-controls="akif-drawer"
            onClick={() => (drawerOpen ? closeDrawer(false) : setDrawerOpen(true))}
          >
            <MenuIcon />
          </button>
          <span className={s.avatar} aria-hidden="true">
            A
          </span>
          <div className={s.titleBox}>
            <span className={s.kicker}>Akif Usta</span>
            {editing ? (
              <input
                className={s.titleInput}
                aria-label="Sohbet başlığı"
                value={draft}
                autoFocus
                maxLength={120}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') finishEdit(true, true)
                  else if (e.key === 'Escape') finishEdit(false, true)
                }}
                onBlur={() => finishEdit(true, false)}
              />
            ) : (
              <button
                ref={titleBtnRef}
                type="button"
                className={s.titleBtn}
                aria-label={`${p.title} — adını değiştir`}
                title={p.title}
                onClick={startEdit}
              >
                <span className={`${s.titleText} ${p.mobileTitle ? s.titleDesk : ''}`}>{p.title}</span>
                {p.mobileTitle && <span className={`${s.titleText} ${s.titleMobile}`}>{p.mobileTitle}</span>}
              </button>
            )}
          </div>
          <div className={s.actions}>
            <button
              type="button"
              className={`${s.iconBtn} ${s.panelToggle}`}
              aria-label="Çalışma paneli"
              aria-expanded={panelOpen}
              aria-controls="akif-panel"
              onClick={() => setPanelOpen((v) => !v)}
            >
              <PanelIcon />
            </button>
            {!p.voiceActive && (
              <button type="button" className={s.voice} onClick={p.onVoice}>
                <MicIcon />
                <span>
                  Sesli<span className={s.voiceLong}> konuş</span>
                </span>
              </button>
            )}
          </div>
        </header>

        <div className={s.chipRow}>
          <button
            ref={chipRef}
            type="button"
            className={s.chip}
            aria-expanded={sheetOpen}
            aria-controls="akif-panel"
            onClick={() => (sheetOpen ? closeSheet(false) : setSheetOpen(true))}
          >
            <i className={s.chipDot} aria-hidden="true" />
            Senaryo
          </button>
        </div>

        <div className={s.body}>{p.children}</div>
      </section>

      <div id="akif-panel" className={s.panel}>
        <div className={s.sheetHead}>
          <span className={s.sheetTitle}>Senaryo</span>
          <button type="button" className={s.iconBtn} aria-label="Paneli kapat" onClick={() => closeSheet(true)}>
            <CloseIcon />
          </button>
        </div>
        {p.panel}
      </div>
    </div>
  )
}
