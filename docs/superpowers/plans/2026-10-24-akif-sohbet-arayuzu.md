# Akif sohbet arayüzü Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/akif` sayfasını kalıcı sohbet geçmişi, aranabilir sol kenar çubuğu, canlı çalışma paneli ve sohbet içi sesli moduyla ChatGPT düzenine çevirmek.

**Architecture:** Sohbet kalıcılığı sunucuda (iki yeni Prisma modeli); `POST /api/akif/turn` oturum varsa tur çiftini yazar, orkestrasyon değişmez. Panel durumu saklanmaz, kayıtlı `AkifTurn`/ses kartlarından saf bir indirgeyiciyle türetilir. Arayüz `src/components/akif/chat/` altında yeni bir kabuk (`AkifShell`) olarak kurulur; mevcut `AkifChat`/`AkifVoicePanel` yeni düzene uyarlanır.

**Tech Stack:** Next.js (App Router) + React, Prisma/PostgreSQL, next-auth, Jest + Testing Library (jsdom), CSS Modules, Arazi tokenları (`src/styles/tokens-arazi.css`), Playwright (görsel doğrulama).

**Spec:** `docs/superpowers/specs/2026-10-24-akif-sohbet-arayuzu-design.md` (özellikle §6 ve §10 kararları)

## Global Constraints

- Orkestrasyona (`src/lib/ai/akif/orchestrator.ts`, araçlar, `useRealtimeVoice` iç işleyişi, maliyet/rate-limit korumaları) DOKUNULMAZ.
- Giriş yapmamış (misafir) akış bugünkü gibi çalışır: sohbet yalnız bellekte, kaydedilmez; kenar çubuğunda "Sohbetlerini kaydetmek için giriş yap" bandı.
- Bildirim zili / emoji HİÇBİR yerde yok; ikonlar `src/components/icons` ya da satır içi SVG.
- Açık temada siyah blok yok (metin `--ink` `#2F3B34`, bej zemin); koyu tema navy. Ses küresinde parlama/bulanık ışık (glow) yok, yalnız sakin halkalar.
- Başarısız tur (429/503/502) kaydedilmez. Misafir→giriş geçişinde misafir sohbeti taşınmaz.
- `prefers-reduced-motion`'da tüm yeni animasyonlar kapalı. Mobil genişlik 390 px'te her ekran kontrol edilir (açık+koyu).
- Başlık: ilk kullanıcı mesajının ilk 40 karakteri (LLM yok). Panelde değer düzenleme yok (yalnız gösterir).
- Arama: `searchText` sütunu = küçük harf + ASCII katlama; Postgres eklentisi yok.
- Prisma tablo adı `AkifChatMessage` (TS sözleşmesindeki `AkifMessage` ile çakışmasın).

## Review Focus

- Başkasının `conversationId`'si ile gelen istek: sohbet oluşturulmaz/okunmaz, turn 409, GET/PATCH/DELETE 404 (Task 2, 3, 4).
- Türkçe arama: "ISPARTA", "ışık", "İzmir" sorgusu `i/ı/İ/I` farkı olmadan bulur (Task 1, 2).
- Aynı ses transkriptinin iki kez yollanması (`sendBeacon` + normal istek): mesajlar çoğalmaz (Task 2).
- Hiç sohbeti/senaryosu olmayan kullanıcı ve misafir: kenar çubuğu boş durumları bozuk görünmez (Task 6, 7).
- Çok uzun başlık/mesaj ve 15+ sohbet: satır kırpılır, "Daha fazla göster" çalışır (Task 6, 7).
- Eksik alanlı senaryo/kart (`pricePerSqm` yok, `inputs` boş): panel "—" gösterir, çökmez (Task 5, 8).
- Geçmiş sohbeti açınca "eski → yeni" vurgusu çıkmaz; canlı değişimde çıkar (Task 5, 9).

---

## File Structure

