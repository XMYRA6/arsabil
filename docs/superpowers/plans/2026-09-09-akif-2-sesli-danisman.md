# Akif-2 Sesli Danışman — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/akif` sayfasına, OpenAI Realtime API üzerinden sesli sohbet modu eklemek; her sayı/hesap Akif-1 motorunda doğrulanır.

**Architecture:** Hibrit-A. Ses tarayıcı↔OpenAI arasında WebRTC ile doğrudan akar. Backend yalnız (1) efemeral token basar, (2) tool çağrılarını `validateArgs` + `dispatchTool` ile çalıştırır, (3) oturum sonu maliyet/dakika loglar. Realtime modeli sayı hesaplamaz — Akif-1'in `AKIF_TOOL_DEFS` şemaları + `toolRegistry` aynen yeniden kullanılır.

**Tech Stack:** Next.js 16 (App Router, `runtime = 'nodejs'`), React 19, TypeScript, Prisma (Postgres), jest + RTL, WebRTC (`RTCPeerConnection`), OpenAI Realtime API GA (`/v1/realtime/client_secrets` + `/v1/realtime/calls`), plain `fetch` (openai SDK KULLANILMAZ — sürüm riski, studio `falClient` deseni).

**Spec:** `docs/superpowers/specs/2026-09-09-akif-2-sesli-danisman-design.md`

## Global Constraints

