'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { AkifMessage, AkifTurn } from '@/lib/ai/akif/contract'
import type { ConversationSummary, StoredMessage } from '@/lib/akif/chat/conversationStore'
import type { ScenarioItem } from '@/lib/akif/chat/scenarios'
import { deriveWorkspace, diffWorkspace, type WorkspaceState } from '@/lib/akif/chat/workspace'
import { AkifChat, type AkifChatEntry } from '@/components/akif/AkifChat'
import { AkifVoicePanel } from '@/components/akif/voice/AkifVoicePanel'
import { AkifShell } from '@/components/akif/chat/AkifShell'
import { AkifSidebar } from '@/components/akif/chat/AkifSidebar'
import { WorkspacePanel } from '@/components/akif/chat/WorkspacePanel'
import { useConversations } from '@/components/akif/chat/useConversations'
import { useScenarios } from '@/components/akif/chat/useScenarios'
import { bildirimGoster } from '@/components/ui/AppToast'
import styles from './page.module.css'

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `c_${Date.now()}_${Math.random().toString(36).slice(2)}`

const ERR: Record<number, string> = {
  429: 'Çok sık soru sordun, biraz bekle.',
  503: 'Akif şu an kapalı (yapılandırma eksik).',
  502: 'Akif şu an yanıt veremiyor, birazdan dene.',
}

function toHistory(entries: AkifChatEntry[]): AkifMessage[] {
  const msgs: AkifMessage[] = []
  for (const e of entries) {
    if (e.role === 'user') msgs.push({ role: 'user', content: e.content })
    else if (e.role === 'akif') msgs.push({ role: 'akif', content: e.turn.speech })
  }
  return msgs.slice(-40)
}

type Sources = Parameters<typeof deriveWorkspace>[0]
type Changes = ReturnType<typeof diffWorkspace>

const NEW_TITLE = 'Yeni sohbet'
/** Canlı değişim vurgusu bu süre sonra sakinleşir (spec §6.4: ~1,5 sn). */
const FLASH_MS = 1600
const EMPTY_WS = deriveWorkspace([])

/** Senaryo tohumu (site projesi / proje kartı) üstüne turlardan türeyen değerler biner. */
function overlay(seed: WorkspaceState | null, d: WorkspaceState): WorkspaceState {
  if (!seed) return d
  const pick = <T,>(a: T | null, b: T | null): T | null => (a !== null ? a : b)
  return {
    konum: pick(d.konum, seed.konum),
    alanM2: pick(d.alanM2, seed.alanM2),
    m2Fiyat: pick(d.m2Fiyat, seed.m2Fiyat),
    emsalNotu: pick(d.emsalNotu, seed.emsalNotu),
    arsaSahibiPct: pick(d.arsaSahibiPct, seed.arsaSahibiPct),
    muteahhitPct: pick(d.muteahhitPct, seed.muteahhitPct),
    varsayimlar: Array.from(new Set([...seed.varsayimlar, ...d.varsayimlar])),
    dolu: seed.dolu || d.dolu,
  }
}

/** Saklı mesaj → sohbet girdisi. Ses mesajlarında `turn` yok; yalnız konuşma metni gösterilir. */
function toEntries(messages: StoredMessage[]): AkifChatEntry[] {
  const out: AkifChatEntry[] = []
  for (const m of messages) {
    if (m.role === 'user') out.push({ id: m.id, role: 'user', content: m.content })
    else if (m.role === 'akif') {
      const turn: AkifTurn = m.turn ?? {
        intent: 'smalltalk',
        speech: m.content,
        state: 'NEUTRAL',
        facts_used: [],
        assumptions: [],
        missing_fields: [],
        risk_level: 'low',
      }
      out.push({ id: m.id, role: 'akif', turn })
    }
  }
  return out
}

/** Panel konumu "<mahalle>, <ilce>/<il>" biçiminde; ayrıştırılamazsa null. */
function parseKonum(konum: string | null): { il: string; ilce: string } | null {
  const m = konum?.match(/,\s*([^,/]+?)\s*\/\s*([^,/]+?)\s*$/)
  return m ? { ilce: m[1]!, il: m[2]! } : null
}

async function isConflict(res: Response): Promise<boolean> {
  if (res.status !== 409) return false
  try {
    const b = (await res.json()) as { error?: unknown } | null
    return b?.error === 'conversation_conflict'
  } catch {
    return false
  }
}