- `prisma/schema.prisma` + `prisma/migrations/20261024120000_add_akif_conversations/migration.sql` — iki yeni model.
- `src/lib/akif/chat/fold.ts` — `foldTr` (arama normalizasyonu).
- `src/lib/akif/chat/conversationStore.ts` — kalıcılık fonksiyonları (DI'li, saf test edilebilir) + `getChatDb()`.
- `src/lib/akif/chat/workspace.ts` — panel durumu indirgeyicisi (`deriveWorkspace`, `diffWorkspace`).
- `src/lib/akif/chat/scenarios.ts` — `mergeScenarios` (site projeleri + proje kartları → tek liste).
- `src/lib/akif/chat/groupByDate.ts` — kenar çubuğu tarih grupları.
- `src/app/api/akif/conversations/route.ts`, `[id]/route.ts`, `[id]/voice-transcript/route.ts` — uç noktalar.
- `src/app/api/akif/turn/route.ts` — kalıcılık ekleme (mevcut dosya).
- `src/components/akif/chat/` — `AkifShell`, `AkifSidebar`, `WorkspacePanel`, `useConversations`, `useScenarios` ve CSS modülleri.
- `src/components/akif/AkifChat.tsx`, `src/components/akif/voice/AkifVoicePanel.tsx`, `src/app/akif/page.tsx` — uyarlanır.

---

### Task 1: Veri modeli, migration ve `foldTr`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261024120000_add_akif_conversations/migration.sql`, `src/lib/akif/chat/fold.ts`
- Test: `src/lib/akif/chat/fold.test.ts`

**Interfaces:**
- Produces: `foldTr(input: string): string`; modeller `AkifConversation`, `AkifChatMessage` (Prisma client'ta `prisma.akifConversation`, `prisma.akifChatMessage`).

- [ ] **Step 1: Failing test** — `fold.test.ts`: `foldTr('İZMİR Işık ığdır')` → `'izmir isik igdir'`; `foldTr('  Çanakkale  ')` → `'canakkale'` (boşluklar kırpılır); `foldTr('')` → `''`.
- [ ] **Step 2:** `npx jest src/lib/akif/chat/fold.test.ts` → FAIL (modül yok).
- [ ] **Step 3:** `foldTr` → `src/lib/akif/chat/fold.ts`: `areaSeo/slug.ts` içindeki `TR_FOLD` eşlemesini kullan (import etme, kendi küçük eşlemesini yaz), `toLowerCase()`, NFD aksan temizleme, `trim`; slug'a çevirME (yalnız katla).
- [ ] **Step 4:** Test PASS.
- [ ] **Step 5:** `schema.prisma`'ya ekle, `User`'a `akifConversations AkifConversation[]` ilişkisi:
  - `AkifConversation { id String @id (istemci üretir, @default yok), userId String, title String, searchText String, projectId String?, createdAt DateTime @default(now()), updatedAt DateTime @updatedAt, lastMessageAt DateTime @default(now()), user User @relation(onDelete: Cascade), messages AkifChatMessage[], @@index([userId, lastMessageAt]) }`
  - `AkifChatMessage { id String @id @default(cuid()), conversationId String, role String ("user"|"akif"), content String, searchText String, turn Json?, card Json?, channel String @default("text"), clientId String?, createdAt DateTime @default(now()), conversation AkifConversation @relation(onDelete: Cascade), @@index([conversationId, createdAt]), @@unique([conversationId, clientId]) }`
- [ ] **Step 6:** Migration: `DATABASE_URL=postgresql://arsabil:arsabil_dev_pass@127.0.0.1:5433/arsabil_dev npx prisma migrate dev --name add_akif_conversations` (dev DB `arsabil_postgres_dev` açık olmalı); çıkan klasör adını `20261024120000_...` ile hizala; `npx prisma generate`.
- [ ] **Step 7:** `npx tsc --noEmit` temiz → commit `feat(akif): sohbet modelleri (AkifConversation, AkifChatMessage) + foldTr`.

### Task 2: Kalıcılık servisi (`conversationStore`)

**Files:**
- Create: `src/lib/akif/chat/conversationStore.ts`
- Test: `src/lib/akif/chat/conversationStore.test.ts`

**Interfaces:**
- Consumes: `foldTr` (Task 1); `AkifTurn`, `ToolResultCard` (`src/lib/ai/akif/contract.ts`).
- Produces (hepsi ilk parametre `db: ChatDb`, `ChatDb` = prisma'nın `akifConversation`/`akifChatMessage` delege alt kümesi, tipi bu dosyada tanımlı; `getChatDb(): ChatDb` prisma'yı döndürür):
  - `class ConversationOwnershipError extends Error`
  - `titleFromMessage(text: string): string`
  - `saveTurnPair(db, a: { userId: string; conversationId: string; userMessage: string; turn: AkifTurn; projectId?: string }): Promise<void>`
  - `saveVoiceTranscript(db, a: { userId: string; conversationId: string; items: { id: string; role: 'user' | 'akif'; text: string; card?: ToolResultCard }[] }): Promise<{ saved: number }>`
  - `assertConversationFree(db, a: { userId: string; conversationId: string }): Promise<void>` (başkasınınsa `ConversationOwnershipError`)
  - `listConversations(db, a: { userId: string; q?: string; take?: number; cursor?: string }): Promise<{ items: ConversationSummary[]; nextCursor: string | null }>` — `ConversationSummary = { id; title; projectId: string | null; lastMessageAt: string }`
  - `getConversation(db, a: { userId: string; id: string }): Promise<{ conversation: ConversationSummary; messages: StoredMessage[] } | null>` — `StoredMessage = { id; role; content; turn: AkifTurn | null; card: ToolResultCard | null; channel: 'text' | 'voice'; createdAt: string }`
  - `renameConversation(db, a: { userId; id; title: string }): Promise<boolean>`, `deleteConversation(db, a: { userId; id }): Promise<boolean>`

- [ ] **Step 1: Failing testler** (jest, el yapımı fake `db`; assertion'lar):
  - `titleFromMessage('  Akçaabat\'ta 1.250 m² imarlı arsa ne eder ve nasıl hesaplanır?  ')` uzunluğu ≤ 40, baştaki/sondaki boşluksuz; boş girdide `'Yeni sohbet'`.
  - `saveTurnPair` yeni id ile: sohbet `title = titleFromMessage(userMessage)`, `searchText = foldTr(title)`; 2 mesaj (user, akif; akif `content = turn.speech`, `turn` dolu, `searchText` katlanmış); mevcut sohbette başlık DEĞİŞMEZ, `lastMessageAt` güncellenir.
  - Başka kullanıcıya ait id ile `saveTurnPair` ve `assertConversationFree` → `ConversationOwnershipError`; hiçbir mesaj yazılmaz.
  - `saveVoiceTranscript` aynı `items`'ı iki kez → ikinci çağrıda `saved: 0` (`clientId` tekilliği), toplam mesaj sayısı artmaz; `channel='voice'`, kartlı öğede `card` dolu.
  - `listConversations({ q: 'ISPARTA' })` `searchText`'inde `isparta` geçen sohbeti (başlık ya da mesajdan) döndürür; `take` varsayılan 30; başkasının sohbeti hiç dönmez.
  - `getConversation` başkasının id'sinde `null`; `renameConversation`/`deleteConversation` başkasında `false`.
- [ ] **Step 2:** Testler FAIL.
- [ ] **Step 3:** Uygula. Yaklaşım: `saveTurnPair` tek `$transaction`'da (db fake'te sıradan çağrılar) upsert + `createMany`; arama `searchText: { contains: foldTr(q) }` sohbet VEYA mesaj üzerinde (`OR`, mesaj eşleşmesi `messages: { some: ... }`); `cursor` = `lastMessageAt|id` tabanlı değil, sade: `id` imleci (`skip: 1, cursor: { id }`); başlık kırpma kelime ortasında kesebilir.
- [ ] **Step 4:** Testler PASS, `npx tsc --noEmit` temiz.
- [ ] **Step 5:** Commit `feat(akif): sohbet kalıcılık servisi`.

### Task 3: Sohbet uç noktaları

**Files:**
- Create: `src/app/api/akif/conversations/route.ts`, `src/app/api/akif/conversations/[id]/route.ts`, `src/app/api/akif/conversations/[id]/voice-transcript/route.ts`
- Test: aynı klasörlerde `route.test.ts`

**Interfaces:**
- Consumes: `conversationStore` (Task 2), `getServerSession(authOptions)`.
- Produces: `GET /api/akif/conversations?q=&cursor=&take=` → `{ items, nextCursor }`; `GET /api/akif/conversations/[id]` → `{ conversation, messages }` | 404; `PATCH` body `{ title: string }` (1–120 karakter) → 204 | 404 | 400; `DELETE` → 204 | 404; `POST .../voice-transcript` body `{ items: {...}[] }` (en çok 200 öğe, `text` ≤ 4000) → `{ saved: number }` | 409 (`ConversationOwnershipError`) | 400. Hepsi oturum yoksa 401.

- [ ] **Step 1: Failing testler** (`next-auth/next` ve `@/lib/akif/chat/conversationStore` jest.mock): oturumsuz 401 (4 uç için); GET liste `q` iletir; GET `[id]` store `null` → 404; PATCH başlık 121 karakter → 400, geçerli → 204 ve store'a kullanıcı id'siyle gider; DELETE başkasının (`false`) → 404; voice-transcript `ConversationOwnershipError` → 409, 201+ öğe → 400.
- [ ] **Step 2–4:** FAIL → uygula (`export const runtime = 'nodejs'`, `src/app/api/akif/projeler/route.ts` kalıbı) → PASS.
- [ ] **Step 5:** Commit `feat(akif): sohbet liste/oku/yeniden adlandır/sil + ses transkripti uçları`.

### Task 4: Tur uç noktasında kalıcılık

**Files:**
- Modify: `src/app/api/akif/turn/route.ts` (adım 3'ten sonra sahiplik ön kontrolü; başarılı tur sonrası kayıt)
- Test: `src/app/api/akif/turn/route.test.ts` (varsa genişlet, yoksa oluştur; mevcut mock kalıbına uy)

**Interfaces:**
- Consumes: `assertConversationFree`, `saveTurnPair`, `ConversationOwnershipError` (Task 2).
- Produces: oturum varken `conversationId` başkasınınsa LLM çağrılmadan `409 { error: 'conversation_conflict' }`; başarılı turda `saveTurnPair({ userId, conversationId, userMessage, turn, projectId: validatedProjectId })`. Yanıt gövdesi (`AkifTurn`) DEĞİŞMEZ.

- [ ] **Step 1: Failing testler:** oturumlu + başarılı tur → `saveTurnPair` bir kez doğru argümanlarla çağrılır ve yanıt `AkifTurn`; oturumsuz → `saveTurnPair` çağrılmaz, yanıt aynı; başkasının id'si → 409 ve `runAkifTurn` çağrılmaz; `runAkifTurn` fırlatırsa 502 ve `saveTurnPair` çağrılmaz; `saveTurnPair` fırlatırsa yanıt yine 200 (hata `console.error` ile loglanır, kullanıcı cevabı kaybetmez).
- [ ] **Step 2–4:** FAIL → uygula (kayıt `try/catch` içinde, `projectMemory` yazımı gibi) → PASS (mevcut turn testleri de yeşil).
- [ ] **Step 5:** Commit `feat(akif): tur uç noktası oturum varken sohbeti kaydeder`.

### Task 5: Panel durumu indirgeyicisi

**Files:**
- Create: `src/lib/akif/chat/workspace.ts`
- Test: `src/lib/akif/chat/workspace.test.ts`

**Interfaces:**
- Consumes: `AkifTurn`, `ToolResultCard`, `ScenarioCard`, `ParcelCard` (`contract.ts`); `DegerCardDTO` (`src/lib/deger/card.ts`).
- Produces:
  - `type WorkspaceState = { konum: string | null; alanM2: number | null; m2Fiyat: number | null; emsalNotu: string | null; arsaSahibiPct: number | null; muteahhitPct: number | null; varsayimlar: string[]; dolu: boolean }`
  - `deriveWorkspace(sources: { turn?: AkifTurn | null; card?: ToolResultCard | null }[]): WorkspaceState` — kaynaklar kronolojik; en SON çözülmüş parsel kartı konum/alan/₺/m²'yi (`${mahalle}, ${ilce}/${il}`, `parcel.areaSqm`, `value.pricePerSqm.mahalle ?? .ilce ?? value.pricePerSqmCoarse`), en SON `contractor_offers` kartının ilk satırı payı (`arsaSahibiPct = Math.round(arsaPayiX*100)`, `muteahhitPct = 100 − arsaSahibiPct`), `emsalNote` ve `defaultsUsed + assumptions` tekil listesi; `dolu` = herhangi bir alan doluysa.
  - `diffWorkspace(prev: WorkspaceState, next: WorkspaceState): Partial<Record<'konum' | 'alanM2' | 'm2Fiyat' | 'arsaSahibiPct' | 'muteahhitPct', { from: unknown; to: unknown }>>` — yalnız önceden dolu olup değişen alanlar (ilk doluş "değişim" sayılmaz).

- [ ] **Step 1: Failing testler:** boş girdi → tüm alanlar `null`, `dolu=false`; çözülmüş parsel kartı → konum `"Yıldızlı, Akçaabat/Trabzon"`, `alanM2 1250`, `m2Fiyat 2450`; `pricePerSqm` yok ve `pricePerSqmCoarse` var → onu kullanır, ikisi de yok → `null` (çökmez); `status !== 'resolved'` parsel kartı yok sayılır; iki senaryo kartı → sonuncunun payı (`arsaPayiX 0.5` → 50/50); `diffWorkspace` pay 46→50 → `{ arsaSahibiPct: { from: 46, to: 50 }, muteahhitPct: { from: 54, to: 50 } }`, ilk doluş (null→46) → `{}`.
- [ ] **Step 2–4:** FAIL → uygula → PASS.
- [ ] **Step 5:** Commit `feat(akif): çalışma paneli durum indirgeyicisi`.

### Task 6: Senaryo birleştirme, tarih grupları, veri kancaları

**Files:**
- Create: `src/lib/akif/chat/scenarios.ts`, `src/lib/akif/chat/groupByDate.ts`, `src/components/akif/chat/useConversations.ts`, `src/components/akif/chat/useScenarios.ts`
- Test: `src/lib/akif/chat/scenarios.test.ts`, `src/lib/akif/chat/groupByDate.test.ts`, `src/components/akif/chat/useConversations.test.tsx`

**Interfaces:**
- Consumes: `GET /api/projects` (`{ projects: { id, name, scenarios: { landShareRatio, arsaAlani, ... }[] }[] }`), `GET /api/akif/projeler` (`{ projects: { id, name, inputs, parcels, updatedAt }[] }`), Task 3 uçları.
- Produces:
  - `type ScenarioItem = { key: string; source: 'site' | 'kart'; id: string; name: string; summary: string; updatedAt: string; workspace: WorkspaceState }`
  - `mergeScenarios(a: { site: unknown[]; kart: unknown[] }): ScenarioItem[]` — updatedAt azalan; `summary` = `"<konum/parsel varsa> · <alan> m² · %<pay>"`, olmayan parça atlanır, hiçbiri yoksa `""`; `workspace` yalnız bilinen alanlar dolu (site projesinin son senaryosundan `arsaAlani`→`alanM2`, `landShareRatio*100`→`arsaSahibiPct`/`muteahhitPct`; kart `inputs` biçimi bilinmiyorsa alanlar `null`, çökmeden).
  - `groupByDate<T extends { lastMessageAt: string }>(items: T[], now: Date): { label: 'Bugün' | 'Dün' | 'Son 7 gün' | 'Daha eski'; items: T[] }[]` — boş gruplar atlanır, sıra korunur, yerel gün sınırı.
  - `useConversations(enabled: boolean): { items: ConversationSummary[]; loading: boolean; q: string; setQ(q: string): void; hasMore: boolean; loadMore(): Promise<void>; rename(id: string, title: string): Promise<void>; remove(id: string): Promise<void>; refresh(): Promise<void> }` — `q` 250 ms bekleme ile aranır; `enabled=false` iken hiç istek yok, `items=[]`.
  - `useScenarios(enabled: boolean): { items: ScenarioItem[]; loading: boolean }`.

- [ ] **Step 1: Failing testler:** `mergeScenarios` — iki kaynaktan 3 öğe `updatedAt` sırasıyla, `source` etiketleri doğru; `inputs: {}` ve `scenarios: []` olan öğe çökmez, `summary === ''`; `groupByDate` — 00:30'da atılan `now=01:00`'da "Bugün", 25 saat önce "Dün", 3 gün "Son 7 gün", 10 gün "Daha eski", boş grup yok; `useConversations` — `enabled=false` fetch yok; `setQ('Işık')` 250 ms sonra `?q=I%C5%9F%C4%B1k` ile tek istek (fake timers); `remove` listeden düşürür.
- [ ] **Step 2–4:** FAIL → uygula → PASS.
- [ ] **Step 5:** Commit `feat(akif): senaryo birleştirme, tarih grupları ve sohbet/senaryo kancaları`.

### Task 7: Kenar çubuğu

**Files:**
- Create: `src/components/akif/chat/AkifSidebar.tsx`, `AkifSidebar.module.css`
- Test: `src/components/akif/chat/AkifSidebar.test.tsx`

**Interfaces:**
- Consumes: `ConversationSummary`, `ScenarioItem`, `groupByDate` (Task 6).
- Produces: `AkifSidebar(props: { conversations: ConversationSummary[]; scenarios: ScenarioItem[]; activeId: string | null; q: string; onQ(q: string): void; onNew(): void; onOpen(id: string): void; onOpenScenario(s: ScenarioItem): void; onRename(id: string, title: string): void; onDelete(id: string): void; hasMore: boolean; onLoadMore(): void; user: { name: string | null } | null; signedIn: boolean })`

- [ ] **Step 1: Failing testler:** "Yeni sohbet" tıklanınca `onNew`; arama alanına yazınca `onQ`; "Senaryolarım" bölümü amber noktalı satırlar + `source` etiketi ("Proje" / "Akif"), satır tıklanınca `onOpenScenario(item)`; grup başlıkları "Bugün/Dün/…" yalnız dolu gruplar; aktif sohbet `aria-current="true"`; üç nokta menüsü → "Yeniden adlandır" satır içi düzenleme (Enter `onRename`, Esc iptal), "Sil" onay sonrası `onDelete`; `signedIn=false` → giriş bandı ("Sohbetlerini kaydetmek için giriş yap", `/login` bağlantısı) ve sohbet listesi/arama gizli; boş `conversations` + `signedIn` → "Henüz sohbet yok" boş durumu; uzun başlık tek satır kırpılır (`title` attribute'u tam metin); `hasMore` → "Daha fazla göster".
- [ ] **Step 2–4:** FAIL → uygula (Arazi tokenları, ince çizgi/zemin ayrımı, kutusuz satırlar; hover/aktif yüzeyi `--surface`, emoji/zil yok) → PASS.
- [ ] **Step 5:** Commit `feat(akif): sohbet kenar çubuğu`.

### Task 8: Çalışma paneli

**Files:**
- Create: `src/components/akif/chat/WorkspacePanel.tsx`, `WorkspacePanel.module.css`
- Test: `src/components/akif/chat/WorkspacePanel.test.tsx`

**Interfaces:**
- Consumes: `WorkspaceState`, `diffWorkspace` (Task 5).
- Produces: `WorkspacePanel(props: { state: WorkspaceState; changes: ReturnType<typeof diffWorkspace>; onReport(): void; reportDisabled?: boolean })`

- [ ] **Step 1: Failing testler:** `dolu=false` → boş durum metni ("Bir arsa söyle, burada değerleri göreceksin") ve gri yer tutucu satırlar; dolu durum "Konum / Alan / m² fiyatı" satırları (`1.250 m²`, `₺2.450` `tr-TR` biçimi), `null` alan "—"; pay çubuğu `arsaSahibiPct=46` için amber segment genişliği `46%`; `changes.arsaSahibiPct` varsa `%46 → %50` metni ve `data-changed` işareti; varsayımlar listesi; "Rapor oluştur" `onReport`, `reportDisabled` iken devre dışı.
- [ ] **Step 2–4:** FAIL → uygula (vurgu: `data-changed` ile CSS animasyonu ~1,5 sn, reduced-motion'da animasyonsuz) → PASS.
- [ ] **Step 5:** Commit `feat(akif): çalışma paneli`.

### Task 9: Kabuk ve sayfa entegrasyonu

**Files:**
- Create: `src/components/akif/chat/AkifShell.tsx`, `AkifShell.module.css`
- Modify: `src/app/akif/page.tsx`, `src/app/akif/page.module.css`, `src/app/akif/page.test.tsx`

**Interfaces:**
- Consumes: Task 5–8 bileşen ve kancaları; `getConversation` yanıtı (`GET /api/akif/conversations/[id]`); mevcut `AkifChat`, `AkifVoicePanel`.
- Produces: `AkifShell(props: { sidebar: ReactNode; panel: ReactNode; children: ReactNode; title: string; onTitle(title: string): void; onVoice(): void; mobileTitle?: string })` — üç sütunlu düzen (≥1280: sabit panel; 900–1280: panel düğmeyle katlanır; <900: kenar çubuğu çekmece + panel alt sayfa, üstte "Senaryo" çipi).

- [ ] **Step 1: Failing testler** (`page.test.tsx` güncellenir; `useSession` ve `fetch` mock'lı):
  - Misafir: mesaj gönder → kullanıcı balonu + Akif cevabı (mevcut testler korunur); `/api/akif/conversations` HİÇ çağrılmaz; kenar çubuğunda giriş bandı.
  - Oturumlu: açılışta `/api/akif/conversations`, `/api/projects`, `/api/akif/projeler` çağrılır; sohbete tıklayınca mesajlar `GET .../[id]` ile yüklenir; yüklenen sohbette panel son değerleri gösterir ve `data-changed` YOK.
  - Canlı: aynı sohbette yeni Akif turu panelde değeri değiştirirse `data-changed` çıkar.
  - Tur 409 (`conversation_conflict`) → yeni `conversationId` ile bir kez yeniden dener; ikinci kez de olursa hata satırı.
  - "Yeni sohbet" girdileri ve panel durumunu sıfırlar, yeni `conversationId` üretir; başarılı turdan sonra liste yenilenir (`refresh`).
  - "Rapor oluştur": `router.push('/hesapla?alan=<alanM2>&il=<il>&ilce=<ilce>')` (panel durumunda konum ayrıştırılamıyorsa yalnız `alan`); `dolu=false` iken düğme devre dışı.
  - Site projesi senaryosu: boş sohbette `projectId` sonraki turda gövdede; dolu sohbette yeni sohbet. Proje kartı senaryosu: panel dolar, besteciye `"<ad> senaryosunu güncelleyelim:"` taslağı konur (gönderilmez).
- [ ] **Step 2–4:** FAIL → uygula (`makeId` ve `toHistory` mevcut, korunur; `ERR` tablosu korunur; `AkifChat`'e `draft`/`onDraftConsumed` desteği Task 10'da gelecek — bu görevde taslak için `initialDraft` prop'u geçici olarak `AkifChat` imzasına eklenir ve Task 10 öncesi test için basit tutulur) → PASS.
- [ ] **Step 5:** Commit `feat(akif): sohbet kabuğu, kalıcı geçmiş ve panel entegrasyonu`.

### Task 10: Sohbet alanı (üst çubuk, boş durum, besteci)

**Files:**
- Modify: `src/components/akif/AkifChat.tsx`, `AkifChat.module.css`, `AkifMessageBubble.module.css`, `AkifScenarioCard.module.css`, `AkifAssumptionsBar.module.css`; testler `AkifChat.test.tsx`
- Interfaces: `AkifChatProps` eklenen alanlar: `initialDraft?: string` (Task 9'dan gelen taslak), `onVoice` korunur.

- [ ] **Step 1: Failing testler:** boş sohbet → "Ne öğrenmek istersin?" + 3 örnek çip (mevcut) ve kısa tanıtım cümlesi; `initialDraft` verilince metin kutusu dolu ve odakta, gönderilmeden `onSend` çağrılmaz; yeni mesaj eklenince `data-role` balonlarında giriş animasyonu sınıfı (reduced-motion testi: sınıf yok); mikrofon `onVoice` çağırır; mevcut `AkifChat` testleri yeşil kalır.
- [ ] **Step 2–4:** FAIL → uygula (yuvarlak besteci, Arazi tokenları, kullanıcı balonu yeşilimsi sağda, Akif solda avatarlı; kartlar mesaj altında; başlık/proje seçici `AkifShell` üst çubuğuna taşınır, `page.tsx` sade kalır) → PASS.
- [ ] **Step 5:** Commit `feat(akif): sohbet alanı yeni düzende`.

### Task 11: Sohbet içi sesli mod

**Files:**
- Modify: `src/components/akif/voice/AkifVoicePanel.tsx`, `AkifVoicePanel.module.css`, `AkifVoiceTranscript.module.css`, `AkifActionConfirmCard.module.css`, `src/app/akif/page.tsx`; testler `src/components/akif/voice/__tests__/*`
- Interfaces: `AkifVoicePanel(props: { onExit(): void; onCards?(items: VoiceTranscriptItem[]): void; onFinished?(items: VoiceTranscriptItem[]): void })` — `onCards` transkript kartları değiştikçe çağrılır (panele canlı işlemek için `deriveWorkspace` kaynağı olur); `onFinished` oturum bitince/“Metne dön”de bir kez; `page.tsx` bunu `POST /api/akif/conversations/[id]/voice-transcript` (+ `pagehide`'ta `navigator.sendBeacon`) ile yollar ve listeyi yeniler (yalnız oturumluysa).

- [ ] **Step 1: Failing testler** (`useRealtimeVoice` mock'lı): `listening` → "Dinliyorum…" + küre + canlı transkript; `onCards` kartlı öğe gelince çağrılır; "Bitir" ve "Metne dön" `onFinished(items)`'ı tam bir kez çağırır; boş transkriptte `onFinished` çağrılmaz; `pendingAction` varken onay kartı transkriptin altında; küre CSS'inde `box-shadow`'da bulanık (blur) parlama yok (`AkifVoicePanel.module.css` içinde `0 0 \d+px` deseni bulunmadığını doğrulayan kapsam testi); sayfada ses modunda kenar çubuğu ve panel DOM'da kalır.
- [ ] **Step 2–4:** FAIL → uygula (sakin halka animasyonu `scale+opacity`, reduced-motion kapalı; `page.tsx`'te ses modunda `AkifChat` yerine panel; oturumlu `voice-transcript` gönderimi, `clientId = item.id`) → PASS.
- [ ] **Step 5:** Commit `feat(akif): sohbet içi sesli mod, canlı panel ve transkript kaydı`.

### Task 12: Görsel doğrulama, temizlik, tam test

**Files:** değişen CSS/TSX'te düzeltmeler; kullanılmayan eski stiller (`src/app/akif/page.module.css`'in ölü sınıfları); `AkifAssumptionsBar` ve diğer eski bileşen testleri.

- [ ] **Step 1:** Dev sunucu: `DATABASE_URL=postgresql://arsabil:arsabil_dev_pass@127.0.0.1:5433/arsabil_dev NEXTAUTH_URL=http://localhost:3100 npx next dev --webpack -p 3100`. Oturumlu çerez için `next-auth/jwt` `encode` ile token üret (`NEXTAUTH_SECRET` `.env.local`), Playwright çerezi `next-auth.session-token`; API'ler `page.route` ile mock'lanabilir ama sohbet kalıcılığı için bir kez GERÇEK DB ile uçtan uca dene (mesaj gönder → liste yenile → sohbeti aç → ara "ISPARTA/ışık").
- [ ] **Step 2:** Ekran görüntüleri (1440×900 ve 390×844, açık+koyu): boş sohbet, dolu sohbet+panel, sesli mod (mock'lı transkript), kenar çubuğu çekmecesi, misafir hali. `getComputedStyle` ile açık temada siyah blok ve koyu temada görünmeyen logo/metin yok kontrolü.
- [ ] **Step 3:** `npx jest src/app/akif src/app/api/akif src/components/akif src/lib/akif` tüm yeşil; `npx tsc --noEmit` (src) temiz; eslint yeni dosyalarda hatasız.
- [ ] **Step 4:** Commit `chore(akif): görsel doğrulama düzeltmeleri ve ölü stil temizliği`; hafıza notu (`project_arsabil_gorsel_yenileme_arazi.md`) güncellenir.