- Branch: `codex/professional-ui-and-land-cost`. Yeni worktree AÇMA (dal origin'de yok — [[feedback_agent_tool_isolation_worktree]]). Doğrudan bu checkout'ta çalış.
- zod YOK — elle doğrulama (proje geneli, `parseAkifTurn`/`parseInbound` deseni).
- Her dep dışarıdan enjekte edilir (DI) — Akif-1 modüllerinin tamamı böyle, testte tam sahte.
- `runtime = 'nodejs'` tüm route'larda.
- OpenAI çağrıları plain `fetch` — endpoint `https://api.openai.com/v1/realtime/client_secrets` (efemeral) ve tarayıcıda `https://api.openai.com/v1/realtime/calls` (SDP). SDK yok.
- `OPENAI_API_KEY` yoksa sesli mod TAMAMEN kapalı (route 503, düğme gizli). Metin Akif etkilenmez.
- Env okuma: boş string / NaN / pozitif-olmayan → fallback (`numEnv` deseni, `openaiClient.ts`).
- Audit tablolarına HAM METİN / TRANSKRİPT YAZILMAZ — yalnız sayaç/meta.
- Migration elle SQL (proje deseni), YALNIZ dev DB'ye uygulanır. Prod = büyük deploy batch'i.
- Test: `npx jest --no-coverage --roots "<rootDir>/src" <path>` . Tüm proje: `npx jest --no-coverage`. Tip: `npx tsc --noEmit`. Build: `npm run build`.
- Realtime olay adları (GA): kullanıcı konuşması başladı = `input_audio_buffer.speech_started`; tool argümanları tamam = `response.function_call_arguments.done` (`call_id`, `name`, `arguments`); tur bitti = `response.done` (içinde `response.usage`); transkript = `response.output_audio_transcript.delta` (Akif) / `conversation.item.input_audio_transcription.completed` (kullanıcı); hata = `error`.
- Tool sonucu geri besleme: data-channel'a `{ type: 'conversation.item.create', item: { type: 'function_call_output', call_id, output: JSON.stringify(card) } }` sonra `{ type: 'response.create' }`.
- Commit mesajı sonu:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AMJvKKWDuFzkEdvonm9cM1
  ```

---

## File Structure

**Sunucu — `src/lib/ai/akif/voice/`**
| Dosya | Sorumluluk |
|---|---|
| `voiceEnv.ts` | `readVoiceEnv(env)` → sesli mod config (model, ses adı, 3 guard eşiği, smoke bütçesi) |
| `voiceCost.ts` | `VOICE_RATES` sabiti + `estimateVoiceCostUsd({ model, durationSec, usage? })` |
| `voiceRhythm.ts` | `VOICE_RHYTHM_PROMPT` sabiti (Karadeniz ton + fonetik-taklit yasağı + sayı-telaffuz) — `voiceProfile.ts`'i bağlar |
| `realtimeSession.ts` | `buildRealtimeSessionConfig(deps)` → OpenAI `session` nesnesi |
| `voiceAudit.ts` | `createVoiceAuditLogger(db)` → `logVoiceTurn`, `logVoiceSession`, `voiceMonthSpendUsd`, `voiceUserMonthSeconds` |
| `voiceQuota.ts` | `checkVoiceQuota(deps)` → `{ ok, reason?, remainingSec? }` |

**Sunucu — route'lar `src/app/api/akif/voice/`**
| Dosya | Sorumluluk |
|---|---|
| `session/route.ts` | `POST` — rate-limit + auth + kota + efemeral token bas |
| `tool/route.ts` | `POST` — auth + `validateArgs` + `dispatchTool` + audit |
| `usage/route.ts` | `POST` — oturum sonu maliyet/dakika kaydı (idempotent) |

**İstemci — `src/components/akif/voice/`**
| Dosya | Sorumluluk |
|---|---|
| `voiceEvents.ts` | **Saf.** Ham Realtime olayı → `VoiceEvent` birliği |
| `voiceToolBridge.ts` | **Saf.** `tool.call` → POST → `function_call_output` mesajı |
| `useRealtimeVoice.ts` | Hook — WebRTC yaşam döngüsü + durum makinesi + barge-in + süre + usage |
| `AkifVoiceTranscript.tsx` | Canlı transkript — Akif-1 bileşenleriyle |
| `AkifVoicePanel.tsx` | Mikrofon orb'u + Bitir + sayaç + hata bandı + izin akışı |

**Değişen dosyalar**
| Dosya | Değişiklik |
|---|---|
| `prisma/schema.prisma` | 2 yeni model |
| `prisma/migrations/<ts>_add_akif_voice_logs/migration.sql` | yeni |
| `src/lib/rate-limit.ts` | `RATE_LIMITS.AKIF_VOICE_SESSION` eklenir |
| `src/app/akif/page.tsx` | sesli mod toggle |
| `.env.example` | 6 yeni değişken |
| `package.json` | `akif:voice-smoke` script |
| `scripts/akif-voice-smoke.ts` | yeni — gerçek API dumanı |
| `docs/akif/akif-2-insan-duman-kontrol-listesi.md` | yeni — deploy sonrası insan testi |

---

## Task 1: Prisma modelleri + dev migration

**Files:**
- Modify: `prisma/schema.prisma` (dosya sonu)
- Create: `prisma/migrations/<timestamp>_add_akif_voice_logs/migration.sql`
- Test: `prisma/migrations/__tests__` YOK — doğrulama `prisma validate` + dev DB apply

**Interfaces:**
- Produces: `AkifVoiceSessionLog { id, userId, startedAt, endedAt, durationSec, toolCalls, estCostUsd, endReason }`, `AkifVoiceTurnLog { id, sessionId, createdAt, tool, intent, estCostUsd }` (Prisma modelleri — Task 6 `voiceAudit` bunlara yazar)

- [ ] **Step 1: Prisma şemasına 2 model ekle**

`prisma/schema.prisma` sonuna (mevcut `AkifTurnLog` modelinin hemen ardına, tutarlı yer):

```prisma
model AkifVoiceSessionLog {
  id          String   @id @default(cuid())
  userId      String
  startedAt   DateTime
  endedAt     DateTime @default(now())
  durationSec Int
  toolCalls   Int      @default(0)
  estCostUsd  Float    @default(0)
  endReason   String

  @@index([userId, startedAt])
  @@index([startedAt])
}

model AkifVoiceTurnLog {
  id         String   @id @default(cuid())
  sessionId  String
  createdAt  DateTime @default(now())
  tool       String?
  intent     String?
  estCostUsd Float    @default(0)

  @@index([sessionId])
}
```

- [ ] **Step 2: `prisma validate` çalıştır**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 3: Migration SQL dosyasını elle yaz**

Klasör adı: `prisma/migrations/` altında mevcut en yeni migration'ın timestamp'inden büyük bir `YYYYMMDDHHMMSS_add_akif_voice_logs`. Mevcut en yeni migration'ı gör: `ls prisma/migrations | sort | tail -3`.

`migration.sql`:

```sql
-- CreateTable
CREATE TABLE "AkifVoiceSessionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSec" INTEGER NOT NULL,
    "toolCalls" INTEGER NOT NULL DEFAULT 0,
    "estCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endReason" TEXT NOT NULL,

    CONSTRAINT "AkifVoiceSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AkifVoiceTurnLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tool" TEXT,
    "intent" TEXT,
    "estCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AkifVoiceTurnLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AkifVoiceSessionLog_userId_startedAt_idx" ON "AkifVoiceSessionLog"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "AkifVoiceSessionLog_startedAt_idx" ON "AkifVoiceSessionLog"("startedAt");

-- CreateIndex
CREATE INDEX "AkifVoiceTurnLog_sessionId_idx" ON "AkifVoiceTurnLog"("sessionId");
```

- [ ] **Step 4: Dev DB'ye uygula**

Docker dev DB ayakta değilse: `npm run dev:db` (bekle ~5sn).
Run: `npx prisma migrate deploy`
Expected: `Applying migration ...add_akif_voice_logs` + `The following migration(s) have been applied`.
Sonra: `npx prisma migrate status` → `Database schema is up to date!`

- [ ] **Step 5: Prisma client üret**

Run: `npx prisma generate`
Expected: temiz. (Windows'ta EPERM gelirse — [[project_arsabil_edermi_rakip]] bilinen takıntı — jest/TS server'ı kapatıp tekrar dene; şema değiştiği için bu sefer gerekli.)

- [ ] **Step 6: tsc + commit**

Run: `npx tsc --noEmit`
Expected: 0 hata.

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(akif-2): AkifVoiceSessionLog + AkifVoiceTurnLog modelleri + dev migration"
```

---

## Task 2: `voiceEnv.ts` — sesli mod yapılandırması

**Files:**
- Create: `src/lib/ai/akif/voice/voiceEnv.ts`
- Test: `src/lib/ai/akif/voice/__tests__/voiceEnv.test.ts`

**Interfaces:**
- Consumes: `numEnv` deseni (kopyala — `openaiClient.ts`'teki ile aynı davranış; import ETME, `openaiClient` başka şeyler de export ediyor ve döngü riski yok ama küçük saf helper'ı burada tekrar tanımlamak DRY'dan sapma değil — Akif-1 `costGuard` da kendi `estimateHistoryTokens`'ını tutuyor). Aslında: `numEnv`'i `openaiClient.ts`'ten `export` edilmiş hale getir ve import et.
- Produces:
  ```ts
  interface VoiceEnvConfig {
    apiKey: string
    model: string              // AKIF_VOICE_MODEL, default 'gpt-realtime-mini'
    voiceName: string          // AKIF_VOICE_NAME, default 'marin'
    monthlyBudgetUsd: number   // AKIF_VOICE_MONTHLY_BUDGET_USD, default 30
    userMonthlyMinutes: number // AKIF_VOICE_USER_MONTHLY_MINUTES, default 30
    sessionMaxSec: number      // AKIF_VOICE_SESSION_MAX_SEC, default 600
    smokeBudgetUsd: number     // AKIF_VOICE_SMOKE_BUDGET_USD, default 1
  }
  function readVoiceEnv(env?: Record<string, string | undefined>): VoiceEnvConfig  // apiKey yoksa throw new Error('akif_unavailable')
  ```

- [ ] **Step 1: `numEnv`'i openaiClient'tan export et**

`src/lib/ai/akif/openaiClient.ts`: `function numEnv(` → `export function numEnv(`. Başka değişiklik yok.
Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif` → mevcut testler yeşil kalmalı.

- [ ] **Step 2: Failing test yaz**

`src/lib/ai/akif/voice/__tests__/voiceEnv.test.ts`:

```ts
import { readVoiceEnv } from '../voiceEnv'

describe('readVoiceEnv', () => {
  it('apiKey yoksa akif_unavailable fırlatır', () => {
    expect(() => readVoiceEnv({})).toThrow('akif_unavailable')
  })

  it('varsayılanları döndürür', () => {
    const c = readVoiceEnv({ OPENAI_API_KEY: 'sk-x' })
    expect(c).toEqual({
      apiKey: 'sk-x',
      model: 'gpt-realtime-mini',
      voiceName: 'marin',
      monthlyBudgetUsd: 30,
      userMonthlyMinutes: 30,
      sessionMaxSec: 600,
      smokeBudgetUsd: 1,
    })
  })

  it('boş string env varsayılana düşer (Coolify unset)', () => {
    const c = readVoiceEnv({
      OPENAI_API_KEY: 'sk-x',
      AKIF_VOICE_MONTHLY_BUDGET_USD: '',
      AKIF_VOICE_SESSION_MAX_SEC: '0',
    })
    expect(c.monthlyBudgetUsd).toBe(30)
    expect(c.sessionMaxSec).toBe(600)
  })

  it('geçerli override okur', () => {
    const c = readVoiceEnv({
      OPENAI_API_KEY: 'sk-x',
      AKIF_VOICE_MODEL: 'gpt-realtime',
      AKIF_VOICE_NAME: 'verse',
      AKIF_VOICE_USER_MONTHLY_MINUTES: '15',
    })
    expect(c.model).toBe('gpt-realtime')
    expect(c.voiceName).toBe('verse')
    expect(c.userMonthlyMinutes).toBe(15)
  })
})
```

- [ ] **Step 3: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceEnv.test.ts`
Expected: FAIL — `Cannot find module '../voiceEnv'`.

- [ ] **Step 4: `voiceEnv.ts` yaz**

```ts
// Akif-2 — sesli mod yapılandırması. OPENAI_API_KEY yoksa sesli mod tamamen kapalı.
// numEnv: boş string / NaN / pozitif-olmayan → fallback (Coolify unset '' tuzağı).
import { numEnv } from '../openaiClient'

export interface VoiceEnvConfig {
  apiKey: string
  model: string
  voiceName: string
  monthlyBudgetUsd: number
  userMonthlyMinutes: number
  sessionMaxSec: number
  smokeBudgetUsd: number
}

type EnvLike = Record<string, string | undefined>

export function readVoiceEnv(env: EnvLike = process.env): VoiceEnvConfig {
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) throw new Error('akif_unavailable')
  return {
    apiKey,
    model: env.AKIF_VOICE_MODEL || 'gpt-realtime-mini',
    voiceName: env.AKIF_VOICE_NAME || 'marin',
    monthlyBudgetUsd: numEnv(env.AKIF_VOICE_MONTHLY_BUDGET_USD, 30),
    userMonthlyMinutes: numEnv(env.AKIF_VOICE_USER_MONTHLY_MINUTES, 30),
    sessionMaxSec: numEnv(env.AKIF_VOICE_SESSION_MAX_SEC, 600),
    smokeBudgetUsd: numEnv(env.AKIF_VOICE_SMOKE_BUDGET_USD, 1),
  }
}
```

- [ ] **Step 5: Test pass doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceEnv.test.ts`
Expected: PASS (4 test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/akif/openaiClient.ts src/lib/ai/akif/voice/voiceEnv.ts src/lib/ai/akif/voice/__tests__/voiceEnv.test.ts
git commit -m "feat(akif-2): readVoiceEnv — sesli mod yapılandırması"
```

---

## Task 3: `voiceCost.ts` — Realtime maliyet tahmini

**Files:**
- Create: `src/lib/ai/akif/voice/voiceCost.ts`
- Test: `src/lib/ai/akif/voice/__tests__/voiceCost.test.ts`

**Interfaces:**
- Produces:
  ```ts
  const VOICE_RATES: Record<string, { inPerMTok: number; outPerMTok: number; approxUsdPerMin: number }>
  interface RealtimeUsage { inputAudioTokens: number; outputAudioTokens: number }
  function estimateVoiceCostUsd(args: { model: string; durationSec: number; usage?: RealtimeUsage | null }): number
  ```
- Not: `usage` verilirse token-bazlı kesin hesap; yoksa `durationSec/60 * approxUsdPerMin`. Bilinmeyen model → `gpt-realtime-mini` tarifesi.

- [ ] **Step 1: Failing test yaz**

`src/lib/ai/akif/voice/__tests__/voiceCost.test.ts`:

```ts
import { estimateVoiceCostUsd } from '../voiceCost'

describe('estimateVoiceCostUsd', () => {
  it('usage verilince token-bazlı hesaplar (gpt-realtime-mini: $10/$20 per Mtok)', () => {
    // 60k input + 30k output audio token
    const usd = estimateVoiceCostUsd({
      model: 'gpt-realtime-mini',
      durationSec: 300,
      usage: { inputAudioTokens: 60_000, outputAudioTokens: 30_000 },
    })
    // 60000/1e6*10 + 30000/1e6*20 = 0.6 + 0.6 = 1.2
    expect(usd).toBeCloseTo(1.2, 5)
  })

  it('usage yoksa süre-bazlı yaklaşık hesap', () => {
    const usd = estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 600, usage: null })
    expect(usd).toBeGreaterThan(0)
    expect(usd).toBeLessThan(1) // 10 dk mini ~ $0.2-0.5
  })

  it('gpt-realtime tam model mini den pahalı', () => {
    const mini = estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 300, usage: null })
    const full = estimateVoiceCostUsd({ model: 'gpt-realtime', durationSec: 300, usage: null })
    expect(full).toBeGreaterThan(mini)
  })

  it('bilinmeyen model mini tarifesine düşer', () => {
    const unknown = estimateVoiceCostUsd({ model: 'gpt-99', durationSec: 300, usage: null })
    const mini = estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 300, usage: null })
    expect(unknown).toBe(mini)
  })

  it('sıfır süre + usage yok → 0', () => {
    expect(estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 0, usage: null })).toBe(0)
  })
})
```

- [ ] **Step 2: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceCost.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: `voiceCost.ts` yaz**

```ts
// Akif-2 — Realtime maliyet tahmini. Kaynak: OpenAI Realtime tarifesi (2026-07).
// gpt-realtime-2.1: $32/$64 per Mtok audio ; gpt-realtime-mini: $10/$20 per Mtok.
// Süre-bazlı yaklaşık: ~600 input tok/dk + ~1200 output tok/dk (tipik ajan).

export interface RealtimeUsage {
  inputAudioTokens: number
  outputAudioTokens: number
}

interface Rate {
  inPerMTok: number
  outPerMTok: number
}

export const VOICE_RATES: Record<string, Rate> = {
  'gpt-realtime': { inPerMTok: 32, outPerMTok: 64 },
  'gpt-realtime-mini': { inPerMTok: 10, outPerMTok: 20 },
}

const FALLBACK_MODEL = 'gpt-realtime-mini'
const APPROX_IN_TOK_PER_MIN = 600
const APPROX_OUT_TOK_PER_MIN = 1200

function rateFor(model: string): Rate {
  return VOICE_RATES[model] ?? VOICE_RATES[FALLBACK_MODEL]
}

export function estimateVoiceCostUsd(args: {
  model: string
  durationSec: number
  usage?: RealtimeUsage | null
}): number {
  const rate = rateFor(args.model)
  if (args.usage) {
    return (
      (args.usage.inputAudioTokens / 1e6) * rate.inPerMTok +
      (args.usage.outputAudioTokens / 1e6) * rate.outPerMTok
    )
  }
  const minutes = args.durationSec / 60
  return (
    (minutes * APPROX_IN_TOK_PER_MIN / 1e6) * rate.inPerMTok +
    (minutes * APPROX_OUT_TOK_PER_MIN / 1e6) * rate.outPerMTok
  )
}
```

- [ ] **Step 4: Test pass doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceCost.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/akif/voice/voiceCost.ts src/lib/ai/akif/voice/__tests__/voiceCost.test.ts
git commit -m "feat(akif-2): estimateVoiceCostUsd + VOICE_RATES"
```

---

## Task 4: `voiceRhythm.ts` — ses ritmi prompt eki

**Files:**
- Create: `src/lib/ai/akif/voice/voiceRhythm.ts`
- Test: `src/lib/ai/akif/voice/__tests__/voiceRhythm.test.ts`
- Read: `src/lib/ai/akif/voiceProfile.ts` (mevcut, 5 test var, bağlı değil), `docs/akif/voice-character-spec-v0.1.md`

**Interfaces:**
- Consumes: `voiceProfile.ts` export'ları (implementer önce dosyayı okusun — muhtemel: `VOICE_PROFILE` obje sabiti veya bir fn).
- Produces: `const VOICE_RHYTHM_PROMPT: string` — Realtime sistem prompt'una eklenecek metin bloğu.

- [ ] **Step 1: `voiceProfile.ts` içeriğini oku**

Run: `cat src/lib/ai/akif/voiceProfile.ts src/lib/ai/akif/voiceProfile.test.ts`
Amaç: hangi sabitleri export ettiğini gör (isim/şekil), `VOICE_RHYTHM_PROMPT` içinde bunları kullanacağız (metni oradan türet, elde ne varsa).

- [ ] **Step 2: Failing test yaz**

`src/lib/ai/akif/voice/__tests__/voiceRhythm.test.ts`:

```ts
import { VOICE_RHYTHM_PROMPT } from '../voiceRhythm'

describe('VOICE_RHYTHM_PROMPT', () => {
  it('Karadeniz ritmi yönlendirmesi içerir', () => {
    expect(VOICE_RHYTHM_PROMPT).toMatch(/Karadeniz/i)
  })

  it('fonetik taklit YASAĞINI açıkça söyler', () => {
    expect(VOICE_RHYTHM_PROMPT).toMatch(/taklit|karikatür|fonetik/i)
  })

  it('sayıları net telaffuz kuralını içerir', () => {
    expect(VOICE_RHYTHM_PROMPT).toMatch(/say[ıi]|rakam/i)
  })

  it('boş değil, makul uzunlukta', () => {
    expect(VOICE_RHYTHM_PROMPT.length).toBeGreaterThan(120)
    expect(VOICE_RHYTHM_PROMPT.length).toBeLessThan(1500)
  })
})
```

- [ ] **Step 3: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceRhythm.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 4: `voiceRhythm.ts` yaz**

`voice-character-spec-v0.1.md` ve `voiceProfile.ts`'ten türet. Taban metin (voiceProfile export'ları varsa string interpolation ile kat):

```ts
// Akif-2 — Realtime sistem prompt'una eklenen ses performansı bloğu.
// voice-character-spec-v0.1.md kararı: %70 standart Türkçe, %20 Karadeniz ritmi,
// %10 karakter imzası. FONETİK TAKLİT / KARİKATÜR YOK.
// (voiceProfile.ts'ten mevcut sabitler burada kullanılır — Step 1'de görülen şekle göre.)

export const VOICE_RHYTHM_PROMPT = `
SES PERFORMANSI:
- Sıcak, güven veren, hafif esprili bir müteahhit tonu kullan.
- Konuşma ritmin %20 oranında Karadeniz tınısı taşısın: cümle sonlarında sesi hafif düşür, kısa vurgular yap.
- ASLA fonetik taklit / karikatür yapma (ör. "geldun" yazımı, abartılı şive). Standart Türkçe telaffuz + doğal ritim.
- Sayıları, yüzdeleri ve para tutarlarını YAVAŞ ve NET söyle ("yüzde kırk beş", "iki milyon üç yüz bin lira"). Kritik bir sayıyı söyledikten sonra kısa dur.
- Kısa konuş. Uzun paragraf yok; 2-3 cümlede topla, kullanıcı sorarsa aç.
`.trim()
```

> Not: Step 1'de `voiceProfile.ts` anlamlı sabitler (ör. imza kelimeleri, oran tablosu) döndürüyorsa bu metni onlardan string template ile üret — elle sabit metni azalt. Test yalnız anahtar kavramların varlığını kontrol eder, kaynağı değil.

- [ ] **Step 5: Test pass doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceRhythm.test.ts`
Expected: PASS (4 test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/akif/voice/voiceRhythm.ts src/lib/ai/akif/voice/__tests__/voiceRhythm.test.ts
git commit -m "feat(akif-2): VOICE_RHYTHM_PROMPT — ses ritmi prompt eki"
```

---

## Task 5: `realtimeSession.ts` — Realtime oturum config'i

**Files:**
- Create: `src/lib/ai/akif/voice/realtimeSession.ts`
- Test: `src/lib/ai/akif/voice/__tests__/realtimeSession.test.ts`
- Read: `src/lib/ai/akif/prompts/assemble.ts`, `src/lib/ai/akif/gateway/toolRegistry.ts` (`AKIF_TOOL_DEFS`)

**Interfaces:**
- Consumes: `assembleSystemPrompt({ hasHistory: boolean }): string` (mevcut), `AKIF_TOOL_DEFS: OpenAiToolDef[]` (mevcut), `VOICE_RHYTHM_PROMPT` (Task 4).
- Produces:
  ```ts
  interface RealtimeSessionConfig {
    type: 'realtime'
    model: string
    instructions: string
    tools: unknown[]
    tool_choice: 'auto'
    audio: {
      input: { turn_detection: { type: 'semantic_vad' } }
      output: { voice: string }
    }
  }
  function buildRealtimeSessionConfig(args: { model: string; voiceName: string }): RealtimeSessionConfig
  ```
- Not: GA API'de `turn_detection` `audio.input` altında (spec §3.2'nin "session-level" ifadesi düzeltilir). `tools` = `AKIF_TOOL_DEFS` **birebir** (Chat Completions `{type:'function', function:{...}}` şekli Realtime GA'da da kabul ediliyor; reddederse Task 17 smoke yakalar, dönüşüm gerekirse burada yapılır — ama önce birebir dene).

- [ ] **Step 1: `assemble.ts` imzasını doğrula**

Run: `grep -n "export function assembleSystemPrompt" src/lib/ai/akif/prompts/assemble.ts`
Beklenen: `assembleSystemPrompt({ hasHistory }: { hasHistory: boolean }): string` benzeri. İmza farklıysa Step 3'te uyarlanır.

- [ ] **Step 2: Failing test yaz**

`src/lib/ai/akif/voice/__tests__/realtimeSession.test.ts`:

```ts
import { buildRealtimeSessionConfig } from '../realtimeSession'
import { AKIF_TOOL_DEFS } from '../../gateway/toolRegistry'

describe('buildRealtimeSessionConfig', () => {
  const cfg = buildRealtimeSessionConfig({ model: 'gpt-realtime-mini', voiceName: 'marin' })

  it('model ve ses adını yerleştirir', () => {
    expect(cfg.model).toBe('gpt-realtime-mini')
    expect(cfg.audio.output.voice).toBe('marin')
  })

  it('semantic_vad kullanır', () => {
    expect(cfg.audio.input.turn_detection).toEqual({ type: 'semantic_vad' })
  })

  it('instructions Akif sistem prompt + ses ritmi ekini içerir', () => {
    expect(cfg.instructions).toMatch(/SES PERFORMANSI/)
    // Akif personası: sistem prompt'tan bir çapa kelime
    expect(cfg.instructions.length).toBeGreaterThan(500)
  })

  it('AKIF_TOOL_DEFS birebir aktarılır', () => {
    expect(cfg.tools).toEqual(AKIF_TOOL_DEFS)
    expect(cfg.tool_choice).toBe('auto')
  })

  it('type realtime', () => {
    expect(cfg.type).toBe('realtime')
  })
})
```

- [ ] **Step 3: Test fail → implementasyon → pass**

`src/lib/ai/akif/voice/realtimeSession.ts`:

```ts
// Akif-2 — OpenAI Realtime oturum config'i. Efemeral token basılırken gönderilir.
// Sayı hesabı YOK: Realtime yalnız konuşur + tool çağırır; tool'lar backend'de doğrulanır.
import { assembleSystemPrompt } from '../prompts/assemble'
import { AKIF_TOOL_DEFS } from '../gateway/toolRegistry'
import { VOICE_RHYTHM_PROMPT } from './voiceRhythm'

export interface RealtimeSessionConfig {
  type: 'realtime'
  model: string
  instructions: string
  tools: unknown[]
  tool_choice: 'auto'
  audio: {
    input: { turn_detection: { type: 'semantic_vad' } }
    output: { voice: string }
  }
}

export function buildRealtimeSessionConfig(args: {
  model: string
  voiceName: string
}): RealtimeSessionConfig {
  const base = assembleSystemPrompt({ hasHistory: false })
  return {
    type: 'realtime',
    model: args.model,
    instructions: `${base}\n\n${VOICE_RHYTHM_PROMPT}`,
    tools: AKIF_TOOL_DEFS,
    tool_choice: 'auto',
    audio: {
      input: { turn_detection: { type: 'semantic_vad' } },
      output: { voice: args.voiceName },
    },
  }
}
```

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/realtimeSession.test.ts`
Expected: PASS (5 test).

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/akif/voice/realtimeSession.ts src/lib/ai/akif/voice/__tests__/realtimeSession.test.ts
git commit -m "feat(akif-2): buildRealtimeSessionConfig — Realtime oturum config'i"
```

---

## Task 6: `voiceAudit.ts` — ses audit logger

**Files:**
- Create: `src/lib/ai/akif/voice/voiceAudit.ts`
- Test: `src/lib/ai/akif/voice/__tests__/voiceAudit.test.ts`
- Read: `src/lib/ai/akif/audit.ts` (desen)

**Interfaces:**
- Produces:
  ```ts
  interface VoiceSessionEntry { userId: string; startedAt: Date; durationSec: number; toolCalls: number; estCostUsd: number; endReason: string }
  interface VoiceTurnEntry { sessionId: string; tool: string | null; intent: string | null; estCostUsd: number }
  interface VoiceAuditDb {
    akifVoiceSessionLog: {
      create(a: { data: VoiceSessionEntry }): Promise<unknown>
      aggregate(a: unknown): Promise<{ _sum: { durationSec: number | null; estCostUsd: number | null } }>
      findFirst(a: unknown): Promise<{ id: string } | null>
    }
    akifVoiceTurnLog: { create(a: { data: VoiceTurnEntry }): Promise<unknown> }
  }
  function createVoiceAuditLogger(db: VoiceAuditDb): {
    logVoiceTurn(e: VoiceTurnEntry): Promise<void>
    logVoiceSession(e: VoiceSessionEntry & { sessionId: string }): Promise<void>  // sessionId ile idempotent
    voiceMonthSpendUsd(now: Date): Promise<number>
    voiceUserMonthSeconds(userId: string, now: Date): Promise<number>
  }
  ```
- Not: `logVoiceSession` idempotent — `sessionId` verilir, `AkifVoiceSessionLog.id` olarak kullanılır (`create({ data: { id: sessionId, ... } })`), P2002 (unique) hatası → sessizce yut. Bu yüzden `VoiceSessionEntry`'ye `id` de eklenmeli. Şemada `id` zaten `@id` (cuid default) — elle vermek serbest.

- [ ] **Step 1: Failing test yaz**

`src/lib/ai/akif/voice/__tests__/voiceAudit.test.ts`:

```ts
import { createVoiceAuditLogger } from '../voiceAudit'

function makeDb() {
  const sessionCreate = jest.fn().mockResolvedValue({})
  const turnCreate = jest.fn().mockResolvedValue({})
  const sessionAggregate = jest.fn().mockResolvedValue({ _sum: { durationSec: 900, estCostUsd: 4.2 } })
  return {
    db: {
      akifVoiceSessionLog: { create: sessionCreate, aggregate: sessionAggregate, findFirst: jest.fn() },
      akifVoiceTurnLog: { create: turnCreate },
    },
    sessionCreate,
    turnCreate,
    sessionAggregate,
  }
}

describe('createVoiceAuditLogger', () => {
  it('logVoiceTurn tur satırı yazar', async () => {
    const { db, turnCreate } = makeDb()
    await createVoiceAuditLogger(db as never).logVoiceTurn({
      sessionId: 's1', tool: 'compareContractorOffers', intent: null, estCostUsd: 0,
    })
    expect(turnCreate).toHaveBeenCalledWith({
      data: { sessionId: 's1', tool: 'compareContractorOffers', intent: null, estCostUsd: 0 },
    })
  })

  it('logVoiceSession id=sessionId ile yazar', async () => {
    const { db, sessionCreate } = makeDb()
    const started = new Date('2026-09-09T10:00:00Z')
    await createVoiceAuditLogger(db as never).logVoiceSession({
      sessionId: 'sess-1', userId: 'u1', startedAt: started,
      durationSec: 120, toolCalls: 2, estCostUsd: 0.3, endReason: 'user_ended',
    })
    expect(sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'sess-1', userId: 'u1', durationSec: 120, endReason: 'user_ended' }),
    })
  })

  it('logVoiceSession unique çakışmasını yutar (idempotent)', async () => {
    const { db } = makeDb()
    db.akifVoiceSessionLog.create = jest.fn().mockRejectedValue({ code: 'P2002' })
    await expect(
      createVoiceAuditLogger(db as never).logVoiceSession({
        sessionId: 'sess-1', userId: 'u1', startedAt: new Date(),
        durationSec: 1, toolCalls: 0, estCostUsd: 0, endReason: 'timeout',
      }),
    ).resolves.toBeUndefined()
  })

  it('voiceMonthSpendUsd ay başından toplar', async () => {
    const { db, sessionAggregate } = makeDb()
    const spend = await createVoiceAuditLogger(db as never).voiceMonthSpendUsd(new Date('2026-09-20T00:00:00Z'))
    expect(spend).toBe(4.2)
    const arg = sessionAggregate.mock.calls[0][0]
    expect(arg.where.startedAt.gte).toEqual(new Date(Date.UTC(2026, 8, 1)))
  })

  it('voiceUserMonthSeconds kullanıcı + ay filtreler', async () => {
    const { db, sessionAggregate } = makeDb()
    const sec = await createVoiceAuditLogger(db as never).voiceUserMonthSeconds('u1', new Date('2026-09-20T00:00:00Z'))
    expect(sec).toBe(900)
    const arg = sessionAggregate.mock.calls[0][0]
    expect(arg.where.userId).toBe('u1')
  })

  it('create hatası logVoiceTurn i düşürmez', async () => {
    const { db } = makeDb()
    db.akifVoiceTurnLog.create = jest.fn().mockRejectedValue(new Error('db down'))
    await expect(
      createVoiceAuditLogger(db as never).logVoiceTurn({ sessionId: 's', tool: null, intent: null, estCostUsd: 0 }),
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceAudit.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: `voiceAudit.ts` yaz**

```ts
// Akif-2 — ses audit. Akif-1 audit.ts deseninin ses eşi.
// HAM METİN / TRANSKRİPT YAZILMAZ — yalnız sayaç/meta.

export interface VoiceTurnEntry {
  sessionId: string
  tool: string | null
  intent: string | null
  estCostUsd: number
}

export interface VoiceSessionEntry {
  sessionId: string
  userId: string
  startedAt: Date
  durationSec: number
  toolCalls: number
  estCostUsd: number
  endReason: string
}

export interface VoiceAuditDb {
  akifVoiceSessionLog: {
    create(a: { data: Record<string, unknown> }): Promise<unknown>
    aggregate(a: unknown): Promise<{ _sum: { durationSec: number | null; estCostUsd: number | null } }>
  }
  akifVoiceTurnLog: {
    create(a: { data: VoiceTurnEntry }): Promise<unknown>
  }
}

function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function createVoiceAuditLogger(db: VoiceAuditDb) {
  return {
    async logVoiceTurn(entry: VoiceTurnEntry): Promise<void> {
      try {
        await db.akifVoiceTurnLog.create({ data: entry })
      } catch (err) {
        console.error('[voice-audit] logVoiceTurn failed:', err)
      }
    },

    async logVoiceSession(entry: VoiceSessionEntry): Promise<void> {
      const { sessionId, ...rest } = entry
      try {
        await db.akifVoiceSessionLog.create({ data: { id: sessionId, ...rest } })
      } catch (err) {
        const code = (err as { code?: string })?.code
        if (code === 'P2002') return // idempotent — aynı oturum ikinci kez
        console.error('[voice-audit] logVoiceSession failed:', err)
      }
    },

    async voiceMonthSpendUsd(now: Date): Promise<number> {
      const r = await db.akifVoiceSessionLog.aggregate({
        _sum: { estCostUsd: true },
        where: { startedAt: { gte: monthStartUtc(now) } },
      })
      return r._sum.estCostUsd ?? 0
    },

    async voiceUserMonthSeconds(userId: string, now: Date): Promise<number> {
      const r = await db.akifVoiceSessionLog.aggregate({
        _sum: { durationSec: true },
        where: { userId, startedAt: { gte: monthStartUtc(now) } },
      })
      return r._sum.durationSec ?? 0
    },
  }
}
```

- [ ] **Step 4: Test pass doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceAudit.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/akif/voice/voiceAudit.ts src/lib/ai/akif/voice/__tests__/voiceAudit.test.ts
git commit -m "feat(akif-2): createVoiceAuditLogger — ses oturum/tur audit"
```

---

## Task 7: `voiceQuota.ts` — 3 katmanlı guard kontrolü

**Files:**
- Create: `src/lib/ai/akif/voice/voiceQuota.ts`
- Test: `src/lib/ai/akif/voice/__tests__/voiceQuota.test.ts`

**Interfaces:**
- Consumes: `voiceMonthSpendUsd(now)`, `voiceUserMonthSeconds(userId, now)` (Task 6).
- Produces:
  ```ts
  interface VoiceQuotaDeps {
    voiceMonthSpendUsd: (now: Date) => Promise<number>
    voiceUserMonthSeconds: (userId: string, now: Date) => Promise<number>
    monthlyBudgetUsd: number
    userMonthlyMinutes: number
    now: () => Date
  }
  function checkVoiceQuota(userId: string, deps: VoiceQuotaDeps): Promise<
    | { ok: true }
    | { ok: false; reason: 'monthly_budget' }
    | { ok: false; reason: 'user_quota'; remainingSec: number }
  >
  ```
- Not: önce global bütçe (aşıldıysa `monthly_budget`), sonra kullanıcı dakika (aşıldıysa `user_quota` + `remainingSec: 0`).

- [ ] **Step 1: Failing test yaz**

`src/lib/ai/akif/voice/__tests__/voiceQuota.test.ts`:

```ts
import { checkVoiceQuota } from '../voiceQuota'

const base = {
  monthlyBudgetUsd: 30,
  userMonthlyMinutes: 30,
  now: () => new Date('2026-09-10T00:00:00Z'),
}

it('her şey altında → ok', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 10,
    voiceUserMonthSeconds: async () => 600,
  })
  expect(r).toEqual({ ok: true })
})

it('global bütçe aşıldı → monthly_budget', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 30,
    voiceUserMonthSeconds: async () => 0,
  })
  expect(r).toEqual({ ok: false, reason: 'monthly_budget' })
})

