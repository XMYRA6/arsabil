# Alt-proje: Akif — LLM Danışman · Faz 1 (Metin MVP) tasarımı

**Tarih:** 2026-08-31
**Branch:** `codex/professional-ui-and-land-cost` (HEAD `3faa633`)
**Üst bağlam:** `docs/arsabil-ai-akif-product-vision-v1.1.md` (vizyon, OpenAI-merkezli
§43-54), `docs/akif/voice-character-spec-v0.1.md`. [[project_arsabil]],
[[project_arsabil_edermi_rakip]] (Akif = decomposition'daki "alt-proje 4",
"EN SON, kapsamlı").

## 0. Akif dekompozisyonu (bu spec = Akif-1)

| Alt-proje | Kapsam | Durum |
|---|---|---|
| **Akif-1 (bu spec)** | Metin MVP: orkestratör + Tool Gateway + çift-kanallı sözleşme + sayı güvenliği + sistem-prompt + `/akif` metin sohbet + gpt-4o-mini + eval | YAZILIYOR |
| Akif-2 | Ses: WebRTC + OpenAI Realtime + canlı transkript + turn detection + barge-in + STT/TTS fallback | sonra |
| Akif-3 | Hafıza + Arsa Dosyası + "hatırla/unut" | sonra |
| Akif-4 | Avatar + sosyal medya (vizyon "ertele" diyor) | ertelendi |
| Akif-5 | 5a/5b entegrasyonu (WhatsApp `QueryUnderstanding` + bildirim metinleri) | sonra |

## 1. Amaç, kapsam, kararlar

**Amaç (vizyon §50 MVP sınırı):** Kullanıcı metin sohbetinde arsa alanını, emsali
ve müteahhit payını söyler; Akif eksikleri fark eder, sayıları doğrular, mevcut
deterministik kat-karşılığı motoruyla iki senaryoyu hesaplar ve sonucu kısa
konuşma + ekran kartıyla açıklar.

**Onaylanan kararlar (2026-08-31 brainstorming):**
- **Sağlayıcı/model:** OpenAI, **`gpt-4o-mini`** başlangıç (env `AKIF_MODEL` ile
  değiştirilebilir — vizyon "tek modele bağlanma" diyor). Konuşma-başı token
  tavanı + aylık harcama tahmini paneli. API anahtarını kullanıcı sağlar.
- **Araçlar (Tool Gateway):** 3 adet — `explainTerm` (saf), `compareContractorOffers`
  + `compareApartmentSizes` (`CalculatorEngineV2` sarar). `lookupParcelValue`
  DAHİL DEĞİL (5a/5b ile çakışma; Akif-5).
- **Yerleşim:** ayrı `/akif` sayfası. `/hesapla` formu değişmez.
- **Karakter:** yalnız sistem-prompt'ta, hafif Karadeniz tonu. Fonetik
  transkripsiyon / ağır taklit YOK (vizyon §49 karikatür yasağı). Ayrı "dialect
  layer" modülü yok (o ses için, Akif-2).
- **Hafıza:** stateless sunucu — konuşma geçmişi client'ta tutulur ve her turda
  yeniden gönderilir. Kalıcı hafıza = Akif-3. (Audit tablosu ayrı, aşağıda.)

### Kapsam DIŞI (Akif-1)

- Ses / WebRTC / Realtime / TTS / STT / barge-in (Akif-2)
- Kalıcı konuşma hafızası, Arsa Dosyası, "hatırla/unut" (Akif-3)
- Avatar, sosyal medya videoları (Akif-4)
- Belge okuma (PDF/tapu), hukuki yorum
- TAKS/çekme mesafesi ile taban oturumu, `lookupParcel*`, risk snapshot aracı
- 3'ten fazla araç, çoklu karakter
- Vizyon §47'deki `tool_request`/`ui_actions` alanlarının tam hali —
  Akif-1 sadeleştirilmiş `AkifTurn` kullanır (aşağıda §4)

## 2. Mimari — modül ağacı

Yeni: `src/lib/ai/akif/`

