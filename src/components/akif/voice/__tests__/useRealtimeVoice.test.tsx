/** @jest-environment jsdom */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealtimeVoice } from '../useRealtimeVoice'

// --- sahte RTCPeerConnection ---
class FakeDC {
  listeners: Record<string, ((e: unknown) => void)[]> = {}
  readyState = 'open'
  sent: string[] = []
  addEventListener(t: string, cb: (e: unknown) => void, opts?: { once?: boolean }) {
    const wrapped = opts?.once
      ? (e: unknown) => {
          this.listeners[t] = (this.listeners[t] ?? []).filter((f) => f !== wrapped)
          cb(e)
        }
      : cb
    ;(this.listeners[t] ??= []).push(wrapped)
  }
  send(s: string) {
    this.sent.push(s)
  }
  emit(t: string, e: unknown) {
    ;(this.listeners[t] ?? []).slice().forEach((cb) => cb(e))
  }
  // Gerçek RTCDataChannel gibi: setRemoteDescription sonrası bir süre 'connecting',
  // sonra DTLS/SCTP kurulunca 'open' + 'open' olayı.
  emitOpen() {
    this.readyState = 'open'
    this.emit('open', {})
  }
}
class FakePC {
  dc = new FakeDC()
  onconnectionstatechange: (() => void) | null = null
  ontrack: ((e: unknown) => void) | null = null
  connectionState: string | undefined = undefined
  constructor(opts?: { dcConnecting?: boolean }) {
    if (opts?.dcConnecting) this.dc.readyState = 'connecting'
  }
  createDataChannel() {
    return this.dc
  }
  addTrack() {}
  async createOffer() {
    return { type: 'offer', sdp: 'x' }
  }
  async setLocalDescription() {}
  async setRemoteDescription() {}
  close() {
    this.closed = true
  }
  closed = false
  setConnState(s: string) {
    this.connectionState = s
    this.onconnectionstatechange?.()
  }
}

const sendBeaconMock = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  // @ts-expect-error jsdom
  navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
  }
  navigator.sendBeacon = sendBeaconMock
  global.fetch = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-1',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/tool')) {
      return {
        ok: true,
        json: async () => ({ kind: 'term', term: 'emsal', shortDef: 'a', example: 'b' }),
      } as never
    }
    // realtime/calls SDP
    return { ok: true, text: async () => 'answer-sdp' } as never
  }) as never
})

it('start: idle → connecting → listening', async () => {
  let pc: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
    }),
  )
  expect(result.current.status).toBe('idle')
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
})

it('tool_call olayı runVoiceToolCall tetikler + modele output döner', async () => {
  let pc!: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await act(async () => {
    pc.dc.emit('message', {
      data: JSON.stringify({
        type: 'response.function_call_arguments.done',
        call_id: 'c1',
        name: 'explainTerm',
        arguments: '{"term":"emsal"}',
      }),
    })
  })
  await waitFor(() => {
    expect(pc.dc.sent.some((s) => s.includes('function_call_output'))).toBe(true)
    expect(pc.dc.sent.some((s) => s.includes('response.create'))).toBe(true)
  })
})

it('speech_started → response.cancel gönderir, status listening', async () => {
  let pc!: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await act(async () => {
    pc.dc.emit('message', {
      data: JSON.stringify({ type: 'response.output_audio_transcript.delta', delta: 'Merhaba' }),
    })
  })
  await waitFor(() => expect(result.current.status).toBe('speaking'))
  await act(async () => {
    pc.dc.emit('message', { data: JSON.stringify({ type: 'input_audio_buffer.speech_started' }) })
  })
  await waitFor(() => {
    expect(pc.dc.sent.some((s) => s.includes('response.cancel'))).toBe(true)
    expect(result.current.status).toBe('listening')
  })
})

it('3 ardışık error → stop', async () => {
  let pc!: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      pc.dc.emit('message', { data: JSON.stringify({ type: 'error', error: { message: 'boom' } }) })
    })
  }
  await waitFor(() => expect(result.current.status).toBe('idle'))
  expect(pc.closed).toBe(true)
  expect(sendBeaconMock).toHaveBeenCalledWith('/api/akif/voice/usage', expect.any(String))
})

it('I5: error durumundan start() yeniden ilerler', async () => {
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return { ok: false, status: 401, json: async () => ({}) } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => new FakePC() as unknown as RTCPeerConnection,
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('error'))

  // Artık session 200 dönüyor — "Tekrar dene"
  fetchSpy.mockImplementation(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-2',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
})