it('kullanıcı dakikası aşıldı → user_quota', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 5,
    voiceUserMonthSeconds: async () => 1800, // 30 dk
  })
  expect(r).toEqual({ ok: false, reason: 'user_quota', remainingSec: 0 })
})

it('global bütçe kullanıcı kotasından önce kontrol edilir', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 100,
    voiceUserMonthSeconds: async () => 9999,
  })
  expect(r).toEqual({ ok: false, reason: 'monthly_budget' })
})

it('kullanıcı sınıra yakın ama altında → ok', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 5,
    voiceUserMonthSeconds: async () => 1740, // 29 dk
  })
  expect(r).toEqual({ ok: true })
})
```

- [ ] **Step 2: Test fail → implementasyon → pass**

`src/lib/ai/akif/voice/voiceQuota.ts`:

```ts
// Akif-2 — sesli mod guard'ları. Sıra: global aylık USD → kullanıcı aylık dakika.
export interface VoiceQuotaDeps {
  voiceMonthSpendUsd: (now: Date) => Promise<number>
  voiceUserMonthSeconds: (userId: string, now: Date) => Promise<number>
  monthlyBudgetUsd: number
  userMonthlyMinutes: number
  now: () => Date
}

export type VoiceQuotaResult =
  | { ok: true }
  | { ok: false; reason: 'monthly_budget' }
  | { ok: false; reason: 'user_quota'; remainingSec: number }

export async function checkVoiceQuota(
  userId: string,
  deps: VoiceQuotaDeps,
): Promise<VoiceQuotaResult> {
  const now = deps.now()

  const spent = await deps.voiceMonthSpendUsd(now)
  if (spent >= deps.monthlyBudgetUsd) return { ok: false, reason: 'monthly_budget' }

  const usedSec = await deps.voiceUserMonthSeconds(userId, now)
  const limitSec = deps.userMonthlyMinutes * 60
  if (usedSec >= limitSec) return { ok: false, reason: 'user_quota', remainingSec: 0 }

  return { ok: true }
}
```

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/lib/ai/akif/voice/__tests__/voiceQuota.test.ts`
Expected: PASS (5 test).

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/akif/voice/voiceQuota.ts src/lib/ai/akif/voice/__tests__/voiceQuota.test.ts
git commit -m "feat(akif-2): checkVoiceQuota — 3 katmanlı guard"
```

---

## Task 8: `POST /api/akif/voice/session` — efemeral token

**Files:**
- Create: `src/app/api/akif/voice/session/route.ts`
- Modify: `src/lib/rate-limit.ts` (`RATE_LIMITS`'e `AKIF_VOICE_SESSION` ekle)
- Test: `src/app/api/akif/voice/session/__tests__/route.test.ts`
- Read: `src/app/api/akif/turn/__tests__/route.test.ts` (mock deseni), `src/app/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/render/route.ts` (auth deseni)

**Interfaces:**
- Consumes: `readVoiceEnv` (T2), `buildRealtimeSessionConfig` (T5), `createVoiceAuditLogger` (T6), `checkVoiceQuota` (T7), `getServerSession`+`authOptions`, `checkRateLimit`+`RATE_LIMITS`+`getClientIp`, `prisma`.
- Produces: `POST` handler. Başarı: `200 { token: string, expiresAt: number, sessionId: string, model: string, sessionMaxSec: number }`. `sessionId` = server üretimi (`crypto.randomUUID()`), tarayıcı bunu `tool`/`usage` çağrılarında taşır.
- Yanıt kodları: 429 rate-limit; 401 auth yok; 503 `{error:'akif_unavailable'}` (env yok) / `{error:'akif_unavailable', reason:'monthly_budget'}`; 429 `{error:'quota', reason:'user_quota', remainingSec}`; 502 `{error:'upstream'}` (OpenAI token çağrısı başarısız).

- [ ] **Step 1: `RATE_LIMITS`'e ekle**

`src/lib/rate-limit.ts`, `RATE_LIMITS` objesi içine (AKIF_TURN'ün yanına):

```ts
    AKIF_VOICE_SESSION: { limit: 5, windowMs: 3_600_000 }, // kullanıcı başına 5/saat — pahalı Realtime oturumu