| Modül | Sorumluluk | Bağımlılık (DI) |
|---|---|---|
| `contract.ts` | `AkifMessage`, `AkifTurn` tipleri + `AKIF_TURN_JSON_SCHEMA` sabiti (OpenAI `response_format`) + `parseAkifTurn(raw): AkifTurn \| null` elle doğrulayıcı (5a `parseInbound`/`verifySignature` deseni — proje zod kullanmıyor) | – (saf) |
| `numberSafety.ts` | Türkçe sayı/yüzde/sözlü-sayı çıkarımı + sıra-dışı değer tespiti + araç-arg aralık doğrulama | – (saf) |
| `prompts/persona.ts` … `prompts/humor.ts` (7 dosya) + `prompts/assemble.ts` | Katmanlı sistem-prompt sabitleri + `assembleSystemPrompt(ctx)` | – (saf) |
| `gateway/glossary.ts` | Terim → `{ shortDef, example }` sabit sözlük | – (saf) |
| `gateway/engineDefaults.ts` | `resolveEngineDefaults(db)` → `{ P, K, L }` (GlobalSettings/ProfitLevel → fallback) | Prisma (DI) |
| `gateway/explainTerm.ts` | `explainTerm({ term }) → TermCard` | glossary |
| `gateway/compareContractorOffers.ts` | motor sarar (§3) | `CalculatorEngineV2`, `buildCalculationInput`, engineDefaults |
| `gateway/compareApartmentSizes.ts` | motor sarar (§3) | aynı |
| `gateway/toolRegistry.ts` | allowlist + OpenAI function şemaları + `validateArgs(name, args)` + dispatch | yukarıdaki 3 araç, numberSafety |
| `openaiClient.ts` | `createAkifModel(deps)` — `openai` paketi sarmalayıcısı; `chatWithTools()` + `finalStructured()`; token sayacı | `openai` (DI: instance) |
| `costGuard.ts` | `checkConversationBudget(history)` (token tahmini vs `AKIF_MAX_TURN_TOKENS`), `estimateMonthlySpend(db)` | audit (DI) |
| `audit.ts` | `logTurn(entry)` → `AkifTurnLog` Prisma | Prisma (DI) |
| `orchestrator.ts` | `runAkifTurn(input, deps): Promise<AkifTurn>` — §5 akışı | yukarıdakiler, hepsi DI |

Yeni route: `src/app/api/akif/turn/route.ts`
Yeni sayfa: `src/app/akif/page.tsx` + `page.module.css` + alt bileşenler
`src/components/akif/` (`AkifChat.tsx`, `AkifMessageBubble.tsx`,
`AkifScenarioCard.tsx`, `AkifAssumptionsBar.tsx`)

## 3. Tool Gateway

