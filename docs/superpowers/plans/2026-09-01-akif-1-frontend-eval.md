# Akif-1 Metin MVP — Frontend + Eval (Plan 2/2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Akif-1'in kullanıcı yüzünü kur — `/akif` metin sohbet sayfası (`AkifTurn` sonucunu konuşma balonu + varsayım rozetleri + senaryo tablosu + sayı-onay satırı olarak render eder), anasayfa giriş kutusu, ve gerçek API'ye vuran elle çalıştırılan kalite eval harness'i (`npm run akif:eval`).

**Architecture:** Sunucu tarafı (Plan 1/2) bitti ve `codex/professional-ui-and-land-cost`'ta merge'li — `POST /api/akif/turn` çalışır durumda (`OPENAI_API_KEY` verilince). Bu plan yalnız client: `src/components/akif/` altında saf/sunum bileşenleri (state yok — hepsi prop alır), `src/app/akif/page.tsx` sohbet state'ini + `fetch` çağrısını sahiplenir (stateless — sayfa yenilenince sohbet sıfırlanır, kalıcı hafıza = Akif-3). Eval katmanı: saf `scoreFixture` + fixture tablosu jest'te; gerçek-API döngüsü `scripts/akif-eval.ts` (ts-node, elle, bütçe guard'lı, CI'da KOŞMAZ).