export default function AkifPage() {
  // Sohbet kimliği state'te — "Yeni sohbet" sıfırlamada yenilenir.
  const [conversationId, setConversationId] = useState(makeId)
  const [entries, setEntries] = useState<AkifChatEntry[]>([])
  const [pending, setPending] = useState(false)
  const [mode, setMode] = useState<'text' | 'voice'>('text')
  const { status, data: session } = useSession()
  const signedIn = status === 'authenticated'
  const router = useRouter()
  const convs = useConversations(signedIn)
  const scenarios = useScenarios(signedIn)
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState(NEW_TITLE)
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const [navTick, setNavTick] = useState(0)
  // Sunucuda var olduğu bilinen sohbet (yüklendi ya da oturumluyken başarılı tur aldı).
  // Liste süzgeci/sayfalaması onu gizleyebileceği için listeden aranmaz.
  const [persistedId, setPersistedId] = useState<string | null>(null)

  // Çalışma paneli: yükleme anında türetilir (vurgu yok); yalnız canlı turlar diff'lenir.
  const [ws, setWs] = useState<WorkspaceState>(EMPTY_WS)
  const [changes, setChanges] = useState<Changes>({})
  const wsRef = useRef<WorkspaceState>(EMPTY_WS)
  const sourcesRef = useRef<Sources>([])
  const seedRef = useRef<WorkspaceState | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadSeq = useRef(0)

  const clearFlash = () => {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = null
  }
  useEffect(() => clearFlash, [])

  const setWorkspace = (sources: Sources, seed: WorkspaceState | null) => {
    clearFlash()
    sourcesRef.current = sources
    seedRef.current = seed
    const next = overlay(seed, deriveWorkspace(sources))
    wsRef.current = next
    setWs(next)
    setChanges({})
  }

  const applyLiveTurn = (turn: AkifTurn) => {
    sourcesRef.current = [...sourcesRef.current, { turn }]
    const next = overlay(seedRef.current, deriveWorkspace(sourcesRef.current))
    const diff = diffWorkspace(wsRef.current, next)
    wsRef.current = next
    setWs(next)
    clearFlash()
    if (Object.keys(diff).length > 0) {
      setChanges(diff)
      flashTimer.current = setTimeout(() => {
        flashTimer.current = null
        setChanges({})
      }, FLASH_MS)
    } else {
      setChanges({})
    }
  }

  const startFresh = () => {
    loadSeq.current++
    setEntries([])
    setConversationId(makeId())
    setTitle(NEW_TITLE)
    setPersistedId(null)
    setProjectId('')
    setDraft(undefined)
    setWorkspace([], null)
    setNavTick((n) => n + 1)
  }

  const resetConversation = () => {
    if (pending) return
    startFresh()
  }

  const openConversation = async (id: string) => {
    if (pending) return
    const seq = ++loadSeq.current
    setNavTick((n) => n + 1)
    try {
      const res = await fetch(`/api/akif/conversations/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { conversation: ConversationSummary; messages: StoredMessage[] }
      if (seq !== loadSeq.current) return
      const messages = data.messages ?? []
      setConversationId(id)
      setPersistedId(id)
      setTitle(data.conversation?.title || NEW_TITLE)
      setProjectId(data.conversation?.projectId ?? '')
      setDraft(undefined)
      setEntries(toEntries(messages))
      setWorkspace(
        messages.map((m) => ({ turn: m.turn, card: m.card })),
        null,
      )
    } catch {
      if (seq === loadSeq.current) bildirimGoster({ tip: 'hata', baslik: 'Sohbet açılamadı' })
    }
  }

  const openScenario = (sc: ScenarioItem) => {
    if (pending) return
    if (entries.length > 0) startFresh()
    else loadSeq.current++
    // Tur API'si yalnız site projelerini tanır; proje kartı bağlamı taslakla sürer (§10.2).
    setProjectId(sc.source === 'site' ? sc.id : '')
    setWorkspace([], sc.workspace)
    setDraft(sc.source === 'kart' ? `${sc.name} senaryosunu güncelleyelim:` : undefined)
    setNavTick((n) => n + 1)
  }

  const deleteConversation = async (id: string) => {
    // Tur sürerken etkin sohbet silinmez: yanıt silinmiş bir sohbetin görünümüne düşerdi.
    if (pending && id === conversationId) {
      bildirimGoster({ tip: 'hata', baslik: 'Akif yanıtlarken bu sohbet silinemez', aciklama: 'Yanıt gelince tekrar dene.' })
      return
    }
    try {
      await convs.remove(id)
      if (id === conversationId) startFresh()
    } catch {
      bildirimGoster({ tip: 'hata', baslik: 'Sohbet silinemedi', aciklama: 'Bağlantını kontrol edip tekrar dene.' })
    } finally {
      void convs.refresh()
    }
  }

  const renameConversation = async (id: string, next: string) => {
    try {
      await convs.rename(id, next)
      if (id === conversationId) setTitle(next)
    } catch {
      bildirimGoster({ tip: 'hata', baslik: 'Sohbet adı değiştirilemedi', aciklama: 'Bağlantını kontrol edip tekrar dene.' })
    } finally {
      void convs.refresh()
    }
  }

  const listed = convs.items.find((c) => c.id === conversationId)
  const shownTitle = listed?.title ?? title

  const renameActive = (next: string) => {
    if (signedIn && persistedId === conversationId) void renameConversation(conversationId, next)
    else setTitle(next)
  }

  const report = () => {
    const q = new URLSearchParams()
    if (ws.alanM2 !== null) q.set('alan', String(ws.alanM2))
    const loc = parseKonum(ws.konum)
    if (loc) {
      q.set('il', loc.il)
      q.set('ilce', loc.ilce)
    }
    const qs = q.toString()
    router.push(qs ? `/hesapla?${qs}` : '/hesapla')
  }

  const send = async (text: string) => {
    if (pending) return
    // Bu gönderimin görünüm sırası: devam eden bir sohbet yüklemesini düşürür; yanıt
    // gelene kadar kullanıcı başka sohbete geçerse yanıt bu görünüme yazılmaz
    // (sunucu zaten doğru sohbete kaydetti).
    const seq = ++loadSeq.current
    const current = () => seq === loadSeq.current
    const history = toHistory(entries)
    setDraft(undefined)
    setEntries((prev) => [...prev, { id: makeId(), role: 'user', content: text }])
    setPending(true)
    const post = (cid: string) =>
      fetch('/api/akif/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: cid,
          history,
          userMessage: text,
          ...(projectId ? { projectId } : {}),
        }),
      })
    try {
      let cid = conversationId
      let res = await post(cid)
      // Kimlik başka kullanıcıya aitse (409) yeni kimlikle BİR kez yeniden dene; geçmiş aynı kalır.
      if (await isConflict(res)) {
        cid = makeId()
        if (current()) setConversationId(cid)
        res = await post(cid)
      }
      if (!current()) {
        if (signedIn) void convs.refresh()
        return
      }
      if (!res.ok) {
        setEntries((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'error',
            content: ERR[res.status] ?? 'Bir sorun oldu, tekrar dener misin?',
          },
        ])
        return
      }
      const turn = (await res.json()) as AkifTurn
      if (signedIn) void convs.refresh()
      if (!current()) return
      setEntries((prev) => [...prev, { id: makeId(), role: 'akif', turn }])
      applyLiveTurn(turn)
      // Sunucu çifti kaydetti (oturum varsa); başlık/sıra için liste yukarıda yenilendi.
      if (signedIn) setPersistedId(cid)
    } catch {
      if (!current()) return
      setEntries((prev) => [
        ...prev,
        { id: makeId(), role: 'error', content: 'Bağlantı hatası, tekrar deneyin.' },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <AkifShell
      title={shownTitle}
      onTitle={renameActive}
      onVoice={() => setMode('voice')}
      voiceActive={mode === 'voice'}
      closeSignal={navTick}
      sidebar={
        <AkifSidebar
          conversations={convs.items}
          scenarios={scenarios.items}
          activeId={signedIn ? conversationId : null}
          q={convs.q}
          onQ={convs.setQ}
          onNew={resetConversation}
          onOpen={(id) => void openConversation(id)}
          onOpenScenario={openScenario}
          onRename={(id, t) => void renameConversation(id, t)}
          onDelete={(id) => void deleteConversation(id)}
          hasMore={convs.hasMore}
          onLoadMore={() => void convs.loadMore()}
          user={signedIn ? { name: session?.user?.name ?? null } : null}
          signedIn={signedIn}
        />
      }
      panel={
        <WorkspacePanel state={ws} changes={changes} onReport={report} reportDisabled={!ws.dolu} />
      }
    >
      <div className={styles.chat}>
        {mode === 'voice' && (
          <div className={styles.modeSwitch} role="group" aria-label="Akif modu">
            <button type="button" className={styles.modeBtn} aria-pressed="false" onClick={() => setMode('text')}>
              Yazı
            </button>
            <button type="button" className={`${styles.modeBtn} ${styles.modeBtnActive}`} aria-pressed="true">
              Sesli
            </button>
          </div>
        )}
        {mode === 'text' ? (
          <AkifChat
            entries={entries}
            pending={pending}
            onSend={send}
            onVoice={() => setMode('voice')}
            initialDraft={draft}
          />
        ) : (
          <AkifVoicePanel onExit={() => setMode('text')} />
        )}
      </div>
    </AkifShell>
  )
}