`explainTerm` şeması: `{ term: enum['emsal','taks','kaks','kat_karsiligi','arsa_payi','iksa','risk_katsayisi'] }`
→ `{ term, shortDef: string, example: string }` (glossary'den; model metni üretmez).

`compareContractorOffers` şeması:
```
{
  arsaAlani: number,           // m², 100–50000
  emsal: number,               // 0.1–5
  muteahhitPaylari: number[],  // her biri 0–100, 2–4 eleman
  daireBuyuklugu?: number,     // 30–500, verilmezse varsayılan
  birimMaliyet?: number,       // TL/m², verilmezse varsayılan
  kaliteSinifi?: 'standart'|'orta'|'luks'
}
```
Yürütme: her `p ∈ muteahhitPaylari` için `x = 1 - p/100`;
`buildCalculationInput({ x, luxLevel: L(kaliteSinifi), apartmentSize: daireBuyuklugu ?? def,
globalUnitPrice: birimMaliyet ?? def, builderProfit: K(def), isAaEnabled: true,
arsaAlani, isApartmentCountEnabled: false, totalApartments: 0, riskLevel: 0,
iksaMode: 'off', iksaPercentage: 0, iksaManualTL: 0 })` → `CalculatorEngineV2.calculate()`.
Çıktı:
```
{
  kind: 'contractor_offers',
  rows: [{ muteahhitPayi, arsaPayiX, arsaSahibiDaireSayisi, arsaSahibiDegeriTL, daireSatisFiyatiTL }],
  defaultsUsed: string[],   // "birimMaliyet=12000", "kalite=orta"
  assumptions: string[],
  emsalNote: string          // "Emsal alanı = arsaAlani × emsal (TAKS/çekme yok sayıldı)"
}
```

`compareApartmentSizes` şeması: `muteahhitPayi` tekil + `daireBuyuklukleri: number[]`;
motorun `Ad` alanı her boyut için varyasyon. Aynı çıktı şekli (`kind:'apartment_sizes'`).

**Ortak:** `toolRegistry.validateArgs` — aralık kontrolleri + yüzde/alan/oran birim
ayrımı. Geçersiz → araç çalışmaz, orchestrator modele "bu değeri kullanıcıya
onaylat" sinyali. Her araç çağrısı `audit.logTurn`'e `tool` + argüman özeti yazar.
Araçlar saf/tekrar-güvenli (yalnız DB OKUR — `engineDefaults`; yazmaz).

**`engineDefaults`:** `GlobalSettings` (P = `globalUnitPrice`), `ProfitLevel` orta
kademe (K), `L` = 1.0/1.2/1.4 (`standart`/`orta`/`luks`, `calculatorUiHelpers`'taki
`QualityTier` ile aynı). DB satırı yoksa sabit fallback `P=12000, K=<orta>, L=1.0`.
Kullanılan her varsayım `defaultsUsed`'a girer → Akif cevabında **her zaman** söyler.

## 4. Çift-kanallı sözleşme (`contract.ts`)

```ts
interface AkifMessage { role: 'user' | 'akif'; content: string }

interface AkifTurn {
  intent: 'explain_term' | 'compare_contractor' | 'compare_apartment_size'
        | 'collect_info' | 'clarify_number' | 'smalltalk' | 'out_of_scope'
  speech: string
  state: 'NEUTRAL'|'THINKING'|'EXPLAINING'|'CAUTION'|'CONFIDENT'|'SERIOUS'|'FRIENDLY'|'HUMOR'
  facts_used: string[]
  assumptions: string[]
  missing_fields: string[]
  tool_result?: ContractorOffersCard | ApartmentSizesCard | TermCard
  needs_confirmation?: { field: string; heard: string; question: string }
  risk_level: 'low' | 'medium' | 'high'
}
```
`speech`, `tool_result` ve ekran rozetleri **aynı turdan** türetilir — vizyon §47
"ses, hesap ve ekran aynı kaynak sonuçtan". OpenAI `response_format:
{ type: 'json_schema', json_schema: { schema: AKIF_TURN_JSON_SCHEMA } }` (elle
yazılmış sabit) ile final tur bu şemada döner; dönen JSON `parseAkifTurn()` ile
sunucuda ayrıca doğrulanır.

## 5. Orchestrator akışı (`runAkifTurn`)

Girdi: `{ conversationId, history: AkifMessage[], userMessage: string }`.
DI: `{ model, toolRegistry, numberSafety, prompts, audit, costGuard, now }`.

1. `costGuard.checkConversationBudget(history + userMessage)` — token tahmini
   `AKIF_MAX_TURN_TOKENS`'ı aşıyorsa → `AkifTurn` `intent:'out_of_scope'`,
   `speech:"Konuşmamız uzadı, yeni bir sohbet açalım."`, dur.
2. `extracted = numberSafety.extract(userMessage)` — aday sayılar + sıra-dışı
   işaretler.
3. **OpenAI çağrısı 1** (`model.chatWithTools`): `assembleSystemPrompt` + history +
   userMessage + 3 tool tanımı. Sonuç: ya `tool_call` ya düz metin.
4. `tool_call` varsa:
   - `toolRegistry.validateArgs(name, args)`. Geçersiz → tool ÇALIŞTIRMA;
     modele "invalid_args: <alan> <sebep>" tool-result olarak besle (adım 5'e
     `needs_confirmation` düşecek).
   - Geçerli → `toolRegistry.dispatch(name, args, { db })` → `ToolResult`.
   - `audit`'e tool + args + süre.
5. **OpenAI çağrısı 2** (`model.finalStructured`): önceki mesajlar + (varsa) tool
   result + `response_format: AkifTurn json_schema`. Model final `AkifTurn` üretir.
6. Sunucu-tarafı doğrulama: `parseAkifTurn(raw)`. `tool_result` varsa
   orchestrator'ın gerçekten çalıştırdığı sonuçla DEĞİŞTİRİLİR (model uydurmasın —
   vizyon §53 "araç sonucu yokken sonucu varmış gibi tamamlamaz"). `assumptions`'a
   `defaultsUsed` eklenir.