it('I6: SDP ilk deneme fail → taze token ile bir kez retry, sonra bağlanır', async () => {
  let sdpCalls = 0
  let sessionCalls = 0
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      sessionCalls++
      return {
        ok: true,
        json: async () => ({
          token: `ek_${sessionCalls}`,
          sessionId: `sess-${sessionCalls}`,
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    // realtime/calls
    sdpCalls++
    if (sdpCalls === 1) return { ok: false, status: 401, text: async () => 'expired' } as never
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => new FakePC() as unknown as RTCPeerConnection,
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  expect(sdpCalls).toBe(2)
  expect(sessionCalls).toBe(2)
})

it('I6: ICE disconnected → grace içinde connected → oturum yaşar', async () => {
  jest.useFakeTimers()
  try {
    let pc!: FakePC
    const { result } = renderHook(() =>
      useRealtimeVoice({
        rtcFactory: () => {
          pc = new FakePC()
          return pc as unknown as RTCPeerConnection
        },
        fetchFn: (async (url: RequestInfo | URL) => {
          if (String(url).includes('/api/akif/voice/session')) {
            return {
              ok: true,
              json: async () => ({
                token: 'ek_1',
                sessionId: 'sess-1',
                model: 'gpt-realtime-mini',
                sessionMaxSec: 600,
              }),
            } as never
          }
          return { ok: true, text: async () => 'answer-sdp' } as never
        }) as typeof fetch,
      }),
    )
    await act(async () => {
      await result.current.start()
    })
    await waitFor(() => expect(result.current.status).toBe('listening'))

    act(() => {
      pc.setConnState('disconnected')
    })
    act(() => {
      jest.advanceTimersByTime(3000)
      pc.setConnState('connected')
    })
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(pc.closed).toBe(false)
    expect(result.current.status).not.toBe('idle')
  } finally {
    jest.useRealTimers()
  }
})

// Re-asserted (Task 8): grace timer artık doğrudan stop() etmiyor — önce TEK reconnect
// denenir. Bu testin fetch mock'u session için geçerli oturum döndürdüğünden reconnect
// başarılı olur ve status 'idle' yerine 'listening'e döner.
it('I6: ICE disconnected → grace geçti → tek reconnect denenir', async () => {
  jest.useFakeTimers()
  try {
    let pc!: FakePC
    const { result } = renderHook(() =>
      useRealtimeVoice({
        rtcFactory: () => {
          pc = new FakePC()
          return pc as unknown as RTCPeerConnection
        },
        fetchFn: (async (url: RequestInfo | URL) => {
          if (String(url).includes('/api/akif/voice/session')) {
            return {
              ok: true,
              json: async () => ({
                token: 'ek_1',
                sessionId: 'sess-1',
                model: 'gpt-realtime-mini',
                sessionMaxSec: 600,
              }),
            } as never
          }
          return { ok: true, text: async () => 'answer-sdp' } as never
        }) as typeof fetch,
      }),
    )
    await act(async () => {
      await result.current.start()
    })
    await waitFor(() => expect(result.current.status).toBe('listening'))

    const oldPc = pc
    act(() => {
      oldPc.setConnState('disconnected')
    })
    await act(async () => {
      jest.advanceTimersByTime(6000)
    })
    await waitFor(() => expect(result.current.status).toBe('listening'))
    expect(oldPc.closed).toBe(true) // eski pc kapandı
    expect(pc).not.toBe(oldPc) // yeni bağlantı kuruldu
  } finally {
    jest.useRealTimers()
  }
})

it('stop: sendBeacon usage POST', async () => {
  let pc!: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  act(() => {
    result.current.stop('user_ended')
  })
  const body = JSON.parse(sendBeaconMock.mock.calls[0][1])
  expect(body).toMatchObject({ sessionId: 'sess-1', endReason: 'user_ended' })
})

it('timer: wrap-up at sessionMaxSec-60, timeout at sessionMaxSec', async () => {
  jest.useFakeTimers()
  try {
    let pc!: FakePC
    const { result } = renderHook(() =>
      useRealtimeVoice({
        rtcFactory: () => {
          pc = new FakePC()
          return pc as unknown as RTCPeerConnection
        },
        fetchFn: (async (url: RequestInfo | URL, init?: RequestInit) => {
          if (String(url).includes('/api/akif/voice/session')) {
            return {
              ok: true,
              json: async () => ({
                token: 'ek_1',
                sessionId: 'sess-1',
                model: 'gpt-realtime-mini',
                sessionMaxSec: 120, // 120 seconds for this test
              }),
            } as never
          }
          if (String(url).includes('/api/akif/voice/tool')) {
            return {
              ok: true,
              json: async () => ({ kind: 'term', term: 'emsal', shortDef: 'a', example: 'b' }),
            } as never
          }
          return { ok: true, text: async () => 'answer-sdp' } as never
        }) as typeof fetch,
      }),
    )
    await act(async () => {
      await result.current.start()
    })
    await waitFor(() => expect(result.current.status).toBe('listening'))

    // Advance 61s (should trigger wrap-up at 60s)
    await act(async () => {
      jest.advanceTimersByTime(61_000)
    })
    const wrapUpMessages = pc.dc.sent.filter((s) =>
      s.includes('conversation.item.create') && s.includes('Süremiz doluyor'),
    )
    expect(wrapUpMessages).toHaveLength(1)

    // Advance 30s more (total 91s, should NOT trigger second wrap-up)
    await act(async () => {
      jest.advanceTimersByTime(30_000)
    })
    const wrapUpMessagesAfter30s = pc.dc.sent.filter((s) =>
      s.includes('conversation.item.create') && s.includes('Süremiz doluyor'),
    )
    expect(wrapUpMessagesAfter30s).toHaveLength(1)

    // Advance 30s more (total 121s ≥ 120, should trigger timeout)
    await act(async () => {
      jest.advanceTimersByTime(30_000)
    })
    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(pc.closed).toBe(true)
    const beaconCall = sendBeaconMock.mock.calls.find((call) =>
      String(call[0]).includes('/api/akif/voice/usage'),
    )
    expect(beaconCall).toBeDefined()
    const beaconBody = JSON.parse(beaconCall![1] as string)
    expect(beaconBody).toMatchObject({ endReason: 'timeout' })
  } finally {
    jest.useRealTimers()
  }
})

it('reconnect: connectionState=failed bir kez → reconnecting → listening, transkript korunur, aynı sessionId', async () => {
  const sessionBodies: (string | undefined)[] = []
  let pc!: FakePC
  let pcCount = 0
  const fetchSpy = jest.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/api/akif/voice/session')) {
      sessionBodies.push(init?.body as string | undefined)
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-1',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pcCount++
        // İlk bağlantı normal (kanal açık); reconnect'teki kanal 'connecting' başlar.
        pc = new FakePC(pcCount === 2 ? { dcConnecting: true } : undefined)
        return pc as unknown as RTCPeerConnection
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  // seed a transcript turn
  await act(async () => {
    pc.dc.emit('message', {
      data: JSON.stringify({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: '1200 metrekare',
      }),
    })
  })

  await act(async () => {
    pc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  // one resume call with resumeSessionId in the body
  const resumeBody = sessionBodies.find((b) => b && b.includes('resumeSessionId'))
  expect(resumeBody).toBeTruthy()
  expect(JSON.parse(resumeBody as string)).toEqual({ resumeSessionId: 'sess-1' })
  // transcript preserved
  expect(result.current.transcript.some((t) => t.text.includes('1200 metrekare'))).toBe(true)
  // resume context NOT sent yet — reconnected channel is still 'connecting'
  expect(pc.dc.readyState).toBe('connecting')
  expect(pc.dc.sent.some((s) => s.includes('Bağlantı koptu ve yeniden kuruldu'))).toBe(false)
  // channel opens → resume context injected on the new data channel
  await act(async () => {
    pc.dc.emitOpen()
  })
  expect(pc.dc.sent.some((s) => s.includes('Bağlantı koptu ve yeniden kuruldu'))).toBe(true)
})

it('reconnect: ikinci kopma → error + stop(disconnect)', async () => {
  let pc!: FakePC
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-1',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('idle'))
  expect(result.current.errorText).toBe('Bağlantı koptu.')
  const beaconCall = sendBeaconMock.mock.calls.find((c) =>
    String(c[0]).includes('/api/akif/voice/usage'),
  )
  expect(JSON.parse(beaconCall![1] as string)).toMatchObject({ endReason: 'disconnect' })
})

// --- Task 8: pendingAction (prepareScenarioSave) ---

const CONFIRM_CARD = {
  scenarioName: 'Akif — %45',
  display: {
    arsaPayiPct: 45,
    satisFiyati: 5e6,
    toplamMaliyet: 28e5,
    sahibineDaire: 9,
    sahibineTL: 9e5,
  },
  projectRef: { newName: null },
}

const PREPARE_TOOL_EVENT = {
  data: JSON.stringify({
    type: 'response.function_call_arguments.done',
    call_id: 'c1',
    name: 'prepareScenarioSave',
    arguments: '{"arsaAlani":2000,"emsal":2,"muteahhitPayi":45}',
  }),
}

it('prepareScenarioSave tool result → pendingAction proposal', async () => {
  let pc!: FakePC
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) return { ok: true, json: async () => ({ token: 't', sessionId: 's1', model: 'm', sessionMaxSec: 600 }) } as never
    if (String(url).includes('/api/akif/voice/tool')) return { ok: true, json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: { scenarioName: 'Akif — %45', display: { arsaPayiPct: 45, satisFiyati: 5e6, toplamMaliyet: 28e5, sahibineDaire: 9, sahibineTL: 9e5 }, projectRef: { newName: null } } }) } as never
    return { ok: true, text: async () => 'answer' } as never
  })
  const { result } = renderHook(() => useRealtimeVoice({ rtcFactory: () => { pc = new FakePC(); return pc as never }, fetchFn: fetchSpy as never }))
  await act(async () => { await result.current.start() })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.dc.emit('message', { data: JSON.stringify({ type: 'response.function_call_arguments.done', call_id: 'c1', name: 'prepareScenarioSave', arguments: '{"arsaAlani":2000,"emsal":2,"muteahhitPayi":45}' }) })
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('proposal'))
  expect(result.current.pendingAction?.pendingActionId).toBe('pa_1')
})