```

- [ ] **Step 2: Failing test yaz**

`src/app/api/akif/voice/session/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const checkRateLimitMock = jest.fn()
const readVoiceEnvMock = jest.fn()
const checkVoiceQuotaMock = jest.fn()
const fetchMock = jest.fn()

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { __brand: 'prisma' } }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  getClientIp: () => '203.0.113.9',
  RATE_LIMITS: { AKIF_VOICE_SESSION: { limit: 5, windowMs: 3_600_000 } },
}))
jest.mock('@/lib/ai/akif/voice/voiceEnv', () => ({ readVoiceEnv: (...a: unknown[]) => readVoiceEnvMock(...a) }))
jest.mock('@/lib/ai/akif/voice/voiceQuota', () => ({ checkVoiceQuota: (...a: unknown[]) => checkVoiceQuotaMock(...a) }))
jest.mock('@/lib/ai/akif/voice/voiceAudit', () => ({
  createVoiceAuditLogger: () => ({ voiceMonthSpendUsd: jest.fn(), voiceUserMonthSeconds: jest.fn() }),
}))
jest.mock('@/lib/ai/akif/voice/realtimeSession', () => ({
  buildRealtimeSessionConfig: () => ({ type: 'realtime', model: 'gpt-realtime-mini' }),
}))

import { POST } from '../route'

const OK_ENV = {
  apiKey: 'sk-x', model: 'gpt-realtime-mini', voiceName: 'marin',
  monthlyBudgetUsd: 30, userMonthlyMinutes: 30, sessionMaxSec: 600, smokeBudgetUsd: 1,
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = fetchMock as never
  checkRateLimitMock.mockReturnValue({ ok: true })
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  readVoiceEnvMock.mockReturnValue(OK_ENV)
  checkVoiceQuotaMock.mockResolvedValue({ ok: true })
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ value: 'ek_abc', expires_at: 1756310470 }),
  })
})

const req = () => new Request('http://x/api/akif/voice/session', { method: 'POST' })

it('rate-limit aşılınca 429', async () => {
  checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 120 })
  const res = await POST(req())
  expect(res.status).toBe(429)
})

it('giriş yoksa 401', async () => {
  getServerSessionMock.mockResolvedValue(null)
  const res = await POST(req())
  expect(res.status).toBe(401)
})

it('env yoksa 503 akif_unavailable', async () => {
  readVoiceEnvMock.mockImplementation(() => { throw new Error('akif_unavailable') })
  const res = await POST(req())
  expect(res.status).toBe(503)
  expect(await res.json()).toEqual({ error: 'akif_unavailable' })
})

it('global bütçe aşıldı → 503 monthly_budget', async () => {
  checkVoiceQuotaMock.mockResolvedValue({ ok: false, reason: 'monthly_budget' })
  const res = await POST(req())
  expect(res.status).toBe(503)
  expect((await res.json()).reason).toBe('monthly_budget')
})

it('kullanıcı kotası aşıldı → 429 user_quota', async () => {
  checkVoiceQuotaMock.mockResolvedValue({ ok: false, reason: 'user_quota', remainingSec: 0 })
  const res = await POST(req())
  expect(res.status).toBe(429)
  expect((await res.json()).reason).toBe('user_quota')
})

it('OpenAI token çağrısı başarısız → 502', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
  const res = await POST(req())
  expect(res.status).toBe(502)
})

it('mutlu yol → 200 token + sessionId + model', async () => {
  const res = await POST(req())
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.token).toBe('ek_abc')
  expect(body.model).toBe('gpt-realtime-mini')
  expect(body.sessionMaxSec).toBe(600)
  expect(typeof body.sessionId).toBe('string')
  // OpenAI'ye doğru endpoint + body
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.openai.com/v1/realtime/client_secrets',
    expect.objectContaining({ method: 'POST' }),
  )
})
```

- [ ] **Step 3: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/app/api/akif/voice/session`
Expected: FAIL — route yok.

- [ ] **Step 4: `session/route.ts` yaz**

```ts
// Akif-2 — POST /api/akif/voice/session
// rate-limit → auth (giriş şart) → env → kota (global USD + kullanıcı dk) →
// OpenAI /v1/realtime/client_secrets ile efemeral token → tarayıcıya.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { readVoiceEnv } from '@/lib/ai/akif/voice/voiceEnv'
import { checkVoiceQuota } from '@/lib/ai/akif/voice/voiceQuota'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'
import { buildRealtimeSessionConfig } from '@/lib/ai/akif/voice/realtimeSession'

export const runtime = 'nodejs'

const TOKEN_TTL = '2m' // efemeral — WebRTC handshake'e yeter, kısa

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit('akif-voice:user:' + userId, RATE_LIMITS.AKIF_VOICE_SESSION)
  if (!rl.ok) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  let env
  try {
    env = readVoiceEnv()
  } catch {
    return Response.json({ error: 'akif_unavailable' }, { status: 503 })
  }

  const db = prisma as unknown as VoiceAuditDb
  const audit = createVoiceAuditLogger(db)
  const quota = await checkVoiceQuota(userId, {
    voiceMonthSpendUsd: audit.voiceMonthSpendUsd,
    voiceUserMonthSeconds: audit.voiceUserMonthSeconds,
    monthlyBudgetUsd: env.monthlyBudgetUsd,
    userMonthlyMinutes: env.userMonthlyMinutes,
    now: () => new Date(),
  })
  if (!quota.ok) {
    if (quota.reason === 'monthly_budget') {
      return Response.json({ error: 'akif_unavailable', reason: 'monthly_budget' }, { status: 503 })
    }
    return Response.json(
      { error: 'quota', reason: 'user_quota', remainingSec: quota.remainingSec },
      { status: 429 },
    )
  }

  const sessionConfig = buildRealtimeSessionConfig({ model: env.model, voiceName: env.voiceName })

  let upstream: Response
  try {
    upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_after: { ttl: TOKEN_TTL }, session: sessionConfig }),
    })
  } catch (e) {
    console.error('[akif-voice] token fetch threw', e)
    return Response.json({ error: 'upstream' }, { status: 502 })
  }

  if (!upstream.ok) {
    console.error('[akif-voice] token fetch not ok', upstream.status, await upstream.text().catch(() => ''))
    return Response.json({ error: 'upstream' }, { status: 502 })
  }

  const data = (await upstream.json()) as { value?: string; expires_at?: number }
  if (!data.value) {
    return Response.json({ error: 'upstream' }, { status: 502 })
  }

  return Response.json({
    token: data.value,
    expiresAt: data.expires_at ?? 0,
    sessionId: crypto.randomUUID(),
    model: env.model,
    sessionMaxSec: env.sessionMaxSec,
  })
}
```

