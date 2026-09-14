'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ToolResultCard } from '@/lib/ai/akif/contract'
import { parseRealtimeEvent } from './voiceEvents'
import { runVoiceToolCall, buildFunctionCallOutputMessages } from './voiceToolBridge'
import { buildResumeContext } from './voiceResume'
import type { ResumeTranscriptItem } from './voiceResume'

export type VoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'error'
  | 'reconnecting'

export interface VoiceTranscriptItem {
  id: string
  role: 'user' | 'akif'
  text: string
  card?: ToolResultCard
}

// Akif-2-Aksiyon — "senaryoyu kaydet" akışının istemci tarafı durumu.
// proposal → (kullanıcı onayı) saving → saved | error. Tek seferde tek kart tutulur.
export interface PendingAction {
  phase: 'proposal' | 'saving' | 'saved' | 'error'
  pendingActionId?: string
  confirmCard?: unknown
  candidates?: { id: string; name: string }[]
  saved?: { projectName: string; undoToken: string; undoUntil: string }
  errorMessage?: string
}

export interface PendingActionOverrides {
  projectId?: string
  projectName?: string
  scenarioName?: string
}

export interface UseRealtimeVoice {
  status: VoiceStatus
  transcript: VoiceTranscriptItem[]
  elapsedSec: number
  errorText: string | null
  pendingAction: PendingAction | null
  start: () => Promise<void>
  stop: (reason?: string) => void
  confirmPendingAction: (overrides?: PendingActionOverrides) => Promise<void>
  cancelPendingAction: () => void
  undoLastAction: () => Promise<void>
}

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls'
const SESSION_URL = '/api/akif/voice/session'
const COMMIT_URL = '/api/akif/voice/action/commit'
const UNDO_URL = '/api/akif/voice/action/undo'
// Yeniden bağlanmada onaylanmamış kaydetme önerisi düşer; model tekrar önerebilsin.
const RESUME_PENDING_DROPPED =
  ' Önceki kaydetme önerisi iptal oldu; kullanıcı isterse tekrar söylesin.'
const WARN_BEFORE_SEC = 60
const MAX_ERRORS = 3
const ICE_GRACE_MS = 5000

const rid = () =>
  globalThis.crypto?.randomUUID?.() ?? `v_${Date.now()}_${Math.random().toString(36).slice(2)}`

interface SessionInfo {
  token: string
  sessionId: string
  model: string
  sessionMaxSec: number
}

type RefetchSession = () => Promise<SessionInfo | null>

