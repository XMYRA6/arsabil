# WhatsApp Inbound Sorgu Botu (5a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WhatsApp'tan serbest metinle gelen bir parsel sorgusunu TKGM idari yapısına oturtup mevcut anonim Değer Kartı motorunu çalıştıran ve sonucu WhatsApp mesajı olarak dönen bir inbound bot kur.

**Architecture:** Yeni `api/whatsapp/webhook` route'u Meta doğrulamasını (GET) ve imza-doğrulamalı gelen mesajı (POST) karşılar; ağır iş `after()` ile response sonrasına alınır. Tüm iş mantığı `src/lib/whatsapp/` altında saf, DI'lı, ayrı ayrı test edilebilir modüllerde. Konuşma durumu `WhatsappConversation` Prisma modelinde (30 dk TTL kod tarafında). `buildDegerCard` seam'i `memberView:false` ile aynen kullanılır.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma + PostgreSQL, Jest + ts-jest (testEnvironment: node), `node:crypto` (proje stili: `import { createHmac } from 'crypto'`).

**Spec:** `docs/superpowers/specs/2026-08-31-whatsapp-inbound-sorgu-botu-design.md`

## Global Constraints

- **Sağlayıcı:** Meta WhatsApp Cloud API doğrudan. Aracı BSP yok. 5a şablonsuz (24 saatlik servis penceresi).
- **v1'de LLM yok, Levenshtein yok.** Belirsizlikte kullanıcıya sor.
- **Test deseni:** saf modül + bağımlılık enjeksiyonu (DI). Prisma/fetch/TKGM asla doğrudan import edilip test edilmez — hep DI ile sahte geçilir. Fixture'lar `src/lib/whatsapp/__fixtures__/`.
- **Migration:** elle yazılmış SQL, `prisma/migrations/<UTC-timestamp>_<isim>/migration.sql`. `prisma migrate dev` ile üretilmez; SQL elle yazılır, sonra `prisma migrate deploy` (dev DB'ye) + `prisma generate`.
- **Her task sonunda:** `npx tsc --noEmit` temiz + ilgili jest yeşil. Route/page dokunan task'larda ek olarak `npm run build` temiz.
- **jest komutu (ana checkout):** `npx jest --no-coverage --roots "<rootDir>/src" <pattern>` — worktree'den çalıştırılırsa `--roots` verme.
- **Türkçe metin:** kullanıcıya giden tüm mesajlar Türkçe. Kod içi identifier İngilizce.
- **PII:** telefon numarası log'a yazılmaz (gerekiyorsa son 4 hane maskeli).
- **Dizin:** repo kökü `C:\Users\emre\Desktop\arsabil-main`, branch `codex/professional-ui-and-land-cost`.

---

### Task 1: `WhatsappConversation` Prisma modeli + migration

**Files:**
- Modify: `prisma/schema.prisma` (yeni model ekle — dosya sonundaki model bloklarının yanına)
- Create: `prisma/migrations/20260901090000_add_whatsapp_conversation/migration.sql`
- Test: yok (şema değişikliği — doğrulama `prisma validate` + `tsc`)

**Interfaces:**
- Consumes: –
- Produces: `prisma.whatsappConversation` delegesi; alanlar: `id: string`, `phone: string` (unique), `state: Json`, `lastMessageId: string | null`, `updatedAt: Date`, `createdAt: Date`

- [ ] **Step 1: Modeli şemaya ekle**

`prisma/schema.prisma` sonuna:

```prisma
model WhatsappConversation {
  id            String   @id @default(cuid())
  phone         String   @unique
  state         Json
  lastMessageId String?
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())
}
```

- [ ] **Step 2: `prisma validate` çalıştır**

Run: `npx prisma validate`
Expected: "The schema is valid"

- [ ] **Step 3: Migration SQL'i elle yaz**

`prisma/migrations/20260901090000_add_whatsapp_conversation/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "WhatsappConversation" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "lastMessageId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConversation_phone_key" ON "WhatsappConversation"("phone");
```

- [ ] **Step 4: Client üret (+ mümkünse migration'ı dev DB'ye uygula)**

Run: `npx prisma generate`
Expected: client regenerated — `prisma.whatsappConversation` tipi artık var. (`prisma generate` DB'ye ihtiyaç duymaz; EPERM verirse önce `next dev`/jest süreçlerini kapat.)

Sonra, Docker `arsabil_postgres_dev` container'ı erişilebilirse:
Run: `npx prisma migrate deploy`
Expected: migration `20260901090000_add_whatsapp_conversation` applied.
DB erişilemiyorsa bu adımı ATLA — migration prod'a diğer bekleyen migration'larla deploy fazında uygulanacak; `prisma generate` yeterli (test/tsc DB'ye vurmuyor, hepsi DI-mock).

- [ ] **Step 5: `tsc` ile doğrula**

Run: `npx tsc --noEmit`
Expected: temiz (yeni `prisma.whatsappConversation` tipi tanınır).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260901090000_add_whatsapp_conversation
git commit -m "feat(wa): WhatsappConversation modeli + migration"
```

---

### Task 2: Paylaşılan tipler + `matchAreaName`

**Files:**
- Create: `src/lib/whatsapp/types.ts`
- Create: `src/lib/whatsapp/matchAreaName.ts`
- Test: `src/lib/whatsapp/__tests__/matchAreaName.test.ts`

**Interfaces:**
- Consumes: `normalizeAreaName` from `@/lib/areaPrices/normalizeAreaName` — signature `normalizeAreaName(s: string): string` (i/İ/ı katlama + büyük harf + trim)
- Produces:
  - `types.ts`:
    ```ts
    export type ConvLevel = 'il' | 'ilce' | 'mahalle' | 'ada' | 'parsel'
    export type AreaLevel = 'il' | 'ilce' | 'mahalle'
    export interface InboundMessage {
      from: string           // sadece rakam, baştaki + yok
      text: string
      messageId: string
      timestamp: number      // saniye
      type: 'text' | 'other'
    }
    export interface ParsedQuery {
      ilText?: string; ilceText?: string; mahalleText?: string
      ada?: string; parsel?: string
    }
    export interface ConvFields {
      ilText?: string; ilId?: number
      ilceText?: string; ilceId?: number
      mahalleText?: string; mahalleId?: number
      ada?: string; parsel?: string
    }
    export interface AreaOption { id: number; text: string }
    export interface ConvState {
      pending?: ConvLevel
      candidates?: AreaOption[]
      candidateLevel?: AreaLevel
      fields: ConvFields
    }
    export type ResolveResult =
      | { kind: 'resolved'; mahalleId: number; il: string; ilce: string; mahalle: string }
      | { kind: 'ambiguous'; level: AreaLevel; candidates: AreaOption[] }
      | { kind: 'notfound'; level: AreaLevel; term: string }
    ```
  - `matchAreaName.ts`: `matchAreaName(input: string, options: AreaOption[]): AreaOption[]` — 0/1/N aday döner

- [ ] **Step 1: Failing test yaz**

`src/lib/whatsapp/__tests__/matchAreaName.test.ts`:

```ts
import { matchAreaName } from '../matchAreaName'

const ILCE = [
  { id: 1, text: 'Ortahisar' },
  { id: 2, text: 'Akçaabat' },
  { id: 3, text: 'Of' },
]
const MAH = [
  { id: 10, text: 'UĞURLU' },
  { id: 11, text: 'UĞURLUOĞLU' },
  { id: 12, text: 'YENİ MAHALLE' },
]

describe('matchAreaName', () => {
  it('tam eşitlik (normalize sonrası) tek aday', () => {
    expect(matchAreaName('ortahisar', ILCE)).toEqual([{ id: 1, text: 'Ortahisar' }])
  })
  it('Türkçe İ/ı farkını katlar', () => {
    expect(matchAreaName('uğurlu', MAH)).toEqual([{ id: 10, text: 'UĞURLU' }])
  })
  it('prefix çoklu aday döner', () => {
    const r = matchAreaName('uğurl', MAH)
    expect(r.map(x => x.id).sort()).toEqual([10, 11])
  })
  it('"mah." son ekini temizler', () => {
    expect(matchAreaName('yeni mah.', MAH)).toEqual([{ id: 12, text: 'YENİ MAHALLE' }])
  })
  it('eşleşme yoksa boş dizi', () => {
    expect(matchAreaName('bambaşka', ILCE)).toEqual([])
  })
  it('tam eşitlik varsa prefix adaylarını ELEMEZ ama tam olanı başa alır', () => {
    const r = matchAreaName('of', ILCE)
    expect(r[0]).toEqual({ id: 3, text: 'Of' })
  })
})
```

- [ ] **Step 2: Test fail ettiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" matchAreaName`
Expected: FAIL — "Cannot find module '../matchAreaName'"

- [ ] **Step 3: `types.ts` yaz**

Yukarıdaki "Produces" bloğundaki tüm tipleri `src/lib/whatsapp/types.ts` olarak yaz.

- [ ] **Step 4: `matchAreaName.ts` yaz**

```ts
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import type { AreaOption } from './types'

const SUFFIX = /\s+(MAH\.?|MAHALLESI|MAHALLES\u0130|KOYU|K\u00d6Y\u00dc|BELDESI)$/

function fold(s: string): string {
  return normalizeAreaName(s).replace(SUFFIX, '').replace(/\s+/g, ' ').trim()
}

export function matchAreaName(input: string, options: AreaOption[]): AreaOption[] {
  const q = fold(input)
  if (!q) return []
  const exact: AreaOption[] = []
  const prefix: AreaOption[] = []
  for (const o of options) {
    const t = fold(o.text)
    if (t === q) exact.push(o)
    else if (t.startsWith(q) || q.startsWith(t)) prefix.push(o)
  }
  if (exact.length) return [...exact, ...prefix.filter(p => !exact.includes(p))]
  return prefix
}
```

- [ ] **Step 5: Test geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" matchAreaName`
Expected: PASS (6 test)

- [ ] **Step 6: `tsc`**

Run: `npx tsc --noEmit`
Expected: temiz

- [ ] **Step 7: Commit**

```bash
git add src/lib/whatsapp/types.ts src/lib/whatsapp/matchAreaName.ts src/lib/whatsapp/__tests__/matchAreaName.test.ts
git commit -m "feat(wa): paylaşılan tipler + matchAreaName fuzzy eşleştirici"
```

---

### Task 3: `verifySignature`

**Files:**
- Create: `src/lib/whatsapp/verifySignature.ts`
- Test: `src/lib/whatsapp/__tests__/verifySignature.test.ts`

**Interfaces:**
- Consumes: `import { createHmac, timingSafeEqual } from 'crypto'`
- Produces: `verifySignature(rawBody: string, secret: string, header: string | null): boolean`

- [ ] **Step 1: Failing test yaz**

```ts
import { createHmac } from 'crypto'
import { verifySignature } from '../verifySignature'

const SECRET = 'test_app_secret'
const BODY = '{"object":"whatsapp_business_account","entry":[]}'
function sig(body: string, secret = SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

describe('verifySignature', () => {
  it('geçerli imza true', () => {
    expect(verifySignature(BODY, SECRET, sig(BODY))).toBe(true)
  })
  it('gövde değişince false', () => {
    expect(verifySignature(BODY + ' ', SECRET, sig(BODY))).toBe(false)
  })
  it('yanlış secret false', () => {
    expect(verifySignature(BODY, SECRET, sig(BODY, 'other'))).toBe(false)
  })
  it('header null false', () => {
    expect(verifySignature(BODY, SECRET, null)).toBe(false)
  })
  it('header "sha256=" öneki yoksa false', () => {
    expect(verifySignature(BODY, SECRET, 'deadbeef')).toBe(false)
  })
  it('header hex olmayan çöp ise false (throw etmez)', () => {
    expect(verifySignature(BODY, SECRET, 'sha256=zzz')).toBe(false)
  })
})
```

- [ ] **Step 2: Test fail ettiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" verifySignature`
Expected: FAIL — modül yok

- [ ] **Step 3: Implementasyon yaz**

```ts
import { createHmac, timingSafeEqual } from 'crypto'

export function verifySignature(rawBody: string, secret: string, header: string | null): boolean {
  if (!header || !header.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const got = header.slice('sha256='.length)
  if (got.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Test geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" verifySignature`
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/verifySignature.ts src/lib/whatsapp/__tests__/verifySignature.test.ts
git commit -m "feat(wa): webhook imza doğrulama (HMAC-SHA256, sabit zaman)"
```

---

### Task 4: `parseInbound` + fixture'lar

**Files:**
- Create: `src/lib/whatsapp/parseInbound.ts`
- Create: `src/lib/whatsapp/__fixtures__/inbound-text.json`
- Create: `src/lib/whatsapp/__fixtures__/inbound-image.json`
- Create: `src/lib/whatsapp/__fixtures__/inbound-status.json`
- Create: `src/lib/whatsapp/__fixtures__/inbound-multi.json`
- Test: `src/lib/whatsapp/__tests__/parseInbound.test.ts`

**Interfaces:**
- Consumes: `InboundMessage` from `./types`
- Produces: `parseInbound(payload: unknown): InboundMessage[]`

**Fixture içerikleri (gerçek Meta webhook şekli):**

`inbound-text.json`:
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "display_phone_number": "905550001122", "phone_number_id": "PNID" },
        "contacts": [{ "profile": { "name": "Emre" }, "wa_id": "905321234567" }],
        "messages": [{
          "from": "905321234567",
          "id": "wamid.AAA",
          "timestamp": "1717000000",
          "text": { "body": "Trabzon Ortahisar Uğurlu 123/45" },
          "type": "text"
        }]
      }
    }]
  }]
}
```

`inbound-image.json`: aynı yapı, `messages[0]` = `{ "from": "905321234567", "id": "wamid.IMG", "timestamp": "1717000001", "type": "image", "image": { "id": "MEDIA_ID", "mime_type": "image/jpeg" } }`

`inbound-status.json`: `value` içinde `messages` YOK, yerine `"statuses": [{ "id": "wamid.AAA", "status": "delivered", "timestamp": "1717000002", "recipient_id": "905321234567" }]`

`inbound-multi.json`: `entry` iki eleman; her birinde bir text mesaj (`wamid.M1` "merhaba", `wamid.M2` "123/45"), `from` sırasıyla `"905321111111"` ve `"+905322222222"` (biri + önekli — normalize testi için)

- [ ] **Step 1: Failing test yaz**

```ts
import fs from 'fs'
import path from 'path'
import { parseInbound } from '../parseInbound'

const fx = (n: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', '__fixtures__', n), 'utf8'))

describe('parseInbound', () => {
  it('tek text mesajı çıkarır', () => {
    const r = parseInbound(fx('inbound-text.json'))
    expect(r).toEqual([{
      from: '905321234567',
      text: 'Trabzon Ortahisar Uğurlu 123/45',
      messageId: 'wamid.AAA',
      timestamp: 1717000000,
      type: 'text',
    }])
  })
  it('image mesajı type:other olarak işaretler, text boş', () => {
    const r = parseInbound(fx('inbound-image.json'))
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('other')
    expect(r[0].text).toBe('')
    expect(r[0].messageId).toBe('wamid.IMG')
  })
  it('status callback → boş dizi', () => {
    expect(parseInbound(fx('inbound-status.json'))).toEqual([])
  })
  it('çoklu entry + telefon normalize (+ öneki atılır)', () => {
    const r = parseInbound(fx('inbound-multi.json'))
    expect(r.map(m => m.from)).toEqual(['905321111111', '905322222222'])
    expect(r.map(m => m.messageId)).toEqual(['wamid.M1', 'wamid.M2'])
  })
  it('tanınmayan/eksik payload → boş dizi (throw etmez)', () => {
    expect(parseInbound({})).toEqual([])
    expect(parseInbound(null)).toEqual([])
    expect(parseInbound({ entry: 'x' })).toEqual([])
  })
})
```

- [ ] **Step 2: Test fail ettiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" parseInbound`
Expected: FAIL — modül yok

- [ ] **Step 3: Fixture dosyalarını oluştur**

Yukarıdaki 4 JSON dosyasını `src/lib/whatsapp/__fixtures__/` altına yaz.

- [ ] **Step 4: `parseInbound.ts` yaz**

```ts
import type { InboundMessage } from './types'

function normPhone(s: unknown): string {
  return String(s ?? '').replace(/[^\d]/g, '')
}

export function parseInbound(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = []
  const p = payload as { entry?: unknown }
  if (!p || !Array.isArray(p.entry)) return out
  for (const entry of p.entry) {
    const changes = (entry as { changes?: unknown }).changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      const value = (change as { value?: { messages?: unknown } }).value
      const messages = value?.messages
      if (!Array.isArray(messages)) continue
      for (const m of messages) {
        const msg = m as {
          from?: unknown; id?: unknown; timestamp?: unknown
          type?: unknown; text?: { body?: unknown }
        }
        const isText = msg.type === 'text' && typeof msg.text?.body === 'string'
        out.push({
          from: normPhone(msg.from),
          text: isText ? String(msg.text!.body) : '',
          messageId: String(msg.id ?? ''),
          timestamp: Number(msg.timestamp ?? 0),
          type: isText ? 'text' : 'other',
        })
      }
    }
  }
  return out
}
```

- [ ] **Step 5: Test geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" parseInbound`
Expected: PASS (5 test)

- [ ] **Step 6: `tsc` + commit**

```bash
npx tsc --noEmit
git add src/lib/whatsapp/parseInbound.ts src/lib/whatsapp/__fixtures__ src/lib/whatsapp/__tests__/parseInbound.test.ts
git commit -m "feat(wa): parseInbound — Meta webhook payload normalize"
```

---

### Task 5: `extractParcelQuery`

**Files:**
- Create: `src/lib/whatsapp/extractParcelQuery.ts`
- Test: `src/lib/whatsapp/__tests__/extractParcelQuery.test.ts`

**Interfaces:**
- Consumes: `ParsedQuery` from `./types`
- Produces: `extractParcelQuery(text: string): ParsedQuery`

- [ ] **Step 1: Failing test yaz**

```ts
import { extractParcelQuery } from '../extractParcelQuery'

describe('extractParcelQuery', () => {
  it('"İl İlçe Mahalle ada/parsel"', () => {
    expect(extractParcelQuery('Trabzon Ortahisar Uğurlu 123/45')).toEqual({
      ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu',
      ada: '123', parsel: '45',
    })
  })
  it('"123 ada 45 parsel" + konum', () => {
    const r = extractParcelQuery('Trabzon Of 123 ada 45 parsel')
    expect(r.ada).toBe('123')
    expect(r.parsel).toBe('45')
    expect(r.ilText).toBe('Trabzon')
    expect(r.ilceText).toBe('Of')
  })
  it('"ada: 5 parsel: 10" (iki nokta)', () => {
    const r = extractParcelQuery('ada: 5 parsel: 10')
    expect(r.ada).toBe('5')
    expect(r.parsel).toBe('10')
    expect(r.ilText).toBeUndefined()
  })
  it('tek kelime → sadece ilText', () => {
    expect(extractParcelQuery('Ortahisar')).toEqual({ ilText: 'Ortahisar' })
  })
  it('iki kelime → il + ilçe', () => {
    expect(extractParcelQuery('Trabzon Akçaabat')).toEqual({
      ilText: 'Trabzon', ilceText: 'Akçaabat',
    })
  })
  it('mahalle "mah" son eki metinde kalır (resolve temizler)', () => {
    const r = extractParcelQuery('Trabzon Ortahisar Yeni Mah 1/2')
    expect(r.mahalleText).toBe('Yeni Mah')
  })
  it('çöp/boş → boş nesne', () => {
    expect(extractParcelQuery('merhaba nasılsın')).toEqual({
      ilText: 'merhaba', ilceText: 'nasılsın',
    })
    expect(extractParcelQuery('')).toEqual({})
    expect(extractParcelQuery('   ')).toEqual({})
  })
})
```

Not: son test "merhaba nasılsın" → `{ilText, ilceText}` dönüyor çünkü extraction kaba; `resolveLocation` "notfound" verince `handleMessage` yardım mesajına düşer (bkz. Task 11/12). Bu bilinçli.

- [ ] **Step 2: Test fail ettiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" extractParcelQuery`
Expected: FAIL — modül yok

- [ ] **Step 3: Implementasyon yaz**

```ts
import type { ParsedQuery } from './types'

const D = '\\d{1,7}'

export function extractParcelQuery(text: string): ParsedQuery {
  const q: ParsedQuery = {}
  let rest = ` ${text} `

  // ada/parsel — "123/45"
  const slash = rest.match(new RegExp(`(?<![\\d])(${D})\\s*[/\\-]\\s*(${D})(?![\\d])`))
  if (slash) {
    q.ada = slash[1]
    q.parsel = slash[2]
    rest = rest.replace(slash[0], ' ')
  }
  // "123 ada" / "ada 123" / "ada: 123"
  const adaWord = rest.match(new RegExp(`(${D})\\s*ada\\b|\\bada\\s*[:.]?\\s*(${D})`, 'i'))
  if (adaWord && !q.ada) {
    q.ada = adaWord[1] ?? adaWord[2]
    rest = rest.replace(adaWord[0], ' ')
  }
  const parselWord = rest.match(new RegExp(`(${D})\\s*parsel\\b|\\bparsel\\s*[:.]?\\s*(${D})`, 'i'))
  if (parselWord && !q.parsel) {
    q.parsel = parselWord[1] ?? parselWord[2]
    rest = rest.replace(parselWord[0], ' ')
  }

  // kalan kelimeler = konum
  const words = rest.trim().split(/\s+/).filter(w => w && !/^\d+$/.test(w))
  if (words[0]) q.ilText = words[0]
  if (words[1]) q.ilceText = words[1]
  if (words.length >= 3) q.mahalleText = words.slice(2).join(' ')

  return q
}
```

- [ ] **Step 4: Test geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" extractParcelQuery`
Expected: PASS (7 test)

- [ ] **Step 5: `tsc` + commit**

```bash
npx tsc --noEmit
git add src/lib/whatsapp/extractParcelQuery.ts src/lib/whatsapp/__tests__/extractParcelQuery.test.ts
git commit -m "feat(wa): extractParcelQuery — serbest metinden kaba alan çıkarımı"
```

---

### Task 6: `resolveLocation`

**Files:**
- Create: `src/lib/whatsapp/resolveLocation.ts`
- Test: `src/lib/whatsapp/__tests__/resolveLocation.test.ts`

**Interfaces:**
- Consumes:
  - `matchAreaName(input, options): AreaOption[]` (Task 2)
  - `ConvFields`, `ResolveResult`, `AreaOption`, `AreaLevel` from `./types`
  - DI: `ResolveLocationDeps`:
    ```ts
    export interface ResolveLocationDeps {
      fetchIlListesi: () => Promise<AreaOption[]>
      fetchIlceListesi: (ilId: number) => Promise<AreaOption[]>
      fetchMahalleListesi: (ilceId: number) => Promise<AreaOption[]>
    }
    ```
    (gerçek çağrı sitesi `@/lib/tkgm/idariYapi`'nin `fetchIlListesi`/`fetchIlceListesi`/`fetchMahalleListesi` fonksiyonlarını geçer; `MahalleItem` `AreaOption`'a yapısal uyumlu — `{id,text}` + fazlası)
- Produces: `resolveLocation(fields: ConvFields, deps: ResolveLocationDeps): Promise<ResolveResult>`

**Davranış:**
- `fields.ilText` yoksa → `{ kind:'notfound', level:'il', term:'' }` (çağıran zaten eksik-alan kontrolü yapıyor ama savunmacı)
- il listesi çek → `matchAreaName(ilText, list)`:
  - 0 → `notfound('il', ilText)`
  - \>1 → `ambiguous('il', candidates)` (ilk 3 aday)
  - 1 → `ilId` belli, ilçeye geç
- Aynı mantık ilçe, sonra mahalle. Mahalle 1 aday → `{ kind:'resolved', mahalleId, il, ilce, mahalle }` (isimler eşleşen `AreaOption.text`'ten).
- `fields.ilId` zaten doluysa o adımı atla (kullanıcı belirsizlik seçiminden geçmiş olabilir).

- [ ] **Step 1: Failing test yaz**

```ts
import { resolveLocation, type ResolveLocationDeps } from '../resolveLocation'

const deps = (over: Partial<ResolveLocationDeps> = {}): ResolveLocationDeps => ({
  fetchIlListesi: jest.fn().mockResolvedValue([{ id: 61, text: 'Trabzon' }, { id: 1, text: 'Adana' }]),
  fetchIlceListesi: jest.fn().mockResolvedValue([{ id: 900, text: 'Ortahisar' }, { id: 901, text: 'Akçaabat' }]),
  fetchMahalleListesi: jest.fn().mockResolvedValue([{ id: 5000, text: 'UĞURLU' }, { id: 5001, text: 'UĞURLUOĞLU' }]),
  ...over,
})

describe('resolveLocation', () => {
  it('tam zincir çözülür', async () => {
    const r = await resolveLocation(
      { ilText: 'trabzon', ilceText: 'ortahisar', mahalleText: 'uğurlu', ada: '1', parsel: '2' },
      deps(),
    )
    expect(r).toEqual({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'UĞURLU' })
  })
  it('il eşleşmezse notfound', async () => {
    const r = await resolveLocation({ ilText: 'xyz', ilceText: 'a', mahalleText: 'b' }, deps())
    expect(r).toEqual({ kind: 'notfound', level: 'il', term: 'xyz' })
  })
  it('mahalle çoklu aday → ambiguous', async () => {
    const r = await resolveLocation({ ilText: 'trabzon', ilceText: 'ortahisar', mahalleText: 'uğurl' }, deps())
    expect(r.kind).toBe('ambiguous')
    if (r.kind === 'ambiguous') {
      expect(r.level).toBe('mahalle')
      expect(r.candidates.map(c => c.id).sort()).toEqual([5000, 5001])
    }
  })
  it('ilId zaten doluysa il listesini çekmez', async () => {
    const d = deps()
    await resolveLocation(
      { ilText: 'Trabzon', ilId: 61, ilceText: 'ortahisar', mahalleText: 'uğurlu' },
      d,
    )
    expect(d.fetchIlListesi).not.toHaveBeenCalled()
    expect(d.fetchIlceListesi).toHaveBeenCalledWith(61)
  })
  it('ilçe i/İ farkıyla eşleşir', async () => {
    const d = deps({
      fetchIlceListesi: jest.fn().mockResolvedValue([{ id: 42, text: 'OF' }]),
    })
    const r = await resolveLocation(
      { ilText: 'trabzon', ilceText: 'of', mahalleText: 'uğurlu' },
      d,
    )
    expect(d.fetchMahalleListesi).toHaveBeenCalledWith(42)
    expect(r.kind).toBe('resolved')
  })
})
```

- [ ] **Step 2: Test fail ettiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" resolveLocation`
Expected: FAIL — modül yok

- [ ] **Step 3: Implementasyon yaz**

```ts
import { matchAreaName } from './matchAreaName'
import type { AreaOption, ConvFields, ResolveResult } from './types'

export interface ResolveLocationDeps {
  fetchIlListesi: () => Promise<AreaOption[]>
  fetchIlceListesi: (ilId: number) => Promise<AreaOption[]>
  fetchMahalleListesi: (ilceId: number) => Promise<AreaOption[]>
}

function pick(
  level: 'il' | 'ilce' | 'mahalle',
  term: string,
  options: AreaOption[],
): { ok: true; option: AreaOption } | { ok: false; result: ResolveResult } {
  const m = matchAreaName(term, options)
  if (m.length === 0) return { ok: false, result: { kind: 'notfound', level, term } }
  if (m.length > 1) return { ok: false, result: { kind: 'ambiguous', level, candidates: m.slice(0, 3) } }
  return { ok: true, option: m[0] }
}

export async function resolveLocation(
  fields: ConvFields,
  deps: ResolveLocationDeps,
): Promise<ResolveResult> {
  let ilId = fields.ilId
  let ilText = fields.ilText ?? ''
  if (!ilId) {
    const r = pick('il', ilText, await deps.fetchIlListesi())
    if (!r.ok) return r.result
    ilId = r.option.id
    ilText = r.option.text
  }

  let ilceId = fields.ilceId
  let ilceText = fields.ilceText ?? ''
  if (!ilceId) {
    const r = pick('ilce', ilceText, await deps.fetchIlceListesi(ilId))
    if (!r.ok) return r.result
    ilceId = r.option.id
    ilceText = r.option.text
  }

  const r = pick('mahalle', fields.mahalleText ?? '', await deps.fetchMahalleListesi(ilceId))
  if (!r.ok) return r.result
  return { kind: 'resolved', mahalleId: r.option.id, il: ilText, ilce: ilceText, mahalle: r.option.text }
}
```

- [ ] **Step 4: Test geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" resolveLocation`
Expected: PASS (5 test)

- [ ] **Step 5: `tsc` + commit**

```bash
npx tsc --noEmit
git add src/lib/whatsapp/resolveLocation.ts src/lib/whatsapp/__tests__/resolveLocation.test.ts
git commit -m "feat(wa): resolveLocation — kademeli TKGM fuzzy çözümleme"
```

---

### Task 7: `formatTl` + `renderCard`

**Files:**
- Create: `src/lib/whatsapp/formatTl.ts`
- Create: `src/lib/whatsapp/renderCard.ts`
- Test: `src/lib/whatsapp/__tests__/formatTl.test.ts`
- Test: `src/lib/whatsapp/__tests__/renderCard.test.ts`

**Interfaces:**
- Consumes: `DegerCardDTO` from `@/lib/deger/card` (alanlar: `parcel.{il,ilce,mahalle,ada,parsel,areaSqm}`, `value.{insufficientData,thinData,basis,freeRangeLow,freeRangeHigh,pricePerSqmCoarse}`, `risk.{faultDistanceM,floodQ100,status}`, `comparables.count`)
- Produces:
  - `formatTl(n: number): string` — "2.352.000" (tam) / `formatTlShort(n: number): string` — "2,4M" (≥1e6) veya "850 B" (≥1e4) veya tam
  - `renderCard(dto: DegerCardDTO, siteUrl: string): string`

- [ ] **Step 1: `formatTl` failing test**

```ts
import { formatTl, formatTlShort } from '../formatTl'

describe('formatTl', () => {
  it('binlik ayraç', () => {
    expect(formatTl(2352000)).toBe('2.352.000')
    expect(formatTl(0)).toBe('0')
  })
})
describe('formatTlShort', () => {
  it('milyon kısaltması virgüllü', () => {
    expect(formatTlShort(2352000)).toBe('2,4M')
    expect(formatTlShort(2040000)).toBe('2M')
  })
  it('bin kısaltması', () => {
    expect(formatTlShort(48000)).toBe('48 B')
  })
  it('küçük sayı tam', () => {
    expect(formatTlShort(4900)).toBe('4.900')
  })
})
```

- [ ] **Step 2: fail gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" formatTl`
Expected: FAIL

- [ ] **Step 3: `formatTl.ts` yaz**

```ts
export function formatTl(n: number): string {
  return Math.round(n).toLocaleString('tr-TR')
}

export function formatTlShort(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return (Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', ',')) + 'M'
  }
  if (n >= 10_000) return Math.round(n / 1000) + ' B'
  return formatTl(n)
}
```

- [ ] **Step 4: `formatTl` test geç**

Run: `npx jest --no-coverage --roots "<rootDir>/src" formatTl`
Expected: PASS

- [ ] **Step 5: `renderCard` failing test**

```ts
import { renderCard } from '../renderCard'
import type { DegerCardDTO } from '@/lib/deger/card'

const base: DegerCardDTO = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45', areaSqm: 512, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 3200, floodQ100: false, status: 'ok' },
  value: { tier: 'free', insufficientData: false, basis: 'mahalle', thinData: false, freeRangeLow: 2100000, freeRangeHigh: 2800000, pricePerSqmCoarse: 4900 },
  neighborhood: { geojson: null },
  comparables: { count: 6 },
}
const URL = 'https://www.arsabil.com/deger?mahalleId=1&ada=123&parsel=45'

describe('renderCard', () => {
  it('tam veri: başlık, değer aralığı, ₺/m², risk, emsal, link, placeholder', () => {
    const t = renderCard(base, URL)
    expect(t).toContain('*Uğurlu Mah., Ortahisar / Trabzon*')
    expect(t).toContain('123/45')
    expect(t).toContain('512 m²')
    expect(t).toContain('2,1M – 2,8M ₺')
    expect(t).toContain('4.900 ₺/m²')
    expect(t).toContain('~3,2 km')
    expect(t).toContain('Taşkın (Q100): risk yok')
    expect(t).toContain('emsal ilan: 6')
    expect(t).toContain(URL)
    expect(t).toContain('Yakında:')
  })
  it('insufficientData: değer/₺m² satırı yok, açıklama var', () => {
    const t = renderCard({ ...base, value: { tier: 'free', insufficientData: true } }, URL)
    expect(t).not.toContain('Tahmini değer')
    expect(t).toContain('yeterli ilan verisi yok')
    expect(t).toContain('123/45')
    expect(t).toContain(URL)
  })
  it('thinData: değer satırına "(sınırlı veri)" eklenir', () => {
    const t = renderCard({ ...base, value: { ...base.value, thinData: true } }, URL)
    expect(t).toContain('(sınırlı veri)')
  })
  it('risk unavailable: risk satırı atlanır', () => {
    const t = renderCard({ ...base, risk: { faultDistanceM: null, floodQ100: null, status: 'unavailable' } }, URL)
    expect(t).not.toContain('Deprem')
  })
  it('faultDistanceM null ama status ok: "diri fay verisi yok"', () => {
    const t = renderCard({ ...base, risk: { faultDistanceM: null, floodQ100: true, status: 'ok' } }, URL)
    expect(t).toContain('diri fay verisi yok')
    expect(t).toContain('Taşkın (Q100): risk var')
  })
})
```

- [ ] **Step 6: fail gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" renderCard`
Expected: FAIL — modül yok

- [ ] **Step 7: `renderCard.ts` yaz**

```ts
import type { DegerCardDTO } from '@/lib/deger/card'
import { formatTl, formatTlShort } from './formatTl'

const PLACEHOLDER = 'Yakında: bu mahalledeki fiyat değişimlerini WhatsApp\u2019tan takip edebileceksin.'

function riskLine(risk: DegerCardDTO['risk']): string | null {
  if (risk.status === 'unavailable') return null
  const fault =
    risk.faultDistanceM == null
      ? 'diri fay verisi yok'
      : `diri faya ~${(risk.faultDistanceM / 1000).toFixed(1).replace('.', ',')} km`
  const flood =
    risk.floodQ100 == null ? null : `Taşkın (Q100): ${risk.floodQ100 ? 'risk var' : 'risk yok'}`
  return `\u26a0\ufe0f Deprem: ${fault}${flood ? ' \u00b7 ' + flood : ''}`
}

export function renderCard(dto: DegerCardDTO, siteUrl: string): string {
  const p = dto.parcel
  const v = dto.value
  const lines: string[] = []
  lines.push(`*${p.mahalle} Mah., ${p.ilce} / ${p.il}*`)
  lines.push(`Ada/Parsel: ${p.ada}/${p.parsel} \u00b7 ${formatTl(p.areaSqm)} m\u00b2`)
  lines.push('')

  if (v.insufficientData || v.freeRangeLow == null) {
    lines.push('Bu b\u00f6lgede yeterli ilan verisi yok \u2014 risk ve parsel bilgisi yine de a\u015fa\u011f\u0131da.')
  } else {
    const suffix = v.thinData ? ' _(s\u0131n\u0131rl\u0131 veri)_' : ''
    lines.push(`\ud83d\udcb0 Tahmini de\u011fer: *${formatTlShort(v.freeRangeLow)} \u2013 ${formatTlShort(v.freeRangeHigh!)} \u20ba*${suffix}`)
    if (v.pricePerSqmCoarse != null) {
      lines.push(`\ud83d\udccd ~${formatTl(v.pricePerSqmCoarse)} \u20ba/m\u00b2 (${v.basis ?? 'b\u00f6lge'} geneli)`)
    }
  }

  const rl = riskLine(dto.risk)
  if (rl) lines.push(rl)
  lines.push(`\ud83d\udcca Yak\u0131n emsal ilan: ${dto.comparables.count}`)
  lines.push('')
  lines.push('Detayl\u0131 kart, net de\u011fer tahmini ve kat kar\u015f\u0131l\u0131\u011f\u0131 fizibilitesi i\u00e7in:')
  lines.push(siteUrl)
  lines.push('')
  lines.push(PLACEHOLDER)
  return lines.join('\n')
}
```

- [ ] **Step 8: `renderCard` test geç**

Run: `npx jest --no-coverage --roots "<rootDir>/src" renderCard`
Expected: PASS (5 test). "2,1M – 2,8M" beklentisi: `formatTlShort(2100000)` = `2.1.toFixed(1)` → "2,1M" ✓; `formatTlShort(2800000)` → "2,8M" ✓.

- [ ] **Step 9: `tsc` + commit**

```bash
npx tsc --noEmit
git add src/lib/whatsapp/formatTl.ts src/lib/whatsapp/renderCard.ts src/lib/whatsapp/__tests__/formatTl.test.ts src/lib/whatsapp/__tests__/renderCard.test.ts
git commit -m "feat(wa): renderCard — DegerCardDTO → WhatsApp metni"
```

---

### Task 8: `renderError` (mesaj metinleri)

**Files:**
- Create: `src/lib/whatsapp/renderError.ts`
- Test: `src/lib/whatsapp/__tests__/renderError.test.ts`

**Interfaces:**
- Consumes: `ConvLevel`, `AreaLevel`, `AreaOption`, `ConvFields` from `./types`; `DegerCardResult` reason tipi (`'parcel_not_found' | 'parcel_unavailable'`) from `@/lib/deger/card`
- Produces bir nesne `renderError`:
  ```ts
  export const renderError: {
    help(): string
    textOnly(): string
    askFor(level: ConvLevel, fields: ConvFields): string
    chooseFrom(level: AreaLevel, candidates: AreaOption[]): string
    notFound(level: AreaLevel, term: string, fields: ConvFields): string
    rateLimited(): string
    forCardFailure(reason: 'parcel_not_found' | 'parcel_unavailable'): string
  }
  ```

- [ ] **Step 1: Failing test yaz**

```ts
import { renderError } from '../renderError'

describe('renderError', () => {
  it('help örnek format içerir', () => {
    expect(renderError.help()).toContain('Trabzon Ortahisar Uğurlu 123/45')
  })
  it('textOnly help metnini kapsar', () => {
    expect(renderError.textOnly()).toContain('sadece yazılı')
    expect(renderError.textOnly()).toContain('123/45')
  })
  it('askFor ilçe il adını gömer', () => {
    expect(renderError.askFor('ilce', { ilText: 'Trabzon' })).toBe('Trabzon içinde hangi ilçe?')
  })
  it('askFor ada', () => {
    expect(renderError.askFor('ada', {})).toBe('Ada numarası nedir?')
  })
  it('chooseFrom numaralı liste üretir', () => {
    const t = renderError.chooseFrom('mahalle', [{ id: 1, text: 'Uğurlu' }, { id: 2, text: 'Uğurluoğlu' }])
    expect(t).toContain('1) Uğurlu')
    expect(t).toContain('2) Uğurluoğlu')
  })
  it('notFound ilçe: il + terim', () => {
    expect(renderError.notFound('ilce', 'Xyz', { ilText: 'Trabzon' })).toContain("Trabzon")
    expect(renderError.notFound('ilce', 'Xyz', { ilText: 'Trabzon' })).toContain('Xyz')
  })
  it('forCardFailure ayrımı', () => {
    expect(renderError.forCardFailure('parcel_not_found')).toContain('bulunamadı')
    expect(renderError.forCardFailure('parcel_unavailable')).toContain('ulaşılamıyor')
  })
})
```

- [ ] **Step 2: fail gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" renderError`
Expected: FAIL

- [ ] **Step 3: Implementasyon yaz**

```ts
import type { AreaLevel, AreaOption, ConvFields, ConvLevel } from './types'

const HELP = 'Merhaba! Bir arsan\u0131n de\u011ferini \u00f6\u011frenmek i\u00e7in konumu ve ada/parsel numaras\u0131n\u0131 yaz. \u00d6rnek: `Trabzon Ortahisar U\u011furlu 123/45`'

export const renderError = {
  help: () => HELP,
  textOnly: () => '\u015eimdilik sadece yaz\u0131l\u0131 mesaj anlayabiliyorum. ' + HELP,
  askFor: (level: ConvLevel, fields: ConvFields): string => {
    switch (level) {
      case 'il': return 'Hangi ildeki arsa?'
      case 'ilce': return `${fields.ilText ?? 'Hangi il'} i\u00e7inde hangi il\u00e7e?`
      case 'mahalle': return `${fields.ilceText ?? 'Hangi il\u00e7e'} i\u00e7inde hangi mahalle?`
      case 'ada': return 'Ada numaras\u0131 nedir?'
      case 'parsel': return 'Parsel numaras\u0131 nedir?'
    }
  },
  chooseFrom: (level: AreaLevel, candidates: AreaOption[]): string => {
    const label = level === 'il' ? '\u0130l' : level === 'ilce' ? '\u0130l\u00e7e' : 'Mahalle'
    const list = candidates.map((c, i) => `${i + 1}) ${c.text}`).join('\n')
    return `${label} i\u00e7in birden fazla e\u015fle\u015fme var, hangisi?\n${list}\n(numara veya isim yaz)`
  },
  notFound: (level: AreaLevel, term: string, fields: ConvFields): string => {
    if (level === 'il') return `"${term}" diye bir il bulamad\u0131m. Tekrar yazar m\u0131s\u0131n?`
    if (level === 'ilce') return `${fields.ilText ?? ''} i\u00e7inde "${term}" diye bir il\u00e7e bulamad\u0131m. Tekrar yazar m\u0131s\u0131n?`
    return `${fields.ilceText ?? ''} i\u00e7inde "${term}" diye bir mahalle bulamad\u0131m. Tekrar yazar m\u0131s\u0131n?`
  },
  rateLimited: () => '\u00c7ok fazla sorgu geldi, 1 dakika sonra tekrar dener misin?',
  forCardFailure: (reason: 'parcel_not_found' | 'parcel_unavailable'): string =>
    reason === 'parcel_not_found'
      ? 'Bu ada/parsel TKGM\u2019de bulunamad\u0131. Numaralar\u0131 kontrol edip tekrar yazar m\u0131s\u0131n?'
      : 'Tapu servisine \u015fu an ula\u015f\u0131lam\u0131yor, birazdan tekrar dener misin?',
}
```

- [ ] **Step 4: test geç**

Run: `npx jest --no-coverage --roots "<rootDir>/src" renderError`
Expected: PASS (7 test)

- [ ] **Step 5: `tsc` + commit**

```bash
npx tsc --noEmit
git add src/lib/whatsapp/renderError.ts src/lib/whatsapp/__tests__/renderError.test.ts
git commit -m "feat(wa): renderError — Türkçe kullanıcı mesajları"
```

---

### Task 9: `conversation` (state deposu)

**Files:**
- Create: `src/lib/whatsapp/conversation.ts`
- Test: `src/lib/whatsapp/__tests__/conversation.test.ts`

**Interfaces:**
- Consumes: `ConvState`, `ConvFields` from `./types`
- Produces:
  ```ts
  export const TTL_MS = 30 * 60 * 1000
  export function mergeFields(prev: ConvFields, incoming: Partial<ConvFields>): ConvFields
  export interface ConversationStore {
    loadConversation(phone: string): Promise<{ state: ConvState; lastMessageId: string | null } | null>
    saveConversation(phone: string, state: ConvState, lastMessageId: string): Promise<void>
  }
  export function createPrismaConversationStore(
    db: {
      whatsappConversation: {
        findUnique(a: { where: { phone: string } }): Promise<{ state: unknown; lastMessageId: string | null; updatedAt: Date } | null>
        upsert(a: unknown): Promise<unknown>
      }
    },
    now?: () => number,
  ): ConversationStore
  ```
- `loadConversation`: satır yoksa `null`; `updatedAt` `now - TTL_MS`'den eskiyse `null` (TTL doldu); yoksa `{ state, lastMessageId }`.
- `mergeFields`: `incoming`'in `undefined`/`''`/`0` olmayan alanları `prev`'i ezer; diğerleri `prev`'ten korunur.

- [ ] **Step 1: Failing test yaz**

```ts
import { mergeFields, createPrismaConversationStore, TTL_MS } from '../conversation'

describe('mergeFields', () => {
  it('yeni dolu alanlar eskiyi ezer, boşlar korur', () => {
    const r = mergeFields(
      { ilText: 'Trabzon', ilId: 61, ada: '1' },
      { ilceText: 'Of', ada: undefined },
    )
    expect(r).toEqual({ ilText: 'Trabzon', ilId: 61, ada: '1', ilceText: 'Of' })
  })
  it('ilText değişince alt seviye id\'leri korunur (çağıran temizler)', () => {
    const r = mergeFields({ ilText: 'Trabzon', ilId: 61 }, { ilText: 'Rize' })
    expect(r.ilText).toBe('Rize')
    expect(r.ilId).toBe(61)
  })
})

describe('createPrismaConversationStore', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    state: { fields: { ilText: 'Trabzon' } },
    lastMessageId: 'wamid.X',
    updatedAt: new Date(1_000_000),
    ...over,
  })
  it('taze satır döner', async () => {
    const db = { whatsappConversation: { findUnique: jest.fn().mockResolvedValue(row()), upsert: jest.fn() } }
    const store = createPrismaConversationStore(db as never, () => 1_000_000 + TTL_MS - 1)
    const r = await store.loadConversation('905321234567')
    expect(r?.lastMessageId).toBe('wamid.X')
  })
  it('TTL dolmuşsa null', async () => {
    const db = { whatsappConversation: { findUnique: jest.fn().mockResolvedValue(row()), upsert: jest.fn() } }
    const store = createPrismaConversationStore(db as never, () => 1_000_000 + TTL_MS + 1)
    expect(await store.loadConversation('905321234567')).toBeNull()
  })
  it('satır yoksa null', async () => {
    const db = { whatsappConversation: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() } }
    const store = createPrismaConversationStore(db as never)
    expect(await store.loadConversation('x')).toBeNull()
  })
  it('saveConversation upsert çağırır', async () => {
    const upsert = jest.fn().mockResolvedValue({})
    const db = { whatsappConversation: { findUnique: jest.fn(), upsert } }
    const store = createPrismaConversationStore(db as never)
    await store.saveConversation('905321234567', { fields: { ada: '1' } }, 'wamid.Y')
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone: '905321234567' },
      create: expect.objectContaining({ phone: '905321234567', lastMessageId: 'wamid.Y' }),
      update: expect.objectContaining({ lastMessageId: 'wamid.Y' }),
    }))
  })
})
```

- [ ] **Step 2: fail gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" conversation`
Expected: FAIL

- [ ] **Step 3: Implementasyon yaz**

```ts
import type { ConvFields, ConvState } from './types'

export const TTL_MS = 30 * 60 * 1000

export function mergeFields(prev: ConvFields, incoming: Partial<ConvFields>): ConvFields {
  const out: ConvFields = { ...prev }
  for (const [k, val] of Object.entries(incoming)) {
    if (val !== undefined && val !== '' && val !== 0) {
      ;(out as Record<string, unknown>)[k] = val
    }
  }
  return out
}

export interface ConversationStore {
  loadConversation(phone: string): Promise<{ state: ConvState; lastMessageId: string | null } | null>
  saveConversation(phone: string, state: ConvState, lastMessageId: string): Promise<void>
}

type Db = {
  whatsappConversation: {
    findUnique(a: { where: { phone: string } }): Promise<{ state: unknown; lastMessageId: string | null; updatedAt: Date } | null>
    upsert(a: unknown): Promise<unknown>
  }
}

export function createPrismaConversationStore(db: Db, now: () => number = Date.now): ConversationStore {
  return {
    async loadConversation(phone) {
      const row = await db.whatsappConversation.findUnique({ where: { phone } })
      if (!row) return null
      if (now() - row.updatedAt.getTime() > TTL_MS) return null
      return { state: row.state as ConvState, lastMessageId: row.lastMessageId }
    },
    async saveConversation(phone, state, lastMessageId) {
      await db.whatsappConversation.upsert({
        where: { phone },
        create: { phone, state: state as unknown, lastMessageId },
        update: { state: state as unknown, lastMessageId },
      })
    },
  }
}
```

- [ ] **Step 4: test geç**

Run: `npx jest --no-coverage --roots "<rootDir>/src" conversation`
Expected: PASS (6 test)

- [ ] **Step 5: `tsc` + commit**

```bash
npx tsc --noEmit
git add src/lib/whatsapp/conversation.ts src/lib/whatsapp/__tests__/conversation.test.ts
git commit -m "feat(wa): conversation — Prisma state deposu + mergeFields + TTL"
```

---

### Task 10: `config` + `sendMessage`

**Files:**
- Create: `src/lib/whatsapp/config.ts`
- Create: `src/lib/whatsapp/sendMessage.ts`
- Test: `src/lib/whatsapp/__tests__/sendMessage.test.ts`

**Interfaces:**
- Consumes: `process.env`
- Produces:
  - `config.ts`:
    ```ts
    export interface WhatsappConfig {
      verifyToken: string; appSecret: string; accessToken: string
      phoneNumberId: string; graphVersion: string
    }
    export function readWhatsappConfig(env?: NodeJS.ProcessEnv): WhatsappConfig
    ```
    (eksik zorunlu değişkende `throw new Error('WhatsApp config eksik: <ANAHTAR>')`; `graphVersion` varsayılan `'v21.0'`)
  - `sendMessage.ts`:
    ```ts
    export interface SendDeps { fetch: typeof fetch; config: WhatsappConfig }
    export function createSendText(deps: SendDeps): (to: string, body: string) => Promise<void>
    ```
    (Graph API `POST https://graph.facebook.com/{graphVersion}/{phoneNumberId}/messages`, header `Authorization: Bearer {accessToken}`, gövde `{ messaging_product:'whatsapp', to, type:'text', text:{ body, preview_url:true } }`; yanıt `!ok` ise `console.error` (numarayı maskeleyerek) — throw ETME, `after()` içinde yutulur)

- [ ] **Step 1: `sendMessage` failing test**

```ts
import { createSendText } from '../sendMessage'
import type { WhatsappConfig } from '../config'

const cfg: WhatsappConfig = {
  verifyToken: 'v', appSecret: 's', accessToken: 'TOKEN',
  phoneNumberId: 'PNID', graphVersion: 'v21.0',
}

describe('createSendText', () => {
  it('Graph API\'ye doğru URL + gövde ile POST atar', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
    const send = createSendText({ fetch: fetchMock as never, config: cfg })
    await send('905321234567', 'merhaba')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v21.0/PNID/messages')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer TOKEN')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '905321234567', type: 'text', text: { body: 'merhaba' } })
  })
  it('yanıt ok değilse throw ETMEZ (loglar)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const send = createSendText({ fetch: fetchMock as never, config: cfg })
    await expect(send('905321234567', 'x')).resolves.toBeUndefined()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
  it('fetch reject olsa da throw ETMEZ', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('net'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const send = createSendText({ fetch: fetchMock as never, config: cfg })
    await expect(send('905321234567', 'x')).resolves.toBeUndefined()
    errSpy.mockRestore()
  })
})
```

- [ ] **Step 2: fail gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" sendMessage`
Expected: FAIL

- [ ] **Step 3: `config.ts` yaz**

```ts
export interface WhatsappConfig {
  verifyToken: string
  appSecret: string
  accessToken: string
  phoneNumberId: string
  graphVersion: string
}

export function readWhatsappConfig(env: NodeJS.ProcessEnv = process.env): WhatsappConfig {
  const need = (k: string): string => {
    const v = env[k]
    if (!v) throw new Error(`WhatsApp config eksik: ${k}`)
    return v
  }
  return {
    verifyToken: need('WHATSAPP_VERIFY_TOKEN'),
    appSecret: need('WHATSAPP_APP_SECRET'),
    accessToken: need('WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: need('WHATSAPP_PHONE_NUMBER_ID'),
    graphVersion: env.WHATSAPP_GRAPH_VERSION || 'v21.0',
  }
}
```

- [ ] **Step 4: `sendMessage.ts` yaz**

```ts
import type { WhatsappConfig } from './config'

export interface SendDeps {
  fetch: typeof fetch
  config: WhatsappConfig
}

function mask(phone: string): string {
  return phone.length > 4 ? '***' + phone.slice(-4) : '***'
}

export function createSendText(deps: SendDeps): (to: string, body: string) => Promise<void> {
  const { fetch: f, config } = deps
  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`
  return async (to, body) => {
    try {
      const res = await f(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body, preview_url: true },
        }),
      })
      if (!res.ok) {
        console.error(`[wa] send failed ${res.status} to ${mask(to)}: ${await res.text()}`)
      }
    } catch (e) {
      console.error(`[wa] send error to ${mask(to)}:`, e)
    }
  }
}
```

- [ ] **Step 5: test geç**

Run: `npx jest --no-coverage --roots "<rootDir>/src" sendMessage`
Expected: PASS (3 test)

- [ ] **Step 6: `tsc` + commit**

```bash
npx tsc --noEmit
git add src/lib/whatsapp/config.ts src/lib/whatsapp/sendMessage.ts src/lib/whatsapp/__tests__/sendMessage.test.ts
git commit -m "feat(wa): config okuma + sendMessage (Graph API text)"
```

---

### Task 11: `understanding` (QueryUnderstanding dikişi)

**Files:**
- Create: `src/lib/whatsapp/understanding.ts`
- Test: `src/lib/whatsapp/__tests__/understanding.test.ts`

**Interfaces:**
- Consumes: `extractParcelQuery` (Task 5), `ParsedQuery`, `ConvFields` from `./types`
- Produces:
  ```ts
  export interface QueryUnderstanding {
    understand(text: string, prior: ConvFields): Promise<ParsedQuery>
  }
  export const ruleBasedUnderstanding: QueryUnderstanding
  ```
  (v1: `prior` yok sayılır; `understand` sadece `extractParcelQuery(text)` döner. Akif ileride aynı arayüzü LLM ile sağlar.)

- [ ] **Step 1: Failing test yaz**

```ts
import { ruleBasedUnderstanding } from '../understanding'