7. `audit.logTurn({ conversationId, turn, model, promptTokens, completionTokens,
   estCostUsd, intent, tool, ts })`. `AkifTurn` döner.

## 6. Route + sayfa

`src/app/api/akif/turn/route.ts` — `POST`:
- `getServerSession` opsiyonel; rate limit `RATE_LIMITS.AKIF_TURN`
  (`{ limit: 8, windowMs: 60_000 }` kullanıcı/IP başına — LLM çağrısı pahalı).
- Gövde: `{ conversationId: string, history: AkifMessage[] (max 40), userMessage: string (max 2000) }`.
- `runAkifTurn(...)` → `AkifTurn` JSON. `export const runtime = 'nodejs'`.
- `OPENAI_API_KEY` yoksa route modül seviyesinde THROW ETMEZ — çağrı anında
  `500 { error: 'akif_unavailable' }`.

`src/app/akif/page.tsx` — `'use client'`:
- Metin sohbet: mesaj listesi + input. `conversationId` = client'ta üretilen
  `cuid`/`crypto.randomUUID`.
- Her `AkifTurn` render: `speech` balonu + `AkifAssumptionsBar` (`assumptions` +
  `missing_fields` rozetleri) + `needs_confirmation` varsa vurgulu "Evet/Hayır"
  satırı + `tool_result` varsa `AkifScenarioCard` (2–4 satırlık senaryo tablosu,
  `formatTRCurrency` ile).
- Geçmiş yalnız client state (kalıcılık yok). Sayfa yenilenince sohbet sıfırlanır
  (MVP — Akif-3 hafıza).
- Sayfa `frontend-design` diline uyar (mevcut `/deger`, `/hesapla` ile tutarlı).

## 7. Yeni Prisma modeli (audit)

```prisma
model AkifTurnLog {
  id               String   @id @default(cuid())
  conversationId   String
  turn             Int
  model            String
  promptTokens     Int
  completionTokens Int
  estCostUsd       Float
  intent           String
  tool             String?
  createdAt        DateTime @default(now())
  @@index([conversationId])
  @@index([createdAt])
}
```
Elle SQL migration `prisma/migrations/20260902090000_add_akif_turn_log/`. Dev'de
uygulanır; prod'a batch deploy'da. (Ham prompt/kullanıcı metni SAKLANMAZ — yalnız
sayaçlar + niyet/araç. Gizlilik: vizyon §49.)

`costGuard.estimateMonthlySpend` bu tablodan `sum(estCostUsd)` (bu ay) okur;
`AKIF_MONTHLY_BUDGET_USD` aşılırsa yeni turlar `akif_unavailable` döner (fail-safe).

## 8. Bağımlılık

**Tek yeni bağımlılık:** `openai` npm paketi (resmi, TS tipleri, tool-calling +
structured outputs). `package.json`'a eklenir. **zod EKLENMEZ** — proje zod
kullanmıyor; `AkifTurn` doğrulaması elle (`parseAkifTurn`), OpenAI `response_format`
elle yazılmış JSON schema sabiti.

## 9. Eval + test stratejisi