it('confirmPendingAction → POST commit, phase saved, feeds system msg', async () => {
  let pc!: FakePC
  const undoUntil = new Date(Date.now() + 30_000).toISOString()
  const fetchSpy = jest.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({ token: 't', sessionId: 's1', model: 'm', sessionMaxSec: 600 }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/action/commit')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          scenarioId: 'sc_1',
          projectId: 'p_1',
          projectName: 'Trabzon',
          undoToken: 'ut',
          undoUntil,
        }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/tool')) {
      return {
        ok: true,
        json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: CONFIRM_CARD }),
      } as never
    }
    return { ok: true, text: async () => 'answer' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as never
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.dc.emit('message', PREPARE_TOOL_EVENT)
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('proposal'))

  await act(async () => {
    await result.current.confirmPendingAction()
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('saved'))
  expect(result.current.pendingAction?.saved).toMatchObject({
    projectName: 'Trabzon',
    undoToken: 'ut',
    undoUntil,
  })
  const commitCall = fetchSpy.mock.calls.find((c) =>
    String(c[0]).includes('/api/akif/voice/action/commit'),
  )
  expect(commitCall).toBeTruthy()
  expect(JSON.parse((commitCall![1] as RequestInit).body as string)).toMatchObject({
    pendingActionId: 'pa_1',
    sessionId: 's1',
  })
  expect(
    pc.dc.sent.some(
      (s) => s.includes('conversation.item.create') && s.includes('onayladı') && s.includes('Trabzon'),
    ),
  ).toBe(true)
})