describe('ruleBasedUnderstanding', () => {
  it('extractParcelQuery sonucunu döner', async () => {
    const r = await ruleBasedUnderstanding.understand('Trabzon Of 1/2', {})
    expect(r).toEqual({ ilText: 'Trabzon', ilceText: 'Of', ada: '1', parsel: '2' })
  })
  it('prior parametresini yok sayar (v1)', async () => {
    const r = await ruleBasedUnderstanding.understand('5/6', { ilText: 'Rize' })
    expect(r).toEqual({ ada: '5', parsel: '6' })
  })
})
```

- [ ] **Step 2: fail gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" understanding`
Expected: FAIL

- [ ] **Step 3: Implementasyon yaz**

```ts
import { extractParcelQuery } from './extractParcelQuery'
import type { ConvFields, ParsedQuery } from './types'

export interface QueryUnderstanding {
  understand(text: string, prior: ConvFields): Promise<ParsedQuery>
}

export const ruleBasedUnderstanding: QueryUnderstanding = {
  async understand(text: string, _prior: ConvFields): Promise<ParsedQuery> {
    return extractParcelQuery(text)
  },
}
```

- [ ] **Step 4: test geç**

Run: `npx jest --no-coverage --roots "<rootDir>/src" understanding`
Expected: PASS (2 test)

