'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ToolResultCard } from '@/lib/ai/akif/contract'
import { parseRealtimeEvent } from './voiceEvents'
import { runVoiceToolCall, buildFunctionCallOutputMessages } from './voiceToolBridge'

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'

export interface VoiceTranscriptItem {
  id: string
  role: 'user' | 'akif'
  text: string
  card?: ToolResultCard
}

export interface UseRealtimeVoice {
  status: VoiceStatus
  transcript: VoiceTranscriptItem[]
  elapsedSec: number
  errorText: string | null
  start: () => Promise<void>
  stop: (reason?: string) => void
}

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls'
const WARN_BEFORE_SEC = 60
const MAX_ERRORS = 3

const rid = () =>
  globalThis.crypto?.randomUUID?.() ?? `v_${Date.now()}_${Math.random().toString(36).slice(2)}`

export function useRealtimeVoice(opts?: {
  rtcFactory?: () => RTCPeerConnection
  fetchFn?: typeof fetch
}): UseRealtimeVoice {
  const fetchFn = opts?.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState<VoiceTranscriptItem[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)
  const [errorText, setErrorText] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stoppedRef = useRef(false)

  const sessionIdRef = useRef<string>('')
  const startedAtRef = useRef<number>(0)
  const maxSecRef = useRef<number>(600)
  const toolCallsRef = useRef(0)
  const usageRef = useRef<{ inputAudioTokens: number; outputAudioTokens: number }>({
    inputAudioTokens: 0,
    outputAudioTokens: 0,
  })
  const errCountRef = useRef(0)
  const akifDraftRef = useRef<{ id: string; text: string } | null>(null)
  const warnedRef = useRef(false)

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

  const stop = useCallback((reason = 'user_ended') => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    if (!sessionIdRef.current) {
      setStatus('idle')
      return
    }
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      pcRef.current?.close()
    } catch {
      /* noop */
    }
    micStreamRef.current?.getTracks().forEach((tr) => tr.stop())
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
  }, [])

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
          dcRef.current?.send(JSON.stringify({ type: 'response.cancel' }))
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
          for (const m of buildFunctionCallOutputMessages(ev.callId, r.outputForModel)) {
            dcRef.current?.send(JSON.stringify(m))
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
    [appendUser, appendAkifDelta, attachCard, fetchFn, stop],
  )

  const start = useCallback(async () => {
    if (status !== 'idle') return
    stoppedRef.current = false
    errCountRef.current = 0
    warnedRef.current = false
    setErrorText(null)
    setTranscript([])
    setElapsedSec(0)
    setStatus('connecting')

    let mic: MediaStream
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setStatus('error')
      setErrorText('Sesli sohbet için mikrofon izni lazım.')
      return
    }
    if (stoppedRef.current) return
    micStreamRef.current = mic

    let sess: { token: string; sessionId: string; model: string; sessionMaxSec: number }
    try {
      const res = await fetchFn('/api/akif/voice/session', { method: 'POST' })
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('error')
          setErrorText('Sesli sohbet için giriş yapmalısın.')
          mic.getTracks().forEach((t) => t.stop())
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
        mic.getTracks().forEach((t) => t.stop())
        return
      }
      sess = (await res.json()) as typeof sess
    } catch {
      setStatus('error')
      setErrorText('Bağlantı kurulamadı.')
      mic.getTracks().forEach((t) => t.stop())
      return
    }
    if (stoppedRef.current) return

    sessionIdRef.current = sess.sessionId
    maxSecRef.current = sess.sessionMaxSec
    startedAtRef.current = Date.now()

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
      if (
        (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') &&
        !stoppedRef.current
      ) {
        setErrorText('Bağlantı koptu.')
        stop('disconnect')
      }
    }
    mic.getTracks().forEach((tr) => pc.addTrack(tr, mic))

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

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const sdpRes = await fetchFn(`${CALLS_URL}?model=${encodeURIComponent(sess.model)}`, {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${sess.token}`, 'Content-Type': 'application/sdp' },
      })
      if (!sdpRes.ok) throw new Error('sdp')
      const answer = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answer })
    } catch {
      setStatus('error')
      setErrorText('Bağlantı kurulamadı, tekrar dene.')
      stop('error')
      return
    }
    if (stoppedRef.current) return

    setStatus('listening')
    timerRef.current = setInterval(() => {
      const sec = Math.round((Date.now() - startedAtRef.current) / 1000)
      setElapsedSec(sec)
      if (!warnedRef.current && sec >= maxSecRef.current - WARN_BEFORE_SEC) {
        warnedRef.current = true
        dcRef.current?.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'system',
              content: [{ type: 'input_text', text: 'Süremiz doluyor, kısa bir kapanış yap.' }],
            },
          }),
        )
      }
      if (sec >= maxSecRef.current) stop('timeout')
    }, 1000)
  }, [status, opts, fetchFn, handleEvent, stop])

  useEffect(() => {
    return () => {
      if (!stoppedRef.current) stop('user_ended')
    }
  }, [stop])

  return { status, transcript, elapsedSec, errorText, start, stop }
}
