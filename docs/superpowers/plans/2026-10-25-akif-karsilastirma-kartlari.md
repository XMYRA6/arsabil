# Akif Önerili Karşılaştırma Kartları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Akif'in sesli ve metin sohbetinde arsa–arsa, müteahhit payı ve daire büyüklüğü kıyaslarını, deterministik "Akif'in önerisi" ile birlikte kart olarak göstermek; konuşmada yalnız özet söylemek.

**Architecture:** Yeni `ParcelCompareCard` tipi ve `ScenarioCard.recommendation` alanı `contract.ts`'e eklenir. Öneri kuralları saf bir modülde (`recommend.ts`) yaşar. Yeni `compareParcels` aracı ve öneri ekleme, paylaşılan `toolRegistry.ts`/`AKIF_TOOL_DEFS`'e DOKUNMADAN, ayrı bir "rich" gateway'de (`richTools.ts`) yaşar ve yalnız sesli route ile web `turn` route'una bağlanır (WhatsApp etkilenmez). Konuşma kuralı, paylaşılan `assemble.ts`'e değil, `extraSystemPrompt` / `realtimeSession` yoluyla eklenir.

**Tech Stack:** Next.js, TypeScript, jest + React Testing Library, mevcut `lookupParcel` / `buildDegerCard`.

**Spec:** `docs/superpowers/specs/2026-10-25-akif-karsilastirma-kartlari-design.md`

Test komutu: `npx jest <yol>` (repo kökünde). Tip kontrolü: `npx tsc --noEmit`.

## Global Constraints