- [ ] **Step 5: commit**

```bash
npx tsc --noEmit
git add src/lib/whatsapp/understanding.ts src/lib/whatsapp/__tests__/understanding.test.ts
git commit -m "feat(wa): QueryUnderstanding arayüzü + kural-tabanlı impl (Akif dikişi)"
```

---

### Task 12: `handleMessage` orkestratör + rate-limit sabiti

**Files:**
- Modify: `src/lib/rate-limit.ts` (`RATE_LIMITS`'e `WHATSAPP_INBOUND` ekle)
- Create: `src/lib/whatsapp/handleMessage.ts`
- Test: `src/lib/whatsapp/__tests__/handleMessage.test.ts`

**Interfaces:**
- Consumes:
  - `InboundMessage`, `ConvState`, `ConvFields`, `ResolveResult` from `./types`
  - `ConversationStore` from `./conversation`, `mergeFields`
  - `QueryUnderstanding` from `./understanding`
  - `resolveLocation`, `ResolveLocationDeps` from `./resolveLocation`
  - `renderCard` from `./renderCard`, `renderError` from `./renderError`
  - `buildDegerCard`, `DegerCardResult`, `DegerCardDeps` from `@/lib/deger/card`
  - `checkRateLimit`, `RATE_LIMITS` from `@/lib/rate-limit`
- Produces:
  ```ts
  export interface HandleDeps {
    store: ConversationStore
    understanding: QueryUnderstanding
    resolveDeps: ResolveLocationDeps
    buildCard: (mahalleId: number, ada: string, parsel: string) => Promise<DegerCardResult>
    sendText: (to: string, body: string) => Promise<void>
    siteUrlFor: (f: { il: string; ilce: string; mahalle: string; mahalleId: number; ada: string; parsel: string }) => string
    checkRateLimit?: typeof import('@/lib/rate-limit').checkRateLimit
  }
  export async function handleMessage(msg: InboundMessage, deps: HandleDeps): Promise<void>
  ```

**Akış (spec §4 — bu sırayı BİREBİR uygula):**
1. Rate limit: `(deps.checkRateLimit ?? checkRateLimit)('wa:' + msg.from, RATE_LIMITS.WHATSAPP_INBOUND)`. `!ok` → `sendText(from, renderError.rateLimited())`, dur.
2. `loaded = await store.loadConversation(msg.from)`. `state = loaded?.state ?? { fields: {} }`.
3. Idempotency: `loaded?.lastMessageId === msg.messageId` → dur.
4. `msg.type !== 'text'` → `sendText(from, renderError.textOnly())`, dur (state kaydetme).
5. `text = msg.text.trim()`. Boş → `sendText(from, renderError.help())`, dur.
6. **Belirsizlik cevabı** (`state.candidates?.length`): kullanıcı girdisini adaylarla eşleştir —
   - `/^\d+$/` ise indeks (`n-1`); yoksa `matchAreaName(text, state.candidates)` tek sonuç.
   - Eşleşme → `state.candidateLevel`'a göre `fields.{ilId,ilText}` / `{ilceId,ilceText}` / `{mahalleId,mahalleText}` doldur, `candidates`/`candidateLevel` temizle. **Adım 7 ve 8'i ATLA, doğrudan adım 10'a (resolve) git.**
   - Eşleşme yok → `sendText(from, renderError.chooseFrom(state.candidateLevel!, state.candidates))`, state değişmeden kaydet (messageId güncelle), dur.
7. **Pending tek alan** (`state.pending` set ve `!state.candidates`): tüm `text` o alanın cevabı —
   - `pending` `'ada'`/`'parsel'` → `/^\d{1,7}$/` ise `fields[pending] = text`; değilse `sendText(askFor(pending, fields))`, dur.
   - `pending` `'il'`/`'ilce'`/`'mahalle'` → `fields['${pending}Text'] = text`, ilgili `*Id` alanını (ve altındaki seviyelerin id/text'lerini) `undefined` yap (yeniden çöz).
   - `state.pending` temizle. **Adım 8'i ATLA (understand çağırma), doğrudan adım 9'a (eksik alan kontrolü) git.**
8. **Normal anlama:** `parsed = await understanding.understand(text, state.fields)`; `fields = mergeFields(state.fields, parsed)`.
   - Not: `parsed.ilText` `state.fields.ilText`'ten farklıysa `fields.ilId = undefined` (ilçe/mahalle id'leri de) — konum değişti, yeniden çöz. Aynı şekilde `ilceText` değişince `ilceId=undefined, mahalleId=undefined`.
9. **Eksik alan:** sıra `['il','ilce','mahalle','ada','parsel']`. İlk `fields` karşılığı boş olan `L` (`ilText`/`ilceText`/`mahalleText`/`ada`/`parsel`) → `sendText(from, renderError.askFor(L, fields))`; `save({ pending: L, fields })`, dur.
10. **Resolve:** `r = await resolveLocation(fields, deps.resolveDeps)`.
    - `ambiguous` → `save({ candidates: r.candidates, candidateLevel: r.level, fields })`; `sendText(chooseFrom(r.level, r.candidates))`, dur.
    - `notfound` → o seviyeyi + altını `fields`'ten temizle (`{level}Text`, `{level}Id`, ve altındaki seviyeler); `save({ pending: r.level, fields })`; `sendText(notFound(r.level, r.term, fields))`, dur.
    - `resolved` → `fields.ilId`? (bilинmiyorsa isim yeter) `fields.mahalleId = r.mahalleId`, `fields.ilText=r.il`, `fields.ilceText=r.ilce`, `fields.mahalleText=r.mahalle`.
11. **Kart:** `res = await buildCard(fields.mahalleId!, fields.ada!, fields.parsel!)`.
    - `!res.ok` → `sendText(forCardFailure(res.reason))`; `parcel_not_found` ise `fields.ada=undefined, fields.parsel=undefined`, `save({ pending:'ada', fields })`; değilse `save({ fields })`. dur.
    - `res.ok` → `sendText(renderCard(res.card, deps.siteUrlFor({ il:fields.ilText!, ilce:fields.ilceText!, mahalle:fields.mahalleText!, mahalleId:fields.mahalleId!, ada:fields.ada!, parsel:fields.parsel! })))`.
12. `save({ fields })` (pending/candidates yok).

Her `save` çağrısı `store.saveConversation(msg.from, state, msg.messageId)` demektir.

- [ ] **Step 1: rate-limit sabitini ekle**

`src/lib/rate-limit.ts` `RATE_LIMITS` nesnesine (son satırlardan biri olarak):

```ts
    WHATSAPP_INBOUND: { limit: 10, windowMs: 60_000 }, // telefon başına 10/dk
```

- [ ] **Step 2: Failing test yaz**

`src/lib/whatsapp/__tests__/handleMessage.test.ts`:

```ts
import { handleMessage, type HandleDeps } from '../handleMessage'
import type { InboundMessage } from '../types'

const CARD_OK = {
  ok: true as const,
  card: {
    parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
    risk: { faultDistanceM: 3200, floodQ100: false, status: 'ok' as const },
    value: { tier: 'free' as const, insufficientData: false, basis: 'mahalle' as const, thinData: false, freeRangeLow: 2000000, freeRangeHigh: 2500000, pricePerSqmCoarse: 4000 },
    neighborhood: { geojson: null },
    comparables: { count: 3 },
  },
}

function makeDeps(over: Partial<HandleDeps> = {}): { deps: HandleDeps; sent: string[]; saved: unknown[] } {
  const sent: string[] = []
  const saved: unknown[] = []
  const deps: HandleDeps = {
    store: {
      loadConversation: jest.fn().mockResolvedValue(null),
      saveConversation: jest.fn().mockImplementation(async (_p, s) => { saved.push(s) }),
    },
    understanding: { understand: jest.fn().mockResolvedValue({ ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu', ada: '123', parsel: '45' }) },
    resolveDeps: {} as never,
    buildCard: jest.fn().mockResolvedValue(CARD_OK),
    sendText: jest.fn().mockImplementation(async (_to: string, b: string) => { sent.push(b) }),
    siteUrlFor: () => 'https://www.arsabil.com/deger?x=1',
    checkRateLimit: jest.fn().mockReturnValue({ ok: true }),
    ...over,
  }
  // resolveLocation gerçek modül; resolveDeps'i onun beklediği şekilde sahle
  return { deps, sent, saved }
}

const msg = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  from: '905321234567', text: 'Trabzon Ortahisar Uğurlu 123/45',
  messageId: 'wamid.1', timestamp: 1, type: 'text', ...over,
})

jest.mock('../resolveLocation', () => ({
  resolveLocation: jest.fn().mockResolvedValue({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' }),
}))
import { resolveLocation } from '../resolveLocation'

describe('handleMessage', () => {
  beforeEach(() => { (resolveLocation as jest.Mock).mockResolvedValue({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' }) })

  it('tam sorgu → kart mesajı gönderir', async () => {
    const { deps, sent } = makeDeps()
    await handleMessage(msg(), deps)
    expect(deps.buildCard).toHaveBeenCalledWith(5000, '123', '45')
    expect(sent.join('')).toContain('Uğurlu Mah., Ortahisar / Trabzon')
  })

  it('eksik ilçe → soru sorar ve pending kaydeder', async () => {
    const { deps, sent, saved } = makeDeps({
      understanding: { understand: jest.fn().mockResolvedValue({ ilText: 'Trabzon', ada: '1', parsel: '2' }) },
    })
    await handleMessage(msg({ text: 'Trabzon 1/2' }), deps)
    expect(sent[0]).toContain('hangi ilçe')
    expect(saved[0]).toMatchObject({ pending: 'ilce' })
    expect(deps.buildCard).not.toHaveBeenCalled()
  })

  it('belirsiz mahalle → seçim ister, sonra numara ile çözer', async () => {
    ;(resolveLocation as jest.Mock)
      .mockResolvedValueOnce({ kind: 'ambiguous', level: 'mahalle', candidates: [{ id: 5000, text: 'Uğurlu' }, { id: 5001, text: 'Uğurluoğlu' }] })
      .mockResolvedValueOnce({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
    const load = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ state: { candidates: [{ id: 5000, text: 'Uğurlu' }, { id: 5001, text: 'Uğurluoğlu' }], candidateLevel: 'mahalle', fields: { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'uğur', ada: '1', parsel: '2' } }, lastMessageId: 'wamid.1' })
    const { deps, sent } = makeDeps({
      store: { loadConversation: load, saveConversation: jest.fn() },
      understanding: { understand: jest.fn().mockResolvedValue({ ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'uğur', ada: '1', parsel: '2' }) },
    })
    await handleMessage(msg({ messageId: 'wamid.1' }), deps)
    expect(sent[0]).toContain('1) Uğurlu')
    await handleMessage(msg({ text: '1', messageId: 'wamid.2' }), deps)
    expect(sent[1]).toContain('Uğurlu Mah.')
  })

  it('idempotent retry (aynı messageId) → hiçbir şey yapmaz', async () => {
    const { deps, sent } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({ state: { fields: {} }, lastMessageId: 'wamid.1' }),
        saveConversation: jest.fn(),
      },
    })
    await handleMessage(msg({ messageId: 'wamid.1' }), deps)
    expect(sent).toEqual([])
    expect(deps.sendText).not.toHaveBeenCalled()
  })

  it('non-text → "sadece yazı" mesajı, state kaydetmez', async () => {
    const { deps, sent } = makeDeps()
    await handleMessage(msg({ type: 'other', text: '' }), deps)
    expect(sent[0]).toContain('sadece yazılı')
    expect(deps.store.saveConversation).not.toHaveBeenCalled()
  })

  it('rate limit aşıldı → uyarı, başka iş yok', async () => {
    const { deps, sent } = makeDeps({ checkRateLimit: jest.fn().mockReturnValue({ ok: false, retryAfterSec: 30 }) })
    await handleMessage(msg(), deps)
    expect(sent[0]).toContain('Çok fazla sorgu')
    expect(deps.understanding.understand).not.toHaveBeenCalled()
  })

  it('parcel_not_found → ada/parsel sıfırlar, pending ada', async () => {
    const { deps, sent, saved } = makeDeps({
      buildCard: jest.fn().mockResolvedValue({ ok: false, reason: 'parcel_not_found' }),
    })
    await handleMessage(msg(), deps)
    expect(sent[0]).toContain('bulunamadı')
    expect(saved[saved.length - 1]).toMatchObject({ pending: 'ada' })
  })
})
```

- [ ] **Step 3: Test fail ettiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" handleMessage`
Expected: FAIL — modül yok

- [ ] **Step 4: `handleMessage.ts` yaz**

Yukarıdaki "Akış" bölümündeki 12 adımı birebir uygula. İskelet:

```ts
import type { InboundMessage, ConvState, ConvFields, ConvLevel } from './types'
import type { ConversationStore } from './conversation'
import { mergeFields } from './conversation'
import type { QueryUnderstanding } from './understanding'
import { resolveLocation, type ResolveLocationDeps } from './resolveLocation'
import { matchAreaName } from './matchAreaName'
import { renderCard } from './renderCard'
import { renderError } from './renderError'
import type { DegerCardResult } from '@/lib/deger/card'
import { checkRateLimit as defaultCheckRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export interface HandleDeps {
  store: ConversationStore
  understanding: QueryUnderstanding
  resolveDeps: ResolveLocationDeps
  buildCard: (mahalleId: number, ada: string, parsel: string) => Promise<DegerCardResult>
  sendText: (to: string, body: string) => Promise<void>
  siteUrlFor: (f: { il: string; ilce: string; mahalle: string; mahalleId: number; ada: string; parsel: string }) => string
  checkRateLimit?: typeof defaultCheckRateLimit
}

const ORDER: { level: ConvLevel; key: keyof ConvFields }[] = [
  { level: 'il', key: 'ilText' },
  { level: 'ilce', key: 'ilceText' },
  { level: 'mahalle', key: 'mahalleText' },
  { level: 'ada', key: 'ada' },
  { level: 'parsel', key: 'parsel' },
]

export async function handleMessage(msg: InboundMessage, deps: HandleDeps): Promise<void> {
  const check = deps.checkRateLimit ?? defaultCheckRateLimit
  const save = (state: ConvState) => deps.store.saveConversation(msg.from, state, msg.messageId)

  if (!check('wa:' + msg.from, RATE_LIMITS.WHATSAPP_INBOUND).ok) {
    await deps.sendText(msg.from, renderError.rateLimited())
    return
  }

  const loaded = await deps.store.loadConversation(msg.from)
  if (loaded && loaded.lastMessageId === msg.messageId) return
  const state: ConvState = loaded?.state ?? { fields: {} }

  if (msg.type !== 'text') {
    await deps.sendText(msg.from, renderError.textOnly())
    return
  }
  const text = msg.text.trim()
  if (!text) {
    await deps.sendText(msg.from, renderError.help())
    return
  }

  // ... adım 6-12 (Akış bölümüne göre) ...
}
```

Kalan adımları yaz. Dikkat noktaları:
- Adım 6 belirsizlik ve adım 7 pending, `understand` çağrısından ÖNCE.
- `notfound` temizliğinde alt seviyeler: `il` → hepsi; `ilce` → ilce+mahalle; `mahalle` → sadece mahalle.
- Adım 9'da "boş" tanımı: `undefined || '' `. `ada`/`parsel` string.
- Resolve `resolved` sonrası isim alanlarını `r`'den güncelle; sonra kartı çağır.

- [ ] **Step 5: Test geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" handleMessage`
Expected: PASS (7 test)

- [ ] **Step 6: Tüm whatsapp süiti + `tsc`**

Run: `npx jest --no-coverage --roots "<rootDir>/src" whatsapp && npx tsc --noEmit`
Expected: tüm whatsapp testleri PASS, tsc temiz

- [ ] **Step 7: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/whatsapp/handleMessage.ts src/lib/whatsapp/__tests__/handleMessage.test.ts
git commit -m "feat(wa): handleMessage orkestratör + WHATSAPP_INBOUND rate limit"
```

---

### Task 13: Webhook route (`GET` + `POST`)

**Files:**
- Create: `src/app/api/whatsapp/webhook/route.ts`
- Test: `src/app/api/whatsapp/webhook/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `readWhatsappConfig` (Task 10), `verifySignature` (Task 3), `parseInbound` (Task 4), `handleMessage`+`HandleDeps` (Task 12), `createPrismaConversationStore` (Task 9), `ruleBasedUnderstanding` (Task 11), `createSendText` (Task 10), `buildDegerCard` from `@/lib/deger/card`, `fetchParcelByAdaParsel`/`fetchParcelByPoint` from `@/lib/tkgm/parcel`, `buildRiskSnapshot` from `@/lib/risk/riskSnapshot`, `fetchIlListesi`/`fetchIlceListesi`/`fetchMahalleListesi` from `@/lib/tkgm/idariYapi`, `prisma` from `@/lib/prisma`, `after` from `next/server`
- Produces: `GET(req: Request)`, `POST(req: Request)` — Next.js route handlers

**Davranış:**
- `GET`: `?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y` — token eşleşirse `new Response(challenge, { status: 200 })` (plain text); yoksa `new Response('forbidden', { status: 403 })`.
- `POST`:
  1. `raw = await req.text()`
  2. `verifySignature(raw, config.appSecret, req.headers.get('x-hub-signature-256'))` — false → `403`
  3. `parseInbound(JSON.parse(raw))` (parse hatası → `200` boş; Meta'ya 5xx dönme)
  4. Her mesaj için `after(() => handleMessage(m, buildHandleDeps()).catch(e => console.error('[wa] handle', e)))`
  5. `new Response('ok', { status: 200 })`
- `buildHandleDeps()`: gerçek bağımlılıkları bağlar —
  - `store: createPrismaConversationStore(prisma)`
  - `understanding: ruleBasedUnderstanding`
  - `resolveDeps: { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi }`
  - `buildCard: (mahalleId, ada, parsel) => buildDegerCard({ kind:'adaParsel', mahalleId, ada, parsel }, cardDeps, { memberView: false })`
    - `cardDeps` = `/api/deger/kart/route.ts`'deki anonim `deps` nesnesinin AYNISI ama `userId` YOK: `findAreaTrend` her zaman `[]` döner (üye değil). `findAreaStats`/`findListingsNear`/`findNeighborhood` birebir kopyalanır (route.ts'ten). **DRY notu:** bu deps nesnesi route.ts ile paylaşılabilir olsaydı iyi olurdu ama kapsam-dışı; şimdilik kopyala, `// NOTE: /api/deger/kart ile paralel — 5b'de ortak modüle çıkarılabilir` yorumu ekle.
  - `sendText: createSendText({ fetch, config })`
  - `siteUrlFor: (f) => \`https://www.arsabil.com/deger?mahalleId=${f.mahalleId}&ada=${encodeURIComponent(f.ada)}&parsel=${encodeURIComponent(f.parsel)}\``
- `export const runtime = 'nodejs'` (crypto + prisma).

- [ ] **Step 1: Failing test yaz**

```ts
const handleMessageMock = jest.fn()
const verifySignatureMock = jest.fn()
const afterMock = jest.fn((cb: () => void) => cb())

jest.mock('next/server', () => ({ after: (cb: () => void) => afterMock(cb) }))
jest.mock('@/lib/whatsapp/config', () => ({
  readWhatsappConfig: () => ({ verifyToken: 'VT', appSecret: 'AS', accessToken: 'AT', phoneNumberId: 'PN', graphVersion: 'v21.0' }),
}))
jest.mock('@/lib/whatsapp/verifySignature', () => ({ verifySignature: (...a: unknown[]) => verifySignatureMock(...a) }))
jest.mock('@/lib/whatsapp/handleMessage', () => ({ handleMessage: (...a: unknown[]) => handleMessageMock(...a) }))
jest.mock('@/lib/prisma', () => ({ prisma: {} }))
jest.mock('@/lib/deger/card', () => ({ buildDegerCard: jest.fn() }))
jest.mock('@/lib/tkgm/parcel', () => ({ fetchParcelByAdaParsel: jest.fn(), fetchParcelByPoint: jest.fn() }))
jest.mock('@/lib/tkgm/idariYapi', () => ({ fetchIlListesi: jest.fn(), fetchIlceListesi: jest.fn(), fetchMahalleListesi: jest.fn() }))
jest.mock('@/lib/risk/riskSnapshot', () => ({ buildRiskSnapshot: jest.fn() }))

import { GET, POST } from '../route'

const textBody = JSON.stringify({
  entry: [{ changes: [{ value: { messages: [{ from: '905321234567', id: 'wamid.1', timestamp: '1', type: 'text', text: { body: 'Trabzon Of 1/2' } }] } }] }],
})

describe('GET /api/whatsapp/webhook', () => {
  it('doğru verify_token → challenge 200', async () => {
    const res = await GET(new Request('http://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=VT&hub.challenge=42'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('42')
  })
  it('yanlış token → 403', async () => {
    const res = await GET(new Request('http://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=42'))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/whatsapp/webhook', () => {
  beforeEach(() => { handleMessageMock.mockReset(); verifySignatureMock.mockReset() })
  it('geçersiz imza → 403, handleMessage çağrılmaz', async () => {
    verifySignatureMock.mockReturnValue(false)
    const res = await POST(new Request('http://x', { method: 'POST', body: textBody, headers: { 'x-hub-signature-256': 'sha256=bad' } }))
    expect(res.status).toBe(403)
    expect(handleMessageMock).not.toHaveBeenCalled()
  })
  it('geçerli imza → 200 + handleMessage (after ile) çağrılır', async () => {
    verifySignatureMock.mockReturnValue(true)
    const res = await POST(new Request('http://x', { method: 'POST', body: textBody, headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
    expect(afterMock).toHaveBeenCalled()
    expect(handleMessageMock).toHaveBeenCalledTimes(1)
    expect(handleMessageMock.mock.calls[0][0]).toMatchObject({ from: '905321234567', messageId: 'wamid.1', type: 'text' })
  })
  it('bozuk JSON gövde → 200 (Meta retry fırtınası olmasın), handleMessage yok', async () => {
    verifySignatureMock.mockReturnValue(true)
    const res = await POST(new Request('http://x', { method: 'POST', body: 'not json', headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
    expect(handleMessageMock).not.toHaveBeenCalled()
  })
  it('handleMessage reject olsa da POST 200 döner', async () => {
    verifySignatureMock.mockReturnValue(true)
    handleMessageMock.mockRejectedValue(new Error('boom'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(new Request('http://x', { method: 'POST', body: textBody, headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Test fail ettiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" whatsapp/webhook`
Expected: FAIL — route yok

- [ ] **Step 3: `route.ts` yaz**

"Davranış" bölümüne göre. İskelet:

```ts
import { after } from 'next/server'
import { readWhatsappConfig } from '@/lib/whatsapp/config'
import { verifySignature } from '@/lib/whatsapp/verifySignature'
import { parseInbound } from '@/lib/whatsapp/parseInbound'
import { handleMessage, type HandleDeps } from '@/lib/whatsapp/handleMessage'
import { createPrismaConversationStore } from '@/lib/whatsapp/conversation'
import { ruleBasedUnderstanding } from '@/lib/whatsapp/understanding'
import { createSendText } from '@/lib/whatsapp/sendMessage'
import { buildDegerCard, type AreaStatRecord } from '@/lib/deger/card'
import { fetchParcelByAdaParsel, fetchParcelByPoint } from '@/lib/tkgm/parcel'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from '@/lib/tkgm/idariYapi'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'
import { prisma } from '@/lib/prisma'
import type { ComparableListing } from '@/lib/deger/comparables'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const config = readWhatsappConfig()
  const u = new URL(req.url)
  if (
    u.searchParams.get('hub.mode') === 'subscribe' &&
    u.searchParams.get('hub.verify_token') === config.verifyToken
  ) {
    return new Response(u.searchParams.get('hub.challenge') ?? '', { status: 200 })
  }
  return new Response('forbidden', { status: 403 })
}

function buildHandleDeps(): HandleDeps {
  const config = readWhatsappConfig()
  // NOTE: /api/deger/kart ile paralel deps — 5b'de ortak modüle çıkarılabilir.
  const cardDeps = {
    fetchParcelByPoint,
    fetchParcelByAdaParsel,
    buildRiskSnapshot,
    findAreaStats: async (il: string, ilce: string, mahalle: string): Promise<AreaStatRecord[]> => {
      const rows = await prisma.areaPriceStat.findMany({
        where: { il, OR: [{ ilce: null, mahalle: null }, { ilce, mahalle: null }, { ilce, mahalle }] },
        select: { scope: true, medianPricePerSqm: true, p25: true, p75: true, sampleCount: true },
      })
      return rows as AreaStatRecord[]
    },
    findAreaTrend: async () => [],
    findListingsNear: async (il: string, ilce: string): Promise<ComparableListing[]> => {
      const rows = await prisma.marketListing.findMany({
        where: { status: 'active', lat: { not: null }, lng: { not: null }, listingType: { in: [...ARSA_LISTING_TYPES] } },
        select: {
          id: true, pricePerSqm: true, areaSqm: true, price: true, lat: true, lng: true,
          geoPrecision: true, listedAt: true, source: true, sourceUrl: true, listingType: true, il: true, ilce: true,
        },
        orderBy: [{ listedAt: 'desc' }, { id: 'asc' }],
        take: 2000,
      })
      return rows.filter(
        (r) => r.il != null && r.ilce != null && normalizeAreaName(r.il) === il && normalizeAreaName(r.ilce) === ilce,
      ) as unknown as ComparableListing[]
    },
    findNeighborhood: async (il: string, ilce: string, mahalle: string) => {
      const row = await prisma.neighborhood.findUnique({
        where: { il_ilce_mahalle: { il, ilce, mahalle } },
        select: { geojson: true },
      })
      return row ? { geojson: row.geojson as unknown } : null
    },
  }
  return {
    store: createPrismaConversationStore(prisma),
    understanding: ruleBasedUnderstanding,
    resolveDeps: { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi },
    buildCard: (mahalleId, ada, parsel) =>
      buildDegerCard({ kind: 'adaParsel', mahalleId, ada, parsel }, cardDeps, { memberView: false }),
    sendText: createSendText({ fetch, config }),
    siteUrlFor: (f) =>
      `https://www.arsabil.com/deger?mahalleId=${f.mahalleId}&ada=${encodeURIComponent(f.ada)}&parsel=${encodeURIComponent(f.parsel)}`,
  }
}