export function useRealtimeVoice(opts?: {
  rtcFactory?: () => RTCPeerConnection
  fetchFn?: typeof fetch
}): UseRealtimeVoice {
  const fetchFn = opts?.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState<VoiceTranscriptItem[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppedRef = useRef(false)
  // Oturum başına TEK otomatik yeniden bağlanma.
  const reconnectedRef = useRef(false)
  // establishConnection ↔ attemptReconnect kapanış döngüsünü kırar (dep dizisi yerine ref).
  const reconnectRef = useRef<null | (() => void)>(null)
  // attemptReconnect'in kapanışı bayat 'transcript' görmesin diye ref'te güncel tutulur.
  const transcriptRef = useRef<VoiceTranscriptItem[]>([])
  // confirm/cancel/undo ve attemptReconnect bayat 'pendingAction' görmesin (transcriptRef ile aynı desen).
  const pendingActionRef = useRef<PendingAction | null>(null)

  const sessionIdRef = useRef<string>('')
  const startedAtRef = useRef<number>(0)
  const resumeContextRef = useRef<string | null>(null)
  const maxSecRef = useRef<number>(600)
  const toolCallsRef = useRef(0)
  const usageRef = useRef<{ inputAudioTokens: number; outputAudioTokens: number }>({
    inputAudioTokens: 0,
    outputAudioTokens: 0,
  })
  const errCountRef = useRef(0)
  const akifDraftRef = useRef<{ id: string; text: string } | null>(null)
  const warnedRef = useRef(false)

  const stopMicTracks = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
  }, [])

  const clearGrace = useCallback(() => {
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current)
      graceTimerRef.current = null
    }
  }, [])

  // Data-channel'a yalnız kanal açıkken yaz — kapalıyken .send() fırlatır.
  const safeSend = useCallback((obj: unknown) => {
    const dc = dcRef.current
    if (dc && dc.readyState === 'open') {
      try {
        dc.send(JSON.stringify(obj))
      } catch {
        /* noop */
      }
    }
  }, [])

  // Modele sistem rolüyle metin besle (resume bağlamı, süre uyarısı, aksiyon bildirimleri).
  const sendSystemText = useCallback(
    (text: string) => {
      safeSend({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] },
      })
    },
    [safeSend],
  )

  const appendUser = useCallback((text: string) => {
    setTranscript((t) => [...t, { id: rid(), role: 'user', text }])
  }, [])

  const appendAkifDelta = useCallback((delta: string) => {
    setTranscript((t) => {
      const cur = akifDraftRef.current
      if (cur) {
        return t.map((it) => (it.id === cur.id ? { ...it, text: it.text + delta } : it))
      }
      const item = { id: rid(), role: 'akif' as const, text: delta }
      akifDraftRef.current = { id: item.id, text: delta }
      return [...t, item]
    })
  }, [])

  const attachCard = useCallback((card: ToolResultCard) => {
    setTranscript((t) => [...t, { id: rid(), role: 'akif', text: '', card }])
  }, [])

  const stop = useCallback(
    (reason = 'user_ended') => {
      if (stoppedRef.current) {
        stopMicTracks()
        return
      }
      stoppedRef.current = true
      clearGrace()
      if (!sessionIdRef.current) {
        stopMicTracks()
        setStatus('idle')
        return
      }
      if (timerRef.current) clearInterval(timerRef.current)
      try {
        if (pcRef.current) pcRef.current.onconnectionstatechange = null
        pcRef.current?.close()
      } catch {
        /* noop */
      }
      stopMicTracks()
      const durationSec = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : 0
      const body = JSON.stringify({
        sessionId: sessionIdRef.current,
        startedAtMs: startedAtRef.current,
        durationSec,
        toolCalls: toolCallsRef.current,
        realtimeUsage:
          usageRef.current.inputAudioTokens || usageRef.current.outputAudioTokens
            ? usageRef.current
            : null,
        endReason: reason,
      })
      try {
        navigator.sendBeacon?.('/api/akif/voice/usage', body)
      } catch {
        /* noop */
      }
      setStatus('idle')
    },
    [clearGrace, stopMicTracks],
  )

  // Bağlantı kopması ortak davranışı: ilk kopmada tek sefer yeniden bağlan,
  // ikinci kopmada gerçekten kapat. 'failed' branch'i ve grace-timer callback'i paylaşır.
  const handleDrop = useCallback(() => {
    if (!reconnectedRef.current) {
      reconnectRef.current?.()
    } else {
      setErrorText('Bağlantı koptu.')
      stop('disconnect')
    }
  }, [stop])

  const handleEvent = useCallback(
    async (raw: unknown) => {
      const ev = parseRealtimeEvent(raw)
      if (!ev) return
      switch (ev.type) {
        case 'user_transcript':
          akifDraftRef.current = null
          appendUser(ev.text)
          break
        case 'akif_transcript_delta':
          setStatus('speaking')
          // İlk barge-in'den sonra <audio> duraklatılmış kalır; Akif yeniden
          // konuşmaya başlarken oynatmayı tekrar aç.
          void audioRef.current?.play?.().catch(() => {})
          appendAkifDelta(ev.text)
          break
        case 'akif_transcript_done':
          akifDraftRef.current = null
          setStatus('listening')
          break
        case 'speech_started':
          try {
            audioRef.current?.pause()
          } catch {
            /* noop */
          }
          safeSend({ type: 'response.cancel' })
          akifDraftRef.current = null
          setStatus('listening')
          break
        case 'tool_call': {
          toolCallsRef.current += 1
          const r = await runVoiceToolCall(
            { callId: ev.callId, name: ev.name, args: ev.args },
            { sessionId: sessionIdRef.current, fetchFn },
          )
          if (r.card) attachCard(r.card)
          // Akif-2-Aksiyon: kaydetme akışının sinyalini ekrandaki onay kartına çevir.
          if (r.pendingAction) {
            const pa = r.pendingAction
            if (pa.type === 'proposal') {
              setPendingAction({
                phase: 'proposal',
                pendingActionId: pa.pendingActionId,
                confirmCard: pa.confirmCard,
                candidates: pa.candidates,
              })
            } else if (pa.type === 'committed') {
              setPendingAction({
                phase: 'saved',
                saved: {
                  projectName: pa.projectName,
                  undoToken: pa.undoToken,
                  undoUntil: pa.undoUntil,
                },
              })
            } else {
              setPendingAction({ phase: 'error', errorMessage: pa.message })
            }
          }
          for (const m of buildFunctionCallOutputMessages(ev.callId, r.outputForModel)) {
            safeSend(m)
          }
          break
        }
        case 'response_done':
          if (ev.usage) {
            usageRef.current.inputAudioTokens += ev.usage.inputAudioTokens
            usageRef.current.outputAudioTokens += ev.usage.outputAudioTokens
          }
          setStatus('listening')
          break
        case 'error':
          errCountRef.current += 1
          setErrorText(ev.message)
          if (errCountRef.current >= MAX_ERRORS) stop('error')
          break
      }
    },
    [appendUser, appendAkifDelta, attachCard, fetchFn, safeSend, stop],
  )

  // start() içinden çıkarıldı: PC kurulumu + SDP döngüsü + geçen-süre timer'ı.
  // Davranış korunur; başarıda 'listening' + timer, başarısızlıkta stop() ÇAĞIRMADAN false.
  const establishConnection = useCallback(
    async (sess: SessionInfo, cfg: { resume: boolean; refetch: RefetchSession }): Promise<boolean> => {
      maxSecRef.current = sess.sessionMaxSec

      const pc = opts?.rtcFactory ? opts.rtcFactory() : new RTCPeerConnection()
      pcRef.current = pc
      pc.ontrack = (e: RTCTrackEvent) => {
        if (!audioRef.current) {
          audioRef.current = new Audio()
          audioRef.current.autoplay = true
        }
        audioRef.current.srcObject = (e.streams && e.streams[0]) || null
        void audioRef.current.play?.().catch(() => {})
      }
      pc.onconnectionstatechange = () => {
        if (stoppedRef.current) return
        const st = pc.connectionState
        // 'completed' RTCPeerConnectionState'te yok (o iceConnectionState'e ait) —
        // burada kurtarma sinyali 'connected'.
        if (st === 'connected') {
          clearGrace()
          return
        }
        if (st === 'failed') {
          handleDrop()
          return
        }
        if (st === 'disconnected') {
          // Geçici olabilir — hemen kapatma, ~5 sn tolerans tanı.
          if (graceTimerRef.current) return
          graceTimerRef.current = setTimeout(() => {
            graceTimerRef.current = null
            if (!stoppedRef.current && pcRef.current?.connectionState !== 'connected') {
              handleDrop()
            }
          }, ICE_GRACE_MS)
        }
      }
      micStreamRef.current?.getTracks().forEach((tr) => pc.addTrack(tr, micStreamRef.current!))

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.addEventListener('message', (e: MessageEvent) => {
        let parsed: unknown
        try {
          parsed = JSON.parse(e.data)
        } catch {
          return
        }
        void handleEvent(parsed)
      })

      let offerSdp: string | undefined
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        offerSdp = offer.sdp
      } catch {
        return false
      }

      let connected = false
      let curToken = sess.token
      let curModel = sess.model
      for (let attempt = 0; attempt < 2 && !connected && !stoppedRef.current; attempt++) {
        if (attempt > 0) {
          const j = await cfg.refetch()
          if (!j) break
          curToken = j.token
          curModel = j.model
          sessionIdRef.current = j.sessionId
          if (stoppedRef.current) break
        }
        try {
          const sdpRes = await fetchFn(`${CALLS_URL}?model=${encodeURIComponent(curModel)}`, {
            method: 'POST',
            body: pc.localDescription?.sdp ?? offerSdp,
            headers: { Authorization: `Bearer ${curToken}`, 'Content-Type': 'application/sdp' },
          })
          if (!sdpRes.ok) throw new Error('sdp')
          const answer = await sdpRes.text()
          await pc.setRemoteDescription({ type: 'answer', sdp: answer })
          connected = true
        } catch {
          /* sonraki deneme veya vazgeç */
        }
      }

      if (!connected || stoppedRef.current) return false

      if (cfg.resume) {
        // Data-channel setRemoteDescription sonrası hâlâ 'connecting' olabilir; kanal
        // gerçekten açılınca gönder (açıksa hemen). Aksi halde safeSend sessizce yutar.
        const sendResumeCtx = () => sendSystemText(resumeContextRef.current ?? '')
        if (dc.readyState === 'open') sendResumeCtx()
        else dc.addEventListener('open', sendResumeCtx, { once: true })
      }

      setStatus('listening')
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        const sec = Math.round((Date.now() - startedAtRef.current) / 1000)
        setElapsedSec(sec)
        if (!warnedRef.current && sec >= maxSecRef.current - WARN_BEFORE_SEC) {
          warnedRef.current = true
          sendSystemText('Süremiz doluyor, kısa bir kapanış yap.')
        }
        if (sec >= maxSecRef.current) stop('timeout')
      }, 1000)
      return true
    },
    [opts, fetchFn, handleEvent, sendSystemText, stop, clearGrace, handleDrop],
  )

  // Oturum başına TEK otomatik yeniden bağlanma. Ölü pc'yi kapatır, resume oturumu
  // ister ve establishConnection'ı resume moduyla çağırır. Başarısızlıkta stop('disconnect').
  const attemptReconnect = useCallback(async () => {
    if (stoppedRef.current || reconnectedRef.current) return
    reconnectedRef.current = true
    clearGrace()
    try {
      // Ölü pc'nin geç gelen state olayı yeni sağlıklı oturumu öldürmesin.
      if (pcRef.current) pcRef.current.onconnectionstatechange = null
      pcRef.current?.close()
    } catch {
      /* noop */
    }
    dcRef.current = null
    setStatus('reconnecting')

    // İstemcideki transkriptten kompakt bağlam kur (state closure yerine ref'ten en güncel).
    resumeContextRef.current = buildResumeContext(
      transcriptRef.current as ResumeTranscriptItem[],
    )
    // Akif-2-Aksiyon: yeni oturumda eski pendingActionId geçersiz — kartı düşür.
    // Henüz yazılmamış bir öneriyse modele de bildir ki gerekirse tekrar önersin
    // ('saved' ise kayıt gerçekten olmuştur, "iptal oldu" demek yanlış olurdu).
    const droppedPending = pendingActionRef.current
    if (droppedPending && droppedPending.phase !== 'saved') {
      resumeContextRef.current += RESUME_PENDING_DROPPED
    }
    // Koşulsuz: ref bir tık bayat olsa bile kart kesinlikle düşmeli.
    setPendingAction(null)

    let sess: SessionInfo
    try {
      const res = await fetchFn(SESSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeSessionId: sessionIdRef.current }),
      })
      if (!res.ok) {
        setErrorText('Bağlantı koptu.')
        stop('disconnect')
        return
      }
      sess = (await res.json()) as SessionInfo
    } catch {
      setErrorText('Bağlantı koptu.')
      stop('disconnect')
      return
    }
    if (stoppedRef.current) return

    const refetch: RefetchSession = async () => {
      try {
        const r = await fetchFn(SESSION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeSessionId: sessionIdRef.current }),
        })
        if (!r.ok) return null
        return (await r.json()) as SessionInfo
      } catch {
        return null
      }
    }

    const ok = await establishConnection(sess, { resume: true, refetch })
    if (!ok && !stoppedRef.current) {
      setErrorText('Bağlantı koptu.')
      stop('disconnect')
    }
  }, [clearGrace, fetchFn, establishConnection, stop])

  const start = useCallback(async () => {
    // 'error' durumundan da yeniden başlanabilmeli ("Tekrar dene").
    if (status !== 'idle' && status !== 'error') return

    // Tüm geçici ref'leri sıfırla — 'error' sonrası temiz bir başlangıç şart.
    stoppedRef.current = false
    errCountRef.current = 0
    warnedRef.current = false
    toolCallsRef.current = 0
    usageRef.current = { inputAudioTokens: 0, outputAudioTokens: 0 }
    akifDraftRef.current = null
    sessionIdRef.current = ''
    startedAtRef.current = 0
    reconnectedRef.current = false
    resumeContextRef.current = null
    clearGrace()
    setErrorText(null)
    setTranscript([])
    setElapsedSec(0)
    setPendingAction(null)
    setStatus('connecting')

    // 1) Önce auth/kota — anonim kullanıcı mikrofon istemi görmeden "giriş yap" alsın.
    let sess: SessionInfo
    try {
      const res = await fetchFn(SESSION_URL, { method: 'POST' })
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('error')
          setErrorText('Sesli sohbet için giriş yapmalısın.')
          return
        }
        const errBody = (await res.json().catch(() => ({}))) as { reason?: string }
        setStatus('error')
        setErrorText(
          errBody.reason === 'user_quota'
            ? 'Bu ayki sesli sohbet süreni doldurdun.'
            : errBody.reason === 'monthly_budget'
              ? 'Sesli sohbet şu an kapalı, sonra tekrar dene.'
              : 'Sesli sohbet başlatılamadı.',
        )
        return
      }
      sess = (await res.json()) as SessionInfo
    } catch {
      setStatus('error')
      setErrorText('Bağlantı kurulamadı.')
      return
    }

    // 2) Mikrofon izni.
    let mic: MediaStream
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setStatus('error')
      setErrorText('Sesli sohbet için mikrofon izni lazım.')
      return
    }
    if (stoppedRef.current) {
      mic.getTracks().forEach((t) => t.stop())
      return
    }
    micStreamRef.current = mic

    sessionIdRef.current = sess.sessionId
    startedAtRef.current = Date.now()

    // 3) SDP değişimi — ilk deneme başarısızsa TEK sefer taze token ile yeniden dene.
    const refetch: RefetchSession = async () => {
      try {
        const r = await fetchFn(SESSION_URL, { method: 'POST' })
        if (!r.ok) return null
        return (await r.json()) as SessionInfo
      } catch {
        return null
      }
    }

    const ok = await establishConnection(sess, { resume: false, refetch })
    if (!ok && !stoppedRef.current) {
      setStatus('error')
      setErrorText('Bağlantı kurulamadı, tekrar dene.')
      stop('error')
    }
  }, [status, opts, fetchFn, establishConnection, stop, clearGrace])

  // Kullanıcı onay kartındaki "Kaydet"e bastı — pending action'ı gerçekten yaz.
  const confirmPendingAction = useCallback(
    async (overrides?: PendingActionOverrides) => {
      const cur = pendingActionRef.current
      if (cur?.phase !== 'proposal' || !cur.pendingActionId) return
      // Ref effect ile senkronlanır (render sonrası); çift tıkta ikinci çağrı hâlâ
      // 'proposal' görüp 409'a düşmesin diye burada elle de ilerlet.
      pendingActionRef.current = { ...cur, phase: 'saving' }
      setPendingAction((p) => (p ? { ...p, phase: 'saving' } : p))
      const fail = (message: string) => {
        setPendingAction({ phase: 'error', errorMessage: message })
        sendSystemText(`Kayıt yapılamadı: ${message}.`)
      }
      let res: Response
      try {
        res = await fetchFn(COMMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pendingActionId: cur.pendingActionId,
            sessionId: sessionIdRef.current,
            ...overrides,
          }),
        })
      } catch {
        fail('Bağlantı hatası')
        return
      }
      const body = (await res.json().catch(() => ({}))) as {
        projectName?: string
        undoToken?: string
        undoUntil?: string
        message?: string
      }
      if (!res.ok) {
        fail(body.message ?? 'Beklenmeyen bir hata oldu')
        return
      }
      const projectName = body.projectName ?? ''
      setPendingAction({
        phase: 'saved',
        saved: {
          projectName,
          undoToken: body.undoToken ?? '',
          undoUntil: body.undoUntil ?? '',
        },
      })
      sendSystemText(`Kullanıcı kaydı onayladı; senaryo ${projectName} projesine eklendi.`)
    },
    [fetchFn, sendSystemText],
  )

  // Kullanıcı "Vazgeç" dedi — kartı kaldır, modele de bildir ki ısrar etmesin.
  const cancelPendingAction = useCallback(() => {
    setPendingAction(null)
    sendSystemText('Kullanıcı kaydetmekten vazgeçti.')
  }, [sendSystemText])

  // "Geri Al" — commit'ten dönen undoToken ile kısa pencerede yazılanı sil.
  const undoLastAction = useCallback(async () => {
    const saved = pendingActionRef.current?.saved
    if (!saved?.undoToken) return
    let res: Response
    try {
      res = await fetchFn(UNDO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ undoToken: saved.undoToken }),
      })
    } catch {
      // Kart yerinde kalsın — kayıt duruyor; kullanıcıya küçük bir not düş.
      setPendingAction((p) => (p ? { ...p, errorMessage: 'Geri alınamadı.' } : p))
      return
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      setPendingAction((p) => (p ? { ...p, errorMessage: body.message ?? 'Geri alınamadı.' } : p))
      return
    }
    setPendingAction(null)
    sendSystemText('Kayıt geri alındı.')
  }, [fetchFn, sendSystemText])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    pendingActionRef.current = pendingAction
  }, [pendingAction])

  useEffect(() => {
    reconnectRef.current = () => void attemptReconnect()
  }, [attemptReconnect])

  useEffect(() => {
    return () => {
      if (!stoppedRef.current) stop('user_ended')
    }
  }, [stop])

  return {
    status,
    transcript,
    elapsedSec,
    errorText,
    pendingAction,
    start,
    stop,
    confirmPendingAction,
    cancelPendingAction,
    undoLastAction,
  }
}
