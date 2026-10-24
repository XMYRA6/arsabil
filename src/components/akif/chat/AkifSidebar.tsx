// Akif sohbet arayüzü — sol kenar çubuğu (yeni sohbet, arama, senaryolar, tarihe göre geçmiş, kullanıcı).
'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ConversationSummary } from '@/lib/akif/chat/conversationStore'
import type { ScenarioItem } from '@/lib/akif/chat/scenarios'
import { groupByDate } from '@/lib/akif/chat/groupByDate'
import s from './AkifSidebar.module.css'

export interface AkifSidebarProps {
  conversations: ConversationSummary[]
  scenarios: ScenarioItem[]
  activeId: string | null
  q: string
  onQ(q: string): void
  onNew(): void
  onOpen(id: string): void
  onOpenScenario(s: ScenarioItem): void
  onRename(id: string, title: string): void
  onDelete(id: string): void
  hasMore: boolean
  onLoadMore(): void
  user: { name: string | null } | null
  signedIn: boolean
}

const svg = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const
const PlusIcon = () => (
  <svg {...svg}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const SearchIcon = () => (
  <svg {...svg}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4-4" />
  </svg>
)
const MoreIcon = () => (
  <svg {...svg}>
    <circle cx="5.5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="18.5" cy="12" r="1" fill="currentColor" />
  </svg>
)
const PencilIcon = () => (
  <svg {...svg}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </svg>
)
const TrashIcon = () => (
  <svg {...svg}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
  </svg>
)

const initials = (name: string | null) =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase('tr'))
    .join('') || 'K'

export function AkifSidebar(p: AkifSidebarProps) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (!menuId) return
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('[data-akif-menu]')) setMenuId(null)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuId(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [menuId])

  const groups = useMemo(() => groupByDate(p.conversations, new Date()), [p.conversations])

  const commit = (id: string) => {
    const t = draft.trim()
    setEditId(null)
    if (t) p.onRename(id, t)
  }

  const renderRow = (c: ConversationSummary) => {
    if (editId === c.id) {
      return (
        <li key={c.id} className={s.row}>
          <input
            className={s.rename}
            aria-label="Sohbet adı"
            value={draft}
            autoFocus
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(c.id)
              else if (e.key === 'Escape') setEditId(null)
            }}
            onBlur={() => setEditId(null)}
          />
        </li>
      )
    }
    if (confirmId === c.id) {
      return (
        <li key={c.id} className={`${s.row} ${s.confirm}`}>
          <span className={s.confirmText}>Silinsin mi?</span>
          <button
            type="button"
            className={s.danger}
            onClick={() => {
              setConfirmId(null)
              p.onDelete(c.id)
            }}
          >
            Evet, sil
          </button>
          <button type="button" className={s.ghost} onClick={() => setConfirmId(null)}>
            Vazgeç
          </button>
        </li>
      )
    }
    const active = p.activeId === c.id
    return (
      <li key={c.id} className={`${s.row} ${active ? s.rowActive : ''}`}>
        <button
          type="button"
          className={s.open}
          aria-current={active ? 'true' : undefined}
          title={c.title}
          onClick={() => p.onOpen(c.id)}
        >
          <span className={s.ellipsis}>{c.title}</span>
        </button>
        <span className={s.menuWrap} data-akif-menu>
          <button
            type="button"
            className={s.more}
            aria-label="Sohbet işlemleri"
            aria-haspopup="menu"
            aria-expanded={menuId === c.id}
            onClick={() => setMenuId(menuId === c.id ? null : c.id)}
          >
            <MoreIcon />
          </button>
          {menuId === c.id && (
            <div className={s.menu} role="menu">
              <button
                type="button"
                role="menuitem"
                className={s.menuItem}
                onClick={() => {
                  setMenuId(null)
                  setDraft(c.title)
                  setEditId(c.id)
                }}
              >
                <PencilIcon />
                Yeniden adlandır
              </button>
              <button
                type="button"
                role="menuitem"
                className={s.menuItem}
                onClick={() => {
                  setMenuId(null)
                  setConfirmId(c.id)
                }}
              >
                <TrashIcon />
                Sil
              </button>
            </div>
          )}
        </span>
      </li>
    )
  }

  return (
    <nav className={s.side} aria-label="Sohbetler">
      <button type="button" className={s.newChat} onClick={p.onNew}>
        <PlusIcon />
        Yeni sohbet
      </button>

      {p.signedIn && (
        <label className={s.search}>
          <SearchIcon />
          <input
            type="search"
            className={s.searchInput}
            placeholder="Sohbetlerde ara"
            aria-label="Sohbetlerde ara"
            value={p.q}
            onChange={(e) => p.onQ(e.target.value)}
          />
        </label>
      )}

      <div className={s.scroll}>
        {p.scenarios.length > 0 && (
          <section aria-labelledby="akif-sc-h">
            <h3 id="akif-sc-h" className={s.group}>
              Senaryolarım
            </h3>
            <ul className={s.list}>
              {p.scenarios.map((sc) => (
                <li key={sc.key} className={s.row}>
                  <button
                    type="button"
                    className={`${s.open} ${s.scenario}`}
                    title={sc.name}
                    onClick={() => p.onOpenScenario(sc)}
                  >
                    <i className={s.dot} aria-hidden="true" />
                    <span className={s.scText}>
                      <span className={s.ellipsis}>{sc.name}</span>
                      {sc.summary && <small className={s.ellipsis}>{sc.summary}</small>}
                    </span>
                    <span className={s.source}>{sc.source === 'site' ? 'Proje' : 'Akif'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.signedIn ? (
          p.conversations.length === 0 ? (
            <p className={s.empty}>Henüz sohbet yok</p>
          ) : (
            <>
              {groups.map((g) => (
                <section key={g.label}>
                  <h3 className={s.group}>{g.label}</h3>
                  <ul className={s.list}>{g.items.map(renderRow)}</ul>
                </section>
              ))}
              {p.hasMore && (
                <button type="button" className={s.loadMore} onClick={p.onLoadMore}>
                  Daha fazla göster
                </button>
              )}
            </>
          )
        ) : (
          <Link href="/login" className={s.guest}>
            Sohbetlerini kaydetmek için giriş yap
          </Link>
        )}
      </div>

      {p.user && (
        <div className={s.me}>
          <span className={s.avatar} aria-hidden="true">
            {initials(p.user.name)}
          </span>
          <span className={s.ellipsis}>{p.user.name ?? 'Hesabım'}</span>
        </div>
      )}
    </nav>
  )
}