**Jest (deterministik katman, DI + mock model):**
| Modül | Test |
|---|---|
| `numberSafety` | "dokuz yüz"→900, "bir virgül elli"→1.5, "yüzde elli"→50, "1.500 m²", sıra-dışı emsal "15"→flag, yüzde toplamı, alan aralığı |
| `gateway/glossary` + `explainTerm` | her terim → sabit metin |
| `compareContractorOffers` | sahte engineDefaults; `muteahhitPayi 50` → `x=0.5`; motor gerçek çağrılır, satır sayısı + `defaultsUsed` |
| `compareApartmentSizes` | `Ad` varyasyonu |
| `toolRegistry.validateArgs` | aralık dışı her alan → reddet |
| `prompts/assemble` | 7 parça birleşti, persona metni içeriyor |
| `costGuard` | token tavanı; aylık bütçe aşımı |
| `contract` | `parseAkifTurn` (geçerli / eksik alan / yanlış enum → null) |
| `orchestrator` | model + tüm bağımlılıklar sahte: (a) explain niyet → glossary tool → AkifTurn; (b) eksik alan → `collect_info` + `missing_fields`; (c) sıra-dışı sayı → tool çalışmaz + `needs_confirmation`; (d) tam sorgu → compare tool → `tool_result` orchestrator sonucuyla değiştirilir; (e) bütçe aşımı → out_of_scope |
| `api/akif/turn/route` | POST şema; `OPENAI_API_KEY` yok → 500 `akif_unavailable`; rate limit; `runAkifTurn` çağrıldı (mock) |

**Model kalite eval'i (`src/lib/ai/akif/__evals__/` + `npm run akif:eval`):**
GERÇEK API'ye vurur (ücretli, ELLE çalıştırılır, `AKIF_EVAL_BUDGET_USD` guard).
~25 senaryo fixture: `{ history, userMessage, expect: { intent, toolCalled?,
extractedNumbers?, missingFields? } }`. Kapsam (vizyon §53): niyet, veri çıkarımı,
sayı/birim, araç seçimi, eksik bilgi, varsayım bildirimi, motor-uyumu, cevap
uzunluğu, şive ölçüsü, yanlış-kesinlik. Skor tablosu stdout. **CI'da koşmaz.**

`tsc` + `npm run build` + tüm jest her task'ta.

## 10. Ön koşullar (kullanıcı — kod değil)

1. OpenAI projesi + API anahtarı + **proje bazlı aylık harcama limiti** (OpenAI
   panelinden — kod tarafı `AKIF_MONTHLY_BUDGET_USD` ikinci kat güvenlik).
2. Env: `OPENAI_API_KEY` (zorunlu), `AKIF_MODEL` (varsayılan `gpt-4o-mini`),
   `AKIF_MAX_TURN_TOKENS` (varsayılan 6000), `AKIF_MONTHLY_BUDGET_USD`
   (varsayılan 20), `AKIF_EVAL_BUDGET_USD` (varsayılan 2).
3. Karadeniz'li kullanıcılarla karakter algı testi (vizyon §49) — deploy sonrası.

## 11. Deploy notu

`codex/professional-ui-and-land-cost`'ta birikir. Hafızadaki plan: Akif-1 + 6b +
6c hepsi lokal bitince **tek seferde** `main` merge + push + Coolify deploy + tüm
bekleyen migration'lar (`...` + `AkifTurnLog`) + OpenAI env. `/akif` sayfası ancak
o deploy'dan + `OPENAI_API_KEY`'den sonra çalışır. Deploy öncesi `npm run akif:eval`
gerçek anahtarla lokal çalıştırılıp skor tablosu gözden geçirilmeli; gpt-4o-mini
eşikleri (vizyon §52) tutmuyorsa `AKIF_MODEL=gpt-4o`.

## 12. Açık noktalar / v1 kalıntıları

- `emsal` doğrudan "yapılaşma alanı = arsaAlani × emsal" kabul edilir; TAKS/çekme
  mesafesi yok sayılır — Akif bunu her cevapta `emsalNote` ile söyler. Gerçek
  taban oturumu Akif ilerleyen fazda.
- Stateless sunucu → uzun sohbette her tur tüm geçmiş yeniden gönderilir (token
  maliyeti artar); `costGuard` turu keser. Özet-sıkıştırma = Akif-3.
- `response_format json_schema` — `gpt-4o-mini` bunu destekliyor; model değişirse
  `openaiClient` fallback (tool-as-response) gerekebilir.
- Karakter yalnız prompt'ta — eval "şive ölçüsü" skoru düşükse prompt iterasyonu
  (kod değişmez).
- Rate limit bellek-içi (tek container) — 5a/5b ile aynı sınır.
- Akif-1 `/akif` sayfası anonim çalışır (session opsiyonel) — kötüye kullanım
  riski rate-limit + aylık bütçe + token tavanıyla sınırlı; kimlik zorunluluğu
  ileride değerlendirilir.