it('cancelPendingAction → pendingAction null + system msg "vazgeçti"', async () => {
  let pc!: FakePC
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({ token: 't', sessionId: 's1', model: 'm', sessionMaxSec: 600 }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/tool')) {
      return {
        ok: true,
        json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: CONFIRM_CARD }),
      } as never
    }
    return { ok: true, text: async () => 'answer' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as never
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.dc.emit('message', PREPARE_TOOL_EVENT)
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('proposal'))

  act(() => {
    result.current.cancelPendingAction()
  })
  await waitFor(() => expect(result.current.pendingAction).toBeNull())
  expect(
    pc.dc.sent.some((s) => s.includes('conversation.item.create') && s.includes('vazgeçti')),
  ).toBe(true)
})

it('commit 409 → phase error with message', async () => {
  let pc!: FakePC
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({ token: 't', sessionId: 's1', model: 'm', sessionMaxSec: 600 }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/action/commit')) {
      return {
        ok: false,
        status: 409,
        json: async () => ({ error: 'expired', message: 'Süre doldu.' }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/tool')) {
      return {
        ok: true,
        json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: CONFIRM_CARD }),
      } as never
    }
    return { ok: true, text: async () => 'answer' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as never
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.dc.emit('message', PREPARE_TOOL_EVENT)
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('proposal'))

  await act(async () => {
    await result.current.confirmPendingAction()
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('error'))
  expect(result.current.pendingAction?.errorMessage).toBe('Süre doldu.')
  expect(
    pc.dc.sent.some(
      (s) => s.includes('conversation.item.create') && s.includes('Kayıt yapılamadı: Süre doldu.'),
    ),
  ).toBe(true)
})

// Step 1 listesinde yok; undoLastAction dönen bir üye olduğu ve başarısızlık
// davranışı (kartı koru + küçük not) bir yargı kararı olduğu için eklendi.
async function driveToSaved(undoOk: boolean) {
  let pc!: FakePC
  const undoUntil = new Date(Date.now() + 30_000).toISOString()
  const fetchSpy = jest.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({ token: 't', sessionId: 's1', model: 'm', sessionMaxSec: 600 }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/action/commit')) {
      return {
        ok: true,
        json: async () => ({ ok: true, projectName: 'Trabzon', undoToken: 'ut', undoUntil }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/action/undo')) {
      return undoOk
        ? ({ ok: true, json: async () => ({ ok: true, undid: 'scenario' }) } as never)
        : ({ ok: false, status: 409, json: async () => ({ error: 'expired', message: 'Geri alma süresi doldu.' }) } as never)
    }
    if (String(url).includes('/api/akif/voice/tool')) {
      return {
        ok: true,
        json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: CONFIRM_CARD }),
      } as never
    }
    return { ok: true, text: async () => 'answer' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as never
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.dc.emit('message', PREPARE_TOOL_EVENT)
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('proposal'))
  await act(async () => {
    await result.current.confirmPendingAction()
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('saved'))
  return { result, getPc: () => pc, fetchSpy }
}

it('undoLastAction → POST undo, kart temizlenir + sistem mesajı', async () => {
  const { result, getPc, fetchSpy } = await driveToSaved(true)
  await act(async () => {
    await result.current.undoLastAction()
  })
  await waitFor(() => expect(result.current.pendingAction).toBeNull())
  const undoCall = fetchSpy.mock.calls.find((c) =>
    String(c[0]).includes('/api/akif/voice/action/undo'),
  )
  expect(JSON.parse((undoCall![1] as RequestInit).body as string)).toEqual({ undoToken: 'ut' })
  expect(
    getPc().dc.sent.some(
      (s) => s.includes('conversation.item.create') && s.includes('Kayıt geri alındı.'),
    ),
  ).toBe(true)
})

it('undoLastAction 409 → kayıtlı kart durur, küçük not düşer', async () => {
  const { result } = await driveToSaved(false)
  await act(async () => {
    await result.current.undoLastAction()
  })
  await waitFor(() => expect(result.current.pendingAction?.errorMessage).toBe('Geri alma süresi doldu.'))
  // kayıt gerçekten duruyor — kart 'saved' kalmalı
  expect(result.current.pendingAction?.phase).toBe('saved')
  expect(result.current.pendingAction?.saved?.projectName).toBe('Trabzon')
})

it('reconnect drops an uncommitted pendingAction', async () => {
  let pc!: FakePC
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-1',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    if (String(url).includes('/api/akif/voice/tool')) {
      return {
        ok: true,
        json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: CONFIRM_CARD }),
      } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as never
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.dc.emit('message', PREPARE_TOOL_EVENT)
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('proposal'))

  const oldPc = pc
  await act(async () => {
    oldPc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  expect(pc).not.toBe(oldPc) // yeni bağlantı kuruldu
  expect(result.current.pendingAction).toBeNull()
  // resume bağlamı, modele öneriyi tekrarlaması gerektiğini söyler
  expect(
    pc.dc.sent.some((s) => s.includes('Önceki kaydetme önerisi iptal oldu')),
  ).toBe(true)
})

it('reconnect: resume 409 → error', async () => {
  let pc!: FakePC
  let sessionCalls = 0
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      sessionCalls++
      if (sessionCalls >= 2) return { ok: false, status: 409, json: async () => ({}) } as never
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-1',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('idle'))
  expect(result.current.errorText).toBe('Bağlantı koptu.')
})
