/** @jest-environment jsdom */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealtimeVoice } from '../useRealtimeVoice'

// --- sahte RTCPeerConnection ---
class FakeDC {
  listeners: Record<string, ((e: unknown) => void)[]> = {}
  readyState = 'open'
  sent: string[] = []
  addEventListener(t: string, cb: (e: unknown) => void) {
    ;(this.listeners[t] ??= []).push(cb)
  }
  send(s: string) {
    this.sent.push(s)
  }
  emit(t: string, e: unknown) {
    ;(this.listeners[t] ?? []).forEach((cb) => cb(e))
  }
}
class FakePC {
  dc = new FakeDC()
  onconnectionstatechange: (() => void) | null = null
  ontrack: ((e: unknown) => void) | null = null
  connectionState: string | undefined = undefined
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
  // resume context injected on the new data channel
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
  const beaconCall = sendBeaconMock.mock.calls.find((c) =>
    String(c[0]).includes('/api/akif/voice/usage'),
  )
  expect(JSON.parse(beaconCall![1] as string)).toMatchObject({ endReason: 'disconnect' })
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
})