- [ ] **Step 5: Test pass doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/app/api/akif/voice/session`
Expected: PASS (7 test).

- [ ] **Step 6: tsc + commit**

Run: `npx tsc --noEmit` → 0 hata.

```bash
git add src/lib/rate-limit.ts src/app/api/akif/voice/session
git commit -m "feat(akif-2): POST /api/akif/voice/session — efemeral Realtime token"
```

---

## Task 9: `POST /api/akif/voice/tool` — doğrulanmış tool yürütme

**Files:**
- Create: `src/app/api/akif/voice/tool/route.ts`
- Test: `src/app/api/akif/voice/tool/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `validateArgs`, `dispatchTool`, `type ToolName`, `type DispatchDeps` (mevcut `gateway/toolRegistry`), `createVoiceAuditLogger` (T6), `getServerSession`+`authOptions`, `prisma`, `checkRateLimit`+`RATE_LIMITS.AKIF_TURN` (aynı eşiği yeniden kullan — LLM turu değil ama motor çağrısı, 8/dk makul).
- Produces: `POST` handler. Gövde: `{ sessionId: string, toolName: string, args: unknown }`. Başarı: `200` — doğrulanmış `ToolResultCard` (JSON). Doğrulama hatası: `200 { error: 'invalid_args', field, reason }` (200! — Realtime'a `function_call_output` olarak beslenecek, HTTP hatası değil sözleşme hatası). Auth yok: 401. Bilinmeyen tool: `200 { error: 'invalid_args', field: 'name', reason: 'bilinmeyen araç' }`. Dispatch fırlatırsa: `502 { error: 'tool_unavailable' }`.

- [ ] **Step 1: Failing test yaz**

`src/app/api/akif/voice/tool/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const checkRateLimitMock = jest.fn()
const validateArgsMock = jest.fn()
const dispatchToolMock = jest.fn()
const logVoiceTurnMock = jest.fn()

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { __brand: 'prisma' } }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  getClientIp: () => '203.0.113.9',
  RATE_LIMITS: { AKIF_TURN: { limit: 8, windowMs: 60_000 } },
}))
jest.mock('@/lib/ai/akif/gateway/toolRegistry', () => ({
  validateArgs: (...a: unknown[]) => validateArgsMock(...a),
  dispatchTool: (...a: unknown[]) => dispatchToolMock(...a),
}))
jest.mock('@/lib/ai/akif/voice/voiceAudit', () => ({
  createVoiceAuditLogger: () => ({ logVoiceTurn: (...a: unknown[]) => logVoiceTurnMock(...a) }),
}))

import { POST } from '../route'

beforeEach(() => {
  jest.clearAllMocks()
  checkRateLimitMock.mockReturnValue({ ok: true })
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
})

const req = (body: unknown) =>
  new Request('http://x/api/akif/voice/tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

it('giriş yoksa 401', async () => {
  getServerSessionMock.mockResolvedValue(null)
  const res = await POST(req({ sessionId: 's', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(401)
})

it('geçersiz gövde → 400', async () => {
  const res = await POST(req({ toolName: 'explainTerm' }))
  expect(res.status).toBe(400)
})

it('validateArgs başarısız → 200 invalid_args (HTTP hatası DEĞİL)', async () => {
  validateArgsMock.mockReturnValue({ ok: false, field: 'emsal', reason: 'geçersiz aralık' })
  const res = await POST(req({ sessionId: 's', toolName: 'compareContractorOffers', args: {} }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ error: 'invalid_args', field: 'emsal', reason: 'geçersiz aralık' })
  expect(dispatchToolMock).not.toHaveBeenCalled()
})

it('mutlu yol → doğrulanmış kart + audit', async () => {
  validateArgsMock.mockReturnValue({ ok: true })
  const card = { kind: 'term', term: 'emsal', shortDef: '...', example: '...' }
  dispatchToolMock.mockResolvedValue(card)
  const res = await POST(req({ sessionId: 'sess-1', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual(card)
  expect(logVoiceTurnMock).toHaveBeenCalledWith(
    expect.objectContaining({ sessionId: 'sess-1', tool: 'explainTerm' }),
  )
})

it('dispatch fırlatırsa → 502 tool_unavailable', async () => {
  validateArgsMock.mockReturnValue({ ok: true })
  dispatchToolMock.mockRejectedValue(new Error('engine boom'))
  const res = await POST(req({ sessionId: 's', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: 'tool_unavailable' })
})

it('rate-limit aşıldı → 429', async () => {
  checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 30 })
  const res = await POST(req({ sessionId: 's', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(429)
})
```

- [ ] **Step 2: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/app/api/akif/voice/tool`
Expected: FAIL — route yok.

- [ ] **Step 3: `tool/route.ts` yaz**

```ts
// Akif-2 — POST /api/akif/voice/tool
// Realtime bir function-call ürettiğinde tarayıcı buraya iletir.
// auth → rate-limit → validateArgs → dispatchTool → audit → doğrulanmış ToolResultCard.
// invalid_args = 200 (Realtime'a function_call_output olarak beslenir, HTTP hatası değil).
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import {
  validateArgs,
  dispatchTool,
  type ToolName,
  type DispatchDeps,
} from '@/lib/ai/akif/gateway/toolRegistry'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'

export const runtime = 'nodejs'

const TOOL_NAMES: ToolName[] = ['explainTerm', 'compareContractorOffers', 'compareApartmentSizes']

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const rl = checkRateLimit('akif-voice-tool:user:' + userId, RATE_LIMITS.AKIF_TURN)
  if (!rl.ok) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  const { sessionId, toolName, args } = (body ?? {}) as {
    sessionId?: unknown
    toolName?: unknown
    args?: unknown
  }
  if (typeof sessionId !== 'string' || !sessionId || typeof toolName !== 'string') {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  if (!TOOL_NAMES.includes(toolName as ToolName)) {
    return Response.json({ error: 'invalid_args', field: 'name', reason: 'bilinmeyen araç' })
  }

  const v = validateArgs(toolName as ToolName, args)
  if (!v.ok) {
    return Response.json({ error: 'invalid_args', field: v.field, reason: v.reason })
  }

  const db = prisma as unknown as VoiceAuditDb & DispatchDeps['db']
  const audit = createVoiceAuditLogger(db)

  try {
    const card = await dispatchTool(toolName as ToolName, args, { db })
    await audit.logVoiceTurn({
      sessionId,
      tool: toolName,
      intent: null,
      estCostUsd: 0,
    })
    return Response.json(card)
  } catch (e) {
    console.error('[akif-voice] dispatch failed', e)
    return Response.json({ error: 'tool_unavailable' }, { status: 502 })
  }
}
```

- [ ] **Step 4: Test pass + tsc**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/app/api/akif/voice/tool`
Expected: PASS (6 test).
Run: `npx tsc --noEmit` → 0 hata.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/akif/voice/tool
git commit -m "feat(akif-2): POST /api/akif/voice/tool — doğrulanmış tool yürütme"
```

---

## Task 10: `POST /api/akif/voice/usage` — oturum sonu kayıt

**Files:**
- Create: `src/app/api/akif/voice/usage/route.ts`
- Test: `src/app/api/akif/voice/usage/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `estimateVoiceCostUsd` (T3), `createVoiceAuditLogger` (T6), `readVoiceEnv` (T3 → model adı için), `getServerSession`+`authOptions`, `prisma`.
- Produces: `POST` handler (sendBeacon uyumlu — `Content-Type` `text/plain;charset=UTF-8` de olabilir, `req.json()` yerine `req.text()` + `JSON.parse`). Gövde: `{ sessionId, startedAtMs: number, durationSec: number, toolCalls: number, realtimeUsage?: { inputAudioTokens, outputAudioTokens } | null, endReason: string }`. Başarı: `200 { ok: true }`. Auth yok: 401. Geçersiz gövde: 400. `logVoiceSession` idempotent (T6) — retry güvenli.
- `endReason` allowlist: `user_ended | timeout | error | quota | disconnect`. Dışındaki → `'error'` normalize.

- [ ] **Step 1: Failing test yaz**

`src/app/api/akif/voice/usage/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const logVoiceSessionMock = jest.fn()
const readVoiceEnvMock = jest.fn()

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { __brand: 'prisma' } }))
jest.mock('@/lib/ai/akif/voice/voiceEnv', () => ({ readVoiceEnv: (...a: unknown[]) => readVoiceEnvMock(...a) }))
jest.mock('@/lib/ai/akif/voice/voiceAudit', () => ({
  createVoiceAuditLogger: () => ({ logVoiceSession: (...a: unknown[]) => logVoiceSessionMock(...a) }),
}))

import { POST } from '../route'

beforeEach(() => {
  jest.clearAllMocks()
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  readVoiceEnvMock.mockReturnValue({ model: 'gpt-realtime-mini' })
  logVoiceSessionMock.mockResolvedValue(undefined)
})

const body = (o: Record<string, unknown>) =>
  new Request('http://x/api/akif/voice/usage', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      sessionId: 'sess-1', startedAtMs: Date.parse('2026-09-09T10:00:00Z'),
      durationSec: 180, toolCalls: 1, realtimeUsage: null, endReason: 'user_ended', ...o,
    }),
  })

it('giriş yoksa 401', async () => {
  getServerSessionMock.mockResolvedValue(null)
  expect((await POST(body({}))).status).toBe(401)
})

it('geçersiz gövde → 400', async () => {
  const res = await POST(new Request('http://x', { method: 'POST', body: 'not json' }))
  expect(res.status).toBe(400)
})

it('mutlu yol → logVoiceSession çağrılır, maliyet hesaplanır', async () => {
  const res = await POST(body({}))
  expect(res.status).toBe(200)
  const arg = logVoiceSessionMock.mock.calls[0][0]
  expect(arg).toEqual(
    expect.objectContaining({
      sessionId: 'sess-1', userId: 'u1', durationSec: 180, toolCalls: 1, endReason: 'user_ended',
    }),
  )
  expect(arg.estCostUsd).toBeGreaterThan(0)
  expect(arg.startedAt instanceof Date).toBe(true)
})

it('bilinmeyen endReason → error normalize', async () => {
  await POST(body({ endReason: 'garip' }))
  expect(logVoiceSessionMock.mock.calls[0][0].endReason).toBe('error')
})

it('realtimeUsage verilince token-bazlı maliyet', async () => {
  await POST(body({ realtimeUsage: { inputAudioTokens: 60000, outputAudioTokens: 30000 } }))
  expect(logVoiceSessionMock.mock.calls[0][0].estCostUsd).toBeCloseTo(1.2, 3)
})
```

- [ ] **Step 2: Test fail → implementasyon → pass**

`src/app/api/akif/voice/usage/route.ts`:

```ts
// Akif-2 — POST /api/akif/voice/usage
// Oturum kapanınca (sendBeacon) çağrılır. Süre + tool sayısı + (varsa) gerçek usage →
// maliyet → AkifVoiceSessionLog (idempotent). Kayıp POST kabul (v1, gece uzlaştırma yok).
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readVoiceEnv } from '@/lib/ai/akif/voice/voiceEnv'
import { estimateVoiceCostUsd } from '@/lib/ai/akif/voice/voiceCost'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'

export const runtime = 'nodejs'

const END_REASONS = new Set(['user_ended', 'timeout', 'error', 'quota', 'disconnect'])

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  let body: {
    sessionId?: unknown
    startedAtMs?: unknown
    durationSec?: unknown
    toolCalls?: unknown
    realtimeUsage?: unknown
    endReason?: unknown
  }
  try {
    body = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const { sessionId, startedAtMs, durationSec, toolCalls, realtimeUsage, endReason } = body
  if (
    typeof sessionId !== 'string' ||
    !sessionId ||
    typeof startedAtMs !== 'number' ||
    typeof durationSec !== 'number' ||
    durationSec < 0 ||
    typeof toolCalls !== 'number'
  ) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  let model = 'gpt-realtime-mini'
  try {
    model = readVoiceEnv().model
  } catch {
    /* env yoksa bile kaydı yaz — fallback model tarifesi */
  }

  const usage =
    realtimeUsage &&
    typeof realtimeUsage === 'object' &&
    typeof (realtimeUsage as { inputAudioTokens?: unknown }).inputAudioTokens === 'number' &&
    typeof (realtimeUsage as { outputAudioTokens?: unknown }).outputAudioTokens === 'number'
      ? (realtimeUsage as { inputAudioTokens: number; outputAudioTokens: number })
      : null

  const estCostUsd = estimateVoiceCostUsd({ model, durationSec: Math.round(durationSec), usage })

  const db = prisma as unknown as VoiceAuditDb
  await createVoiceAuditLogger(db).logVoiceSession({
    sessionId,
    userId,
    startedAt: new Date(startedAtMs),
    durationSec: Math.round(durationSec),
    toolCalls: Math.max(0, Math.round(toolCalls)),
    estCostUsd,
    endReason: END_REASONS.has(String(endReason)) ? String(endReason) : 'error',
  })

  return Response.json({ ok: true })
}
```

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/app/api/akif/voice/usage`
Expected: PASS (5 test).

- [ ] **Step 3: tsc + commit**

Run: `npx tsc --noEmit` → 0 hata.

```bash
git add src/app/api/akif/voice/usage
git commit -m "feat(akif-2): POST /api/akif/voice/usage — oturum sonu maliyet kaydı"
```

---

## Task 11: `voiceEvents.ts` — Realtime olay normalleştirici (saf, istemci)

**Files:**
- Create: `src/components/akif/voice/voiceEvents.ts`
- Test: `src/components/akif/voice/__tests__/voiceEvents.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type VoiceEvent =
    | { type: 'user_transcript'; text: string }
    | { type: 'akif_transcript_delta'; text: string }
    | { type: 'akif_transcript_done' }
    | { type: 'speech_started' }
    | { type: 'tool_call'; callId: string; name: string; args: unknown }
    | { type: 'response_done'; usage: { inputAudioTokens: number; outputAudioTokens: number } | null }
    | { type: 'error'; message: string }
    | null   // tanınmayan / ilgisiz olay
  function parseRealtimeEvent(raw: unknown): VoiceEvent
  ```
- Not: `raw` genelde `JSON.parse(dataChannelMessage.data)`. `args` alanı Realtime'da string gelir (`arguments`) → `JSON.parse` dene, başarısızsa `{}`.

- [ ] **Step 1: Failing test yaz**

`src/components/akif/voice/__tests__/voiceEvents.test.ts`:

```ts
import { parseRealtimeEvent } from '../voiceEvents'

it('kullanıcı transkripti', () => {
  expect(
    parseRealtimeEvent({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: '900 metrekare arsam var',
    }),
  ).toEqual({ type: 'user_transcript', text: '900 metrekare arsam var' })
})

it('Akif transkript delta', () => {
  expect(
    parseRealtimeEvent({ type: 'response.output_audio_transcript.delta', delta: 'Tamam, ' }),
  ).toEqual({ type: 'akif_transcript_delta', text: 'Tamam, ' })
})

it('Akif transkript bitti', () => {
  expect(parseRealtimeEvent({ type: 'response.output_audio_transcript.done' })).toEqual({
    type: 'akif_transcript_done',
  })
})

it('kullanıcı konuşmaya başladı (barge-in sinyali)', () => {
  expect(parseRealtimeEvent({ type: 'input_audio_buffer.speech_started' })).toEqual({
    type: 'speech_started',
  })
})

it('tool call — arguments string parse edilir', () => {
  expect(
    parseRealtimeEvent({
      type: 'response.function_call_arguments.done',
      call_id: 'call_1',
      name: 'compareContractorOffers',
      arguments: '{"arsaAlani":900,"emsal":1.5,"muteahhitPaylari":[45,50]}',
    }),
  ).toEqual({
    type: 'tool_call',
    callId: 'call_1',
    name: 'compareContractorOffers',
    args: { arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [45, 50] },
  })
})

it('tool call — bozuk arguments → {}', () => {
  const e = parseRealtimeEvent({
    type: 'response.function_call_arguments.done',
    call_id: 'c',
    name: 'x',
    arguments: '{bozuk',
  })
  expect(e).toEqual({ type: 'tool_call', callId: 'c', name: 'x', args: {} })
})

it('response.done — usage çıkarılır', () => {
  expect(
    parseRealtimeEvent({
      type: 'response.done',
      response: { usage: { input_token_details: { audio_tokens: 100 }, output_token_details: { audio_tokens: 200 } } },
    }),
  ).toEqual({ type: 'response_done', usage: { inputAudioTokens: 100, outputAudioTokens: 200 } })
})

it('response.done — usage yoksa null', () => {
  expect(parseRealtimeEvent({ type: 'response.done', response: {} })).toEqual({
    type: 'response_done',
    usage: null,
  })
})

it('error olayı', () => {
  expect(
    parseRealtimeEvent({ type: 'error', error: { message: 'rate limit' } }),
  ).toEqual({ type: 'error', message: 'rate limit' })
})

it('tanınmayan olay → null', () => {
  expect(parseRealtimeEvent({ type: 'rate_limits.updated' })).toBeNull()
  expect(parseRealtimeEvent(null)).toBeNull()
  expect(parseRealtimeEvent('x')).toBeNull()
})
```

- [ ] **Step 2: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/components/akif/voice/__tests__/voiceEvents.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: `voiceEvents.ts` yaz**

```ts
// Akif-2 — Realtime data-channel olaylarını uygulama olaylarına çevirir. Saf, WebRTC'siz.
// Olay adları: OpenAI Realtime GA (2026).

export type VoiceEvent =
  | { type: 'user_transcript'; text: string }
  | { type: 'akif_transcript_delta'; text: string }
  | { type: 'akif_transcript_done' }
  | { type: 'speech_started' }
  | { type: 'tool_call'; callId: string; name: string; args: unknown }
  | { type: 'response_done'; usage: { inputAudioTokens: number; outputAudioTokens: number } | null }
  | { type: 'error'; message: string }

type Raw = Record<string, unknown>

function isObj(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null
}

export function parseRealtimeEvent(raw: unknown): VoiceEvent | null {
  if (!isObj(raw) || typeof raw.type !== 'string') return null

  switch (raw.type) {
    case 'conversation.item.input_audio_transcription.completed':
      return typeof raw.transcript === 'string'
        ? { type: 'user_transcript', text: raw.transcript }
        : null

    case 'response.output_audio_transcript.delta':
      return typeof raw.delta === 'string'
        ? { type: 'akif_transcript_delta', text: raw.delta }
        : null

    case 'response.output_audio_transcript.done':
      return { type: 'akif_transcript_done' }

    case 'input_audio_buffer.speech_started':
      return { type: 'speech_started' }

    case 'response.function_call_arguments.done': {
      const callId = typeof raw.call_id === 'string' ? raw.call_id : ''
      const name = typeof raw.name === 'string' ? raw.name : ''
      let args: unknown = {}
      if (typeof raw.arguments === 'string') {
        try {
          args = JSON.parse(raw.arguments)
        } catch {
          args = {}
        }
      }
      return { type: 'tool_call', callId, name, args }
    }

    case 'response.done': {
      const resp = isObj(raw.response) ? raw.response : {}
      const usage = isObj(resp.usage) ? resp.usage : null
      const inDet = usage && isObj(usage.input_token_details) ? usage.input_token_details : null
      const outDet = usage && isObj(usage.output_token_details) ? usage.output_token_details : null
      const parsed =
        inDet || outDet
          ? {
              inputAudioTokens: typeof inDet?.audio_tokens === 'number' ? inDet.audio_tokens : 0,
              outputAudioTokens: typeof outDet?.audio_tokens === 'number' ? outDet.audio_tokens : 0,
            }
          : null
      return { type: 'response_done', usage: parsed }
    }

    case 'error': {
      const err = isObj(raw.error) ? raw.error : {}
      return { type: 'error', message: typeof err.message === 'string' ? err.message : 'bilinmeyen hata' }
    }

    default:
      return null
  }
}
```

- [ ] **Step 4: Test pass doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/components/akif/voice/__tests__/voiceEvents.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/akif/voice/voiceEvents.ts src/components/akif/voice/__tests__/voiceEvents.test.ts
git commit -m "feat(akif-2): parseRealtimeEvent — Realtime olay normalleştirici"
```

---

## Task 12: `voiceToolBridge.ts` — tool köprüsü (saf, istemci)

**Files:**
- Create: `src/components/akif/voice/voiceToolBridge.ts`
- Test: `src/components/akif/voice/__tests__/voiceToolBridge.test.ts`

**Interfaces:**
- Consumes: `VoiceEvent` `tool_call` varyantı (T11); `ToolResultCard` (`@/lib/ai/akif/contract`).
- Produces:
  ```ts
  interface ToolBridgeResult {
    card: ToolResultCard | null            // başarı → kart, aksi null
    outputForModel: string                 // her zaman — function_call_output.output alanına
  }
  async function runVoiceToolCall(
    ev: { callId: string; name: string; args: unknown },
    deps: { sessionId: string; fetchFn?: typeof fetch }
  ): Promise<ToolBridgeResult>
  function buildFunctionCallOutputMessages(callId: string, output: string): unknown[]  // [conversation.item.create, response.create]
  ```
- Not: `/api/akif/voice/tool` 200 döner (hem başarı hem `invalid_args`). Ağ/5xx → `{ error: 'tool_unavailable' }` output'u. `card` yalnız gerçek `ToolResultCard` (`kind` alanı olan) dönüşünde dolu.

- [ ] **Step 1: Failing test yaz**

`src/components/akif/voice/__tests__/voiceToolBridge.test.ts`:

```ts
import { runVoiceToolCall, buildFunctionCallOutputMessages } from '../voiceToolBridge'

const ev = { callId: 'call_1', name: 'explainTerm', args: { term: 'emsal' } }

it('başarı → kart + output modele', async () => {
  const card = { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' }
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => card })
  const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
  expect(r.card).toEqual(card)
  expect(JSON.parse(r.outputForModel)).toEqual(card)
  expect(fetchFn).toHaveBeenCalledWith(
    '/api/akif/voice/tool',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sessionId: 's1', toolName: 'explainTerm', args: { term: 'emsal' } }),
    }),
  )
})

it('invalid_args → card null, output modele hatayı taşır', async () => {
  const err = { error: 'invalid_args', field: 'emsal', reason: 'geçersiz aralık' }
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => err })
  const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
  expect(r.card).toBeNull()
  expect(JSON.parse(r.outputForModel)).toEqual(err)
})

it('HTTP 502 → tool_unavailable output', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) })
  const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
  expect(r.card).toBeNull()
  expect(JSON.parse(r.outputForModel)).toEqual({ error: 'tool_unavailable' })
})

it('fetch fırlatırsa → tool_unavailable output', async () => {
  const fetchFn = jest.fn().mockRejectedValue(new Error('offline'))
  const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
  expect(JSON.parse(r.outputForModel)).toEqual({ error: 'tool_unavailable' })
})

it('buildFunctionCallOutputMessages iki mesaj üretir', () => {
  const msgs = buildFunctionCallOutputMessages('call_1', '{"ok":1}')
  expect(msgs).toEqual([
    { type: 'conversation.item.create', item: { type: 'function_call_output', call_id: 'call_1', output: '{"ok":1}' } },
    { type: 'response.create' },
  ])
})
```

- [ ] **Step 2: Test fail → implementasyon → pass**

`src/components/akif/voice/voiceToolBridge.ts`:

```ts
// Akif-2 — Realtime tool çağrısını backend'e köprüler, modele geri beslenecek mesajları üretir. Saf.
import type { ToolResultCard } from '@/lib/ai/akif/contract'

export interface ToolBridgeResult {
  card: ToolResultCard | null
  outputForModel: string
}

export async function runVoiceToolCall(
  ev: { callId: string; name: string; args: unknown },
  deps: { sessionId: string; fetchFn?: typeof fetch },
): Promise<ToolBridgeResult> {
  const fetchFn = deps.fetchFn ?? fetch
  try {
    const res = await fetchFn('/api/akif/voice/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: deps.sessionId, toolName: ev.name, args: ev.args }),
    })
    if (!res.ok) {
      return { card: null, outputForModel: JSON.stringify({ error: 'tool_unavailable' }) }
    }
    const data = (await res.json()) as Record<string, unknown>
    if (data && typeof data.kind === 'string') {
      return { card: data as unknown as ToolResultCard, outputForModel: JSON.stringify(data) }
    }
    // invalid_args veya beklenmeyen şekil — modele olduğu gibi taşı
    return { card: null, outputForModel: JSON.stringify(data) }
  } catch {
    return { card: null, outputForModel: JSON.stringify({ error: 'tool_unavailable' }) }
  }
}

export function buildFunctionCallOutputMessages(callId: string, output: string): unknown[] {
  return [
    {
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: callId, output },
    },
    { type: 'response.create' },
  ]
}
```

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/components/akif/voice/__tests__/voiceToolBridge.test.ts`
Expected: PASS (5 test).

- [ ] **Step 3: Commit**

```bash
git add src/components/akif/voice/voiceToolBridge.ts src/components/akif/voice/__tests__/voiceToolBridge.test.ts
git commit -m "feat(akif-2): voiceToolBridge — Realtime tool → backend köprüsü"
```

---

## Task 13: `useRealtimeVoice.ts` — WebRTC yaşam döngüsü hook'u

**Files:**
- Create: `src/components/akif/voice/useRealtimeVoice.ts`
- Test: `src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx`

**Interfaces:**
- Consumes: `parseRealtimeEvent` (T11), `runVoiceToolCall` + `buildFunctionCallOutputMessages` (T12).
- Produces:
  ```ts
  type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'
  interface VoiceTranscriptItem { id: string; role: 'user' | 'akif'; text: string; card?: ToolResultCard }
  interface UseRealtimeVoice {
    status: VoiceStatus
    transcript: VoiceTranscriptItem[]
    elapsedSec: number
    errorText: string | null
    start: () => Promise<void>
    stop: (reason?: string) => void
  }
  function useRealtimeVoice(opts?: { rtcFactory?: () => RTCPeerConnection; fetchFn?: typeof fetch }): UseRealtimeVoice
  ```
- Not: `rtcFactory` DI — testte sahte `RTCPeerConnection` (createDataChannel/createOffer/setLocalDescription/setRemoteDescription/addTrack/close + `ontrack`/`onconnectionstatechange` atanabilir). `getUserMedia` `navigator.mediaDevices` üzerinden — testte `jsdom`'a mock'lanır.
- Davranış:
  - `start()`: `getUserMedia({audio:true})` → `POST /api/akif/voice/session` → sahte/gerçek `RTCPeerConnection` → dataChannel `'oai-events'` → offer → `POST https://api.openai.com/v1/realtime/calls` (Bearer token, `Content-Type: application/sdp`) → setRemoteDescription(answer). `status='connecting'→'listening'`. `startedAtMs` kaydı.
  - dataChannel `message`: `parseRealtimeEvent` → transcript güncelle / `speech_started` → yerel audio.pause() + dataChannel.send(`{type:'response.cancel'}`), status `listening` / `tool_call` → `runVoiceToolCall` → `buildFunctionCallOutputMessages` her birini `dc.send` / `response_done` → usage biriktir, status `listening` / `error` → hata sayacı++ (3 → `stop('error')`).
  - `akif_transcript_delta` → status `speaking`.
  - `elapsedSec`: `setInterval` 1sn. `sessionMaxSec-60` → dataChannel'a system mesajı ("Süremiz doluyor, kısa bir kapanış yap"). `sessionMaxSec` → `stop('timeout')`.
  - `stop(reason)`: interval temizle, `pc.close()`, `navigator.sendBeacon('/api/akif/voice/usage', JSON.stringify({...}))`, status `idle`.
- **Test kapsamı sınırlı** (WebRTC jsdom'da yok): durum makinesi geçişleri (idle→connecting→listening), tool_call akışının `runVoiceToolCall`'ı çağırması, `speech_started`'ın `response.cancel` göndermesi, 3 error'ın `stop` tetiklemesi, `stop`'un `sendBeacon` çağırması. SDP/gerçek ses insan dumanında.

- [ ] **Step 1: Failing test yaz**

`src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealtimeVoice } from '../useRealtimeVoice'

// --- sahte RTCPeerConnection ---
class FakeDC {
  listeners: Record<string, ((e: unknown) => void)[]> = {}
  readyState = 'open'
  sent: string[] = []
  addEventListener(t: string, cb: (e: unknown) => void) { (this.listeners[t] ??= []).push(cb) }
  send(s: string) { this.sent.push(s) }
  emit(t: string, e: unknown) { (this.listeners[t] ?? []).forEach((cb) => cb(e)) }
}
class FakePC {
  dc = new FakeDC()
  onconnectionstatechange: (() => void) | null = null
  ontrack: ((e: unknown) => void) | null = null
  createDataChannel() { return this.dc }
  addTrack() {}
  async createOffer() { return { type: 'offer', sdp: 'x' } }
  async setLocalDescription() {}
  async setRemoteDescription() {}
  close() { this.closed = true }
  closed = false
}

const sendBeaconMock = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  // @ts-expect-error jsdom
  navigator.mediaDevices = { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }) }
  navigator.sendBeacon = sendBeaconMock
  global.fetch = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return { ok: true, json: async () => ({ token: 'ek_1', sessionId: 'sess-1', model: 'gpt-realtime-mini', sessionMaxSec: 600 }) } as never
    }
    if (String(url).includes('/api/akif/voice/tool')) {
      return { ok: true, json: async () => ({ kind: 'term', term: 'emsal', shortDef: 'a', example: 'b' }) } as never
    }
    // realtime/calls SDP
    return { ok: true, text: async () => 'answer-sdp' } as never
  }) as never
})

it('start: idle → connecting → listening', async () => {
  let pc: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({ rtcFactory: () => { pc = new FakePC(); return pc as unknown as RTCPeerConnection } }),
  )
  expect(result.current.status).toBe('idle')
  await act(async () => { await result.current.start() })
  await waitFor(() => expect(result.current.status).toBe('listening'))
})

it('tool_call olayı runVoiceToolCall tetikler + modele output döner', async () => {
  let pc!: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({ rtcFactory: () => { pc = new FakePC(); return pc as unknown as RTCPeerConnection } }),
  )
  await act(async () => { await result.current.start() })
  await act(async () => {
    pc.dc.emit('message', { data: JSON.stringify({
      type: 'response.function_call_arguments.done',
      call_id: 'c1', name: 'explainTerm', arguments: '{"term":"emsal"}',
    }) })
  })
  await waitFor(() => {
    expect(pc.dc.sent.some((s) => s.includes('function_call_output'))).toBe(true)
    expect(pc.dc.sent.some((s) => s.includes('response.create'))).toBe(true)
  })
})

it('speech_started → response.cancel gönderir, status listening', async () => {
  let pc!: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({ rtcFactory: () => { pc = new FakePC(); return pc as unknown as RTCPeerConnection } }),
  )
  await act(async () => { await result.current.start() })
  await act(async () => {
    pc.dc.emit('message', { data: JSON.stringify({ type: 'response.output_audio_transcript.delta', delta: 'Merhaba' }) })
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
    useRealtimeVoice({ rtcFactory: () => { pc = new FakePC(); return pc as unknown as RTCPeerConnection } }),
  )
  await act(async () => { await result.current.start() })
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      pc.dc.emit('message', { data: JSON.stringify({ type: 'error', error: { message: 'boom' } }) })
    })
  }
  await waitFor(() => expect(result.current.status).toBe('idle'))
  expect(pc.closed).toBe(true)
  expect(sendBeaconMock).toHaveBeenCalledWith('/api/akif/voice/usage', expect.any(String))
})

it('stop: sendBeacon usage POST', async () => {
  let pc!: FakePC
  const { result } = renderHook(() =>
    useRealtimeVoice({ rtcFactory: () => { pc = new FakePC(); return pc as unknown as RTCPeerConnection } }),
  )
  await act(async () => { await result.current.start() })
  act(() => { result.current.stop('user_ended') })
  const body = JSON.parse(sendBeaconMock.mock.calls[0][1])
  expect(body).toMatchObject({ sessionId: 'sess-1', endReason: 'user_ended' })
})
```

- [ ] **Step 2: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx`
Expected: FAIL — modül yok.

- [ ] **Step 3: `useRealtimeVoice.ts` yaz**

```ts
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
  const modelRef = useRef<string>('gpt-realtime-mini')
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

  const stop = useCallback(
    (reason = 'user_ended') => {
      if (stoppedRef.current) return
      stoppedRef.current = true
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
    },
    [],
  )

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
    micStreamRef.current = mic

    let sess: { token: string; sessionId: string; model: string; sessionMaxSec: number }
    try {
      const res = await fetchFn('/api/akif/voice/session', { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { reason?: string }
        setStatus('error')
        setErrorText(
          body.reason === 'user_quota'
            ? 'Bu ayki sesli sohbet süreni doldurdun.'
            : body.reason === 'monthly_budget'
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

    sessionIdRef.current = sess.sessionId
    modelRef.current = sess.model
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
      audioRef.current.play?.().catch(() => {})
    }
    pc.onconnectionstatechange = () => {
      if ((pc.connectionState === 'failed' || pc.connectionState === 'disconnected') && !stoppedRef.current) {
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
```

- [ ] **Step 4: Test pass doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx`
Expected: PASS (5 test). Test ortamında `RTCPeerConnection`/`Audio` yok — `rtcFactory` DI ile sahte veriliyor, `ontrack` çağrılmıyor. Gerçek `new RTCPeerConnection()` dalı yalnız tarayıcıda.

- [ ] **Step 5: tsc + commit**

Run: `npx tsc --noEmit` → 0 hata. (`RTCTrackEvent`, `RTCDataChannel` DOM lib tiplerinde var — `tsconfig` `lib: ["dom"]` içeriyor, doğrula.)

```bash
git add src/components/akif/voice/useRealtimeVoice.ts src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx
git commit -m "feat(akif-2): useRealtimeVoice — WebRTC yaşam döngüsü + barge-in + guard"
```

---

## Task 14: `AkifVoiceTranscript.tsx` — canlı transkript

**Files:**
- Create: `src/components/akif/voice/AkifVoiceTranscript.tsx`
- Create: `src/components/akif/voice/AkifVoiceTranscript.module.css`
- Test: `src/components/akif/voice/__tests__/AkifVoiceTranscript.test.tsx`
- Read: `src/components/akif/AkifChat.tsx` (transkript render deseni), `src/components/akif/AkifMessageBubble.tsx`, `src/components/akif/AkifScenarioCard.tsx`

**Interfaces:**
- Consumes: `VoiceTranscriptItem` (T13); `AkifMessageBubble`, `AkifScenarioCard` (mevcut); `ScenarioCard` tipi (`@/lib/ai/akif/contract`).
- Produces: `function AkifVoiceTranscript({ items }: { items: VoiceTranscriptItem[] }): JSX.Element`

- [ ] **Step 1: Failing test yaz**

`src/components/akif/voice/__tests__/AkifVoiceTranscript.test.tsx`:

```ts
import { render, screen } from '@testing-library/react'
import { AkifVoiceTranscript } from '../AkifVoiceTranscript'

it('kullanıcı ve Akif metinlerini gösterir', () => {
  render(
    <AkifVoiceTranscript
      items={[
        { id: '1', role: 'user', text: '900 metrekare arsam var' },
        { id: '2', role: 'akif', text: 'Tamam, emsali de söyle.' },
      ]}
    />,
  )
  expect(screen.getByText('900 metrekare arsam var')).toBeInTheDocument()
  expect(screen.getByText('Tamam, emsali de söyle.')).toBeInTheDocument()
})

it('term kartı render eder', () => {
  render(
    <AkifVoiceTranscript
      items={[{ id: '1', role: 'akif', text: '', card: { kind: 'term', term: 'emsal', shortDef: 'yapılaşma oranı', example: 'örnek' } }]}
    />,
  )
  expect(screen.getByText('emsal')).toBeInTheDocument()
  expect(screen.getByText(/yapılaşma oranı/)).toBeInTheDocument()
})

it('senaryo kartı render eder', () => {
  render(
    <AkifVoiceTranscript
      items={[{
        id: '1', role: 'akif', text: '',
        card: {
          kind: 'contractor_offers',
          rows: [{ label: 'Müteahhit %50', arsaPayiX: 0.5, arsaSahibiDaireSayisi: 3, arsaSahibiDegeriTL: 1000000, daireSatisFiyatiTL: 2000000 }],
          defaultsUsed: [], assumptions: [], emsalNote: '',
        },
      }]}
    />,
  )
  expect(screen.getByText(/Müteahhit %50/)).toBeInTheDocument()
})

it('boş metinli düz item render etmez (yalnız kart taşıyanlar)', () => {
  const { container } = render(
    <AkifVoiceTranscript items={[{ id: '1', role: 'akif', text: '' }]} />,
  )
  expect(container.textContent).toBe('')
})
```

- [ ] **Step 2: Test fail → implementasyon → pass**

`src/components/akif/voice/AkifVoiceTranscript.tsx`:

```tsx
'use client'

import type { ScenarioCard } from '@/lib/ai/akif/contract'
import { AkifMessageBubble } from '../AkifMessageBubble'
import { AkifScenarioCard } from '../AkifScenarioCard'
import type { VoiceTranscriptItem } from './useRealtimeVoice'
import styles from './AkifVoiceTranscript.module.css'

export function AkifVoiceTranscript({ items }: { items: VoiceTranscriptItem[] }) {
  return (
    <div className={styles.wrap}>
      {items.map((it) => {
        if (it.card) {
          if (it.card.kind === 'term') {
            return (
              <div key={it.id} className={styles.term}>
                <strong>{it.card.term}</strong> — {it.card.shortDef}
                <div className={styles.termEx}>Örnek: {it.card.example}</div>
              </div>
            )
          }
          return <AkifScenarioCard key={it.id} card={it.card as ScenarioCard} />
        }
        if (!it.text) return null
        return (
          <AkifMessageBubble
            key={it.id}
            role={it.role === 'user' ? 'user' : 'akif'}
            content={it.text}
          />
        )
      })}
    </div>
  )
}
```

`AkifVoiceTranscript.module.css` — `AkifChat.module.css`'teki `.term`/`.termEx` kurallarını kopyala (cross-module className paylaşımı YOK, proje kuralı):

```css
.wrap { display: flex; flex-direction: column; gap: 8px; }
.term { border: 1px solid var(--panel-border, #e2e2e2); border-radius: 12px; padding: 12px; background: var(--panel, #fff); font-size: 14px; }
.termEx { margin-top: 6px; color: var(--muted, #666); }
```

> Not: `AkifChat.module.css`'teki gerçek `.term`/`.termEx` değerlerini birebir al (renk token adları farklı olabilir — Step 1'de oku).

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/components/akif/voice/__tests__/AkifVoiceTranscript.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 3: Commit**

```bash
git add src/components/akif/voice/AkifVoiceTranscript.tsx src/components/akif/voice/AkifVoiceTranscript.module.css src/components/akif/voice/__tests__/AkifVoiceTranscript.test.tsx
git commit -m "feat(akif-2): AkifVoiceTranscript — canlı transkript + Akif-1 kartları"
```

---

## Task 15: `AkifVoicePanel.tsx` — mikrofon paneli

**Files:**
- Create: `src/components/akif/voice/AkifVoicePanel.tsx`
- Create: `src/components/akif/voice/AkifVoicePanel.module.css`
- Test: `src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx`

**Interfaces:**
- Consumes: `useRealtimeVoice` (T13), `AkifVoiceTranscript` (T14).
- Produces: `function AkifVoicePanel({ onExit }: { onExit: () => void }): JSX.Element` — `onExit` metin moduna geri döner.
- Davranış: `idle` → büyük "Konuşmaya başla" butonu; `connecting` → "Bağlanıyor…"; `listening`/`speaking` → orb (durum sınıfı) + süre `m:ss` + "Bitir" butonu; `error` → `errorText` bandı + "Tekrar dene". "Metne dön" butonu her zaman (`onExit` + `stop`).
- `useRealtimeVoice`'ı DI edilebilir yapmak için test'te modülü mock'la (aşağıda).

- [ ] **Step 1: Failing test yaz**

`src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx`:

```ts
import { render, screen, fireEvent } from '@testing-library/react'

const startMock = jest.fn()
const stopMock = jest.fn()
let hookState: Record<string, unknown>

jest.mock('../useRealtimeVoice', () => ({
  useRealtimeVoice: () => hookState,
}))

import { AkifVoicePanel } from '../AkifVoicePanel'

beforeEach(() => {
  jest.clearAllMocks()
  hookState = {
    status: 'idle', transcript: [], elapsedSec: 0, errorText: null,
    start: startMock, stop: stopMock,
  }
})

it('idle: başlat butonu start çağırır', () => {
  render(<AkifVoicePanel onExit={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /konuşmaya başla/i }))
  expect(startMock).toHaveBeenCalled()
})

it('listening: süre ve Bitir butonu', () => {
  hookState.status = 'listening'
  hookState.elapsedSec = 65
  render(<AkifVoicePanel onExit={jest.fn()} />)
  expect(screen.getByText('1:05')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /bitir/i }))
  expect(stopMock).toHaveBeenCalledWith('user_ended')
})

it('error: hata bandı + tekrar dene', () => {
  hookState.status = 'error'
  hookState.errorText = 'Mikrofon izni lazım.'
  render(<AkifVoicePanel onExit={jest.fn()} />)
  expect(screen.getByText('Mikrofon izni lazım.')).toBeInTheDocument()
})

it('metne dön: onExit + stop', () => {
  const onExit = jest.fn()
  hookState.status = 'listening'
  render(<AkifVoicePanel onExit={onExit} />)
  fireEvent.click(screen.getByRole('button', { name: /metne dön/i }))
  expect(stopMock).toHaveBeenCalled()
  expect(onExit).toHaveBeenCalled()
})
```

- [ ] **Step 2: Test fail → implementasyon → pass**

`src/components/akif/voice/AkifVoicePanel.tsx`:

```tsx
'use client'

import { useRealtimeVoice } from './useRealtimeVoice'
import { AkifVoiceTranscript } from './AkifVoiceTranscript'
import styles from './AkifVoicePanel.module.css'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function AkifVoicePanel({ onExit }: { onExit: () => void }) {
  const v = useRealtimeVoice()

  const exit = () => {
    v.stop('user_ended')
    onExit()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.transcript}>
        <AkifVoiceTranscript items={v.transcript} />
      </div>

      {v.errorText && <p className={styles.error}>{v.errorText}</p>}

      <div className={styles.controls}>
        {v.status === 'idle' && (
          <button type="button" className={styles.start} onClick={() => void v.start()}>
            🎙 Konuşmaya başla
          </button>
        )}
        {v.status === 'connecting' && <span className={styles.hint}>Bağlanıyor…</span>}
        {(v.status === 'listening' || v.status === 'speaking') && (
          <>
            <span className={`${styles.orb} ${styles[v.status]}`} aria-hidden />
            <span className={styles.timer}>{fmt(v.elapsedSec)}</span>
            <button type="button" className={styles.stop} onClick={() => v.stop('user_ended')}>
              Bitir
            </button>
          </>
        )}
        {v.status === 'error' && (
          <button type="button" className={styles.start} onClick={() => void v.start()}>
            Tekrar dene
          </button>
        )}
        <button type="button" className={styles.exit} onClick={exit}>
          Metne dön
        </button>
      </div>
    </div>
  )
}
```

`AkifVoicePanel.module.css` — `/akif` sayfa dilinde (`.mGlass` YOK — kart dili revizyonu kuralı, `AkifChat.module.css`'e bak):

```css
.panel { display: flex; flex-direction: column; gap: 12px; }
.transcript { flex: 1; overflow-y: auto; min-height: 200px; }
.controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 0; }
.start { padding: 12px 20px; border-radius: 999px; border: none; background: var(--accent, #1a73e8); color: #fff; font-size: 15px; cursor: pointer; }
.stop { padding: 8px 16px; border-radius: 999px; border: 1px solid var(--panel-border, #ddd); background: transparent; cursor: pointer; }
.exit { margin-left: auto; background: none; border: none; color: var(--muted, #666); font-size: 13px; cursor: pointer; text-decoration: underline; }
.orb { width: 14px; height: 14px; border-radius: 50%; background: var(--muted, #999); }
.listening { background: #34a853; }
.speaking { background: #1a73e8; }
.timer { font-variant-numeric: tabular-nums; color: var(--muted, #666); }
.hint { color: var(--muted, #666); }
.error { color: #c5221f; font-size: 14px; margin: 0; }
```

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 3: Commit**

```bash
git add src/components/akif/voice/AkifVoicePanel.tsx src/components/akif/voice/AkifVoicePanel.module.css src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx
git commit -m "feat(akif-2): AkifVoicePanel — mikrofon orb'u + süre + guard mesajları"
```

---

## Task 16: `/akif` sayfasına sesli mod toggle

**Files:**
- Modify: `src/app/akif/page.tsx`
- Modify: `src/app/akif/page.module.css` (toggle butonu için birkaç kural)
- Test: `src/app/akif/__tests__/page.test.tsx` (mevcut — yeni testler ekle; yoksa oluştur)
- Read: mevcut `src/app/akif/page.tsx` (tam), `src/app/akif/page.test.tsx` varsa

**Interfaces:**
- Consumes: `AkifVoicePanel` (T15).
- Produces: sayfa davranışı — üstte "🎙 Sesli konuş" butonu; tıklanınca `<AkifChat>` yerine `<AkifVoicePanel onExit={...}>`. Buton **yalnız** `NEXT_PUBLIC` bir bayrak değil, `/api/akif/voice/session` denemesiyle değil — basitçe her zaman görünür; giriş yoksa panel `start()`'ta 401 alır ve "Sesli sohbet başlatılamadı" gösterir. (Spec "giriş yapılmışsa görünür" diyordu — ama session durumu client'ta yok; v1 sadeleştirme: buton her zaman, hata mesajı yönlendirir. Kalıntı olarak §10'a not.)

> **Spec sapması (bilinçli):** Spec §3.1 "düğme yalnız giriş yapılmışsa görünür" — client'ta oturum durumu için `useSession` eklemek gerekir. v1'de düğme her zaman görünür, giriş yoksa panel net hata verir ("Sesli sohbet için giriş yapmalısın" — 401 mesajını buna güncelle T13 Step 3'te). Bu, plan-owner onayı ile sadeleştirildi; `useSession` ile gate sonraki iterasyon.

- [ ] **Step 1: T13 hook'unda 401 mesajını netleştir**

`useRealtimeVoice.ts` `start()` içinde `!res.ok` dalında `res.status === 401` kontrolü ekle:

```ts
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { reason?: string }
        setStatus('error')
        setErrorText(
          res.status === 401
            ? 'Sesli sohbet için giriş yapmalısın.'
            : body.reason === 'user_quota'
              ? 'Bu ayki sesli sohbet süreni doldurdun.'
              : body.reason === 'monthly_budget'
                ? 'Sesli sohbet şu an kapalı, sonra tekrar dene.'
                : 'Sesli sohbet başlatılamadı.',
        )
        mic.getTracks().forEach((t) => t.stop())
        return
      }
```

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/components/akif/voice` → hepsi yeşil kalmalı.

- [ ] **Step 2: Failing test yaz**

`src/app/akif/__tests__/page.test.tsx` (yoksa oluştur; varsa `describe` ekle):

```ts
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/akif/voice/AkifVoicePanel', () => ({
  AkifVoicePanel: ({ onExit }: { onExit: () => void }) => (
    <div>
      <span>SESLI PANEL</span>
      <button onClick={onExit}>panel-exit</button>
    </div>
  ),
}))

import AkifPage from '../page'

it('varsayılan metin modu — sesli konuş butonu görünür', () => {
  render(<AkifPage />)
  expect(screen.getByRole('button', { name: /sesli konuş/i })).toBeInTheDocument()
  expect(screen.queryByText('SESLI PANEL')).not.toBeInTheDocument()
})

it('sesli konuş → panel açılır, metin composer gizlenir', () => {
  render(<AkifPage />)
  fireEvent.click(screen.getByRole('button', { name: /sesli konuş/i }))
  expect(screen.getByText('SESLI PANEL')).toBeInTheDocument()
  expect(screen.queryByPlaceholderText(/Arsanı ve payı yaz/i)).not.toBeInTheDocument()
})

it('panelden çık → metin moduna döner', () => {
  render(<AkifPage />)
  fireEvent.click(screen.getByRole('button', { name: /sesli konuş/i }))
  fireEvent.click(screen.getByText('panel-exit'))
  expect(screen.queryByText('SESLI PANEL')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sesli konuş/i })).toBeInTheDocument()
})
```

- [ ] **Step 3: Test fail doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/app/akif`
Expected: FAIL — buton yok.

- [ ] **Step 4: `page.tsx`'i güncelle**

`src/app/akif/page.tsx` — `'use client'` zaten var. `useState` ile `mode` ekle:

```tsx
import { AkifVoicePanel } from '@/components/akif/voice/AkifVoicePanel'
// ...
export default function AkifPage() {
  const [mode, setMode] = useState<'text' | 'voice'>('text')
  // ... mevcut state ...

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Akif Usta&apos;ya Sor</h1>
        <div className={styles.headActions}>
          {mode === 'text' && (
            <button
              type="button"
              className={styles.voiceToggle}
              onClick={() => setMode('voice')}
            >
              🎙 Sesli konuş
            </button>
          )}
          {mode === 'text' && entries.length > 0 && (
            <button
              type="button"
              className={styles.reset}
              onClick={resetConversation}
              disabled={pending}
            >
              Yeni sohbet
            </button>
          )}
        </div>
      </div>
      <p className={styles.sub}>
        Arsanı, emsali ve müteahhit payını {mode === 'voice' ? 'söyle' : 'yaz'} — iki senaryoyu
        hesaplayıp anlatayım. Sayılar deterministik motordan gelir, uydurma yok.
      </p>
      {mode === 'text' ? (
        <AkifChat entries={entries} pending={pending} onSend={send} />
      ) : (
        <AkifVoicePanel onExit={() => setMode('text')} />
      )}
    </div>
  )
}
```

`page.module.css`'e ekle:

```css
.headActions { display: flex; gap: 8px; align-items: center; }
.voiceToggle { padding: 6px 14px; border-radius: 999px; border: 1px solid var(--panel-border, #ddd); background: transparent; font-size: 13px; cursor: pointer; }
```

- [ ] **Step 5: Test pass + regresyon**

Run: `npx jest --no-coverage --roots "<rootDir>/src" src/app/akif src/components/akif`
Expected: PASS — yeni testler + mevcut AkifChat/page testleri yeşil.

- [ ] **Step 6: tsc + commit**

Run: `npx tsc --noEmit` → 0 hata.

```bash
git add src/app/akif/page.tsx src/app/akif/page.module.css src/app/akif/__tests__/page.test.tsx src/components/akif/voice/useRealtimeVoice.ts
git commit -m "feat(akif-2): /akif sesli mod toggle — metin ↔ ses"
```

---

## Task 17: env örneği + smoke script + insan kontrol listesi

**Files:**
- Modify: `.env.example`
- Modify: `package.json` (`scripts`)
- Create: `scripts/akif-voice-smoke.ts`
- Create: `docs/akif/akif-2-insan-duman-kontrol-listesi.md`
- Test: `scripts/__tests__/akif-voice-smoke.test.ts` (yalnız anahtarsız zarif çıkışı doğrular)
- Read: `scripts/akif-eval.ts` + `scripts/tsconfig.akif-eval.json` (script deseni)

**Interfaces:**
- Produces: `npm run akif:voice-smoke` — `OPENAI_API_KEY` varsa gerçek `/v1/realtime/client_secrets` çağrısı yapıp config'in reddedilmediğini doğrular; yoksa `console.log` + `process.exit(0)`.

- [ ] **Step 1: `.env.example`'a 6 değişken ekle**

`OPENAI_API_KEY=` satırının altındaki Akif bloğuna:

```
# Akif-2 — sesli danışman (OpenAI Realtime). OPENAI_API_KEY yoksa sesli mod tamamen kapalı.
AKIF_VOICE_MODEL=gpt-realtime-mini      # opsiyonel — gpt-realtime ile yükseltilebilir
AKIF_VOICE_NAME=marin                   # opsiyonel — Realtime hazır ses adı (marin/verse/cedar/coral...)
AKIF_VOICE_MONTHLY_BUDGET_USD=30        # opsiyonel — global aylık sesli harcama tavanı (aşılırsa session 503)
AKIF_VOICE_USER_MONTHLY_MINUTES=30      # opsiyonel — kullanıcı başına aylık sesli dakika
AKIF_VOICE_SESSION_MAX_SEC=600          # opsiyonel — oturum başına saniye sınırı
AKIF_VOICE_SMOKE_BUDGET_USD=1           # opsiyonel — npm run akif:voice-smoke için
```

- [ ] **Step 2: `package.json`'a script**

`scripts` içine (`akif:eval`'in yanına):

```json
    "akif:voice-smoke": "cross-env TS_NODE_PROJECT=scripts/tsconfig.akif-eval.json ts-node --transpile-only -r tsconfig-paths/register scripts/akif-voice-smoke.ts",
```

- [ ] **Step 3: Failing test yaz**

`scripts/__tests__/akif-voice-smoke.test.ts`:

```ts
import { runVoiceSmoke } from '../akif-voice-smoke'

it('anahtarsız → skipped:true, API çağrısı yok', async () => {
  const fetchFn = jest.fn()
  const r = await runVoiceSmoke({ env: {}, fetchFn: fetchFn as never })
  expect(r).toEqual({ skipped: true })
  expect(fetchFn).not.toHaveBeenCalled()
})

it('anahtarlı + config kabul → ok:true', async () => {
  const fetchFn = jest.fn().mockResolvedValue({
    ok: true, json: async () => ({ value: 'ek_x', expires_at: 1 }),
  })
  const r = await runVoiceSmoke({ env: { OPENAI_API_KEY: 'sk-x' }, fetchFn: fetchFn as never })
  expect(r).toEqual({ skipped: false, ok: true })
})

it('anahtarlı + config reddedildi → ok:false + status', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad tool schema' })
  const r = await runVoiceSmoke({ env: { OPENAI_API_KEY: 'sk-x' }, fetchFn: fetchFn as never })
  expect(r).toEqual({ skipped: false, ok: false, status: 400, detail: 'bad tool schema' })
})
```

- [ ] **Step 4: Test fail → implementasyon → pass**

`scripts/akif-voice-smoke.ts`:

```ts
// Akif-2 — gerçek Realtime API dumanı. CI'da KOŞMAZ.
// OPENAI_API_KEY ile: config (tool şeması + semantic_vad + ses adı) API tarafından
// reddedilmiyor mu? Efemeral token dönüyor mu?
import { readVoiceEnv } from '@/lib/ai/akif/voice/voiceEnv'
import { buildRealtimeSessionConfig } from '@/lib/ai/akif/voice/realtimeSession'

export interface VoiceSmokeResult {
  skipped: boolean
  ok?: boolean
  status?: number
  detail?: string
}

export async function runVoiceSmoke(deps: {
  env?: Record<string, string | undefined>
  fetchFn?: typeof fetch
}): Promise<VoiceSmokeResult> {
  const env = deps.env ?? process.env
  const fetchFn = deps.fetchFn ?? fetch
  if (!env.OPENAI_API_KEY) return { skipped: true }

  const cfg = readVoiceEnv(env)
  const session = buildRealtimeSessionConfig({ model: cfg.model, voiceName: cfg.voiceName })

  const res = await fetchFn('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expires_after: { ttl: '2m' }, session }),
  })

  if (!res.ok) {
    return { skipped: false, ok: false, status: res.status, detail: (await res.text()).slice(0, 300) }
  }
  const data = (await res.json()) as { value?: string }
  return { skipped: false, ok: Boolean(data.value) }
}

if (require.main === module) {
  runVoiceSmoke({})
    .then((r) => {
      if (r.skipped) {
        console.log('⏭  OPENAI_API_KEY yok — smoke atlandı.')
        process.exit(0)
      }
      if (r.ok) {
        console.log('✅ Realtime config kabul edildi, efemeral token alındı.')
        process.exit(0)
      }
      console.error(`❌ Realtime config reddedildi (HTTP ${r.status}): ${r.detail}`)
      process.exit(1)
    })
    .catch((e) => {
      console.error('❌ smoke fırlattı:', e)
      process.exit(1)
    })
}
```

Run: `npx jest --no-coverage --roots "<rootDir>/scripts" scripts/__tests__/akif-voice-smoke.test.ts`
(Not: jest `roots` `src` — script testi için `--roots "<rootDir>/scripts"` gerekebilir veya `testPathIgnorePatterns` kontrol et. `akif-eval` testi nasıl koşuyorsa aynı şekilde.)
Expected: PASS (3 test).

- [ ] **Step 5: İnsan kontrol listesi dokümanı**

`docs/akif/akif-2-insan-duman-kontrol-listesi.md`:

```markdown
# Akif-2 Sesli Danışman — Deploy Sonrası İnsan Duman Testi

WebRTC + mikrofon otomatik test edilemez. Deploy sonrası gerçek cihazda (mobil + masaüstü) elle:

- [ ] `/akif` → "🎙 Sesli konuş" → mikrofon izni istendi, verince bağlandı
- [ ] "900 metrekare arsam var, emsal 1.5, müteahhit yüzde 50 istiyor" de → Akif eksik sormadan hesapladı
- [ ] Ekranda `AkifScenarioCard` belirdi + sesle söylenen sayı ekrandaki tabloyla AYNI
- [ ] Akif konuşurken araya gir ("tamam tamam") → Akif SUSTU, yeni soruyu aldı (barge-in)
- [ ] Sayıları net/yavaş telaffuz etti, abartılı şive YOK
- [ ] Bir terim sor ("emsal nedir?") → term kartı + sözlü açıklama
- [ ] Geçersiz veri ver ("emsal 50") → Akif düzeltme istedi (uçuk sonuç vermedi)
- [ ] ~9. dakikada Akif kapanış uyarısı yaptı, 10. dakikada oturum kapandı
- [ ] Giriş yapmadan "Sesli konuş" → "giriş yapmalısın" mesajı
- [ ] Uçağa alıp ağı kes → "Bağlantı koptu" + oturum düzgün kapandı
- [ ] Coolify `AkifVoiceSessionLog` tablosunda oturum satırı var, `estCostUsd` makul (~$0.02-0.1/dk)

Sorun çıkarsa: `AKIF_VOICE_MODEL=gpt-realtime` (kalite) veya guard eşiklerini düşür.
```

- [ ] **Step 6: Tam suite + build + commit**

Run: `npx jest --no-coverage` → tüm proje yeşil (Akif-1 dahil regresyon yok).
Run: `npx tsc --noEmit` → 0 hata.
Run: `npm run build` → temiz (Next 16 / Turbopack — CSS Modules `composes` yok, sorun beklenmez).

```bash
git add .env.example package.json scripts/akif-voice-smoke.ts scripts/__tests__/akif-voice-smoke.test.ts docs/akif/akif-2-insan-duman-kontrol-listesi.md
git commit -m "feat(akif-2): env örneği + akif:voice-smoke + insan duman kontrol listesi"
```

---

## Self-Review

**1. Spec coverage:**

| Spec bölümü | Karşılayan task |
|---|---|
| §2 mimari (3 katman, ses doğrudan / sayı backend) | T5, T8, T9, T13 |
| §3.1 istemci modülleri | T11 (`voiceEvents`), T12 (`voiceToolBridge`), T13 (`useRealtimeVoice`), T14 (`AkifVoiceTranscript`), T15 (`AkifVoicePanel`) |
| §3.1 `/akif` sesli mod toggle | T16 |
| §3.2 sunucu modülleri | T2 (`voiceEnv`), T3 (`voiceCost`), T4 (`voiceRhythm`), T5 (`realtimeSession`), T6 (`voiceAudit`), T7 (`voiceQuota`) |
| §3.2 route'lar | T8 (session), T9 (tool), T10 (usage) |
| §3.3 Prisma modelleri + migration | T1 |
| §4 veri akışı (oturum/normal/hesap/barge-in/son) | T13 (hook tümünü orkestralar) + T8/T9/T10 |
| §5 3 katmanlı guard | T7 (`voiceQuota`) + T8 (session'da uygular) + T13 (oturum süresi + kapanış uyarısı) |
| §5 maliyet kaydı (gerçek usage / tahmin) | T3 (`voiceCost`) + T10 (usage route) + T13 (usage biriktirme) |
| §5 suistimal (giriş şart, rate-limit, efemeral token) | T8 |
| §6 hata yönetimi (izin, token, kopma, invalid_args, tool 5xx, 3 error, kota) | T9 (invalid_args 200), T13 (izin/kopma/3-error/timeout), T15 (hata bandı) |
| §7 test stratejisi (birim / route / hook light / insan) | her task TDD + T17 insan listesi |
| §7 gerçek API dumanı `npm run akif:voice-smoke` | T17 |
| §8 env değişkenleri | T2 (okuma) + T17 (`.env.example`) |
| §9 deploy kapısı | T17 (insan listesi + smoke) — prod migration/env büyük batch'te (kapsam dışı, doğru) |
| §10 kalıntılar | plan içinde işaretlendi (T16 spec sapması, T13 reconnect özet) |

**Boşluk:** §3.2 `realtimeSession.ts` "ses ritmi eki" — T4 + T5 birlikte karşılıyor. §4 adım 16 "kapanış uyarısı" — T13 Step 3 timer bloğunda `conversation.item.create` system mesajı ile var. ✔ Tam kapsam.

**2. Placeholder taraması:** Migration klasör adı `<timestamp>` — kasıtlı (implementer mevcut en yeni migration'dan büyük timestamp üretir, Step 3'te `ls | sort | tail` ile). `voiceProfile.ts` entegrasyonu (T4) — "Step 1'de oku, şekle göre bağla" — dosya zaten repo'da, implementer içeriğini görecek; test kaynağı değil kavramı kontrol ediyor. Başka placeholder yok.

**3. Tip tutarlılığı:**
- `VoiceTranscriptItem` — T13'te tanımlı, T14/T15'te `import type ... from './useRealtimeVoice'` ile tüketiliyor ✔
- `VoiceAuditDb` — T6'da tanımlı, T8/T9/T10'da import ✔
- `parseRealtimeEvent` dönüşü `VoiceEvent | null` — T11 tanım, T13 tüketim ✔
- `runVoiceToolCall` / `buildFunctionCallOutputMessages` — T12 tanım, T13 tüketim ✔
- `readVoiceEnv` dönüş alanları (`model`, `voiceName`, `monthlyBudgetUsd`, `userMonthlyMinutes`, `sessionMaxSec`, `smokeBudgetUsd`) — T2 tanım; T8 (`model`, `voiceName`, `monthlyBudgetUsd`, `userMonthlyMinutes`, `sessionMaxSec`), T10 (`model`), T17 (`model`, `voiceName`, `apiKey`) tüketim — hepsi T2'de var ✔
- `buildRealtimeSessionConfig({ model, voiceName })` — T5 tanım, T8/T17 çağrı ✔
- `estimateVoiceCostUsd({ model, durationSec, usage })` — T3 tanım, T10 çağrı ✔
- `checkVoiceQuota(userId, deps)` — T7 tanım, T8 çağrı ✔
- `createVoiceAuditLogger(db)` metotları: `logVoiceTurn` (T9), `logVoiceSession` (T10), `voiceMonthSpendUsd`+`voiceUserMonthSeconds` (T8) — hepsi T6'da ✔
- Realtime olay adları Global Constraints'te sabit + T11 testinde birebir ✔

Tutarsızlık yok.

---

## Execution Handoff

**Plan `docs/superpowers/plans/2026-09-09-akif-2-sesli-danisman.md`'ye kaydedildi. İki yürütme seçeneği:**

**1. Subagent-Driven (önerilen)** — her task için taze subagent, task'lar arası iki aşamalı review, hızlı iterasyon.

**2. Inline** — bu oturumda `executing-plans` ile, checkpoint'lerde review.

**Hangisi?**