export async function POST(req: Request): Promise<Response> {
  const config = readWhatsappConfig()
  const raw = await req.text()
  if (!verifySignature(raw, config.appSecret, req.headers.get('x-hub-signature-256'))) {
    return new Response('forbidden', { status: 403 })
  }
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('ok', { status: 200 })
  }
  const messages = parseInbound(payload)
  for (const m of messages) {
    after(() => handleMessage(m, buildHandleDeps()).catch((e) => console.error('[wa] handle', e)))
  }
  return new Response('ok', { status: 200 })
}
```

- [ ] **Step 4: Test geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" whatsapp/webhook`
Expected: PASS (7 test)

- [ ] **Step 5: `tsc` + build**

Run: `npx tsc --noEmit && npm run build`
Expected: temiz. (Build sırasında route `/api/whatsapp/webhook` listede görünür. Build env değişkenleri istemiyor — `readWhatsappConfig` yalnız çağrıldığında throw eder, modül seviyesinde değil.)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/whatsapp/webhook
git commit -m "feat(wa): webhook route — GET doğrulama + POST imza + after(handleMessage)"
```

---

### Task 14: `/deger` deep-link param desteği

**Files:**
- Modify: `src/app/deger/page.tsx` (init `useEffect` — `mahalleId`/`ada`/`parsel` paramlarını da oku; `fetchCard`'a ada/parsel varyantı ekle)
- Test: `src/app/deger/page.test.tsx` (mevcut dosyaya yeni test)

**Interfaces:**
- Consumes: `/api/deger/kart?mahalleId=&ada=&parsel=` (zaten var, route.ts destekliyor)
- Produces: `/deger?mahalleId=X&ada=Y&parsel=Z` URL'i açılınca otomatik kart getirme

**Mevcut durum:** `page.tsx` init effect'i (satır ~67-77) yalnız `lat`/`lng` okuyor. `fetchCard(lat, lng)` sadece nokta destekliyor.

- [ ] **Step 1: `useSearchParams` mock'unu mutable yap + failing test**

Mevcut mock (dosya başı) sabit `new URLSearchParams('')` döndürüyor. Mutable değişkene çevir (mevcut testler bozulmaz — varsayılan boş):

```ts
let searchParamsValue = new URLSearchParams('')
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  useSearchParams: () => searchParamsValue,
}))
```

`beforeEach` içine `searchParamsValue = new URLSearchParams('')` ekle (test izolasyonu).

Yeni test (dosya sonuna):

```ts
it('?mahalleId&ada&parsel ile açılınca kartı otomatik getirir', async () => {
  searchParamsValue = new URLSearchParams('mahalleId=5000&ada=12&parsel=3')
  render(<DegerPage />)
  await waitFor(() => expect(screen.getByText(/Tahmini Değer Aralığı/i)).toBeInTheDocument())
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
    '/api/deger/kart?mahalleId=5000&ada=12&parsel=3',
  )
  expect(replaceMock).toHaveBeenCalledWith('/deger?mahalleId=5000&ada=12&parsel=3')
})