- Sayılar yalnız motor/araç çıktısından gelir; öneri kuralı kafadan hesap yapmaz (spec Anti-hedef).
- `toolRegistry.ts`, `AKIF_TOOL_DEFS`, `ToolName`, `assemble.ts` LAYERS ve `src/app/api/whatsapp/**` DEĞİŞMEZ; WhatsApp davranışı aynı kalır.
- `prepareScenarioSave` ve kayıtlı senaryo şeması değişmez; öneri display-only.
- Üye ayrımı: `memberView = !!userId` (mevcut `/api/deger/kart` kuralı). Ücretsiz katmanda kesin tahmin, m² birim değeri ve öneri GÖNDERİLMEZ (sunucuda kesilir, yalnız UI'da gizlenmez).
- Mobil 390px'te tablo yatay kaydırmayla okunur (mevcut `.scroll` deseni).
- Test-first; her task sonunda commit; commit mesajı sonuna `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Parsellerden biri `ambiguous`/`parcel_not_found`: tablo kalan satırlarla çıkar, öneri yoktur (Task 3).
- Farklı `basis` (mahalle/ilçe/il) karışımı veya `thinData`/`insufficientData`: öneri yok, "doğrudan kıyaslanamaz" notu (Task 2).
- İki parselin m² değeri %1'den az farklı (beraberlik): öneri yok (Task 2).
- Ücretsiz kullanıcı yanıtında üye alanlarının (`estimate`, `pricePerSqm`, öneri) JSON'da hiç bulunmaması (Task 3).
- Aynı parsel iki kez verildi veya 5 parsel verildi: `invalid_args` (Task 3).

---

### Task 1: Sözleşme tipleri

**Files:**
- Modify: `src/lib/ai/akif/contract.ts:46-85`
- Test: `src/lib/ai/akif/__tests__/contract.recommendation.test.ts` (tip düzeyi + parseAkifTurn geçişi)

**Interfaces:**
- Produces (contract.ts):
  - `interface Recommendation { rowIndex: number; criterion: string; reason: string }` — `criterion` kartta "neye göre" olarak gösterilir.
  - `ScenarioCard.recommendation?: Recommendation`
  - `interface ParcelCompareRow { label: string; status: ParcelCard['status']; areaSqm?: number; basis?: 'mahalle' | 'ilce' | 'il'; thinData?: boolean; rangeLow?: number; rangeHigh?: number; estimate?: number; pricePerSqm?: number; confidence?: 'yuksek' | 'orta' | 'dusuk'; siteUrl?: string; candidates?: string[] }`
  - `interface ParcelCompareCard { kind: 'parcel_compare'; tier: 'free' | 'member'; rows: ParcelCompareRow[]; recommendation?: Recommendation; note?: string; upgradeHint?: boolean }`
  - `ToolResultCard` birleşimine `ParcelCompareCard` eklenir.

- [ ] **Step 1: Write the failing test** — `contract.recommendation.test.ts`: `ScenarioCard` literal'i `recommendation: { rowIndex: 1, criterion: 'arsa sahibi değeri', reason: 'x' }` ile ve `ParcelCompareCard` literal'i `ToolResultCard` değişkenine atanır (`const c: ToolResultCard = {...}`); `expect(c.kind).toBe('parcel_compare')`. Jest ts-jest tip hatasını da yakalar.
- [ ] **Step 2: Run test to verify it fails** — `npx jest src/lib/ai/akif/__tests__/contract.recommendation.test.ts` → FAIL (tip hatası).
- [ ] **Step 3: Implement** tipleri `contract.ts`'e ekle (yukarıdaki imzalar birebir).
- [ ] **Step 4: Run** `npx jest src/lib/ai/akif/__tests__/contract.recommendation.test.ts` ve `npx tsc --noEmit` → PASS. `tsc` başka dosyalarda `ToolResultCard` üzerinde tüketici switch'lerde hata veriyorsa (`workspace.ts`, `orchestrator.ts`, `score.ts`, `akifHandleMessage.ts`) bunları bu task'ta DAR şekilde düzelt: bilinmeyen `parcel_compare` kind'ı mevcut davranışı değiştirmeden yok sayılsın (WhatsApp bu kartı hiç üretmez).
- [ ] **Step 5: Commit** — `feat(akif): ParcelCompareCard ve Recommendation sözleşmesi`

---

### Task 2: Öneri kuralları (saf modül)

**Files:**
- Create: `src/lib/ai/akif/gateway/recommend.ts`
- Test: `src/lib/ai/akif/gateway/__tests__/recommend.test.ts`

**Interfaces:**
- Consumes: Task 1 tipleri.
- Produces:
  - `recommendScenario(card: ScenarioCard): Recommendation | undefined` — `contractor_offers` ve `apartment_sizes` için `arsaSahibiDegeriTL` en yüksek satır; `null` değerli satırlar elenir; en az 2 geçerli satır yoksa veya en yüksek iki değer eşitse `undefined`. `criterion`: `'arsa sahibi değeri'`.
  - `recommendParcels(rows: ParcelCompareRow[]): { recommendation?: Recommendation; note?: string }` — yalnız `status === 'resolved'`, `estimate` ve `areaSqm > 0` olan, `thinData` olmayan, `confidence !== 'dusuk'` satırlar adaydır. Birim değer = `estimate / areaSqm`. Adaylar ≥2 değilse öneri yok. Adayların `basis` değerleri farklıysa öneri yok, `note: 'Parseller farklı veri seviyesinden (mahalle/ilçe/il) fiyatlandığı için doğrudan kıyaslanamaz.'`. En yüksek iki birim değer %1'den az farklıysa öneri yok. Aksi halde en yüksek birim değerli satır; `criterion: 'm² birim değeri'`; `reason` birim değeri `tr-TR` biçimli ve ₺/m² ile yazar. Not: "yüksek = daha değerli bölge" anlamındadır, "ucuz = iyi alım" değil; `reason` bunu ima etmez, yalnız ölçütü söyler.

- [ ] **Step 1: Write the failing tests** — adlar ve assertion'lar: `recommendScenario picks highest arsaSahibiDegeriTL`; `recommendScenario returns undefined on tie`; `recommendScenario ignores null rows and needs 2 valid`; `recommendParcels picks highest estimate/area`; `recommendParcels undefined when basis differs and sets note`; `recommendParcels undefined when thinData or confidence dusuk row makes candidates <2`; `recommendParcels undefined within 1% tie`; `recommendParcels ignores non-resolved rows`. `rowIndex` her zaman girdi dizisindeki indekstir (elenen satırlar indeksi kaydırmaz).
- [ ] **Step 2: Run** `npx jest src/lib/ai/akif/gateway/__tests__/recommend.test.ts` → FAIL.
- [ ] **Step 3: Implement** yukarıdaki iki fonksiyon.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(akif): deterministik öneri kuralları`

---

### Task 3: `compareParcels` aracı ve rich gateway

**Files:**
- Create: `src/lib/ai/akif/gateway/compareParcels.ts`
- Create: `src/lib/ai/akif/gateway/richTools.ts`
- Create: `src/lib/ai/akif/gateway/parcelLookupDeps.ts`
- Test: `src/lib/ai/akif/gateway/__tests__/compareParcels.test.ts`, `.../richTools.test.ts`

**Interfaces:**
- Consumes: `lookupParcel(args: LookupParcelArgs, deps: LookupParcelDeps): Promise<ParcelCard>` (`lookupParcel.ts`), `recommendParcels`, `recommendScenario`, `dispatchTool`/`validateArgs`/`DispatchDeps`/`ToolName` (`toolRegistry.ts`, değiştirilmez).
- Produces:
  - `compareParcels.ts`: `interface CompareParcelsArgs { parcels: LookupParcelArgs[] }`; `compareParcels(args: CompareParcelsArgs, deps: LookupParcelDeps, opts: { memberView: boolean }): Promise<ParcelCompareCard>`. Parseller `Promise.all` ile paralel çözülür. Satır `label`: `"${mahalle} ${ada}/${parsel}"` (çözülemeyen satırda girilen metinler). Üye katmanı: `estimate`, `pricePerSqm` (= `estimate/areaSqm`), `confidence`, `rangeLow/High` = `memberRangeLow/High`, öneri `recommendParcels` ile. Ücretsiz katman: yalnız `rangeLow/High` = `freeRangeLow/High`, `areaSqm`, `basis`; `estimate`/`pricePerSqm`/`confidence`/öneri HİÇ yazılmaz, `upgradeHint: true`. Çözülemeyen parsel satırı `status` ve (`ambiguous` ise) `candidates` taşır. Başarılı (`resolved`) satır sayısı <2 ise `recommendation` yok.
  - `parcelLookupDeps.ts`: `createParcelLookupDeps(opts: { memberView: boolean }): LookupParcelDeps` — webhook'taki wiring'in aynısı (`createAnonCardDeps()` + `findAreaTrend: async () => []`, `findDistrictDemographics: async () => null`, `resolveDeps: { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi }` `@/lib/tkgm/idariYapi`'den, `siteUrlFor` webhook'taki URL şablonu); `buildCard` `memberView: opts.memberView` ile `buildDegerCard` çağırır. Webhook dosyası değiştirilmez.
  - `richTools.ts`: `type RichToolName = ToolName | 'compareParcels'`; `RICH_EXTRA_TOOL_DEFS: OpenAiToolDef[]` (yalnız `compareParcels`: `parcels` dizisi, her eleman `ilText, ilceText, mahalleText, ada, parsel` string, `additionalProperties: false`; açıklama: 2–4 arsayı yan yana kıyaslar, her parsel için tüm beş alan toplandıktan sonra çağır); `isRichToolName(n: string): n is RichToolName`; `validateRichArgs(name: RichToolName, args: unknown): ValidateResult` (`compareParcels`: `parcels` dizi 2–4, her eleman 5 alan boş olmayan string, ada/parsel `^\d{1,7}$`, aynı (mahalle,ada,parsel) tekrarı `invalid_args`; diğer isimler `validateArgs`'a delege); `dispatchRichTool(name, args, deps: { db: DispatchDeps['db']; parcelDeps: LookupParcelDeps; memberView: boolean }): Promise<ToolResultCard>` (`compareParcels` → `compareParcels`; `compareContractorOffers`/`compareApartmentSizes` → `dispatchTool` sonucuna `recommendScenario` ile `recommendation` ekler; `explainTerm` aynen).

- [ ] **Step 1: Write the failing tests** — `compareParcels.test.ts` (sahte `LookupParcelDeps` ile): `member tier includes estimate pricePerSqm and recommendation`; `free tier omits estimate pricePerSqm confidence recommendation and sets upgradeHint` (assert: `JSON.stringify(card)` içinde `"estimate"` ve `"pricePerSqm"` yok); `one ambiguous parcel keeps other rows and no recommendation`; `resolved rows < 2 gives no recommendation`. `richTools.test.ts`: `validateRichArgs rejects 1 and 5 parcels`; `rejects duplicate parcel`; `rejects non-numeric ada`; `dispatchRichTool adds recommendation to contractor_offers`; `dispatchRichTool leaves explainTerm card unchanged`; `RICH_EXTRA_TOOL_DEFS does not include existing tools and AKIF_TOOL_DEFS is unchanged` (assert `AKIF_TOOL_DEFS.map(t=>t.function.name)` hâlâ yalnız 3 araç).
- [ ] **Step 2: Run** `npx jest src/lib/ai/akif/gateway/__tests__/compareParcels.test.ts src/lib/ai/akif/gateway/__tests__/richTools.test.ts` → FAIL.
- [ ] **Step 3: Implement** yukarıdaki imzalarla; `parcelLookupDeps.ts` için webhook (`src/app/api/whatsapp/webhook/route.ts:60-82`) örnek alınır.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(akif): compareParcels aracı ve rich gateway`

---

### Task 4: Sesli route bağlantısı

**Files:**
- Modify: `src/app/api/akif/voice/tool/route.ts`, `src/lib/ai/akif/voice/realtimeSession.ts:42-43`
- Modify: `src/lib/ai/akif/voice/__tests__/realtimeSession.test.ts`
- Test: mevcut voice tool route testi varsa genişlet, yoksa `src/app/api/akif/voice/tool/__tests__/route.compare.test.ts` oluştur.

**Interfaces:**
- Consumes: `isRichToolName`, `validateRichArgs`, `dispatchRichTool`, `RICH_EXTRA_TOOL_DEFS`, `createParcelLookupDeps` (Task 3).
- Produces: sesli route `compareParcels`'ı kabul eder; `buildRealtimeSessionConfig(...).tools` = `[...AKIF_TOOL_DEFS, ...ACTION_TOOL_DEFS, ...RICH_EXTRA_TOOL_DEFS]`. Route `memberView: true` kullanır (route zaten giriş şart koşar). `dispatchTool` çağrısı `dispatchRichTool` ile değiştirilir (`explainTerm`/senaryo araçları da bu yoldan geçer, böylece sesli kartlarda öneri olur). `TOOL_NAMES` kontrolü `isRichToolName` olur. `compareParcels` için ek rate limit: `checkRateLimit('akif-compare-parcels:user:' + userId, RATE_LIMITS.AKIF_COMPARE_PARCELS)` ile `rate-limit.ts`'e `AKIF_COMPARE_PARCELS: { limit: 6, windowMs: 60_000 }`; aşılırsa 429 (mevcut desen).

- [ ] **Step 1: Write the failing tests** — `realtimeSession.test.ts`: `tools include compareParcels`. Route testi: `compareParcels with valid args returns parcel_compare card (member)`; `compareParcels 1 parcel returns invalid_args 200`; `unauthenticated 401`; `scenario tool result carries recommendation`.
- [ ] **Step 2: Run** ilgili testler → FAIL.
- [ ] **Step 3: Implement** route ve session değişiklikleri.
- [ ] **Step 4: Run** testler + `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** — `feat(akif): sesli yola compareParcels ve önerili senaryolar`

---

### Task 5: Web metin sohbeti bağlantısı

**Files:**
- Modify: `src/app/api/akif/turn/route.ts:166-167`, `src/lib/ai/akif/orchestrator.ts:204-206`
- Test: orchestrator ve turn route mevcut test dosyalarına ekle.

**Interfaces:**
- Consumes: Task 3 çıktıları; `createAkifModel({ ..., toolDefs })` zaten `toolDefs` kabul eder (`openaiClient.ts`).
- Produces: `turn` route modele `[...AKIF_TOOL_DEFS, ...RICH_EXTRA_TOOL_DEFS]` verir, `dispatch`/`validateArgs` rich sürümlerini kullanır; `memberView: !!sessionUserId`. Orchestrator step 7'de `toolResult.kind === 'parcel_compare'` kartı `turn.tool_result`'a olduğu gibi geçer (`term/parcel/project` dalı gibi). `dispatch` tipi `(name: ToolName, ...)`'den `(name: RichToolName, ...)`'e genişletilir; WhatsApp'ın `AkifHandleDeps` tipi bozulmaz (jenerik/union genişletme, WhatsApp çağrı yeri değişmez).

- [ ] **Step 1: Write the failing tests** — orchestrator: `parcel_compare tool result is passed through to turn.tool_result`; `scenario tool result keeps recommendation after row rounding`. Turn route: `anonymous user gets free-tier card without estimate`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** orchestrator/turn testleri, `npx jest src/lib/whatsapp` (WhatsApp regresyonu yok) ve `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** — `feat(akif): metin sohbetine compareParcels ve öneri`

---

### Task 6: Konuşma kuralı (özet + istek üzerine detay)

**Files:**
- Create: `src/lib/ai/akif/prompts/comparisonRules.ts`
- Modify: `src/lib/ai/akif/voice/realtimeSession.ts:42`, `src/app/api/akif/turn/route.ts` (assemble çağrısına `extraSystemPrompt`), `src/components/akif/voice/voiceToolBridge.ts`
- Test: `src/lib/ai/akif/__tests__/comparisonRules.test.ts`, `voiceToolBridge.test.ts` (genişlet), `realtimeSession.test.ts` (genişlet)

**Interfaces:**
- Produces: `COMPARISON_RULES_PROMPT: string` — içerir: kıyas kartı (contractor_offers, apartment_sizes, parcel_compare) ekranda göründüğünde cevap yalnız özet + öneri (satırları tek tek okuma); kullanıcı "anlat/oku/satır satır" derse satır satır anlat; "sence/yorumla/hangisi" derse yorum yap; karttaki `recommendation` varsa onu ve `criterion`'ını söyle, yoksa öneri uydurma ve `note`'u aktar; `upgradeHint` varsa kısaca üyelikle detay açılacağını söyle; kafadan sayı yasağı geçerli; parsel için beş alanı (il, ilçe, mahalle, ada, parsel) toplamadan `compareParcels` çağırma. `assemble.ts`/WhatsApp'a EKLENMEZ. Sesli: `instructions` = `${base}\n\n${VOICE_RHYTHM_PROMPT}\n\n${COMPARISON_RULES_PROMPT}`. Metin: `turn` route'ta `extraSystemPrompt: COMPARISON_RULES_PROMPT`.
- `voiceToolBridge.runVoiceToolCall`: dönen kart `kind` ∈ {`contractor_offers`,`apartment_sizes`,`parcel_compare`} ise `outputForModel` = `JSON.stringify({ ...data, displayNote: 'Kart ekranda gösterildi; satırları okuma, yalnız özet ve öneriyi söyle.' })`; `card` alanı DEĞİŞMEZ (UI'a `displayNote` sızmaz).

- [ ] **Step 1: Write the failing tests** — `comparisonRules.test.ts`: prompt `'satır satır'`, `'recommendation'`, `'upgradeHint'`, `'compareParcels'` içerir; `assembleSystemPrompt({hasHistory:false})` çıktısı `comparisonRules` metnini İÇERMEZ (WhatsApp yolu temiz). `voiceToolBridge.test.ts`: `comparison card output for model carries displayNote while card object does not`; `term card output has no displayNote`. `realtimeSession.test.ts`: `instructions contain comparison rules`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** testler → PASS.
- [ ] **Step 5: Commit** — `feat(akif): kıyas kartlarında özet-önce konuşma kuralı`

---

### Task 7: Kart arayüzü

**Files:**
- Create: `src/components/akif/AkifRecommendation.tsx` (+ `.module.css`), `src/components/akif/AkifParcelCompareCard.tsx` (+ `.module.css`)
- Modify: `src/components/akif/AkifScenarioCard.tsx`, `src/components/akif/voice/AkifVoiceTranscript.tsx`, `src/components/akif/AkifChat.tsx:122-126`
- Test: `AkifParcelCompareCard.test.tsx`, `AkifScenarioCard.test.tsx` (genişlet), `voice/__tests__/AkifVoiceTranscript.test.tsx` (genişlet), `AkifChat.test.tsx` (genişlet)

**Interfaces:**
- Consumes: Task 1 tipleri.
- Produces: `AkifRecommendation({ recommendation, rowLabel }: { recommendation: Recommendation; rowLabel: string })` — "Akif'in önerisi" başlığı, `rowLabel`, `reason` ve "Ölçüt: {criterion}" gösterir. `AkifParcelCompareCard({ card }: { card: ParcelCompareCard })` — satır başına parsel; üyede tahmin, ₺/m², güven, aralık; ücretsizde yalnız aralık ve alan; `upgradeHint` ise üyelik daveti (hedef: `AkifParcelCard.tsx`'te zaten kullanılan üyelik/giriş bağlantısı, yoksa `/giris`); çözülemeyen satırda durum metni ve (`ambiguous`) adaylar; `recommendation.rowIndex` satırı vurgulu (`aria-current="true"` + css sınıfı); `note` varsa gösterilir; tablo `.scroll` içinde. `AkifScenarioCard` `card.recommendation` varsa o satırı vurgular ve tablonun altında `AkifRecommendation` gösterir. `AkifVoiceTranscript` ve `AkifChat` `kind === 'parcel_compare'` için `AkifParcelCompareCard` render eder.

- [ ] **Step 1: Write the failing tests** — `shows recommended row highlighted with aria-current`; `free tier shows range and upgrade prompt and no estimate text`; `unresolved row shows status text`; `scenario card renders recommendation block when present and none when absent`; `voice transcript renders parcel_compare card`; `chat renders parcel_compare card`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; stil mevcut kart modüllerinin değişkenlerini/desenini izler (`AkifScenarioCard.module.css`); 390px'te taşma yok.
- [ ] **Step 4: Run** testler + `npx tsc --noEmit` + `npx eslint src/components/akif` → PASS.
- [ ] **Step 5: Commit** — `feat(akif): karşılaştırma ve öneri kartı arayüzü`

---

### Task 8: Bütüncül doğrulama (gerçek build + tarayıcı)

**Files:** kod değişmez; gerekirse önceki task'larda bulunan hatalar düzeltilir.

- [ ] **Step 1:** `npx jest src/lib/ai/akif src/components/akif src/app/api/akif src/lib/whatsapp` → hepsi PASS (WhatsApp regresyonu yok).
- [ ] **Step 2:** `npx tsc --noEmit` ve `npm run build` → hatasız (ESM/Turbopack build-time hatalarını jest yakalamaz).
- [ ] **Step 3:** `npm run dev` ile gerçek tarayıcıda (giriş yapmış üye): metin sohbetinde iki gerçek parsel kıyası → tablo + öneri görünür; anonim pencerede aynı kıyas → aralık tablosu + üyelik daveti, ağ yanıtında `estimate` yok; müteahhit payı kıyasında öneri satırı vurgulu; 390px genişlikte taşma yok. Sesli oturum gerçek ses davranışı (özet söyleme, "anlat" ile satır satır) elle smoke edilir; sonuç raporlanır, otomatik doğrulanmış sayılmaz.
- [ ] **Step 4:** Bulgu varsa düzelt, ilgili testi ekle, commit.

---

## Bilinen açıklar (plan dışı, kullanıcıya raporlanacak)

- Kullanıcının ürün kota modeli (kayıtsız 1 → doğrulanmış 5 → premium ~100 sorgu) için kalıcı sayaç koda YOK (`PlanResource` yalnız reports/listings/scenarios). Bu plan yalnız dakika bazlı rate limit koyar (Task 4); kalıcı sorgu kotası ayrı bir iş.
- Parsel kıyasında öneri ölçütü "m² birim değeri en yüksek" (bölgenin değerini gösterir, "ucuz alım" demez); yönün ürün olarak doğru olup olmadığı kullanıcı onayına açık.
- VPS dağıtımı bu planın dışında; erişim doğrulanıp ayrıca onayla yapılacak.