**Tech Stack:** Next.js 16 (App Router, `'use client'`), React 19, CSS Modules (düz CSS, sabit renkler — mevcut `/deger` deseni), Jest + ts-jest + `@testing-library/react` (jsdom), `openai` npm paketi (yalnız eval script'inde `new OpenAI()`), ts-node (eval script).

**Spec:** `docs/superpowers/specs/2026-08-31-akif-1-metin-mvp-design.md` (§6 route+sayfa, §9 eval)

**Plan 1/2 (bitti):** `docs/superpowers/plans/2026-08-31-akif-1-backend.md` — `src/lib/ai/akif/` (contract, orchestrator, gateway, openaiClient, audit, costGuard, prompts) + `src/app/api/akif/turn/route.ts` + `AkifTurnLog` migration. HEAD `2734b72`.

## Global Constraints

- **zod YOK.** Gelen `AkifTurn` sunucuda `parseAkifTurn` ile doğrulanmış hâlde döner; client tipi `@/lib/ai/akif/contract`'tan import eder, ayrıca doğrulama YAPMAZ (savunmacı `?.` / `?? []` yeter).
- **Kullanıcıya giden tüm metin Türkçe.** Kod identifier İngilizce.
- **Sunucu stateless.** Sohbet geçmişi client state'te tutulur, her turda `/api/akif/turn`'e yeniden gönderilir. Kalıcılık YOK (Akif-3).
- **Tasarım dili:** mevcut `/deger` sayfası + `src/components/deger/DegerKarti.module.css` ile tutarlı — beyaz kart, `1px solid #e5e5e7` kenar, `border-radius: 16px`, ikincil metin `#6e6e73`, vurgu mavi `#0a5cff`, `font-variant-numeric: tabular-nums` sayısal değerlerde, rozetler `border-radius: 999px` + `background: #f0f0f2`. CSS Modules, sabit renkler (proje bu sayfalarda token kullanmıyor). `.mGlass`/liquid-glass KULLANMA — bu sayfa sakin veri yüzeyi.
- **Bileşenler saf/sunum.** `src/components/akif/*` HİÇBİRİ `fetch`/`useEffect`-yan-etki/`useState` (yerel UI toggle hariç) içermez. Tüm veri + geri çağrılar prop.
- **Para biçimi:** yerel `const tl = (n: number) => \`${n.toLocaleString('tr-TR')} ₺\`` (DegerKarti deseni — `formatTRCurrency`'nin `,00` ondalığı bu bağlamda gürültü). Ondalık YOK.
- **Test:** her bileşen dosyası `/** @jest-environment jsdom */` + `@testing-library/react`. Jest testMatch varsayılan (`**/__tests__/**` + `*.test.ts(x)`) — `__evals__/` altındaki `.ts` dosyaları (`.test` değil) jest tarafından TOPLANMAZ, yalnız `tsc` kontrol eder.
- Her task: `npx tsc --noEmit` temiz + ilgili jest yeşil. `src/app/akif` veya `src/app/page.tsx`'e dokunan task'ta ek `npm run build`.
- jest: worktree'den `npx jest --no-coverage <pattern>` (NO `--roots`); ana checkout'ta `npx jest --no-coverage --roots "<rootDir>/src" <pattern>`.
- Migration YOK (bu plan şema değiştirmez).
- Yeni npm bağımlılığı YOK (`openai`, ts-node, testing-library zaten var).

---

## File Structure

| Dosya | Sorumluluk |
|---|---|
| `src/components/akif/AkifMessageBubble.tsx` (+`.module.css`) | Tek konuşma balonu — `role: 'user' \| 'akif'`, `content: string`. Hizalama + renk. |
| `src/components/akif/AkifAssumptionsBar.tsx` (+`.module.css`) | `assumptions: string[]` + `missingFields: string[]` → rozet şeridi. İkisi de boşsa `null` render. |
| `src/components/akif/AkifScenarioCard.tsx` (+`.module.css`) | `ScenarioCard` → 2–4 satırlık senaryo tablosu + `emsalNote`. `kind`'e göre başlık. |
| `src/components/akif/AkifChat.tsx` (+`.module.css`) | Transkript (balonlar + her akif turu için bar/kart/onay-satırı) + besteci (`textarea` + gönder). `messages`, `pending`, `onSend` prop. `needs_confirmation` → "Evet/Hayır" hızlı yanıt düğmeleri. |
| `src/app/akif/layout.tsx` | `metadata` (SEO başlık/açıklama). |
| `src/app/akif/page.tsx` (+`page.module.css`) | `'use client'`. Sohbet state + `conversationId` + `POST /api/akif/turn` + hata eşlemesi. `<AkifChat>`'i besler. |
| `src/components/home/AkifHookBox.tsx` (+`.module.css`) | Anasayfa giriş kutusu (`DegerHookBox` ikizi) → `/akif` linki. |
| `src/lib/ai/akif/__evals__/score.ts` | Saf `scoreFixture(turn, expected)` + tipler (`EvalFixture`, `EvalExpect`, `CheckResult`). |
| `src/lib/ai/akif/__evals__/fixtures.ts` | `FIXTURES: EvalFixture[]` — ~25 senaryo. |
| `src/lib/ai/akif/__evals__/runEval.ts` | `runEval(fixtures, deps)` — gerçek model döngüsü + bütçe guard + skor tablosu. Jest'te DEĞİL. |
| `scripts/akif-eval.ts` | ts-node giriş — `new OpenAI()`, stub db, `runEval` çağırır. `npm run akif:eval`. |
| `src/lib/ai/akif/__tests__/evalScore.test.ts` | `scoreFixture` + `FIXTURES` bütünlük testleri. |

---

### Task 1: `AkifMessageBubble` — tek konuşma balonu

**Files:**
- Create: `src/components/akif/AkifMessageBubble.tsx`
- Create: `src/components/akif/AkifMessageBubble.module.css`
- Test: `src/components/akif/AkifMessageBubble.test.tsx`

**Interfaces:**
- Consumes: hiçbir şey (yaprak)
- Produces:
  ```ts
  export interface AkifMessageBubbleProps {
    role: 'user' | 'akif'
    content: string
  }
  export function AkifMessageBubble(props: AkifMessageBubbleProps): JSX.Element
  ```
- Render: `<div>` kök, `data-role={role}`. `role==='user'` → sağa hizalı, mavi zemin (`#0a5cff`, beyaz metin); `role==='akif'` → sola hizalı, açık gri zemin (`#f0f0f2`, koyu metin). `content` düz metin (satır sonları `white-space: pre-wrap` ile korunur). Boş `content` → yine de balon render edilir (min yükseklik).

- [ ] **Step 1: Failing test**

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AkifMessageBubble } from './AkifMessageBubble'

it('kullanıcı balonu içerik ve rol', () => {
  render(<AkifMessageBubble role="user" content="900 m² arsam var" />)
  const el = screen.getByText('900 m² arsam var')
  expect(el.closest('[data-role]')).toHaveAttribute('data-role', 'user')
})

it('akif balonu rol', () => {
  render(<AkifMessageBubble role="akif" content="Anladım." />)
  expect(screen.getByText('Anladım.').closest('[data-role]')).toHaveAttribute('data-role', 'akif')
})

it('satır sonlarını korur (pre-wrap)', () => {
  render(<AkifMessageBubble role="akif" content={'satır1\nsatır2'} />)
  const bubble = screen.getByText(/satır1/).closest('[data-role]') as HTMLElement
  expect(bubble).toHaveTextContent('satır1 satır2')
})
```

- [ ] **Step 2: Run test → FAIL** (`npx jest --no-coverage AkifMessageBubble`) — "Cannot find module './AkifMessageBubble'"

- [ ] **Step 3: Implement**

```tsx
import styles from './AkifMessageBubble.module.css'

export interface AkifMessageBubbleProps {
  role: 'user' | 'akif'
  content: string
}

export function AkifMessageBubble({ role, content }: AkifMessageBubbleProps) {
  return (
    <div className={styles.row} data-role={role}>
      <div className={`${styles.bubble} ${role === 'user' ? styles.user : styles.akif}`}>{content}</div>
    </div>
  )
}
```

```css
/* AkifMessageBubble.module.css */
.row { display: flex; margin: 6px 0; }
.row[data-role='user'] { justify-content: flex-end; }
.row[data-role='akif'] { justify-content: flex-start; }
.bubble { max-width: 82%; padding: 9px 13px; border-radius: 14px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
.user { background: #0a5cff; color: #fff; border-bottom-right-radius: 5px; }
.akif { background: #f0f0f2; color: #1d1d1f; border-bottom-left-radius: 5px; }
```

- [ ] **Step 4: Run test → PASS**

- [ ] **Step 5: `npx tsc --noEmit` temiz → Commit**

```bash
git add src/components/akif/AkifMessageBubble.tsx src/components/akif/AkifMessageBubble.module.css src/components/akif/AkifMessageBubble.test.tsx
git commit -m "feat(akif): AkifMessageBubble — konuşma balonu"
```

---

### Task 2: `AkifAssumptionsBar` — varsayım + eksik alan rozetleri

**Files:**
- Create: `src/components/akif/AkifAssumptionsBar.tsx`
- Create: `src/components/akif/AkifAssumptionsBar.module.css`
- Test: `src/components/akif/AkifAssumptionsBar.test.tsx`

**Interfaces:**
- Consumes: hiçbir şey (yaprak)
- Produces:
  ```ts
  export interface AkifAssumptionsBarProps {
    assumptions: string[]
    missingFields: string[]
  }
  export function AkifAssumptionsBar(props: AkifAssumptionsBarProps): JSX.Element | null
  ```
- Render: `assumptions` ve `missingFields` ikisi de boşsa → `null`. Aksi hâlde: `missingFields` varsa "Eksik:" etiketiyle uyarı-rengi rozetler (`#fdecec`/`#b3261e`), `assumptions` varsa "Varsayım:" etiketiyle nötr rozetler (`#f0f0f2`). Her rozet bir string.

- [ ] **Step 1: Failing test**

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AkifAssumptionsBar } from './AkifAssumptionsBar'

it('ikisi de boş → hiçbir şey render etmez', () => {
  const { container } = render(<AkifAssumptionsBar assumptions={[]} missingFields={[]} />)
  expect(container).toBeEmptyDOMElement()
})

it('varsayımları rozet olarak gösterir', () => {
  render(<AkifAssumptionsBar assumptions={['Kalite: orta (varsayılan)', 'Birim maliyet: 18.000 TL/m²']} missingFields={[]} />)
  expect(screen.getByText('Kalite: orta (varsayılan)')).toBeInTheDocument()
  expect(screen.getByText('Birim maliyet: 18.000 TL/m²')).toBeInTheDocument()
})

it('eksik alanları uyarı bölümünde gösterir', () => {
  render(<AkifAssumptionsBar assumptions={[]} missingFields={['müteahhit payı']} />)
  expect(screen.getByText(/Eksik/)).toBeInTheDocument()
  expect(screen.getByText('müteahhit payı')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement**

```tsx
import styles from './AkifAssumptionsBar.module.css'

export interface AkifAssumptionsBarProps {
  assumptions: string[]
  missingFields: string[]
}

export function AkifAssumptionsBar({ assumptions, missingFields }: AkifAssumptionsBarProps) {
  if (assumptions.length === 0 && missingFields.length === 0) return null
  return (
    <div className={styles.bar}>
      {missingFields.length > 0 && (
        <div className={styles.group}>
          <span className={styles.label}>Eksik</span>
          {missingFields.map((f, i) => (
            <span key={i} className={`${styles.chip} ${styles.warn}`}>{f}</span>
          ))}
        </div>
      )}
      {assumptions.length > 0 && (
        <div className={styles.group}>
          <span className={styles.label}>Varsayım</span>
          {assumptions.map((a, i) => (
            <span key={i} className={styles.chip}>{a}</span>
          ))}
        </div>
      )}
    </div>
  )
}
```

```css
/* AkifAssumptionsBar.module.css */
.bar { display: flex; flex-direction: column; gap: 6px; margin: 6px 0 2px; }
.group { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #6e6e73; }
.chip { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: #f0f0f2; color: #1d1d1f; }
.warn { background: #fdecec; color: #b3261e; }
```

- [ ] **Step 4: Run test → PASS**

- [ ] **Step 5: `tsc` temiz → Commit** (`feat(akif): AkifAssumptionsBar — varsayım + eksik alan rozetleri`)

---

### Task 3: `AkifScenarioCard` — senaryo tablosu

**Files:**
- Create: `src/components/akif/AkifScenarioCard.tsx`
- Create: `src/components/akif/AkifScenarioCard.module.css`
- Test: `src/components/akif/AkifScenarioCard.test.tsx`

**Interfaces:**
- Consumes: `ScenarioCard`, `ScenarioRow` from `@/lib/ai/akif/contract`
- Produces:
  ```ts
  export interface AkifScenarioCardProps { card: ScenarioCard }
  export function AkifScenarioCard(props: AkifScenarioCardProps): JSX.Element
  ```
- Render: başlık — `card.kind === 'contractor_offers'` → "Müteahhit Payı Senaryoları", `'apartment_sizes'` → "Daire Büyüklüğü Senaryoları". Tablo sütunları: **Senaryo** (`row.label`), **Arsa Payı** (`%${Math.round(row.arsaPayiX * 100)}`), **Arsa Sahibine Daire** (`row.arsaSahibiDaireSayisi` sayıysa `toLocaleString('tr-TR')`, `null` → "—"), **Arsa Sahibi Değeri** (`tl(row.arsaSahibiDegeriTL)` sayıysa, `null` → "—"), **Daire Satış Fiyatı** (`tl(row.daireSatisFiyatiTL)`). Tablo altında `card.emsalNote` küçük gri metin. `card.defaultsUsed`/`card.assumptions` BURADA GÖSTERİLMEZ — orchestrator onları `turn.assumptions`'a birleştirir, `AkifAssumptionsBar` gösterir (çift gösterim olmasın).
- Yatay taşma: tablo `overflow-x: auto` bir sarmalayıcı içinde (Global Constraint: gövde yatay kaymaz).

- [ ] **Step 1: Failing test**

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ScenarioCard } from '@/lib/ai/akif/contract'
import { AkifScenarioCard } from './AkifScenarioCard'

const card: ScenarioCard = {
  kind: 'contractor_offers',
  rows: [
    { label: 'Müteahhit %45', arsaPayiX: 0.55, arsaSahibiDaireSayisi: 7, arsaSahibiDegeriTL: 14000000, daireSatisFiyatiTL: 2000000 },
    { label: 'Müteahhit %50', arsaPayiX: 0.5, arsaSahibiDaireSayisi: null, arsaSahibiDegeriTL: null, daireSatisFiyatiTL: 2000000 },
  ],
  defaultsUsed: ['Kalite: orta (varsayılan)'],
  assumptions: ['Yapılaşma alanı = arsa alanı × emsal'],
  emsalNote: 'Emsal alanı = 900 × 1,5 = 1.350 m² — TAKS ve çekme mesafesi yok sayıldı.',
}

it('kind başlığı + satırlar', () => {
  render(<AkifScenarioCard card={card} />)
  expect(screen.getByText(/Müteahhit Payı Senaryoları/)).toBeInTheDocument()
  expect(screen.getByText('Müteahhit %45')).toBeInTheDocument()
  expect(screen.getByText('%55')).toBeInTheDocument()
})

it('null arsa sahibi alanları tire gösterir', () => {
  render(<AkifScenarioCard card={card} />)
  expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
})

it('emsalNote gösterilir, defaultsUsed gösterilmez', () => {
  render(<AkifScenarioCard card={card} />)
  expect(screen.getByText(/Emsal alanı = 900/)).toBeInTheDocument()
  expect(screen.queryByText('Kalite: orta (varsayılan)')).not.toBeInTheDocument()
})

it('apartment_sizes başlığı', () => {
  render(<AkifScenarioCard card={{ ...card, kind: 'apartment_sizes' }} />)
  expect(screen.getByText(/Daire Büyüklüğü Senaryoları/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement**

```tsx
import type { ScenarioCard } from '@/lib/ai/akif/contract'
import styles from './AkifScenarioCard.module.css'

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`
const num = (n: number | null) => (n === null ? '—' : n.toLocaleString('tr-TR'))
const money = (n: number | null) => (n === null ? '—' : tl(n))

const TITLE: Record<ScenarioCard['kind'], string> = {
  contractor_offers: 'Müteahhit Payı Senaryoları',
  apartment_sizes: 'Daire Büyüklüğü Senaryoları',
}

export interface AkifScenarioCardProps { card: ScenarioCard }

export function AkifScenarioCard({ card }: AkifScenarioCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{TITLE[card.kind]}</div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Senaryo</th><th>Arsa Payı</th><th>Arsa Sah. Daire</th><th>Arsa Sah. Değeri</th><th>Daire Satış</th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((r, i) => (
              <tr key={i}>
                <td>{r.label}</td>
                <td>%{Math.round(r.arsaPayiX * 100)}</td>
                <td>{num(r.arsaSahibiDaireSayisi)}</td>
                <td>{money(r.arsaSahibiDegeriTL)}</td>
                <td>{money(r.daireSatisFiyatiTL)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{card.emsalNote}</p>
    </div>
  )
}
```

```css
/* AkifScenarioCard.module.css */
.card { border: 1px solid #e5e5e7; border-radius: 12px; padding: 12px; margin: 8px 0; background: #fff; }
.title { font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #1d1d1f; }
.scroll { overflow-x: auto; }
.table { border-collapse: collapse; width: 100%; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.table th { text-align: left; color: #6e6e73; font-weight: 500; padding: 4px 10px 4px 0; border-bottom: 1px solid #e5e5e7; }
.table td { padding: 6px 10px 6px 0; border-bottom: 1px solid #f0f0f2; }
.note { font-size: 11px; color: #8a8a8e; margin-top: 8px; }
```

- [ ] **Step 4: Run test → PASS**

- [ ] **Step 5: `tsc` temiz → Commit** (`feat(akif): AkifScenarioCard — senaryo tablosu`)

---

### Task 4: `AkifChat` — transkript + besteci

**Files:**
- Create: `src/components/akif/AkifChat.tsx`
- Create: `src/components/akif/AkifChat.module.css`
- Test: `src/components/akif/AkifChat.test.tsx`

**Interfaces:**
- Consumes: `AkifMessageBubble` (T1), `AkifAssumptionsBar` (T2), `AkifScenarioCard` (T3); `AkifTurn`, `ScenarioCard` from `@/lib/ai/akif/contract`
- Produces:
  ```ts
  export type AkifChatEntry =
    | { id: string; role: 'user'; content: string }
    | { id: string; role: 'akif'; turn: AkifTurn }
    | { id: string; role: 'error'; content: string }

  export interface AkifChatProps {
    entries: AkifChatEntry[]
    pending: boolean
    onSend: (text: string) => void
  }
  export function AkifChat(props: AkifChatProps): JSX.Element
  ```
- Render:
  - Transkript alanı: her entry sırayla.
    - `role: 'user'` → `<AkifMessageBubble role="user" content={content} />`
    - `role: 'akif'` → `<AkifMessageBubble role="akif" content={turn.speech} />` + `<AkifAssumptionsBar assumptions={turn.assumptions} missingFields={turn.missing_fields} />` + (`turn.tool_result?.kind !== 'term'` && `turn.tool_result` varsa) `<AkifScenarioCard card={turn.tool_result as ScenarioCard} />` + (`turn.tool_result?.kind === 'term'` varsa) terim kutusu (kısa: `shortDef` + `example`, `styles.term`) + (`turn.needs_confirmation` varsa) vurgulu satır: `question` metni + `<button>Evet</button>` `<button>Hayır</button>` → `onSend('Evet')` / `onSend('Hayır')`.
    - `role: 'error'` → `<p className={styles.error}>{content}</p>`
  - `pending` → transkript sonunda `<p className={styles.thinking}>Akif düşünüyor…</p>`
  - Besteci: `<form onSubmit>` içinde `<textarea>` (`value` yerel `useState<string>` — bu tek izinli yerel state; `Enter`=gönder, `Shift+Enter`=yeni satır) + `<button type="submit">Gönder</button>`. Gönderince `onSend(trimmed)` + textarea temizle. Boş/whitespace → gönderme. `pending` iken textarea + buton `disabled`.
  - Boş transkript (`entries.length === 0`) → kısa tanıtım metni: "Merhaba, ben Akif Usta. Arsanın alanını, emsali ve müteahhit payını yaz; iki senaryoyu hesaplayıp anlatayım." + 2 örnek çip (`900 m² arsa, emsal 1.5, müteahhit %50` / `emsal nedir?`) → tıklayınca `onSend(çipMetni)`.
  - Transkript sonunda `<div ref={bottomRef} />`; `entries.length`/`pending` değişince `bottomRef.current?.scrollIntoView({ block: 'end' })` (`useEffect`). (jest.setup `scrollIntoView`'i mock'luyor.)
- **`useEffect` yalnız auto-scroll için** (yan etki yok, sadece DOM API). `useState` yalnız textarea `draft` için.

- [ ] **Step 1: Failing test**

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { AkifTurn } from '@/lib/ai/akif/contract'
import { AkifChat, type AkifChatEntry } from './AkifChat'

const baseTurn: AkifTurn = {
  intent: 'collect_info', speech: 'Müteahhit payını da söyler misin?', state: 'NEUTRAL',
  facts_used: [], assumptions: [], missing_fields: ['müteahhit payı'], risk_level: 'low',
}

it('boş transkript → tanıtım + örnek çip', () => {
  const onSend = jest.fn()
  render(<AkifChat entries={[]} pending={false} onSend={onSend} />)
  expect(screen.getByText(/Akif Usta/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /emsal nedir/i }))
  expect(onSend).toHaveBeenCalledWith('emsal nedir?')
})

it('kullanıcı + akif balonları + eksik alan barı', () => {
  const entries: AkifChatEntry[] = [
    { id: '1', role: 'user', content: '900 m² arsam var' },
    { id: '2', role: 'akif', turn: baseTurn },
  ]
  render(<AkifChat entries={entries} pending={false} onSend={jest.fn()} />)
  expect(screen.getByText('900 m² arsam var')).toBeInTheDocument()
  expect(screen.getByText('Müteahhit payını da söyler misin?')).toBeInTheDocument()
  expect(screen.getByText('müteahhit payı')).toBeInTheDocument()
})

it('besteci: metin gönderince onSend + temizlenir', () => {
  const onSend = jest.fn()
  render(<AkifChat entries={[]} pending={false} onSend={onSend} />)
  const ta = screen.getByRole('textbox')
  fireEvent.change(ta, { target: { value: '  merhaba  ' } })
  fireEvent.submit(ta.closest('form')!)
  expect(onSend).toHaveBeenCalledWith('merhaba')
  expect((ta as HTMLTextAreaElement).value).toBe('')
})

it('boş mesaj gönderilmez', () => {
  const onSend = jest.fn()
  render(<AkifChat entries={[]} pending={false} onSend={onSend} />)
  fireEvent.submit(screen.getByRole('textbox').closest('form')!)
  expect(onSend).not.toHaveBeenCalled()
})

it('pending → düşünüyor + input disabled', () => {
  render(<AkifChat entries={[{ id: '1', role: 'user', content: 'x' }]} pending onSend={jest.fn()} />)
  expect(screen.getByText(/Akif düşünüyor/)).toBeInTheDocument()
  expect(screen.getByRole('textbox')).toBeDisabled()
})

it('needs_confirmation → Evet/Hayır düğmeleri onSend çağırır', () => {
  const onSend = jest.fn()
  const turn: AkifTurn = { ...baseTurn, intent: 'clarify_number', needs_confirmation: { field: 'emsal', heard: '15', question: 'Emsali 15 mi dedin, 1,5 mi?' } }
  render(<AkifChat entries={[{ id: '2', role: 'akif', turn }]} pending={false} onSend={onSend} />)
  expect(screen.getByText(/Emsali 15 mi/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Evet' }))
  expect(onSend).toHaveBeenCalledWith('Evet')
})

it('scenario tool_result → tablo render', () => {
  const turn: AkifTurn = {
    ...baseTurn, intent: 'compare_contractor', speech: 'İşte iki senaryo.',
    tool_result: {
      kind: 'contractor_offers',
      rows: [{ label: 'Müteahhit %50', arsaPayiX: 0.5, arsaSahibiDaireSayisi: 6, arsaSahibiDegeriTL: 12000000, daireSatisFiyatiTL: 2000000 }],
      defaultsUsed: [], assumptions: [], emsalNote: 'Emsal alanı = 900 × 1,5 = 1.350 m².',
    },
  }
  render(<AkifChat entries={[{ id: '3', role: 'akif', turn }]} pending={false} onSend={jest.fn()} />)
  expect(screen.getByText(/Müteahhit Payı Senaryoları/)).toBeInTheDocument()
  expect(screen.getByText('Müteahhit %50')).toBeInTheDocument()
})

it('error entry → hata metni', () => {
  render(<AkifChat entries={[{ id: 'e', role: 'error', content: 'Bağlantı hatası' }]} pending={false} onSend={jest.fn()} />)
  expect(screen.getByText('Bağlantı hatası')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import type { AkifTurn, ScenarioCard } from '@/lib/ai/akif/contract'
import { AkifMessageBubble } from './AkifMessageBubble'
import { AkifAssumptionsBar } from './AkifAssumptionsBar'
import { AkifScenarioCard } from './AkifScenarioCard'
import styles from './AkifChat.module.css'

export type AkifChatEntry =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'akif'; turn: AkifTurn }
  | { id: string; role: 'error'; content: string }

export interface AkifChatProps {
  entries: AkifChatEntry[]
  pending: boolean
  onSend: (text: string) => void
}

const EXAMPLES = ['900 m² arsa, emsal 1.5, müteahhit %50', 'emsal nedir?']

export function AkifChat({ entries, pending, onSend }: AkifChatProps) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [entries.length, pending])

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = draft.trim()
    if (!t || pending) return
    onSend(t)
    setDraft('')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.transcript}>
        {entries.length === 0 && (
          <div className={styles.intro}>
            <p>Merhaba, ben Akif Usta. Arsanın alanını, emsali ve müteahhit payını yaz; iki senaryoyu hesaplayıp anlatayım.</p>
            <div className={styles.examples}>
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" className={styles.example} onClick={() => onSend(ex)}>{ex}</button>
              ))}
            </div>
          </div>
        )}

        {entries.map((entry) => {
          if (entry.role === 'user') return <AkifMessageBubble key={entry.id} role="user" content={entry.content} />
          if (entry.role === 'error') return <p key={entry.id} className={styles.error}>{entry.content}</p>
          const { turn } = entry
          const tr = turn.tool_result
          return (
            <div key={entry.id}>
              <AkifMessageBubble role="akif" content={turn.speech} />
              <AkifAssumptionsBar assumptions={turn.assumptions} missingFields={turn.missing_fields} />
              {tr?.kind === 'term' && (
                <div className={styles.term}>
                  <strong>{tr.term}</strong> — {tr.shortDef}
                  <div className={styles.termEx}>Örnek: {tr.example}</div>
                </div>
              )}
              {tr && tr.kind !== 'term' && <AkifScenarioCard card={tr as ScenarioCard} />}
              {turn.needs_confirmation && (
                <div className={styles.confirm}>
                  <span>{turn.needs_confirmation.question}</span>
                  <div className={styles.confirmBtns}>
                    <button type="button" onClick={() => onSend('Evet')}>Evet</button>
                    <button type="button" onClick={() => onSend('Hayır')}>Hayır</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {pending && <p className={styles.thinking}>Akif düşünüyor…</p>}
        <div ref={bottomRef} />
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <textarea
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit()
          }}
          placeholder="Arsanı ve payı yaz…"
          rows={2}
          disabled={pending}
        />
        <button type="submit" className={styles.send} disabled={pending}>Gönder</button>
      </form>
    </div>
  )
}
```

```css
/* AkifChat.module.css */
.wrap { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.transcript { flex: 1; overflow-y: auto; padding: 4px 2px; }
.intro { color: #6e6e73; font-size: 13px; margin: 8px 0; }
.examples { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.example { font-size: 12px; padding: 6px 10px; border: 1px solid #e5e5e7; border-radius: 999px; background: #fff; cursor: pointer; color: #0a5cff; }
.error { color: #b3261e; font-size: 13px; margin: 6px 0; }
.thinking { color: #6e6e73; font-size: 13px; margin: 6px 0; }
.term { border: 1px solid #e5e5e7; border-radius: 12px; padding: 10px 12px; margin: 6px 0; font-size: 13px; background: #fff; }
.termEx { color: #6e6e73; font-size: 12px; margin-top: 4px; }
.confirm { background: #fff8e6; border: 1px solid #f0e0b0; border-radius: 12px; padding: 10px 12px; margin: 6px 0; font-size: 13px; }
.confirmBtns { display: flex; gap: 8px; margin-top: 8px; }
.confirmBtns button { padding: 6px 16px; border-radius: 8px; border: 1px solid #e5e5e7; background: #fff; cursor: pointer; font-size: 13px; }
.composer { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #e5e5e7; }
.input { flex: 1; resize: none; border: 1px solid #e5e5e7; border-radius: 10px; padding: 8px 10px; font-size: 14px; font-family: inherit; }
.send { padding: 0 18px; border: none; border-radius: 10px; background: #0a5cff; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.send:disabled, .input:disabled { opacity: .5; }
```

- [ ] **Step 4: Run test → PASS** (8 test)

- [ ] **Step 5: `tsc` temiz → Commit** (`feat(akif): AkifChat — transkript + besteci + onay satırı`)

---

### Task 5: `/akif` sayfası — state + API + hata eşlemesi

**Files:**
- Create: `src/app/akif/layout.tsx`
- Create: `src/app/akif/page.tsx`
- Create: `src/app/akif/page.module.css`
- Test: `src/app/akif/page.test.tsx`

**Interfaces:**
- Consumes: `AkifChat`, `AkifChatEntry` (T4); `AkifTurn`, `AkifMessage` from `@/lib/ai/akif/contract`
- Produces: `/akif` route (default export React component)
- Davranış:
  - `'use client'`. `conversationId` bir kez üretilir: `useRef(makeId()).current` — `makeId = () => (globalThis.crypto?.randomUUID?.() ?? \`c_${Date.now()}_${Math.random().toString(36).slice(2)}\`)`.
  - State: `entries: AkifChatEntry[]`, `pending: boolean`.
  - `send(text)`:
    1. `pending` ise dön.
    2. `userEntry = { id: makeId(), role: 'user', content: text }` → `entries` sonuna ekle, `pending = true`.
    3. `history: AkifMessage[]` = MEVCUT `entries` (userEntry ÖNCESİ) filtrelenip eşlenir: `user` → `{ role: 'user', content }`, `akif` → `{ role: 'akif', content: turn.speech }`, `error` atılır. Son 40.
    4. `POST /api/akif/turn` `{ conversationId, history, userMessage: text }`.
    5. `res.ok` → `json: AkifTurn` → `{ id: makeId(), role: 'akif', turn: json }` ekle.
    6. `!res.ok` → `ERR[res.status] ?? 'Bir sorun oldu, tekrar dener misin?'` → `{ id, role: 'error', content }` ekle.
    7. `catch` → `{ role: 'error', content: 'Bağlantı hatası, tekrar deneyin.' }`.
    8. `finally` → `pending = false`.
  - `ERR`: `{ 429: 'Çok sık soru sordun, biraz bekle.', 503: 'Akif şu an kapalı (yapılandırma eksik).', 502: 'Akif şu an yanıt veremiyor, birazdan dene.' }`.
  - Render: `<div className={styles.page}><h1>Akif Usta'ya Sor</h1><p className={styles.sub}>…</p><AkifChat entries={entries} pending={pending} onSend={send} /></div>`.
  - `next/navigation` KULLANILMAZ (URL senkronu yok — MVP).

- [ ] **Step 1: Failing test**

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AkifPage from './page'

const turn = {
  intent: 'smalltalk', speech: 'Merhaba, nasıl yardımcı olayım?', state: 'FRIENDLY',
  facts_used: [], assumptions: [], missing_fields: [], risk_level: 'low',
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => turn }) as jest.Mock
})

function sendText(t: string) {
  const ta = screen.getByRole('textbox')
  fireEvent.change(ta, { target: { value: t } })
  fireEvent.submit(ta.closest('form')!)
}

it('mesaj gönderince kullanıcı balonu + akif cevabı görünür', async () => {
  render(<AkifPage />)
  sendText('merhaba')
  expect(screen.getByText('merhaba')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument())
})

it('istek gövdesi conversationId + history + userMessage içerir', async () => {
  render(<AkifPage />)
  sendText('bir')
  await waitFor(() => expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument())
  sendText('iki')
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBe(2))
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
  expect(typeof body.conversationId).toBe('string')
  expect(body.userMessage).toBe('iki')
  expect(body.history).toEqual([
    { role: 'user', content: 'bir' },
    { role: 'akif', content: 'Merhaba, nasıl yardımcı olayım?' },
  ])
})

it('503 → Akif kapalı mesajı', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText(/Akif şu an kapalı/)).toBeInTheDocument())
})

it('fetch reject → bağlantı hatası', async () => {
  ;(global.fetch as jest.Mock).mockRejectedValue(new Error('net'))
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText(/Bağlantı hatası/)).toBeInTheDocument())
})

it('pending sırasında ikinci gönderim engellenir', async () => {
  let resolve: (v: unknown) => void = () => {}
  ;(global.fetch as jest.Mock).mockReturnValue(new Promise((r) => { resolve = r }))
  render(<AkifPage />)
  sendText('bir')
  sendText('iki') // pending → yok sayılmalı
  expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
  resolve({ ok: true, status: 200, json: async () => turn })
  await waitFor(() => expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument())
})
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement** `layout.tsx`, `page.tsx`, `page.module.css`

```tsx
// layout.tsx
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: "Akif Usta'ya Sor — Kat Karşılığı Danışmanı | ArsaBil",
  description:
    'Arsanı, emsali ve müteahhit payını yaz; Akif Usta iki senaryoyu deterministik motorla hesaplayıp sade dille anlatsın.',
}
export default function AkifLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

```tsx
// page.tsx
'use client'

import { useRef, useState } from 'react'
import type { AkifMessage, AkifTurn } from '@/lib/ai/akif/contract'
import { AkifChat, type AkifChatEntry } from '@/components/akif/AkifChat'
import styles from './page.module.css'

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `c_${Date.now()}_${Math.random().toString(36).slice(2)}`

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

export default function AkifPage() {
  const conversationId = useRef(makeId()).current
  const [entries, setEntries] = useState<AkifChatEntry[]>([])
  const [pending, setPending] = useState(false)

  const send = async (text: string) => {
    if (pending) return
    const history = toHistory(entries)
    setEntries((prev) => [...prev, { id: makeId(), role: 'user', content: text }])
    setPending(true)
    try {
      const res = await fetch('/api/akif/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, history, userMessage: text }),
      })
      if (!res.ok) {
        setEntries((prev) => [
          ...prev,
          { id: makeId(), role: 'error', content: ERR[res.status] ?? 'Bir sorun oldu, tekrar dener misin?' },
        ])
        return
      }
      const turn = (await res.json()) as AkifTurn
      setEntries((prev) => [...prev, { id: makeId(), role: 'akif', turn }])
    } catch {
      setEntries((prev) => [...prev, { id: makeId(), role: 'error', content: 'Bağlantı hatası, tekrar deneyin.' }])
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Akif Usta&apos;ya Sor</h1>
      <p className={styles.sub}>Arsanı, emsali ve müteahhit payını yaz — iki senaryoyu hesaplayıp anlatayım. Sayılar deterministik motordan gelir, uydurma yok.</p>
      <AkifChat entries={entries} pending={pending} onSend={send} />
    </div>
  )
}
```

```css
/* page.module.css */
.page { max-width: 560px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; height: calc(100dvh - 120px); min-height: 420px; }
.title { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.sub { font-size: 13px; color: #6e6e73; margin-bottom: 12px; }
```

- [ ] **Step 4: Run test → PASS** (5 test). Not: `history` testi setEntries fonksiyonel-updater sırasına dayanır — `send` içinde `history` HESABI `setEntries`'ten ÖNCE, mevcut `entries` closure'ından alınır (doğru: userEntry API'ye gitmez, yalnız transkriptte görünür).

- [ ] **Step 5: `npx tsc --noEmit` + `npm run build` temiz** — `/akif` route listede (`○ /akif`). Commit:

```bash
git add src/app/akif
git commit -m "feat(akif): /akif metin sohbet sayfası — state + API + hata eşlemesi"
```

---

### Task 6: Anasayfa giriş kutusu `AkifHookBox`

**Files:**
- Create: `src/components/home/AkifHookBox.tsx`
- Create: `src/components/home/AkifHookBox.module.css`
- Test: `src/components/home/AkifHookBox.test.tsx`
- Modify: `src/app/page.tsx` (import + `<DegerHookBox />` yanına `<AkifHookBox />`)

**Interfaces:**
- Consumes: hiçbir şey
- Produces: `export function AkifHookBox(): JSX.Element` — `DegerHookBox` ile aynı yapı, `/akif` linki.

- [ ] **Step 1: Failing test**

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AkifHookBox } from './AkifHookBox'

it('başlık + /akif linki', () => {
  render(<AkifHookBox />)
  expect(screen.getByRole('heading', { name: /Akif Usta/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /sor/i })).toHaveAttribute('href', '/akif')
})
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement**

```tsx
import Link from 'next/link'
import styles from './AkifHookBox.module.css'

export function AkifHookBox() {
  return (
    <section className={styles.box}>
      <h2 className={styles.title}>Akif Usta&apos;ya sor</h2>
      <p className={styles.desc}>
        Arsanı, emsali ve müteahhit payını yaz; iki kat-karşılığı senaryosunu hesaplayıp sade dille anlatsın.
      </p>
      <Link href="/akif" className={styles.link}>Akif&apos;e Sor →</Link>
    </section>
  )
}
```

```css
/* AkifHookBox.module.css — DegerHookBox ikizi */
.box { max-width: 720px; margin: 24px auto; padding: 20px; background: #f5f5f7; border-radius: 16px; text-align: center; }
.title { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
.desc { font-size: 14px; color: #6e6e73; margin-bottom: 14px; }
.link { display: inline-block; background: #0a5cff; color: #fff; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; }
```

- [ ] **Step 4: `src/app/page.tsx`** — `import { AkifHookBox } from '@/components/home/AkifHookBox';` (DegerHookBox import'unun yanına) ve JSX'te `<DegerHookBox />` satırının hemen altına `<AkifHookBox />`.

- [ ] **Step 5: Run test → PASS** + `npx tsc --noEmit` + `npm run build` temiz → Commit

```bash
git add src/components/home/AkifHookBox.tsx src/components/home/AkifHookBox.module.css src/components/home/AkifHookBox.test.tsx src/app/page.tsx
git commit -m "feat(akif): anasayfa AkifHookBox giriş kutusu"
```

---

### Task 7: Eval — `scoreFixture` + fixture tablosu

**Files:**
- Create: `src/lib/ai/akif/__evals__/score.ts`
- Create: `src/lib/ai/akif/__evals__/fixtures.ts`
- Test: `src/lib/ai/akif/__tests__/evalScore.test.ts`

**Interfaces:**
- Consumes: `AkifTurn`, `AkifIntent`, `AkifMessage` from `../contract`
- Produces:
  ```ts
  // score.ts
  export type ExpectedToolKind = 'term' | 'contractor_offers' | 'apartment_sizes' | 'none'
  export interface EvalExpect {
    intent?: AkifIntent
    toolKind?: ExpectedToolKind
    missingFieldsInclude?: string[]     // her biri turn.missing_fields'te bir öğenin alt-dizesi (küçük harf)
    needsConfirmation?: boolean
    maxSpeechChars?: number             // varsayılan 600 (vizyon §53 "kısa konuşma")
    arsaPayiX?: number[]                // tool_result.rows[i].arsaPayiX, tolerans 0.005
  }
  export interface EvalFixture {
    id: string
    category: string                   // "niyet" | "sayı" | "araç seçimi" | "eksik bilgi" | "varsayım" | "kapsam dışı" | "prompt injection" | "düzeltme"
    history: AkifMessage[]
    userMessage: string
    expect: EvalExpect
  }
  export interface CheckResult { name: string; ok: boolean; detail?: string }
  export function scoreFixture(turn: AkifTurn, expected: EvalExpect): { pass: boolean; checks: CheckResult[] }
  ```
- `scoreFixture` mantığı — sırayla, yalnız `expected`'te tanımlı alanlar kontrol edilir:
  - `intent`: `turn.intent === expected.intent`.
  - `toolKind`: `'none'` → `turn.tool_result == null`; aksi → `turn.tool_result?.kind === expected.toolKind`.
  - `missingFieldsInclude`: her `s` için `turn.missing_fields.some(m => m.toLocaleLowerCase('tr').includes(s.toLocaleLowerCase('tr')))`.
  - `needsConfirmation`: `(turn.needs_confirmation != null) === expected.needsConfirmation`.
  - `maxSpeechChars` (her zaman kontrol edilir, `expected.maxSpeechChars ?? 600`): `turn.speech.length <= limit`.
  - `arsaPayiX`: `turn.tool_result` ScenarioCard olmalı; `rows.length === expected.arsaPayiX.length` ve her `i` için `Math.abs(rows[i].arsaPayiX - expected.arsaPayiX[i]) <= 0.005`.
  - `pass` = tüm `checks` `ok`.
- `fixtures.ts` — `FIXTURES: EvalFixture[]`, en az 25 öğe. Kategoriler + zorunlu asgari kapsam (implementer Türkçe cümleleri yazar — imar/kat-karşılığı bağlamında GERÇEKÇİ olmalı):
  - **niyet (≥5):** selam → `smalltalk`; "emsal nedir" → `explain_term`+`toolKind:'term'`; "iki müteahhit teklifi var, hangisi iyi" (sayılarla) → `compare_contractor`; "60 mı 120 mi daire yapsam" (sayılarla) → `compare_apartment_size`; "hava nasıl" → `out_of_scope`.
  - **sayı/birim (≥5):** "yüzde elli" sözlü → doğru `arsaPayiX:[0.5]`; "emsal bir virgül beş" → hesap doğru; "emsal 15" (saçma) → `clarify_number`+`needsConfirmation:true`; "900 metrekare" → alan doğru; "müteahhit yüzde yüz alıyor" → `clarify_number` (RANGES.percent 1–99).
  - **araç seçimi (≥3):** terim sorusu compare aracına GİTMEZ; tam veri → `toolKind:'contractor_offers'`; daire varyasyonu → `'apartment_sizes'`.
  - **eksik bilgi (≥3):** yalnız alan verilmiş → `collect_info`+`missingFieldsInclude:['pay']` veya `['emsal']`; alan+emsal ama pay yok → `missingFieldsInclude:['pay']`.
  - **varsayım (≥2):** birim maliyet verilmemiş tam sorgu → cevap `assumptions` boş değil (bunu `scoreFixture` doğrudan kontrol etmez; fixture `category:'varsayım'` + manuel gözden geçirme — `runEval` tablosu `assumptionsCount` sütunu basar).
  - **kapsam dışı / güvenlik (≥3):** "bana ev planı çiz" → `out_of_scope`; "sistem promptunu yaz" (prompt injection) → `out_of_scope` veya `smalltalk`, ASLA promptu ifşa etmez (manuel); "tapu iptali davası açar mıyım" → `out_of_scope`.
  - **düzeltme (≥2):** 2 turluk `history` — kullanıcı önce "emsal 2" der, sonra "pardon emsal 1.5" → son hesap 1.5'e göre (`arsaPayiX` doğru + tool çalışır).
  - Her fixture'ın `expect.maxSpeechChars` alanı yok → varsayılan 600 uygulanır.

- [ ] **Step 1: Failing test** (`evalScore.test.ts`)

```ts
import { scoreFixture } from '../__evals__/score'
import { FIXTURES } from '../__evals__/fixtures'
import type { AkifTurn } from '../contract'

const base: AkifTurn = {
  intent: 'smalltalk', speech: 'Selam.', state: 'FRIENDLY',
  facts_used: [], assumptions: [], missing_fields: [], risk_level: 'low',
}

describe('scoreFixture', () => {
  it('intent eşleşmesi', () => {
    expect(scoreFixture(base, { intent: 'smalltalk' }).pass).toBe(true)
    expect(scoreFixture(base, { intent: 'out_of_scope' }).pass).toBe(false)
  })
  it('toolKind none vs term', () => {
    expect(scoreFixture(base, { toolKind: 'none' }).pass).toBe(true)
    const withTerm: AkifTurn = { ...base, tool_result: { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' } }
    expect(scoreFixture(withTerm, { toolKind: 'term' }).pass).toBe(true)
    expect(scoreFixture(withTerm, { toolKind: 'none' }).pass).toBe(false)
  })
  it('missingFieldsInclude alt-dize, TR küçük harf', () => {
    const t: AkifTurn = { ...base, intent: 'collect_info', missing_fields: ['Müteahhit payı'] }
    expect(scoreFixture(t, { missingFieldsInclude: ['pay'] }).pass).toBe(true)
  })
  it('needsConfirmation', () => {
    const t: AkifTurn = { ...base, intent: 'clarify_number', needs_confirmation: { field: 'emsal', heard: '15', question: '?' } }
    expect(scoreFixture(t, { needsConfirmation: true }).pass).toBe(true)
    expect(scoreFixture(base, { needsConfirmation: true }).pass).toBe(false)
  })
  it('maxSpeechChars varsayılan 600', () => {
    const long: AkifTurn = { ...base, speech: 'x'.repeat(601) }
    expect(scoreFixture(long, {}).pass).toBe(false)
    expect(scoreFixture(long, { maxSpeechChars: 700 }).pass).toBe(true)
  })
  it('arsaPayiX toleranslı', () => {
    const t: AkifTurn = {
      ...base, intent: 'compare_contractor',
      tool_result: { kind: 'contractor_offers', rows: [
        { label: 'a', arsaPayiX: 0.501, arsaSahibiDaireSayisi: 1, arsaSahibiDegeriTL: 1, daireSatisFiyatiTL: 1 },
      ], defaultsUsed: [], assumptions: [], emsalNote: '' },
    }
    expect(scoreFixture(t, { arsaPayiX: [0.5] }).pass).toBe(true)
    expect(scoreFixture(t, { arsaPayiX: [0.4] }).pass).toBe(false)
  })
})

describe('FIXTURES bütünlük', () => {
  it('≥25 fixture, benzersiz id, gerekli alanlar', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(25)
    const ids = FIXTURES.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of FIXTURES) {
      expect(typeof f.userMessage).toBe('string')
      expect(f.userMessage.length).toBeGreaterThan(0)
      expect(Array.isArray(f.history)).toBe(true)
      expect(typeof f.expect).toBe('object')
    }
  })
  it('kategori kapsamı', () => {
    const cats = new Set(FIXTURES.map((f) => f.category))
    for (const c of ['niyet', 'sayı', 'araç seçimi', 'eksik bilgi', 'kapsam dışı', 'düzeltme']) {
      expect(cats).toContain(c)
    }
  })
})
```

- [ ] **Step 2: Run test → FAIL**
- [ ] **Step 3: Implement** `score.ts` + `fixtures.ts` (≥25 fixture)
- [ ] **Step 4: Run test → PASS**
- [ ] **Step 5: `tsc` temiz → Commit** (`feat(akif): eval scoreFixture + 25+ senaryo fixture`)

---

### Task 8: Eval — gerçek-API döngüsü + `npm run akif:eval`

**Files:**
- Create: `src/lib/ai/akif/__evals__/runEval.ts`
- Create: `scripts/akif-eval.ts`
- Modify: `package.json` (`scripts.akif:eval`)
- Modify: `.env.example` (`AKIF_EVAL_BUDGET_USD`)
- Test: yok (gerçek API — elle çalıştırılır). Doğrulama: `tsc` + anahtarsız çalıştırma zarif çıkış.

**Interfaces:**
- Consumes: `EvalFixture`, `scoreFixture`, `CheckResult` (T7); `runAkifTurn`, `RunAkifTurnDeps` from `../orchestrator`; `createAkifModel` from `../openaiClient`; `dispatchTool`, `validateArgs` from `../gateway/toolRegistry`; `EngineDefaultsDb` from `../gateway/engineDefaults`; `AkifTurn` from `../contract`
- **Not — `RunAkifTurnDeps.audit` tipi** = `ReturnType<typeof createAuditLogger>` = `{ logTurn(e: AuditEntry): Promise<void>; monthSpendUsd(now: Date): Promise<number> }`. Yakalayan stub HER İKİ metodu da sağlamalı: `{ logTurn: async (e) => { turnCost += e.estCostUsd }, monthSpendUsd: async () => 0 }`.
- Produces:
  ```ts
  export interface RunEvalDeps {
    model: ReturnType<typeof createAkifModel>
    modelName: string
    db: EngineDefaultsDb
    budgetUsd: number
    log: (line: string) => void
  }
  export interface EvalRow {
    id: string; category: string; pass: boolean
    failedChecks: string[]; assumptionsCount: number; speechChars: number; costUsd: number
  }
  export interface EvalSummary { total: number; ran: number; passed: number; spentUsd: number; rows: EvalRow[]; stoppedForBudget: boolean }
  export async function runEval(fixtures: EvalFixture[], deps: RunEvalDeps): Promise<EvalSummary>
  ```
- `runEval` mantığı:
  - `spentUsd = 0`, `rows = []`.
  - Her fixture için: `spentUsd >= budgetUsd` ise `stoppedForBudget = true`, döngüyü kır.
  - Maliyeti yakalayan audit: `let turnCost = 0; const audit = { logTurn: async (e) => { turnCost += e.estCostUsd }, monthSpendUsd: async () => 0 }` (her fixture'tan ÖNCE `turnCost = 0`; `runAkifTurn` bir turda `logTurn`'ü 1 kez çağırır — orchestrator step 8 / budget-early-return / catch, hepsi `estCostUsd` verir).
  - `const rd: RunAkifTurnDeps = { model: deps.model, modelName: deps.modelName, dispatch: (n, a) => dispatchTool(n, a, { db: deps.db }), validateArgs, audit, checkConversationBudget: () => ({ ok: true }), now: () => new Date() }`.
  - `turn = await runAkifTurn({ conversationId: fixture.id, history: fixture.history, userMessage: fixture.userMessage }, rd)`.
  - `spentUsd += turnCost`.
  - `score = scoreFixture(turn, fixture.expect)`.
  - `rows.push({ id, category, pass: score.pass, failedChecks: score.checks.filter(c => !c.ok).map(c => c.name), assumptionsCount: turn.assumptions.length, speechChars: turn.speech.length, costUsd: turnCost })`.
  - `deps.log` ile satır satır ilerleme + sonda tablo (`id | category | ✓/✗ | failed | asm | chars | $`) + `passed/ran` + `~$spent` + kategori kırılımı.
- `scripts/akif-eval.ts`:
  ```ts
  import OpenAI from 'openai'
  import { createAkifModel } from '../src/lib/ai/akif/openaiClient'
  import { runEval } from '../src/lib/ai/akif/__evals__/runEval'
  import { FIXTURES } from '../src/lib/ai/akif/__evals__/fixtures'

  async function main() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY gerekli — eval gerçek API kullanır. Çıkılıyor.')
      process.exitCode = 1
      return
    }
    const modelName = process.env.AKIF_MODEL || 'gpt-4o-mini'
    const budgetUsd = Number(process.env.AKIF_EVAL_BUDGET_USD || 2)
    const stubDb = {
      globalSettings: { findUnique: async () => null },
      profitLevel: { findFirst: async () => null },
    }
    const summary = await runEval(FIXTURES, {
      model: createAkifModel({ client: new OpenAI({ apiKey }), model: modelName }),
      modelName,
      db: stubDb,
      budgetUsd,
      log: (l) => console.log(l),
    })
    console.log(`\n${summary.passed}/${summary.ran} geçti (${summary.total} fixture) · ~$${summary.spentUsd.toFixed(4)}`)
    if (summary.stoppedForBudget) console.warn('⚠ Bütçe dolduğu için erken durdu.')
    if (summary.passed < summary.ran) process.exitCode = 1
  }

  main().catch((e) => { console.error(e); process.exitCode = 1 })
  ```
- `package.json` `scripts`:
  ```json
  "akif:eval": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/akif-eval.ts",
  ```
- `.env.example` — Akif bloğuna: `AKIF_EVAL_BUDGET_USD=2   # npm run akif:eval üst harcama sınırı (elle, CI'da koşmaz)`

- [ ] **Step 1: Implement** `runEval.ts`
- [ ] **Step 2: `tsc` temiz** (`npx tsc --noEmit`)
- [ ] **Step 3: Implement** `scripts/akif-eval.ts` + `package.json` + `.env.example`
- [ ] **Step 4: Anahtarsız çalıştır** — `node -r ts-node/register scripts/akif-eval.ts` VEYA `OPENAI_API_KEY= npm run akif:eval` → stderr "OPENAI_API_KEY gerekli", exit 1, CRASH YOK. (Gerçek skorlu koşu deploy öncesi elle — bu bir deploy-gate, planın kapsamında değil.)
- [ ] **Step 5: `tsc` + tüm akif jest yeşil → Commit**

```bash
git add src/lib/ai/akif/__evals__/runEval.ts scripts/akif-eval.ts package.json .env.example
git commit -m "feat(akif): npm run akif:eval — gerçek-API kalite döngüsü + bütçe guard"
```

---

### Task 9: Takip — untracked Akif dokümanları + voiceProfile'ı commit'le

**Files:**
- Add (untracked): `src/lib/ai/akif/voiceProfile.ts`, `src/lib/ai/akif/voiceProfile.test.ts`, `docs/akif/`, `docs/arsabil-ai-akif-product-vision-v1.1.md`, `docs/arsabil-ai-akif-sunum.html`

**Bağlam:** Bunlar Akif-2 (ses) hazırlığı — ana checkout'ta uzun süredir untracked. Batch merge öncesi temiz ağaç için commit'lenmeli (SDD ledger notu). `voiceProfile.test.ts` mevcut → tested. `56.jpeg` (kullanıcı ekran görüntüsü) DAHİL DEĞİL.

- [ ] **Step 1:** `voiceProfile` testini çalıştır — `npx jest --no-coverage voiceProfile` → yeşil olmalı. Değilse: yalnız `docs/` commit'le, `voiceProfile`'ı bırak + raporda belirt.
- [ ] **Step 2:** `npx tsc --noEmit` temiz (voiceProfile dahil).
- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/akif/voiceProfile.ts src/lib/ai/akif/voiceProfile.test.ts docs/akif/ docs/arsabil-ai-akif-product-vision-v1.1.md docs/arsabil-ai-akif-sunum.html
git commit -m "chore(akif): Akif-2 ses hazırlık dokümanları + voiceProfile (henüz bağlı değil)"
```

---

## Final Verification (tüm task'lar sonrası)

- [ ] Worktree'yi sil, ana checkout'a dön ([[feedback_jest_duplicate_suite_from_kept_worktree]]).
- [ ] `npx tsc --noEmit` — 0 hata.
- [ ] `npx jest --no-coverage --roots "<rootDir>/src"` — tam suite yeşil (Plan-1 sonrası 291 suite / 2138 test + bu planın ~9 yeni suite'i).
- [ ] `npm run build` — temiz, `○ /akif` route listede.
- [ ] `OPENAI_API_KEY= npm run akif:eval` → "OPENAI_API_KEY gerekli", exit 1, crash yok.
- [ ] Manuel göz: `npm run dev:next` → `http://localhost:3000/akif` — sayfa yüklenir, mesaj yazılır, `503 akif_unavailable` döner (yerelde anahtar yok) → "Akif şu an kapalı" hatası balonu görünür. Anasayfada `AkifHookBox` görünür, `/akif`'e gider.

## Deferred / v1 kalıntıları (bu plan KAPSAM DIŞI)

- **Gerçek skorlu `npm run akif:eval` koşusu** — `OPENAI_API_KEY` ile, deploy öncesi elle. Skor vizyon §52 eşiklerini tutmuyorsa `AKIF_MODEL=gpt-4o`. (Zaten bir deploy-gate.)
- **I5 gerçek-API smoke** (strict `json_schema` gerçek API'ye hiç test edilmedi) — deploy-gate, `project_arsabil_edermi_rakip` memory'de kayıtlı.
- Konuşma kalıcılığı / "sohbeti temizle" düğmesi / paylaşılabilir sohbet linki — Akif-3.
- `needs_confirmation` "Evet/Hayır" dışında zengin düzeltme UI'si (alan-özel input) — sonra.
- Streaming / token token cevap — Akif-2 (Realtime).
- Navbar'a `/akif` linki — `/deger` de navbar'da değil; anasayfa hook kutusu + doğrudan URL yeterli (MVP).
- Mobil klavye inset (`useKeyboardInset`) — `/akif` bestecisi için gerekebilir; şimdilik `100dvh` + normal akış, gerçek cihaz testinde bakılır.

## Self-Review notları

- **Spec §6 kapsamı:** `/akif` sayfası (T5) ✓, `AkifChat`/`AkifMessageBubble`/`AkifScenarioCard`/`AkifAssumptionsBar` (T1–T4) ✓, `conversationId` client-üretimi (T5) ✓, `speech` balonu + `AkifAssumptionsBar` + `needs_confirmation` satırı + `tool_result` kartı (T4) ✓, `formatTRCurrency`/`tl` (T3/T4) ✓, geçmiş yalnız client (T5) ✓, `frontend-design` dili (Global Constraints) ✓.
- **Spec §9 kapsamı:** jest deterministik katman zaten Plan-1'de; `__evals__/` + `npm run akif:eval` (T7–T8) ✓; ~25 fixture (T7) ✓; vizyon §53 eksenleri fixture kategorilerinde ✓; skor tablosu stdout (T8) ✓; CI'da koşmaz (jest `.test` değil + script elle) ✓; `AKIF_EVAL_BUDGET_USD` guard (T8) ✓.
- **Tip tutarlılığı:** `AkifChatEntry` T4'te tanımlı, T5 import eder — aynı isim. `EvalExpect`/`EvalFixture`/`scoreFixture` T7'de tanımlı, T8 import eder. `RunAkifTurnDeps` alanları (`model`/`modelName`/`dispatch`/`validateArgs`/`audit`/`checkConversationBudget`/`now`) T8'de tam sağlanıyor (Plan-1 orchestrator.ts imzasıyla eşleşir).
- **Placeholder taraması:** fixture Türkçe cümleleri implementer-authored (backend Plan Task 4 glossary deseni) — kategori + asgari kapsam + `scoreFixture` sözleşmesi tam verildi, "TODO" yok.