it('mahalleId sayı değilse deep-link tetiklenmez', async () => {
  searchParamsValue = new URLSearchParams('mahalleId=abc&ada=12&parsel=3')
  render(<DegerPage />)
  await new Promise((r) => setTimeout(r, 0))
  expect(global.fetch as jest.Mock).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Test fail ettiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" deger/page`
Expected: FAIL — kart gelmiyor (init effect bu paramları okumuyor)

- [ ] **Step 3: `page.tsx`'i düzenle**

`fetchCard`'ı genişlet veya yeni bir `fetchCardByAdaParsel` ekle:

```ts
const fetchCardQs = useCallback(
  async (qs: string) => {
    setError(null); setPending(true)
    try {
      const res = await fetch(`/api/deger/kart?${qs}`)
      if (!res.ok) { setCard(null); setError(ERR[res.status] ?? 'Beklenmeyen bir hata oluştu.'); return }
      const json = (await res.json()) as DegerCardDTO
      setCard(json); setParcelQuery(qs); router.replace(`/deger?${qs}`)
    } catch { setCard(null); setError('Bağlantı hatası, tekrar deneyin.') }
    finally { setPending(false) }
  },
  [router],
)
```

`fetchCard(lat, lng)` bunu `fetchCardQs(\`lat=${lat}&lng=${lng}\`)` ile çağırsın (DRY). Init effect'e ekle:

```ts
const mahalleId = searchParams.get('mahalleId')
const ada = searchParams.get('ada')
const parsel = searchParams.get('parsel')
if (mahalleId && ada && parsel && /^\d+$/.test(mahalleId)) {
  void fetchCardQs(`mahalleId=${mahalleId}&ada=${encodeURIComponent(ada)}&parsel=${encodeURIComponent(parsel)}`)
  return
}
// mevcut lat/lng bloğu...
```

`didInitFetch` guard'ını koru. `useEffect` dep array'ine `fetchCardQs` ekle.

- [ ] **Step 4: Test geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" deger/page`
Expected: PASS — mevcut testler + yeni test

- [ ] **Step 5: `tsc` + build + tam whatsapp süiti**

Run: `npx tsc --noEmit && npm run build && npx jest --no-coverage --roots "<rootDir>/src" "whatsapp|deger"`
Expected: hepsi temiz/PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/deger/page.tsx src/app/deger/page.test.tsx
git commit -m "feat(deger): ?mahalleId&ada&parsel deep-link desteği (WhatsApp botu için)"
```

---

## Final doğrulama (tüm task'lar bitince)

- [ ] `npx tsc --noEmit` — temiz
- [ ] `npx jest --no-coverage --roots "<rootDir>/src"` — TÜM proje yeşil (yalnız whatsapp değil; regresyon kontrolü)
- [ ] `npm run build` — temiz, `/api/whatsapp/webhook` route çıktıda görünür
- [ ] `.env.example` / README'ye 5 env değişkeni notu eklendi mi (Task dışı küçük ekleme — controller yapar): `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_VERSION`
- [ ] Migration `20260901090000_add_whatsapp_conversation` dev DB'de uygulandı, prod'da BEKLEMEDE (deploy fazında diğer bekleyen migration'larla)
- [ ] Whole-branch review (subagent-driven-development'ın final review adımı)

**Deploy DIŞI bırakılır** — [[project_arsabil_edermi_rakip]] planına göre 5a/5b/6b/6c hepsi lokal bitince tek seferde `main` merge + push + Coolify + migration'lar + Meta kurulumu.

## v1 kalıntıları (ledger'a)

- `buildHandleDeps` içindeki `cardDeps` `/api/deger/kart/route.ts` ile kopya — 5b'de ortak `src/lib/deger/anonCardDeps.ts`'e çıkarılmalı.
- Bellek-içi rate limiter + `after()` tek-instance varsayımı (ArsaBil tek container — sorun değil, yatay ölçeklemede Redis).
- `extractParcelQuery` kaba; çok kelimeli ilçe/mahalle adlarında ("Şalpazarı Merkez") yanlış bölebilir — `resolveLocation` notfound→sor ağı yakalar, gerçek trafikle ayarlanır.
- Konuşma state'i eski satırlar silinmiyor (yalnız üzerine yazılıyor) — `phone @unique` olduğu için sınırlı; ileride cleanup cron'u 5b ile.
