# Akif-5c Aşama B — Proje Kartı Çekirdeği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WhatsApp'taki müşteri, üyelikle bağlandıktan sonra tarihli Proje Kartları ve Parsel Dosyaları oluşturur; Akif "Ocak'ta konuştuğumuz proje"yi bulup revizyon geçmişini en yeniden en eskiye özetler, bayat olgudan teyit ister; aynı veri web'de "Akif Projelerim"de görünür.

**Architecture:** Saf servis katmanı (`src/lib/akifProje/*`: doğrulama, bayatlık, tarih aralığı, parsel/proje servisleri, claim, hafıza bağlamı) üzerine WhatsApp-özel 5 yeni Akif aracı (`src/lib/whatsapp/projectTools.ts`) eklenir; Akif-5'in `WA_AKIF_TOOL_DEFS` deseniyle paylaşılan `toolRegistry.ts` DOKUNULMADAN genişletilir. Kalıcı veri `userId`'ye aittir; telefon yalnız `User.whatsappPhone` ile çözülür. Üye olmayan müşteri "kaydet" derse tek kullanımlık bağlantı + taslak (`PhoneClaim.draft`) üretilir; bağlantı tüketilince taslak otomatik kaydedilir.

**Tech Stack:** Next.js 16 (app router), Prisma 5.22 + PostgreSQL, next-auth 4, Jest 30 + ts-jest, OpenAI (Akif orchestrator, mevcut).

**Spec:** `docs/superpowers/specs/2026-10-15-akif-5c-whatsapp-proje-kartlari-design.md` (Aşama B bölümü §8.1). Akif-5 bağlamı: `docs/superpowers/specs/2026-09-15-akif-5-whatsapp-design.md`.

## Global Constraints

- **Branch:** `git switch -c feat/akif-5c-asama-b` (mevcut HEAD'den; `EnterWorktree` KULLANMA — origin'den dallanır, push edilmemiş commit'ler kaybolur). Çalışma dizini `C:\Users\emre\Desktop\arsabil-main`. `chain.*`, `scratch/design-audit/` izlenmeyen dosyalarına DOKUNMA, `git add` ile yalnız kendi dosyalarını ekle.
- **LLM hesap yapmaz:** modelin yazdığı her sayı araç çıktısından gelir; bayatlık kararı KOD verir.
- **Paylaşılan Akif araç kaydı değişmez:** `src/lib/ai/akif/gateway/toolRegistry.ts` DOKUNULMAZ; web `/akif` ve ses kanalına yeni araç SIZMAZ.
- **Gizlilik:** Görsel saklanmaz (Aşama A'da), TC kimlik numarası hiçbir yerde saklanmaz; malik adı yalnız açıkça verilirse `malik` olgusu olarak.
- **Bayatlık ömürleri (verbatim spec §3.1):** `areaSqm`, ada/parsel, il/ilçe/mahalle → süresiz; `imarDurumu`, `emsal`, `katAdedi`, `taks`, `hmax` → 180 gün; `daireFiyati` → 45 gün; `malik` → 365 gün.
- **Claim:** token 32 bayt rastgele, DB'de yalnız SHA-256 hash, **15 dk**, tek kullanım; aynı telefona ikinci hesap bağlanamaz.
- **Saat dilimi:** tüm göreli tarih çözümü **Europe/Istanbul (UTC+3, DST yok)**.
- **Telefon biçimi:** `InboundMessage.from` = yalnız rakam, başında `+` yok (ör. `905321234567`); `User.whatsappPhone` aynı biçimi saklar.
- **Testler:** `npx jest <yol> --no-coverage`; ts-jest tip denetimi AÇIK (tip hatası = test hatası). Türkçe isimlendirme/yorum mevcut koda uygun.
- **Aşama B kapsamı DIŞI:** resim okuma (Aşama A), imar sorma akışı/daire fiyatı/motor `result` alanı (Aşama C), mevcut web `Project`'e kopyalama.

### Spec'ten plan-zamanı netleştirmeler (Task 1'de spec'e "Plan-zamanı netleştirmeler" bölümü olarak işlenir)

1. Spec §2'deki `ownerPhone` + `userId?` ikili sahipliği **kaldırıldı:** kalıcı kayıt YALNIZ bağlı hesaba (`userId`, zorunlu) aittir. Gerekçe: spec §3.4(4) "üye olmadan kalıcı kart yaratılmaz" der; dolayısıyla bağlanmamış telefonun toplu doldurulacak kaydı yoktur. Telefon yalnız `User.whatsappPhone` (benzersiz) ve `PhoneClaim`'de yaşar.
2. `ProjeKarti.result` ve `projectId` (web `Project` bağlantısı) Aşama B'de **eklenmez** (result → Aşama C; web `Project` kopyalama → "Akif Projelerim" görünümü bu ihtiyacı karşılar).
3. Üyelik öncesi "kaydet" → `createProject` argümanları `PhoneClaim.draft`'a yazılır, bağlantı tüketilince kart otomatik oluşur (30 dk'lık konuşma TTL'i yüzünden sohbet geçmişine güvenilemez).

## Review Focus

Spec'in ima edip hiçbir görevin doğal testinin kapsamadığı, kullanıcıyı en olası ısıracak durumlar (her biri sahibi görevin testinde pinlenir):

1. **Başka kullanıcının `projectId`'si** (modelin uydurduğu ya da başka telefondan sızan id) `updateProject`/`summarizeProject`'ten `not_found` almalı, veri sızmamalı → Task 6, Task 10.
2. **Müşteri "evet, hâlâ geçerli" dediğinde** aynı değerle `rememberFact`: yeni satır açılmadan `recordedAt` tazelenmeli, sonraki turda olgu TAZE görünmeli → Task 5, Task 8.
3. **Gece yarısı sınırı:** 15 Ekim 00:30 (TR) = 14 Ekim 21:30 UTC'de oluşan proje "15 Ekim" aramasında bulunmalı; `2026-02-30` gibi geçersiz tarih ve ters aralık hata dönmeli → Task 4, Task 6.
4. **Aynı parsel farklı yazımla** ("Trabzon"/"TRABZON", " 123 ") tek Parsel Dosyası olmalı; kart çöplüğü oluşmamalı → Task 2, Task 5.
5. **Aynı değeri tekrar söylemek** revizyon yazmamalı; boş `updateProject` (değişiklik yok) sessizce no-op → Task 2, Task 6.
6. **Süresi dolmuş/kullanılmış/başka hesapta bağlı** claim token'ları sızıntısız net hata dönmeli; taslak bozuksa bağlama yine başarılı olmalı → Task 7, Task 13.

---

## File Structure

**Yeni:**
- `src/lib/akifProje/types.ts` — olgu/girdi anahtarları, ortak tipler.
- `src/lib/akifProje/validation.ts` — `validateInputs`, `validateFact`, `validateParcelRef`, `validateCreateArgs`, `diffInputs`, `applyChanges`.
- `src/lib/akifProje/freshness.ts` — `classifyFacts` (taze/bayat/eksik).
- `src/lib/akifProje/dateRange.ts` — `parseDateRange`, `istanbulDateString`.
- `src/lib/akifProje/parselDosyasi.ts` — `upsertParsel`, `recordFact`, `listCurrentFacts`.
- `src/lib/akifProje/projeKarti.ts` — `createProjectTx`, `createProject`, `updateProject`, `findProjects`, `getProjectSummary`.
- `src/lib/akifProje/claim.ts` — `createClaim`, `consumeClaim`, `hashToken`.
- `src/lib/akifProje/context.ts` — `buildMemoryContext`.
- `src/lib/whatsapp/projectTools.ts` — 5 araç tanımı + doğrulama + dispatch.
- `src/lib/safeRedirect.ts` — login `next` güvenliği.
- `src/app/api/akif/baglan/route.ts`, `src/app/akif/baglan/page.tsx` (+ `page.module.css`).
- `src/app/api/akif/projeler/route.ts`, `src/app/dashboard/akif-projeler/page.tsx` (+ `page.module.css`).
- `prisma/migrations/20261015120000_add_akif_proje_kartlari/migration.sql`.
- Testler: her modülün yanında `__tests__/`.

**Değişen:**
- `prisma/schema.prisma` — 6 yeni model + `User` alanları.
- `src/lib/ai/akif/contract.ts` — `ProjectCard`.
- `src/lib/ai/akif/orchestrator.ts` — `project` türü dalı.
- `src/lib/whatsapp/akifToolGateway.ts` — yeni araçları kaydeder.
- `src/lib/whatsapp/akifToolPolicy.ts` — `AKIF_WHATSAPP_PROJECT_POLICY` eklenir.
- `src/lib/whatsapp/akifHandleMessage.ts` — hafıza bağlamı enjekte eder.
- `src/app/api/whatsapp/webhook/route.ts` — telefon-bağlı deps.
- `src/app/login/page.tsx` — `next` yönlendirmesi.
- `src/app/dashboard/layout.tsx` — nav öğesi.
- `docs/akif/akif-2-insan-duman-kontrol-listesi.md`, spec dosyası.

---

### Task 1: Veri modeli, migration ve spec netleştirmeleri

**Files:**
- Modify: `prisma/schema.prisma` (User modeli + dosya sonu)
- Create: `prisma/migrations/20261015120000_add_akif_proje_kartlari/migration.sql`
- Modify: `docs/superpowers/specs/2026-10-15-akif-5c-whatsapp-proje-kartlari-design.md` (sona bölüm ekle)

**Interfaces:**
- Produces: Prisma modelleri `ParselDosyasi`, `ParselOlgu`, `ProjeKarti`, `ProjeKartiParsel`, `ProjeRevizyon`, `PhoneClaim`; `User.whatsappPhone`. Bileşik benzersiz anahtar adı: `userId_il_ilce_mahalle_ada_parsel`. Sonraki tüm görevler bunlara dayanır.

- [ ] **Step 1: Dalı aç ve temiz başla**

```bash
cd /c/Users/emre/Desktop/arsabil-main && git switch -c feat/akif-5c-asama-b && git status --short
```
Beklenen: yalnız `chain.*` ve `scratch/design-audit/` izlenmeyen dosyaları.

- [ ] **Step 2: `User` modeline alanları ekle**

`prisma/schema.prisma` içinde `model User { ... }` bloğunun son alanından (`studioShareTokens StudioShareToken[]`) sonra, kapanıştan önce şunları ekle:

```prisma
  whatsappPhone     String?            @unique
  parselDosyalari   ParselDosyasi[]
  projeKartlari     ProjeKarti[]
```

- [ ] **Step 3: Yeni modelleri dosya sonuna ekle**

```prisma
// Akif-5c Aşama B — WhatsApp Proje Kartları. Kalıcı veri YALNIZ bağlı hesaba
// (userId) aittir; telefon yalnız User.whatsappPhone ve PhoneClaim'de yaşar.
model ParselDosyasi {
  id        String   @id @default(cuid())
  userId    String
  il        String
  ilce      String
  mahalle   String
  ada       String
  parsel    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  olgular   ParselOlgu[]
  projeler  ProjeKartiParsel[]

  @@unique([userId, il, ilce, mahalle, ada, parsel])
}

model ParselOlgu {
  id              String        @id @default(cuid())
  parselDosyasiId String
  key             String
  value           Json
  source          String
  recordedAt      DateTime      @default(now())
  supersededAt    DateTime?
  parselDosyasi   ParselDosyasi @relation(fields: [parselDosyasiId], references: [id], onDelete: Cascade)

  @@index([parselDosyasiId, key, supersededAt])
}

model ProjeKarti {
  id          String   @id @default(cuid())
  userId      String
  name        String?
  inputs      Json
  status      String   @default("aktif")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  parseller   ProjeKartiParsel[]
  revizyonlar ProjeRevizyon[]

  @@index([userId, createdAt])
}

model ProjeKartiParsel {
  projeKartiId    String
  parselDosyasiId String
  projeKarti      ProjeKarti    @relation(fields: [projeKartiId], references: [id], onDelete: Cascade)
  parselDosyasi   ParselDosyasi @relation(fields: [parselDosyasiId], references: [id], onDelete: Cascade)

  @@id([projeKartiId, parselDosyasiId])
}

model ProjeRevizyon {
  id           String     @id @default(cuid())
  projeKartiId String
  field        String
  oldValue     Json?
  newValue     Json
  changedAt    DateTime   @default(now())
  channel      String
  note         String?
  projeKarti   ProjeKarti @relation(fields: [projeKartiId], references: [id], onDelete: Cascade)

  @@index([projeKartiId, changedAt])
}

model PhoneClaim {
  id        String    @id @default(cuid())
  phone     String
  tokenHash String    @unique
  draft     Json?
  expiresAt DateTime
  usedAt    DateTime?
  userId    String?
  createdAt DateTime  @default(now())

  @@index([phone])
}
```

- [ ] **Step 4: Migration SQL'ini yaz**

`prisma/migrations/20261015120000_add_akif_proje_kartlari/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappPhone" TEXT;

-- CreateTable
CREATE TABLE "ParselDosyasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "ada" TEXT NOT NULL,
    "parsel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParselDosyasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParselOlgu" (
    "id" TEXT NOT NULL,
    "parselDosyasiId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "ParselOlgu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjeKarti" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "inputs" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjeKarti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjeKartiParsel" (
    "projeKartiId" TEXT NOT NULL,
    "parselDosyasiId" TEXT NOT NULL,

    CONSTRAINT "ProjeKartiParsel_pkey" PRIMARY KEY ("projeKartiId","parselDosyasiId")
);

-- CreateTable
CREATE TABLE "ProjeRevizyon" (
    "id" TEXT NOT NULL,
    "projeKartiId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "ProjeRevizyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneClaim" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "draft" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappPhone_key" ON "User"("whatsappPhone");

-- CreateIndex
CREATE UNIQUE INDEX "ParselDosyasi_userId_il_ilce_mahalle_ada_parsel_key" ON "ParselDosyasi"("userId", "il", "ilce", "mahalle", "ada", "parsel");

-- CreateIndex
CREATE INDEX "ParselOlgu_parselDosyasiId_key_supersededAt_idx" ON "ParselOlgu"("parselDosyasiId", "key", "supersededAt");

-- CreateIndex
CREATE INDEX "ProjeKarti_userId_createdAt_idx" ON "ProjeKarti"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjeRevizyon_projeKartiId_changedAt_idx" ON "ProjeRevizyon"("projeKartiId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneClaim_tokenHash_key" ON "PhoneClaim"("tokenHash");

-- CreateIndex
CREATE INDEX "PhoneClaim_phone_idx" ON "PhoneClaim"("phone");

-- AddForeignKey
ALTER TABLE "ParselDosyasi" ADD CONSTRAINT "ParselDosyasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParselOlgu" ADD CONSTRAINT "ParselOlgu_parselDosyasiId_fkey" FOREIGN KEY ("parselDosyasiId") REFERENCES "ParselDosyasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeKarti" ADD CONSTRAINT "ProjeKarti_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeKartiParsel" ADD CONSTRAINT "ProjeKartiParsel_projeKartiId_fkey" FOREIGN KEY ("projeKartiId") REFERENCES "ProjeKarti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeKartiParsel" ADD CONSTRAINT "ProjeKartiParsel_parselDosyasiId_fkey" FOREIGN KEY ("parselDosyasiId") REFERENCES "ParselDosyasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeRevizyon" ADD CONSTRAINT "ProjeRevizyon_projeKartiId_fkey" FOREIGN KEY ("projeKartiId") REFERENCES "ProjeKarti"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: Şemayı doğrula ve istemciyi üret**

```bash
cd /c/Users/emre/Desktop/arsabil-main && npx prisma@5.22.0 validate && npx prisma@5.22.0 generate
```
Beklenen: "The schema ... is valid" ve "Generated Prisma Client". `generate` EPERM verirse çalışan `next dev`/`prisma studio` süreçlerini kapatıp tekrar dene.

- [ ] **Step 6: Migration'ı gerçek Postgres'e karşı doğrula (varsa)**

```bash
docker ps --format '{{.Names}} {{.Ports}}' | grep -i postgres
```
Yerel Postgres ayaktaysa (`.env.local` içindeki `DATABASE_URL`):
```bash
npx prisma@5.22.0 migrate deploy && npx prisma@5.22.0 migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```
Beklenen: migration uygulanır, `migrate diff` exit code **0** (sapma yok). Postgres yoksa bu adımı atla ve final raporda "migration yalnız `validate` ile doğrulandı, DB'ye uygulanmadı" yaz (üretim deploy kapısı: `prisma migrate deploy`).

- [ ] **Step 7: Spec'e netleştirme bölümünü ekle**

`docs/superpowers/specs/2026-10-15-akif-5c-whatsapp-proje-kartlari-design.md` dosyasının sonuna ekle:

```markdown

## 9. Plan-zamanı netleştirmeler (2026-10-15, Aşama B planı)

1. **Sahiplik:** §2'deki `ownerPhone` + `userId?` ikili sahipliği kaldırıldı. Kalıcı kayıt yalnız bağlı hesaba (`userId`, zorunlu) aittir (§3.4(4): üyelik olmadan kalıcı kart yoktur, dolayısıyla bağlanmamış telefonun toplu doldurulacak kaydı yoktur). Telefon yalnız `User.whatsappPhone` (benzersiz) ve `PhoneClaim`'de tutulur.
2. **Aşama B'de eklenmeyenler:** `ProjeKarti.result` (Aşama C), web `Project`'e kopyalama / `projectId` (web'de "Akif Projelerim" görünümü bu ihtiyacı karşılar).
3. **Üyelik öncesi kaydet:** `createProject` argümanları `PhoneClaim.draft`'a yazılır; bağlantı tüketilince kart otomatik oluşur (konuşma durumu 30 dk TTL'li olduğu için sohbet geçmişine güvenilemez).
4. **Tek araç/tur:** orchestrator tur başına tek araç çağırır; `findProjects` tek eşleşmede özeti de döner (ayrı `summarizeProject` turu gerekmesin), `createProject` olguları parsel başına `facts` ile alır.
```

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261015120000_add_akif_proje_kartlari docs/superpowers/specs/2026-10-15-akif-5c-whatsapp-proje-kartlari-design.md
git commit -m "feat(akif-5c): proje kartı veri modeli ve migration

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Ortak tipler ve doğrulama (`types.ts`, `validation.ts`)

**Files:**
- Create: `src/lib/akifProje/types.ts`
- Create: `src/lib/akifProje/validation.ts`
- Test: `src/lib/akifProje/__tests__/validation.test.ts`

**Interfaces:**
- Produces (types.ts): `FACT_KEYS`, `FactKey`, `FACT_SOURCES`, `FactSource`, `INPUT_KEYS`, `InputKey`, `ProjectInputs`, `Channel`, `ParcelRef`, `FactInput`, `ProjectParcelInput`, `CreateProjectInput`, `InputChange`.
- Produces (validation.ts): `Failure = { ok: false; field: string; reason: string }`; `validateInputs(raw): {ok:true; inputs: ProjectInputs} | Failure`; `validateFact(raw): {ok:true; fact: FactInput} | Failure`; `validateParcelRef(raw): {ok:true; parcel: ParcelRef} | Failure`; `validateCreateArgs(raw): {ok:true; value: CreateProjectInput} | Failure`; `diffInputs(old: ProjectInputs, next: ProjectInputs): InputChange[]`; `applyChanges(old: ProjectInputs, changes: InputChange[]): ProjectInputs`.

- [ ] **Step 1: `types.ts` yaz**

```ts
// Akif-5c — Proje Kartı ortak tipleri.

export const FACT_KEYS = [
  'areaSqm',
  'imarDurumu',
  'emsal',
  'katAdedi',
  'taks',
  'hmax',
  'malik',
  'daireFiyati',
] as const
export type FactKey = (typeof FACT_KEYS)[number]

export const FACT_SOURCES = ['tkgm', 'goruntu', 'kullanici', 'ilan'] as const
export type FactSource = (typeof FACT_SOURCES)[number]

// Proje girdileri (revizyon günlüğüne giren alanlar).
export const INPUT_KEYS = [
  'arsaAlani',
  'emsal',
  'arsaSahibiPayiYuzde',
  'daireBuyuklugu',
  'katAdedi',
  'birimMaliyet',
  'kaliteSinifi',
] as const
export type InputKey = (typeof INPUT_KEYS)[number]
export type ProjectInputs = Partial<Record<InputKey, number | string>>

export type Channel = 'whatsapp' | 'web'

export interface ParcelRef {
  il: string
  ilce: string
  mahalle: string
  ada: string
  parsel: string
}

export interface FactInput {
  key: FactKey
  value: unknown
  source: FactSource
}

export interface ProjectParcelInput extends ParcelRef {
  facts?: FactInput[]
}

export interface CreateProjectInput {
  name?: string | null
  parcels: ProjectParcelInput[]
  inputs: ProjectInputs
}

export interface InputChange {
  field: string
  oldValue: unknown
  newValue: unknown
}
```

- [ ] **Step 2: Başarısız testi yaz**

`src/lib/akifProje/__tests__/validation.test.ts`:

```ts
import {
  validateInputs,
  validateFact,
  validateParcelRef,
  validateCreateArgs,
  diffInputs,
  applyChanges,
} from '../validation'

describe('validateInputs', () => {
  it('boş/undefined → ok, boş nesne', () => {
    expect(validateInputs(undefined)).toEqual({ ok: true, inputs: {} })
    expect(validateInputs({})).toEqual({ ok: true, inputs: {} })
  })

  it('geçerli girdiler kabul edilir', () => {
    const r = validateInputs({ arsaAlani: 850, emsal: 1.5, arsaSahibiPayiYuzde: 40, katAdedi: 4, kaliteSinifi: 'orta' })
    expect(r).toEqual({
      ok: true,
      inputs: { arsaAlani: 850, emsal: 1.5, arsaSahibiPayiYuzde: 40, katAdedi: 4, kaliteSinifi: 'orta' },
    })
  })

  it('bilinmeyen alan reddedilir', () => {
    expect(validateInputs({ foo: 1 })).toEqual({ ok: false, field: 'foo', reason: 'bilinmeyen alan' })
  })

  it('aralık dışı ve sayı olmayan değerler reddedilir', () => {
    expect(validateInputs({ arsaAlani: 5 }).ok).toBe(false) // area min 100
    expect(validateInputs({ arsaSahibiPayiYuzde: 100 }).ok).toBe(false) // percent 1-99
    expect(validateInputs({ emsal: '1.5' }).ok).toBe(false)
    expect(validateInputs({ katAdedi: 2.5 }).ok).toBe(false) // tam sayı
    expect(validateInputs({ katAdedi: 51 }).ok).toBe(false)
    expect(validateInputs({ kaliteSinifi: 'süper' }).ok).toBe(false)
    expect(validateInputs({ emsal: null }).ok).toBe(false)
  })

  it('nesne olmayan reddedilir', () => {
    expect(validateInputs([1]).ok).toBe(false)
    expect(validateInputs('x').ok).toBe(false)
  })
})

describe('validateFact', () => {
  it('geçerli olgular', () => {
    expect(validateFact({ key: 'areaSqm', value: 850, source: 'tkgm' })).toEqual({
      ok: true,
      fact: { key: 'areaSqm', value: 850, source: 'tkgm' },
    })
    expect(validateFact({ key: 'imarDurumu', value: '  Konut Alanı ', source: 'kullanici' })).toEqual({
      ok: true,
      fact: { key: 'imarDurumu', value: 'Konut Alanı', source: 'kullanici' },
    })
    expect(validateFact({ key: 'emsal', value: 1.5, source: 'kullanici' }).ok).toBe(true)
    expect(validateFact({ key: 'katAdedi', value: 4, source: 'kullanici' }).ok).toBe(true)
    expect(validateFact({ key: 'daireFiyati', value: { m2: 150, tl: 7_000_000 }, source: 'ilan' })).toEqual({
      ok: true,
      fact: { key: 'daireFiyati', value: { m2: 150, tl: 7_000_000 }, source: 'ilan' },
    })
  })

  it('geçersiz anahtar/kaynak/değer reddedilir', () => {
    expect(validateFact({ key: 'x', value: 1, source: 'tkgm' }).ok).toBe(false)
    expect(validateFact({ key: 'areaSqm', value: 1, source: 'rüya' }).ok).toBe(false)
    expect(validateFact({ key: 'areaSqm', value: -5, source: 'tkgm' }).ok).toBe(false)
    expect(validateFact({ key: 'emsal', value: 99, source: 'kullanici' }).ok).toBe(false)
    expect(validateFact({ key: 'imarDurumu', value: '   ', source: 'kullanici' }).ok).toBe(false)
    expect(validateFact({ key: 'daireFiyati', value: { m2: 150 }, source: 'ilan' }).ok).toBe(false)
    expect(validateFact(null).ok).toBe(false)
  })
})

describe('validateParcelRef', () => {
  it('il/ilçe/mahalle normalize edilir, ada/parsel kırpılır, sayı string olur', () => {
    const r = validateParcelRef({ il: 'Trabzon', ilce: ' Ortahisar ', mahalle: 'Uğurlu', ada: ' 123 ', parsel: 45 })
    expect(r).toEqual({
      ok: true,
      parcel: { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' },
    })
  })

  it('aynı parselin farklı yazımları aynı sonucu verir (Review Focus 4)', () => {
    const a = validateParcelRef({ il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45' })
    const b = validateParcelRef({ il: 'TRABZON', ilce: 'ortahisar'.toUpperCase(), mahalle: 'Uğurlu ', ada: ' 123', parsel: '45 ' })
    expect(a).toEqual(b)
  })

  it('eksik/boş alan reddedilir', () => {
    expect(validateParcelRef({ il: 'Trabzon', ilce: '', mahalle: 'x', ada: '1', parsel: '2' }).ok).toBe(false)
    expect(validateParcelRef({ il: 'T', ilce: 'O', mahalle: 'U', ada: '1' }).ok).toBe(false)
    expect(validateParcelRef(null).ok).toBe(false)
  })
})

describe('validateCreateArgs', () => {
  const parcel = { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '1', parsel: '2' }

  it('minimum geçerli: tek parsel', () => {
    const r = validateCreateArgs({ parcels: [parcel] })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.parcels).toHaveLength(1)
      expect(r.value.inputs).toEqual({})
      expect(r.value.name).toBeNull()
    }
  })

  it('isim kırpılır, boş isim null olur; facts doğrulanır', () => {
    const r = validateCreateArgs({
      name: '  Maçka arsası ',
      parcels: [{ ...parcel, facts: [{ key: 'emsal', value: 1.5, source: 'kullanici' }] }],
      inputs: { arsaAlani: 850 },
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe('Maçka arsası')
      expect(r.value.parcels[0].facts).toEqual([{ key: 'emsal', value: 1.5, source: 'kullanici' }])
    }
    const blank = validateCreateArgs({ name: '   ', parcels: [parcel] })
    expect(blank.ok && blank.value.name).toBeNull()
  })

  it('parsel sayısı 1..5, geçersiz fact/girdi reddedilir', () => {
    expect(validateCreateArgs({ parcels: [] }).ok).toBe(false)
    expect(validateCreateArgs({ parcels: Array(6).fill(parcel) }).ok).toBe(false)
    expect(validateCreateArgs({ parcels: [{ ...parcel, facts: [{ key: 'x', value: 1, source: 'tkgm' }] }] }).ok).toBe(false)
    expect(validateCreateArgs({ parcels: [parcel], inputs: { arsaAlani: 1 } }).ok).toBe(false)
    expect(validateCreateArgs({ name: 'x'.repeat(81), parcels: [parcel] }).ok).toBe(false)
  })
})

describe('diffInputs / applyChanges', () => {
  it('yalnız değişen alanlar, INPUT_KEYS sırasıyla; yeni alan eski null', () => {
    const d = diffInputs({ arsaAlani: 850, arsaSahibiPayiYuzde: 40 }, { arsaSahibiPayiYuzde: 50, emsal: 1.5 })
    expect(d).toEqual([
      { field: 'emsal', oldValue: null, newValue: 1.5 },
      { field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50 },
    ])
  })

  it('aynı değeri tekrar söylemek fark üretmez (Review Focus 5)', () => {
    expect(diffInputs({ arsaAlani: 850 }, { arsaAlani: 850 })).toEqual([])
    expect(diffInputs({}, {})).toEqual([])
  })

  it('applyChanges eski nesneyi mutasyona uğratmadan uygular', () => {
    const old = { arsaAlani: 850 }
    const next = applyChanges(old, [{ field: 'arsaAlani', oldValue: 850, newValue: 900 }])
    expect(next).toEqual({ arsaAlani: 900 })
    expect(old).toEqual({ arsaAlani: 850 })
  })
})
```

- [ ] **Step 2b: Çalıştır, başarısız olduğunu gör**

Run: `npx jest src/lib/akifProje/__tests__/validation.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '../validation'`.

- [ ] **Step 3: `validation.ts` yaz**

```ts
// Akif-5c — girdi/olgu/parsel doğrulaması. Saf modül, I/O yok.
// Aralıklar mevcut numberSafety.RANGES ile aynıdır (tek doğruluk kaynağı).

import { validateRange } from '@/lib/ai/akif/numberSafety'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import {
  FACT_KEYS,
  FACT_SOURCES,
  INPUT_KEYS,
  type CreateProjectInput,
  type FactInput,
  type FactKey,
  type FactSource,
  type InputChange,
  type InputKey,
  type ParcelRef,
  type ProjectInputs,
  type ProjectParcelInput,
} from './types'

export type Failure = { ok: false; field: string; reason: string }

const fail = (field: string, reason: string): Failure => ({ ok: false, field, reason })
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const asObj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const QUALITY = ['standart', 'orta', 'luks']

const INPUT_CHECKS: Record<Exclude<InputKey, 'kaliteSinifi'>, (v: number) => boolean> = {
  arsaAlani: (v) => validateRange('area', v),
  emsal: (v) => validateRange('emsal', v),
  arsaSahibiPayiYuzde: (v) => validateRange('percent', v),
  daireBuyuklugu: (v) => validateRange('daire', v),
  birimMaliyet: (v) => validateRange('birimMaliyet', v),
  katAdedi: (v) => Number.isInteger(v) && v >= 1 && v <= 50,
}

export function validateInputs(raw: unknown): { ok: true; inputs: ProjectInputs } | Failure {
  if (raw === undefined || raw === null) return { ok: true, inputs: {} }
  const obj = asObj(raw)
  if (!obj) return fail('inputs', 'nesne olmalı')
  const out: ProjectInputs = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!(INPUT_KEYS as readonly string[]).includes(k)) return fail(k, 'bilinmeyen alan')
    const key = k as InputKey
    if (key === 'kaliteSinifi') {
      if (typeof v !== 'string' || !QUALITY.includes(v)) return fail(k, 'geçersiz kalite sınıfı')
      out[key] = v
      continue
    }
    if (!isNum(v)) return fail(k, 'sayı olmalı')
    if (!INPUT_CHECKS[key](v)) return fail(k, 'geçersiz aralık')
    out[key] = v
  }
  return { ok: true, inputs: out }
}

const trimmedText = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length >= 1 && t.length <= max ? t : null
}

export function validateFact(raw: unknown): { ok: true; fact: FactInput } | Failure {
  const o = asObj(raw)
  if (!o) return fail('fact', 'nesne olmalı')
  if (!(FACT_KEYS as readonly string[]).includes(o.key as string)) return fail('key', 'bilinmeyen olgu')
  if (!(FACT_SOURCES as readonly string[]).includes(o.source as string)) return fail('source', 'bilinmeyen kaynak')
  const key = o.key as FactKey
  const source = o.source as FactSource
  const v = o.value
  const ok = (value: unknown) => ({ ok: true as const, fact: { key, value, source } })

  switch (key) {
    case 'areaSqm':
      return isNum(v) && v > 0 && v <= 10_000_000 ? ok(v) : fail('value', 'geçersiz alan')
    case 'emsal':
      return isNum(v) && validateRange('emsal', v) ? ok(v) : fail('value', 'geçersiz emsal')
    case 'katAdedi':
      return isNum(v) && Number.isInteger(v) && v >= 1 && v <= 50 ? ok(v) : fail('value', 'geçersiz kat adedi')
    case 'taks':
      return isNum(v) && v >= 0.05 && v <= 1 ? ok(v) : fail('value', 'geçersiz taks')
    case 'hmax':
      return isNum(v) && v >= 3 && v <= 300 ? ok(v) : fail('value', 'geçersiz yükseklik')
    case 'imarDurumu': {
      const t = trimmedText(v, 200)
      return t ? ok(t) : fail('value', 'metin olmalı')
    }
    case 'malik': {
      const t = trimmedText(v, 100)
      return t ? ok(t) : fail('value', 'metin olmalı')
    }
    case 'daireFiyati': {
      const d = asObj(v)
      if (!d || !isNum(d.m2) || !validateRange('daire', d.m2)) return fail('value', 'geçersiz daire büyüklüğü')
      if (!isNum(d.tl) || d.tl < 100_000 || d.tl > 1_000_000_000) return fail('value', 'geçersiz fiyat')
      return ok({ m2: d.m2, tl: d.tl })
    }
  }
}

export function validateParcelRef(raw: unknown): { ok: true; parcel: ParcelRef } | Failure {
  const o = asObj(raw)
  if (!o) return fail('parcel', 'nesne olmalı')
  const text = (field: string, max: number): string | Failure => {
    const v = o[field]
    const s = typeof v === 'number' && Number.isFinite(v) ? String(v) : v
    const t = trimmedText(s, max)
    return t ?? fail(field, 'eksik veya geçersiz')
  }
  const il = text('il', 60)
  if (typeof il !== 'string') return il
  const ilce = text('ilce', 60)
  if (typeof ilce !== 'string') return ilce
  const mahalle = text('mahalle', 60)
  if (typeof mahalle !== 'string') return mahalle
  const ada = text('ada', 20)
  if (typeof ada !== 'string') return ada
  const parsel = text('parsel', 20)
  if (typeof parsel !== 'string') return parsel
  return {
    ok: true,
    parcel: {
      il: normalizeAreaName(il),
      ilce: normalizeAreaName(ilce),
      mahalle: normalizeAreaName(mahalle),
      ada,
      parsel,
    },
  }
}

const MAX_PARCELS = 5
const MAX_FACTS_PER_PARCEL = 10
const MAX_NAME = 80

export function validateCreateArgs(raw: unknown): { ok: true; value: CreateProjectInput } | Failure {
  const o = asObj(raw)
  if (!o) return fail('args', 'nesne olmalı')

  let name: string | null = null
  if (o.name !== undefined && o.name !== null) {
    if (typeof o.name !== 'string') return fail('name', 'metin olmalı')
    const t = o.name.trim()
    if (t.length > MAX_NAME) return fail('name', 'çok uzun')
    name = t.length ? t : null
  }

  if (!Array.isArray(o.parcels) || o.parcels.length < 1 || o.parcels.length > MAX_PARCELS) {
    return fail('parcels', `1-${MAX_PARCELS} parsel olmalı`)
  }
  const parcels: ProjectParcelInput[] = []
  for (const p of o.parcels) {
    const ref = validateParcelRef(p)
    if (!ref.ok) return ref
    const factsRaw = asObj(p)?.facts
    const facts: FactInput[] = []
    if (factsRaw !== undefined && factsRaw !== null) {
      if (!Array.isArray(factsRaw) || factsRaw.length > MAX_FACTS_PER_PARCEL) return fail('facts', 'geçersiz liste')
      for (const f of factsRaw) {
        const v = validateFact(f)
        if (!v.ok) return v
        facts.push(v.fact)
      }
    }
    parcels.push(facts.length ? { ...ref.parcel, facts } : ref.parcel)
  }

  const inputs = validateInputs(o.inputs)
  if (!inputs.ok) return inputs
  return { ok: true, value: { name, parcels, inputs: inputs.inputs } }
}

export function diffInputs(oldI: ProjectInputs, next: ProjectInputs): InputChange[] {
  const out: InputChange[] = []
  for (const k of INPUT_KEYS) {
    const nv = next[k]
    if (nv === undefined) continue
    if (oldI[k] === nv) continue
    out.push({ field: k, oldValue: oldI[k] ?? null, newValue: nv })
  }
  return out
}

export function applyChanges(oldI: ProjectInputs, changes: InputChange[]): ProjectInputs {
  const result: ProjectInputs = { ...oldI }
  for (const c of changes) result[c.field as InputKey] = c.newValue as number | string
  return result
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/lib/akifProje/__tests__/validation.test.ts --no-coverage`
Expected: PASS (tüm testler yeşil).

- [ ] **Step 5: Commit**

```bash
git add src/lib/akifProje/types.ts src/lib/akifProje/validation.ts src/lib/akifProje/__tests__/validation.test.ts
git commit -m "feat(akif-5c): proje girdi/olgu/parsel doğrulaması ve diff

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Bayatlık politikası (`freshness.ts`)

**Files:**
- Create: `src/lib/akifProje/freshness.ts`
- Test: `src/lib/akifProje/__tests__/freshness.test.ts`

**Interfaces:**
- Consumes: `FactKey`, `FactSource` (types.ts).
- Produces: `FACT_TTL_DAYS: Record<FactKey, number | null>`; `REQUIRED_FOR_PROJECT: readonly FactKey[]`; `interface FactRow { key: FactKey; value: unknown; source: FactSource; recordedAt: Date }`; `interface Classified { taze: FactRow[]; bayat: FactRow[]; eksik: FactKey[] }`; `classifyFacts(rows: FactRow[], now: Date, required?: readonly FactKey[]): Classified`.

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { classifyFacts, FACT_TTL_DAYS, type FactRow } from '../freshness'

const NOW = new Date('2026-10-15T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)
const row = (key: FactRow['key'], ageDays: number, value: unknown = 1): FactRow => ({
  key,
  value,
  source: 'kullanici',
  recordedAt: daysAgo(ageDays),
})

describe('FACT_TTL_DAYS', () => {
  it('spec ömürleri', () => {
    expect(FACT_TTL_DAYS.areaSqm).toBeNull()
    expect(FACT_TTL_DAYS.imarDurumu).toBe(180)
    expect(FACT_TTL_DAYS.emsal).toBe(180)
    expect(FACT_TTL_DAYS.katAdedi).toBe(180)
    expect(FACT_TTL_DAYS.taks).toBe(180)
    expect(FACT_TTL_DAYS.hmax).toBe(180)
    expect(FACT_TTL_DAYS.daireFiyati).toBe(45)
    expect(FACT_TTL_DAYS.malik).toBe(365)
  })
})

describe('classifyFacts', () => {
  it('süresiz olgu asla bayatlamaz', () => {
    const r = classifyFacts([row('areaSqm', 5000)], NOW)
    expect(r.taze.map((f) => f.key)).toEqual(['areaSqm'])
    expect(r.bayat).toEqual([])
  })

  it('180 gün sınırında taze, ötesinde bayat', () => {
    const r = classifyFacts([row('emsal', 180), row('imarDurumu', 181)], NOW)
    expect(r.taze.map((f) => f.key)).toEqual(['emsal'])
    expect(r.bayat.map((f) => f.key)).toEqual(['imarDurumu'])
  })

  it('daire fiyatı 45 günden sonra bayat', () => {
    const r = classifyFacts([row('daireFiyati', 46)], NOW, [])
    expect(r.bayat.map((f) => f.key)).toEqual(['daireFiyati'])
  })

  it('zorunlu olup olmayanlar eksik listesine girer (varsayılan zorunlular)', () => {
    const r = classifyFacts([row('areaSqm', 1)], NOW)
    expect(r.eksik).toEqual(['imarDurumu', 'emsal', 'katAdedi'])
  })

  it('aynı anahtarın birden fazla satırında en yenisi kullanılır', () => {
    const r = classifyFacts([row('emsal', 400, 1.0), row('emsal', 10, 1.5)], NOW)
    expect(r.taze).toHaveLength(1)
    expect(r.taze[0].value).toBe(1.5)
    expect(r.bayat).toEqual([])
  })

  it('özel zorunlu liste verilebilir; hepsi varsa eksik boş', () => {
    const r = classifyFacts([row('emsal', 1)], NOW, ['emsal'])
    expect(r.eksik).toEqual([])
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL** (`Cannot find module '../freshness'`)

Run: `npx jest src/lib/akifProje/__tests__/freshness.test.ts --no-coverage`

- [ ] **Step 3: Uygula**

```ts
// Akif-5c — olgu bayatlık politikası. Kararı KOD verir, LLM vermez.

import type { FactKey, FactSource } from './types'

const DAY_MS = 86_400_000

/** null = süresiz. Değerler spec §3.1 (başlangıç ömürleri). */
export const FACT_TTL_DAYS: Record<FactKey, number | null> = {
  areaSqm: null,
  imarDurumu: 180,
  emsal: 180,
  katAdedi: 180,
  taks: 180,
  hmax: 180,
  malik: 365,
  daireFiyati: 45,
}

/** Bir proje hesaplanabilmesi için sorulması gereken olgular. */
export const REQUIRED_FOR_PROJECT: readonly FactKey[] = ['areaSqm', 'imarDurumu', 'emsal', 'katAdedi']

export interface FactRow {
  key: FactKey
  value: unknown
  source: FactSource
  recordedAt: Date
}

export interface Classified {
  taze: FactRow[]
  bayat: FactRow[]
  eksik: FactKey[]
}

export function classifyFacts(
  rows: FactRow[],
  now: Date,
  required: readonly FactKey[] = REQUIRED_FOR_PROJECT,
): Classified {
  const latest = new Map<FactKey, FactRow>()
  for (const r of rows) {
    const prev = latest.get(r.key)
    if (!prev || r.recordedAt.getTime() > prev.recordedAt.getTime()) latest.set(r.key, r)
  }

  const taze: FactRow[] = []
  const bayat: FactRow[] = []
  for (const r of latest.values()) {
    const ttl = FACT_TTL_DAYS[r.key]
    const stale = ttl !== null && now.getTime() - r.recordedAt.getTime() > ttl * DAY_MS
    ;(stale ? bayat : taze).push(r)
  }
  const eksik = required.filter((k) => !latest.has(k))
  return { taze, bayat, eksik }
}
```

- [ ] **Step 4: Çalıştır → PASS**

Run: `npx jest src/lib/akifProje/__tests__/freshness.test.ts --no-coverage`

- [ ] **Step 5: Commit**

```bash
git add src/lib/akifProje/freshness.ts src/lib/akifProje/__tests__/freshness.test.ts
git commit -m "feat(akif-5c): olgu bayatlık politikası (taze/bayat/eksik)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Tarih aralığı çözümü (`dateRange.ts`)

**Files:**
- Create: `src/lib/akifProje/dateRange.ts`
- Test: `src/lib/akifProje/__tests__/dateRange.test.ts`

**Interfaces:**
- Produces: `istanbulDateString(d: Date): string` (`YYYY-MM-DD`, Europe/Istanbul); `parseDateRange(args: { dateFrom?: unknown; dateTo?: unknown }): { ok: true; range: { from: Date; toExclusive: Date } | null } | { ok: false; field: string; reason: string }`. `from` = TR gün başlangıcı (UTC karşılığı), `toExclusive` = `dateTo` gününü izleyen TR gün başlangıcı.

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { parseDateRange, istanbulDateString } from '../dateRange'

describe('istanbulDateString', () => {
  it('UTC 21:30 sonrası İstanbul\'da ertesi gün', () => {
    expect(istanbulDateString(new Date('2026-10-14T21:30:00Z'))).toBe('2026-10-15')
    expect(istanbulDateString(new Date('2026-10-14T20:59:59Z'))).toBe('2026-10-14')
  })
})

describe('parseDateRange', () => {
  it('tek tarih = o günün TR sınırları', () => {
    const r = parseDateRange({ dateFrom: '2026-10-15' })
    expect(r).toEqual({
      ok: true,
      range: { from: new Date('2026-10-14T21:00:00Z'), toExclusive: new Date('2026-10-15T21:00:00Z') },
    })
  })

  it('dateTo tek başına da çalışır', () => {
    const r = parseDateRange({ dateTo: '2026-10-15' })
    expect(r.ok && r.range?.from).toEqual(new Date('2026-10-14T21:00:00Z'))
  })

  it('ay aralığı (Ocak)', () => {
    const r = parseDateRange({ dateFrom: '2026-01-01', dateTo: '2026-01-31' })
    expect(r).toEqual({
      ok: true,
      range: { from: new Date('2025-12-31T21:00:00Z'), toExclusive: new Date('2026-01-31T21:00:00Z') },
    })
  })

  it('gece yarısı sınırı: 00:30 TR (21:30Z) 15 Ekim aralığına düşer (Review Focus 3)', () => {
    const r = parseDateRange({ dateFrom: '2026-10-15' })
    if (!r.ok || !r.range) throw new Error('beklenmeyen')
    const t = new Date('2026-10-14T21:30:00Z').getTime()
    expect(t >= r.range.from.getTime() && t < r.range.toExclusive.getTime()).toBe(true)
  })

  it('hiçbiri yoksa ok + range null', () => {
    expect(parseDateRange({})).toEqual({ ok: true, range: null })
    expect(parseDateRange({ dateFrom: null, dateTo: undefined })).toEqual({ ok: true, range: null })
  })

  it('geçersiz tarih/biçim/ters aralık hata döner', () => {
    expect(parseDateRange({ dateFrom: '2026-02-30' }).ok).toBe(false)
    expect(parseDateRange({ dateFrom: '15 Ekim' }).ok).toBe(false)
    expect(parseDateRange({ dateFrom: 20261015 }).ok).toBe(false)
    expect(parseDateRange({ dateFrom: '2026-10-20', dateTo: '2026-10-15' })).toEqual({
      ok: false,
      field: 'dateTo',
      reason: 'ters aralık',
    })
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/akifProje/__tests__/dateRange.test.ts --no-coverage`

- [ ] **Step 3: Uygula**

```ts
// Akif-5c — Europe/Istanbul tarih aralığı. Türkiye 2016'dan beri sabit UTC+3
// (DST yok), bu yüzden sabit ofset doğrudur.

const TR_OFFSET_MS = 3 * 3_600_000
const DAY_MS = 86_400_000

export function istanbulDateString(d: Date): string {
  return new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10)
}

/** 'YYYY-MM-DD' → o günün TR başlangıcının UTC ms değeri; geçersizse null. */
function parseDay(s: unknown): number | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  const chk = new Date(t)
  if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== m - 1 || chk.getUTCDate() !== d) return null
  return t - TR_OFFSET_MS
}

export type DateRangeResult =
  | { ok: true; range: { from: Date; toExclusive: Date } | null }
  | { ok: false; field: string; reason: string }

export function parseDateRange(args: { dateFrom?: unknown; dateTo?: unknown }): DateRangeResult {
  const hasFrom = args.dateFrom !== undefined && args.dateFrom !== null
  const hasTo = args.dateTo !== undefined && args.dateTo !== null
  if (!hasFrom && !hasTo) return { ok: true, range: null }

  const fromMs = hasFrom ? parseDay(args.dateFrom) : null
  if (hasFrom && fromMs === null) return { ok: false, field: 'dateFrom', reason: 'geçersiz tarih (YYYY-MM-DD)' }
  const toMs = hasTo ? parseDay(args.dateTo) : null
  if (hasTo && toMs === null) return { ok: false, field: 'dateTo', reason: 'geçersiz tarih (YYYY-MM-DD)' }

  const from = (fromMs ?? toMs) as number
  const to = (toMs ?? fromMs) as number
  if (from > to) return { ok: false, field: 'dateTo', reason: 'ters aralık' }
  return { ok: true, range: { from: new Date(from), toExclusive: new Date(to + DAY_MS) } }
}
```

- [ ] **Step 4: Çalıştır → PASS**

Run: `npx jest src/lib/akifProje/__tests__/dateRange.test.ts --no-coverage`

- [ ] **Step 5: Commit**

```bash
git add src/lib/akifProje/dateRange.ts src/lib/akifProje/__tests__/dateRange.test.ts
git commit -m "feat(akif-5c): Europe/Istanbul tarih aralığı çözümü

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Parsel Dosyası servisi (`parselDosyasi.ts`)

**Files:**
- Create: `src/lib/akifProje/parselDosyasi.ts`
- Test: `src/lib/akifProje/__tests__/parselDosyasi.test.ts`

**Interfaces:**
- Consumes: `ParcelRef`, `FactInput` (types.ts); `FactRow` (freshness.ts).
- Produces: `type Tx = Prisma.TransactionClient`; `upsertParsel(tx: Tx, userId: string, ref: ParcelRef): Promise<{ id: string }>`; `recordFact(tx: Tx, parselDosyasiId: string, fact: FactInput, now: Date): Promise<{ changed: boolean }>`; `listCurrentFacts(tx: Tx, parselDosyasiId: string): Promise<FactRow[]>`; `canonicalJson(v: unknown): string`.

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { upsertParsel, recordFact, listCurrentFacts, canonicalJson } from '../parselDosyasi'
import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient
const NOW = new Date('2026-10-15T12:00:00Z')

function makeTx(over: Record<string, unknown> = {}) {
  const tx = {
    parselDosyasi: {
      upsert: jest.fn().mockResolvedValue({ id: 'pd1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    parselOlgu: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...over,
  }
  return tx as unknown as Tx & typeof tx
}

describe('canonicalJson', () => {
  it('nesne anahtar sırasından bağımsızdır (jsonb anahtarları yeniden sıralar)', () => {
    expect(canonicalJson({ m2: 150, tl: 7 })).toBe(canonicalJson({ tl: 7, m2: 150 }))
    expect(canonicalJson({ a: { y: 1, x: 2 } })).toBe(canonicalJson({ a: { x: 2, y: 1 } }))
    expect(canonicalJson(1.5)).not.toBe(canonicalJson('1.5'))
  })
})

describe('upsertParsel', () => {
  it('bileşik anahtarla upsert eder ve id döner', async () => {
    const tx = makeTx()
    const ref = { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' }
    const r = await upsertParsel(tx, 'u1', ref)
    expect(r).toEqual({ id: 'pd1' })
    expect(tx.parselDosyasi.upsert).toHaveBeenCalledWith({
      where: { userId_il_ilce_mahalle_ada_parsel: { userId: 'u1', ...ref } },
      create: { userId: 'u1', ...ref },
      update: {},
      select: { id: true },
    })
  })
})

describe('recordFact', () => {
  it('olgu yoksa yeni satır oluşturur ve dosyayı günceller', async () => {
    const tx = makeTx()
    const r = await recordFact(tx, 'pd1', { key: 'emsal', value: 1.5, source: 'kullanici' }, NOW)
    expect(r).toEqual({ changed: true })
    expect(tx.parselOlgu.create).toHaveBeenCalledWith({
      data: { parselDosyasiId: 'pd1', key: 'emsal', value: 1.5, source: 'kullanici', recordedAt: NOW },
    })
    expect(tx.parselOlgu.update).not.toHaveBeenCalled()
    expect(tx.parselDosyasi.update).toHaveBeenCalledWith({ where: { id: 'pd1' }, data: { updatedAt: NOW } })
  })

  it('değer değişirse eskisi supersede edilir, yenisi eklenir (geçmiş silinmez)', async () => {
    const tx = makeTx()
    tx.parselOlgu.findFirst.mockResolvedValue({ id: 'o1', value: 1.0 })
    const r = await recordFact(tx, 'pd1', { key: 'emsal', value: 1.5, source: 'kullanici' }, NOW)
    expect(r).toEqual({ changed: true })
    expect(tx.parselOlgu.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { supersededAt: NOW } })
    expect(tx.parselOlgu.create).toHaveBeenCalledTimes(1)
  })

  it('aynı değer tekrar teyit edilirse recordedAt tazelenir, yeni satır YOK (Review Focus 2)', async () => {
    const tx = makeTx()
    tx.parselOlgu.findFirst.mockResolvedValue({ id: 'o1', value: { tl: 7000000, m2: 150 } })
    const r = await recordFact(tx, 'pd1', { key: 'daireFiyati', value: { m2: 150, tl: 7000000 }, source: 'kullanici' }, NOW)
    expect(r).toEqual({ changed: false })
    expect(tx.parselOlgu.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { recordedAt: NOW, source: 'kullanici' },
    })
    expect(tx.parselOlgu.create).not.toHaveBeenCalled()
  })
})

describe('listCurrentFacts', () => {
  it('yalnız supersede edilmemiş satırları FactRow olarak döner', async () => {
    const tx = makeTx()
    const at = new Date('2026-09-01T00:00:00Z')
    tx.parselOlgu.findMany.mockResolvedValue([{ key: 'emsal', value: 1.5, source: 'kullanici', recordedAt: at }])
    const rows = await listCurrentFacts(tx, 'pd1')
    expect(tx.parselOlgu.findMany).toHaveBeenCalledWith({
      where: { parselDosyasiId: 'pd1', supersededAt: null },
      select: { key: true, value: true, source: true, recordedAt: true },
    })
    expect(rows).toEqual([{ key: 'emsal', value: 1.5, source: 'kullanici', recordedAt: at }])
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/akifProje/__tests__/parselDosyasi.test.ts --no-coverage`

- [ ] **Step 3: Uygula**

```ts
// Akif-5c — Parsel Dosyası: parsel başına tek kayıt + tarihli, geçmişi korunan olgular.

import type { Prisma } from '@prisma/client'
import type { FactInput, ParcelRef } from './types'
import type { FactRow } from './freshness'

export type Tx = Prisma.TransactionClient

/** Anahtar sırasından bağımsız JSON metni — Postgres jsonb anahtarları yeniden sıralar. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
    .join(',')}}`
}

export async function upsertParsel(tx: Tx, userId: string, ref: ParcelRef): Promise<{ id: string }> {
  return tx.parselDosyasi.upsert({
    where: { userId_il_ilce_mahalle_ada_parsel: { userId, ...ref } },
    create: { userId, ...ref },
    update: {},
    select: { id: true },
  })
}

export async function recordFact(
  tx: Tx,
  parselDosyasiId: string,
  fact: FactInput,
  now: Date,
): Promise<{ changed: boolean }> {
  const current = await tx.parselOlgu.findFirst({
    where: { parselDosyasiId, key: fact.key, supersededAt: null },
    orderBy: { recordedAt: 'desc' },
  })
  let changed = true
  if (current && canonicalJson(current.value) === canonicalJson(fact.value)) {
    // Teyit: aynı değer tekrar söylendi → yeni satır açma, tazele.
    await tx.parselOlgu.update({
      where: { id: current.id },
      data: { recordedAt: now, source: fact.source },
    })
    changed = false
  } else {
    if (current) {
      await tx.parselOlgu.update({ where: { id: current.id }, data: { supersededAt: now } })
    }
    await tx.parselOlgu.create({
      data: {
        parselDosyasiId,
        key: fact.key,
        value: fact.value as Prisma.InputJsonValue,
        source: fact.source,
        recordedAt: now,
      },
    })
  }
  await tx.parselDosyasi.update({ where: { id: parselDosyasiId }, data: { updatedAt: now } })
  return { changed }
}

export async function listCurrentFacts(tx: Tx, parselDosyasiId: string): Promise<FactRow[]> {
  const rows = await tx.parselOlgu.findMany({
    where: { parselDosyasiId, supersededAt: null },
    select: { key: true, value: true, source: true, recordedAt: true },
  })
  return rows as unknown as FactRow[]
}
```

- [ ] **Step 4: Çalıştır → PASS**

Run: `npx jest src/lib/akifProje/__tests__/parselDosyasi.test.ts --no-coverage`

- [ ] **Step 5: Commit**

```bash
git add src/lib/akifProje/parselDosyasi.ts src/lib/akifProje/__tests__/parselDosyasi.test.ts
git commit -m "feat(akif-5c): parsel dosyası servisi (tarihli olgular, teyitte tazeleme)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Proje Kartı servisi (`projeKarti.ts`)

**Files:**
- Create: `src/lib/akifProje/projeKarti.ts`
- Test: `src/lib/akifProje/__tests__/projeKarti.test.ts`

**Interfaces:**
- Consumes: Task 2 (`diffInputs`, `applyChanges`, tipler), Task 5 (`Tx`, `upsertParsel`, `recordFact`), Task 4 (`DateRangeResult` içindeki `range` biçimi).
- Produces:
  - `createProjectTx(tx: Tx, a: CreateProjectArgs, now: Date): Promise<{ id: string; name: string | null }>` where `CreateProjectArgs = CreateProjectInput & { userId: string; channel: Channel }`.
  - `createProject(db: PrismaClient, a: CreateProjectArgs, now: Date)` (transaction sarmalayıcı).
  - `updateProject(db: PrismaClient, a: { userId: string; projectId: string; changes: ProjectInputs; name?: string; channel: Channel; note?: string }, now: Date): Promise<{ ok: true; changes: InputChange[]; nameChanged: boolean } | { ok: false; reason: 'not_found' }>`.
  - `findProjects(db: PrismaClient, q: { userId: string; range?: { from: Date; toExclusive: Date } | null; nameLike?: string; ada?: string; parsel?: string; mahalle?: string }): Promise<{ candidates: ProjectListItem[]; more: boolean }>`; `ProjectListItem = { id: string; name: string | null; createdAt: Date; updatedAt: Date; parcels: ParcelRef[] }`.
  - `getProjectSummary(db: PrismaClient, a: { userId: string; projectId: string }): Promise<ProjectSummary | null>`; `ProjectSummary = ProjectListItem & { inputs: ProjectInputs; revisions: Array<{ field: string; oldValue: unknown; newValue: unknown; changedAt: Date; channel: string }>; truncated: boolean }` (revisions en yeni → en eski).

- [ ] **Step 1: Başarısız testi yaz**

```ts
import type { PrismaClient } from '@prisma/client'
import { createProject, updateProject, findProjects, getProjectSummary } from '../projeKarti'

const NOW = new Date('2026-10-15T12:00:00Z')
const REF = { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' }

function makeDb() {
  const tx = {
    parselDosyasi: { upsert: jest.fn().mockResolvedValue({ id: 'pd1' }), update: jest.fn().mockResolvedValue({}) },
    parselOlgu: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    projeKarti: {
      create: jest.fn().mockResolvedValue({ id: 'pk1', name: 'Maçka' }),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    projeRevizyon: { createMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
  }
  const db = {
    ...tx,
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  }
  return { db: db as unknown as PrismaClient, tx }
}

describe('createProject', () => {
  it('parseli upsert eder, olguları kaydeder, kartı ve ilk girdi revizyonlarını yazar', async () => {
    const { db, tx } = makeDb()
    const r = await createProject(
      db,
      {
        userId: 'u1',
        name: 'Maçka',
        parcels: [{ ...REF, facts: [{ key: 'emsal', value: 1.5, source: 'kullanici' }] }],
        inputs: { arsaSahibiPayiYuzde: 40, arsaAlani: 850 },
        channel: 'whatsapp',
      },
      NOW,
    )
    expect(r).toEqual({ id: 'pk1', name: 'Maçka' })
    expect(tx.parselOlgu.create).toHaveBeenCalledTimes(1)
    expect(tx.projeKarti.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        name: 'Maçka',
        inputs: { arsaSahibiPayiYuzde: 40, arsaAlani: 850 },
        parseller: { create: [{ parselDosyasiId: 'pd1' }] },
      },
      select: { id: true, name: true },
    })
    // INPUT_KEYS sırası: arsaAlani önce
    expect(tx.projeRevizyon.createMany).toHaveBeenCalledWith({
      data: [
        { projeKartiId: 'pk1', field: 'arsaAlani', newValue: 850, changedAt: NOW, channel: 'whatsapp', note: 'ilk girdi' },
        { projeKartiId: 'pk1', field: 'arsaSahibiPayiYuzde', newValue: 40, changedAt: NOW, channel: 'whatsapp', note: 'ilk girdi' },
      ],
    })
  })

  it('girdi yoksa revizyon yazılmaz; aynı parsel iki kez verilse tek bağ kurulur', async () => {
    const { db, tx } = makeDb()
    await createProject(db, { userId: 'u1', parcels: [REF, REF], inputs: {}, channel: 'whatsapp' }, NOW)
    expect(tx.projeRevizyon.createMany).not.toHaveBeenCalled()
    expect(tx.projeKarti.create.mock.calls[0][0].data.parseller).toEqual({ create: [{ parselDosyasiId: 'pd1' }] })
    expect(tx.projeKarti.create.mock.calls[0][0].data.name).toBeNull()
  })
})

describe('updateProject', () => {
  const card = { id: 'pk1', name: 'Maçka', inputs: { arsaAlani: 850, arsaSahibiPayiYuzde: 40 } }

  it('sahibi olmayan veya var olmayan proje → not_found (Review Focus 1)', async () => {
    const { db, tx } = makeDb()
    const r = await updateProject(db, { userId: 'baskasi', projectId: 'pk1', changes: { emsal: 1.5 }, channel: 'whatsapp' }, NOW)
    expect(r).toEqual({ ok: false, reason: 'not_found' })
    expect(tx.projeKarti.findFirst).toHaveBeenCalledWith({
      where: { id: 'pk1', userId: 'baskasi' },
      select: { id: true, name: true, inputs: true },
    })
    expect(tx.projeKarti.update).not.toHaveBeenCalled()
  })

  it('değişen alanlar için revizyon yazar ve girdileri birleştirir', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findFirst.mockResolvedValue(card)
    const r = await updateProject(
      db,
      { userId: 'u1', projectId: 'pk1', changes: { arsaSahibiPayiYuzde: 50, arsaAlani: 850 }, channel: 'whatsapp' },
      NOW,
    )
    expect(r).toEqual({
      ok: true,
      changes: [{ field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50 }],
      nameChanged: false,
    })
    expect(tx.projeKarti.update).toHaveBeenCalledWith({
      where: { id: 'pk1' },
      data: { inputs: { arsaAlani: 850, arsaSahibiPayiYuzde: 50 } },
    })
    expect(tx.projeRevizyon.createMany).toHaveBeenCalledWith({
      data: [
        { projeKartiId: 'pk1', field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50, changedAt: NOW, channel: 'whatsapp', note: null },
      ],
    })
  })

  it('değişiklik yoksa sessiz no-op (Review Focus 5)', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findFirst.mockResolvedValue(card)
    const r = await updateProject(db, { userId: 'u1', projectId: 'pk1', changes: { arsaAlani: 850 }, channel: 'whatsapp' }, NOW)
    expect(r).toEqual({ ok: true, changes: [], nameChanged: false })
    expect(tx.projeKarti.update).not.toHaveBeenCalled()
    expect(tx.projeRevizyon.createMany).not.toHaveBeenCalled()
  })

  it('isim değişimi "name" alanıyla revizyona yazılır', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findFirst.mockResolvedValue(card)
    const r = await updateProject(db, { userId: 'u1', projectId: 'pk1', changes: {}, name: 'Yeni ad', channel: 'whatsapp' }, NOW)
    expect(r).toEqual({ ok: true, changes: [], nameChanged: true })
    expect(tx.projeKarti.update).toHaveBeenCalledWith({
      where: { id: 'pk1' },
      data: { inputs: card.inputs, name: 'Yeni ad' },
    })
    expect(tx.projeRevizyon.createMany.mock.calls[0][0].data[0]).toMatchObject({ field: 'name', oldValue: 'Maçka', newValue: 'Yeni ad' })
  })
})

describe('findProjects', () => {
  const row = (id: string) => ({
    id,
    name: null,
    createdAt: NOW,
    updatedAt: NOW,
    parseller: [{ parselDosyasi: REF }],
  })

  it('her zaman userId ile süzer; tarih aralığı createdAt VEYA revizyon tarihi olarak uygulanır (Review Focus 3)', async () => {
    const { db, tx } = makeDb()
    const range = { from: new Date('2026-10-14T21:00:00Z'), toExclusive: new Date('2026-10-15T21:00:00Z') }
    await findProjects(db, { userId: 'u1', range })
    const arg = tx.projeKarti.findMany.mock.calls[0][0]
    expect(arg.where.userId).toBe('u1')
    expect(arg.where.AND).toEqual([
      {
        OR: [
          { createdAt: { gte: range.from, lt: range.toExclusive } },
          { revizyonlar: { some: { changedAt: { gte: range.from, lt: range.toExclusive } } } },
        ],
      },
    ])
    expect(arg.take).toBe(6)
  })

  it('ad, ada/parsel ve mahalle filtreleri eklenir (mahalle normalize)', async () => {
    const { db, tx } = makeDb()
    await findProjects(db, { userId: 'u1', nameLike: 'maçka', ada: '123', parsel: '45', mahalle: 'Uğurlu' })
    const and = tx.projeKarti.findMany.mock.calls[0][0].where.AND
    expect(and).toContainEqual({ name: { contains: 'maçka', mode: 'insensitive' } })
    expect(and).toContainEqual({
      parseller: { some: { parselDosyasi: { ada: '123', parsel: '45', mahalle: { contains: 'UĞURLU' } } } },
    })
  })

  it('6 sonuçtan 5\'i döner ve more=true', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findMany.mockResolvedValue(['a', 'b', 'c', 'd', 'e', 'f'].map(row))
    const r = await findProjects(db, { userId: 'u1' })
    expect(r.candidates).toHaveLength(5)
    expect(r.more).toBe(true)
    expect(r.candidates[0].parcels).toEqual([REF])
  })
})

describe('getProjectSummary', () => {
  it('başkasının/olmayan proje → null (Review Focus 1)', async () => {
    const { db, tx } = makeDb()
    expect(await getProjectSummary(db, { userId: 'x', projectId: 'pk1' })).toBeNull()
    expect(tx.projeKarti.findFirst.mock.calls[0][0].where).toEqual({ id: 'pk1', userId: 'x' })
  })

  it('revizyonlar en yeni → en eski; 51. satır truncated işareti', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findFirst.mockResolvedValue({
      id: 'pk1',
      name: 'Maçka',
      inputs: { arsaAlani: 900 },
      createdAt: NOW,
      updatedAt: NOW,
      parseller: [{ parselDosyasi: REF }],
    })
    const revs = Array.from({ length: 51 }, (_, i) => ({
      field: 'arsaAlani',
      oldValue: i,
      newValue: i + 1,
      changedAt: new Date(NOW.getTime() - i * 1000),
      channel: 'whatsapp',
    }))
    tx.projeRevizyon.findMany.mockResolvedValue(revs)
    const s = await getProjectSummary(db, { userId: 'u1', projectId: 'pk1' })
    expect(tx.projeRevizyon.findMany).toHaveBeenCalledWith({
      where: { projeKartiId: 'pk1' },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
      take: 51,
      select: { field: true, oldValue: true, newValue: true, changedAt: true, channel: true },
    })
    expect(s?.revisions).toHaveLength(50)
    expect(s?.truncated).toBe(true)
    expect(s?.inputs).toEqual({ arsaAlani: 900 })
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/akifProje/__tests__/projeKarti.test.ts --no-coverage`

- [ ] **Step 3: Uygula**

```ts
// Akif-5c — Proje Kartı: oluştur / güncelle (revizyon günlüğüyle) / bul / özetle.
// Sahiplik filtresi (userId) HER sorgunun parçasıdır.

import type { Prisma, PrismaClient } from '@prisma/client'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { INPUT_KEYS, type Channel, type CreateProjectInput, type InputChange, type ParcelRef, type ProjectInputs } from './types'
import { applyChanges, diffInputs } from './validation'
import { recordFact, upsertParsel, type Tx } from './parselDosyasi'

export type CreateProjectArgs = CreateProjectInput & { userId: string; channel: Channel }

export async function createProjectTx(
  tx: Tx,
  a: CreateProjectArgs,
  now: Date,
): Promise<{ id: string; name: string | null }> {
  const parcelIds: string[] = []
  for (const p of a.parcels) {
    const { facts, ...ref } = p
    const { id } = await upsertParsel(tx, a.userId, ref)
    for (const f of facts ?? []) await recordFact(tx, id, f, now)
    parcelIds.push(id)
  }
  const card = await tx.projeKarti.create({
    data: {
      userId: a.userId,
      name: a.name ?? null,
      inputs: a.inputs as Prisma.InputJsonValue,
      parseller: { create: [...new Set(parcelIds)].map((parselDosyasiId) => ({ parselDosyasiId })) },
    },
    select: { id: true, name: true },
  })
  const rows: Prisma.ProjeRevizyonCreateManyInput[] = INPUT_KEYS.filter((k) => a.inputs[k] !== undefined).map((k) => ({
    projeKartiId: card.id,
    field: k,
    newValue: a.inputs[k] as Prisma.InputJsonValue,
    changedAt: now,
    channel: a.channel,
    note: 'ilk girdi',
  }))
  if (rows.length) await tx.projeRevizyon.createMany({ data: rows })
  return card
}

export function createProject(db: PrismaClient, a: CreateProjectArgs, now: Date) {
  return db.$transaction((tx) => createProjectTx(tx, a, now))
}

export interface UpdateProjectArgs {
  userId: string
  projectId: string
  changes: ProjectInputs
  name?: string
  channel: Channel
  note?: string
}

export type UpdateProjectResult =
  | { ok: true; changes: InputChange[]; nameChanged: boolean }
  | { ok: false; reason: 'not_found' }

export function updateProject(db: PrismaClient, a: UpdateProjectArgs, now: Date): Promise<UpdateProjectResult> {
  return db.$transaction(async (tx): Promise<UpdateProjectResult> => {
    const card = await tx.projeKarti.findFirst({
      where: { id: a.projectId, userId: a.userId },
      select: { id: true, name: true, inputs: true },
    })
    if (!card) return { ok: false, reason: 'not_found' }

    const oldInputs = card.inputs as ProjectInputs
    const diff = diffInputs(oldInputs, a.changes)
    const nameChanged = a.name !== undefined && a.name !== card.name
    if (!diff.length && !nameChanged) return { ok: true, changes: [], nameChanged: false }

    await tx.projeKarti.update({
      where: { id: card.id },
      data: { inputs: applyChanges(oldInputs, diff) as Prisma.InputJsonValue, ...(nameChanged ? { name: a.name } : {}) },
    })
    const rows: Prisma.ProjeRevizyonCreateManyInput[] = diff.map((d) => ({
      projeKartiId: card.id,
      field: d.field,
      oldValue: (d.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
      newValue: d.newValue as Prisma.InputJsonValue,
      changedAt: now,
      channel: a.channel,
      note: a.note ?? null,
    }))
    if (nameChanged) {
      rows.push({
        projeKartiId: card.id,
        field: 'name',
        oldValue: (card.name ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: a.name as string,
        changedAt: now,
        channel: a.channel,
        note: a.note ?? null,
      })
    }
    await tx.projeRevizyon.createMany({ data: rows })
    return { ok: true, changes: diff, nameChanged }
  })
}

export interface ProjectListItem {
  id: string
  name: string | null
  createdAt: Date
  updatedAt: Date
  parcels: ParcelRef[]
}

type CardRow = {
  id: string
  name: string | null
  createdAt: Date
  updatedAt: Date
  parseller: Array<{ parselDosyasi: ParcelRef }>
}

const toListItem = (r: CardRow): ProjectListItem => ({
  id: r.id,
  name: r.name,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  parcels: r.parseller.map((p) => ({
    il: p.parselDosyasi.il,
    ilce: p.parselDosyasi.ilce,
    mahalle: p.parselDosyasi.mahalle,
    ada: p.parselDosyasi.ada,
    parsel: p.parselDosyasi.parsel,
  })),
})

const CARD_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  parseller: { select: { parselDosyasi: { select: { il: true, ilce: true, mahalle: true, ada: true, parsel: true } } } },
} as const

export interface FindProjectsQuery {
  userId: string
  range?: { from: Date; toExclusive: Date } | null
  nameLike?: string
  ada?: string
  parsel?: string
  mahalle?: string
}

export async function findProjects(
  db: PrismaClient,
  q: FindProjectsQuery,
): Promise<{ candidates: ProjectListItem[]; more: boolean }> {
  const and: Prisma.ProjeKartiWhereInput[] = []
  if (q.range) {
    const r = { gte: q.range.from, lt: q.range.toExclusive }
    and.push({ OR: [{ createdAt: r }, { revizyonlar: { some: { changedAt: r } } }] })
  }
  if (q.nameLike) and.push({ name: { contains: q.nameLike, mode: 'insensitive' } })
  if (q.ada || q.parsel || q.mahalle) {
    and.push({
      parseller: {
        some: {
          parselDosyasi: {
            ...(q.ada ? { ada: q.ada } : {}),
            ...(q.parsel ? { parsel: q.parsel } : {}),
            ...(q.mahalle ? { mahalle: { contains: normalizeAreaName(q.mahalle) } } : {}),
          },
        },
      },
    })
  }
  const rows = await db.projeKarti.findMany({
    where: { userId: q.userId, ...(and.length ? { AND: and } : {}) },
    orderBy: { updatedAt: 'desc' },
    take: 6,
    select: CARD_SELECT,
  })
  return { candidates: rows.slice(0, 5).map(toListItem), more: rows.length > 5 }
}

export interface ProjectSummary extends ProjectListItem {
  inputs: ProjectInputs
  revisions: Array<{ field: string; oldValue: unknown; newValue: unknown; changedAt: Date; channel: string }>
  truncated: boolean
}

const MAX_REVISIONS = 50

export async function getProjectSummary(
  db: PrismaClient,
  a: { userId: string; projectId: string },
): Promise<ProjectSummary | null> {
  const card = await db.projeKarti.findFirst({
    where: { id: a.projectId, userId: a.userId },
    select: { ...CARD_SELECT, inputs: true },
  })
  if (!card) return null
  const revs = await db.projeRevizyon.findMany({
    where: { projeKartiId: card.id },
    orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    take: MAX_REVISIONS + 1,
    select: { field: true, oldValue: true, newValue: true, changedAt: true, channel: true },
  })
  return {
    ...toListItem(card as unknown as CardRow),
    inputs: card.inputs as ProjectInputs,
    revisions: revs.slice(0, MAX_REVISIONS),
    truncated: revs.length > MAX_REVISIONS,
  }
}
```

- [ ] **Step 4: Çalıştır → PASS**

Run: `npx jest src/lib/akifProje/__tests__/projeKarti.test.ts --no-coverage`
Beklenen: PASS. `tsc` hatası çıkarsa (Prisma tip uyuşmazlığı) test dosyasındaki fake'leri değil, `projeKarti.ts` içindeki cast'leri düzelt.

- [ ] **Step 5: Commit**

```bash
git add src/lib/akifProje/projeKarti.ts src/lib/akifProje/__tests__/projeKarti.test.ts
git commit -m "feat(akif-5c): proje kartı servisi (oluştur/güncelle/bul/özetle + revizyon günlüğü)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Claim servisi (`claim.ts`)

**Files:**
- Create: `src/lib/akifProje/claim.ts`
- Test: `src/lib/akifProje/__tests__/claim.test.ts`

**Interfaces:**
- Consumes: `validateCreateArgs` (Task 2), `createProjectTx` (Task 6).
- Produces: `CLAIM_TTL_MS = 900_000`; `hashToken(token: string): string`; `type ClaimDraft = { op: 'createProject'; args: CreateProjectInput }`; `createClaim(db: PrismaClient, a: { phone: string; draft?: ClaimDraft | null; now: Date; baseUrl: string; token?: string }): Promise<{ url: string; expiresAt: Date }>`; `consumeClaim(db: PrismaClient, a: { token: string; userId: string; now: Date }): Promise<ConsumeResult>`; `type ConsumeResult = { ok: true; phone: string; saved?: { projectId: string; name: string | null } } | { ok: false; reason: 'invalid' | 'used' | 'expired' | 'phone_taken' | 'user_has_other_phone' }`.

- [ ] **Step 1: Başarısız testi yaz**

```ts
import type { PrismaClient } from '@prisma/client'
import { createClaim, consumeClaim, hashToken, CLAIM_TTL_MS } from '../claim'

const NOW = new Date('2026-10-15T12:00:00Z')
const PHONE = '905321234567'
const PARCEL = { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '1', parsel: '2' }

function makeDb() {
  const tx = {
    phoneClaim: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    // createProjectTx bağımlılıkları
    parselDosyasi: { upsert: jest.fn().mockResolvedValue({ id: 'pd1' }), update: jest.fn() },
    parselOlgu: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(), create: jest.fn() },
    projeKarti: { create: jest.fn().mockResolvedValue({ id: 'pk1', name: 'Maçka' }) },
    projeRevizyon: { createMany: jest.fn() },
  }
  const db = { ...tx, $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) }
  return { db: db as unknown as PrismaClient, tx }
}

const claimRow = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  phone: PHONE,
  tokenHash: 'h',
  draft: null,
  expiresAt: new Date(NOW.getTime() + 60_000),
  usedAt: null,
  ...over,
})

describe('createClaim', () => {
  it('token\'ı yalnız hash olarak saklar ve 15 dk geçerli URL döner', async () => {
    const { db, tx } = makeDb()
    const r = await createClaim(db, { phone: PHONE, now: NOW, baseUrl: 'https://www.arsabil.com/', token: 'TOKEN123' })
    expect(r.url).toBe('https://www.arsabil.com/akif/baglan?t=TOKEN123')
    expect(r.expiresAt).toEqual(new Date(NOW.getTime() + CLAIM_TTL_MS))
    const data = tx.phoneClaim.create.mock.calls[0][0].data
    expect(data.tokenHash).toBe(hashToken('TOKEN123'))
    expect(JSON.stringify(data)).not.toContain('TOKEN123')
    expect(data.phone).toBe(PHONE)
  })

  it('token verilmezse rastgele üretir (iki çağrı farklı)', async () => {
    const { db } = makeDb()
    const a = await createClaim(db, { phone: PHONE, now: NOW, baseUrl: 'https://x.test' })
    const b = await createClaim(db, { phone: PHONE, now: NOW, baseUrl: 'https://x.test' })
    expect(a.url).not.toBe(b.url)
  })

  it('taslak JSON olarak kaydedilir', async () => {
    const { db, tx } = makeDb()
    const draft = { op: 'createProject' as const, args: { name: 'Maçka', parcels: [PARCEL], inputs: {} } }
    await createClaim(db, { phone: PHONE, draft, now: NOW, baseUrl: 'https://x.test', token: 't' })
    expect(tx.phoneClaim.create.mock.calls[0][0].data.draft).toEqual(draft)
  })
})

describe('consumeClaim', () => {
  const base = { token: 'TOKEN123', userId: 'u1', now: NOW }

  it('bilinmeyen token → invalid (Review Focus 6)', async () => {
    const { db } = makeDb()
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('kullanılmış → used; süresi dolmuş → expired', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow({ usedAt: new Date() }))
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'used' })
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow({ expiresAt: new Date(NOW.getTime() - 1) }))
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'expired' })
  })

  it('telefon başka hesaba bağlıysa phone_taken; hesap başka telefona bağlıysa user_has_other_phone', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow())
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : { id: 'baska' },
    )
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'phone_taken' })

    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: '905000000000' } : null,
    )
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'user_has_other_phone' })
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('başarılı: token tüketilir, telefon bağlanır, taslak yoksa saved yok', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow())
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    const r = await consumeClaim(db, base)
    expect(r).toEqual({ ok: true, phone: PHONE, saved: undefined })
    expect(tx.phoneClaim.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', usedAt: null },
      data: { usedAt: NOW, userId: 'u1' },
    })
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { whatsappPhone: PHONE } })
  })

  it('eşzamanlı çift tüketim: updateMany count 0 → used, bağlama yapılmaz', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow())
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    tx.phoneClaim.updateMany.mockResolvedValue({ count: 0 })
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'used' })
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('geçerli taslak varsa proje kaydedilir', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(
      claimRow({ draft: { op: 'createProject', args: { name: 'Maçka', parcels: [PARCEL], inputs: { arsaAlani: 850 } } } }),
    )
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    const r = await consumeClaim(db, base)
    expect(r).toEqual({ ok: true, phone: PHONE, saved: { projectId: 'pk1', name: 'Maçka' } })
    expect(tx.projeKarti.create.mock.calls[0][0].data.userId).toBe('u1')
  })

  it('bozuk taslak bağlamayı engellemez, saved yok (Review Focus 6)', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow({ draft: { op: 'createProject', args: { parcels: [] } } }))
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    const r = await consumeClaim(db, base)
    expect(r).toEqual({ ok: true, phone: PHONE, saved: undefined })
    expect(tx.projeKarti.create).not.toHaveBeenCalled()
  })

  it('benzersiz ihlali (P2002) phone_taken olarak raporlanır', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow())
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    tx.user.update.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }))
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'phone_taken' })
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/akifProje/__tests__/claim.test.ts --no-coverage`

- [ ] **Step 3: Uygula**

```ts
// Akif-5c — telefon ↔ hesap eşleştirme bağlantısı (PhoneClaim).
// Token DB'de yalnız SHA-256 hash olarak durur; 15 dk, tek kullanım.

import { createHash, randomBytes } from 'crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { CreateProjectInput } from './types'
import { validateCreateArgs } from './validation'
import { createProjectTx } from './projeKarti'

export const CLAIM_TTL_MS = 15 * 60_000

export interface ClaimDraft {
  op: 'createProject'
  args: CreateProjectInput
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createClaim(
  db: PrismaClient,
  a: { phone: string; draft?: ClaimDraft | null; now: Date; baseUrl: string; token?: string },
): Promise<{ url: string; expiresAt: Date }> {
  const token = a.token ?? randomBytes(32).toString('base64url')
  const expiresAt = new Date(a.now.getTime() + CLAIM_TTL_MS)
  await db.phoneClaim.create({
    data: {
      phone: a.phone,
      tokenHash: hashToken(token),
      draft: a.draft ? (a.draft as unknown as Prisma.InputJsonValue) : undefined,
      expiresAt,
    },
  })
  return { url: `${a.baseUrl.replace(/\/+$/, '')}/akif/baglan?t=${token}`, expiresAt }
}

export type ConsumeResult =
  | { ok: true; phone: string; saved?: { projectId: string; name: string | null } }
  | { ok: false; reason: 'invalid' | 'used' | 'expired' | 'phone_taken' | 'user_has_other_phone' }

function parseDraft(raw: unknown): CreateProjectInput | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as { op?: unknown; args?: unknown }
  if (d.op !== 'createProject') return null
  const v = validateCreateArgs(d.args)
  return v.ok ? v.value : null
}

const isUniqueViolation = (e: unknown): boolean => (e as { code?: string } | null)?.code === 'P2002'

export async function consumeClaim(
  db: PrismaClient,
  a: { token: string; userId: string; now: Date },
): Promise<ConsumeResult> {
  const tokenHash = hashToken(a.token)
  try {
    return await db.$transaction(async (tx): Promise<ConsumeResult> => {
      const claim = await tx.phoneClaim.findUnique({ where: { tokenHash } })
      if (!claim) return { ok: false, reason: 'invalid' }
      if (claim.usedAt) return { ok: false, reason: 'used' }
      if (claim.expiresAt.getTime() <= a.now.getTime()) return { ok: false, reason: 'expired' }

      const user = await tx.user.findUnique({ where: { id: a.userId }, select: { whatsappPhone: true } })
      if (!user) return { ok: false, reason: 'invalid' }
      if (user.whatsappPhone && user.whatsappPhone !== claim.phone) {
        return { ok: false, reason: 'user_has_other_phone' }
      }
      const holder = await tx.user.findUnique({ where: { whatsappPhone: claim.phone }, select: { id: true } })
      if (holder && holder.id !== a.userId) return { ok: false, reason: 'phone_taken' }

      const used = await tx.phoneClaim.updateMany({
        where: { id: claim.id, usedAt: null },
        data: { usedAt: a.now, userId: a.userId },
      })
      if (used.count === 0) return { ok: false, reason: 'used' }

      await tx.user.update({ where: { id: a.userId }, data: { whatsappPhone: claim.phone } })

      const draft = parseDraft(claim.draft)
      let saved: { projectId: string; name: string | null } | undefined
      if (draft) {
        const card = await createProjectTx(tx, { ...draft, userId: a.userId, channel: 'whatsapp' }, a.now)
        saved = { projectId: card.id, name: card.name }
      }
      return { ok: true, phone: claim.phone, saved }
    })
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: 'phone_taken' }
    throw e
  }
}
```

- [ ] **Step 4: Çalıştır → PASS**

Run: `npx jest src/lib/akifProje/__tests__/claim.test.ts --no-coverage`

- [ ] **Step 5: Commit**

```bash
git add src/lib/akifProje/claim.ts src/lib/akifProje/__tests__/claim.test.ts
git commit -m "feat(akif-5c): telefon-hesap eşleştirme (PhoneClaim, taslak otomatik kayıt)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Hafıza bağlamı (`context.ts`)

**Files:**
- Create: `src/lib/akifProje/context.ts`
- Test: `src/lib/akifProje/__tests__/context.test.ts`

**Interfaces:**
- Consumes: `classifyFacts`, `FactRow` (Task 3), `istanbulDateString` (Task 4).
- Produces: `buildMemoryContext(db: PrismaClient, a: { userId: string | null; now: Date }): Promise<string>` — her tur system prompt'a eklenecek, sistem tarafından hesaplanmış metin. İçerik: `BUGÜN: YYYY-MM-DD (Europe/Istanbul)`, `HESAP: bağlı | bağlı değil`, `KAYITLI PROJELER`, `KAYITLI PARSELLER` (TAZE/BAYAT/EKSİK).

- [ ] **Step 1: Başarısız testi yaz**

```ts
import type { PrismaClient } from '@prisma/client'
import { buildMemoryContext } from '../context'

const NOW = new Date('2026-10-15T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

function makeDb(projects: unknown[] = [], parcels: unknown[] = []) {
  return {
    projeKarti: { findMany: jest.fn().mockResolvedValue(projects) },
    parselDosyasi: { findMany: jest.fn().mockResolvedValue(parcels) },
  } as unknown as PrismaClient & {
    projeKarti: { findMany: jest.Mock }
    parselDosyasi: { findMany: jest.Mock }
  }
}

describe('buildMemoryContext', () => {
  it('bağlı olmayan: tarih + "bağlı değil", veritabanına dokunmaz', async () => {
    const db = makeDb()
    const s = await buildMemoryContext(db, { userId: null, now: NOW })
    expect(s).toContain('BUGÜN: 2026-10-15 (Europe/Istanbul)')
    expect(s).toContain('HESAP: bağlı değil')
    expect(db.projeKarti.findMany).not.toHaveBeenCalled()
    expect(db.parselDosyasi.findMany).not.toHaveBeenCalled()
  })

  it('bağlı: proje listesi (id, ad, tarihler, parseller)', async () => {
    const db = makeDb([
      {
        id: 'pk1',
        name: 'Maçka arsası',
        createdAt: daysAgo(5),
        updatedAt: daysAgo(1),
        parseller: [{ parselDosyasi: { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' } }],
      },
    ])
    const s = await buildMemoryContext(db, { userId: 'u1', now: NOW })
    expect(s).toContain('HESAP: bağlı')
    expect(s).toContain('id=pk1')
    expect(s).toContain('"Maçka arsası"')
    expect(s).toContain('oluşturma 2026-10-10')
    expect(s).toContain('güncelleme 2026-10-14')
    expect(s).toContain('TRABZON/ORTAHISAR/UĞURLU ada 123 parsel 45')
    expect(db.projeKarti.findMany.mock.calls[0][0]).toMatchObject({ where: { userId: 'u1' }, take: 5 })
  })

  it('parsel olguları TAZE/BAYAT/EKSİK olarak sınıflanır (Review Focus 2)', async () => {
    const db = makeDb(
      [],
      [
        {
          id: 'pd1',
          il: 'TRABZON',
          ilce: 'ORTAHISAR',
          mahalle: 'UĞURLU',
          ada: '123',
          parsel: '45',
          olgular: [
            { key: 'areaSqm', value: 850, source: 'tkgm', recordedAt: daysAgo(400) },
            { key: 'emsal', value: 1.5, source: 'kullanici', recordedAt: daysAgo(200) },
            { key: 'imarDurumu', value: 'Konut Alanı', source: 'kullanici', recordedAt: daysAgo(10) },
          ],
        },
      ],
    )
    const s = await buildMemoryContext(db, { userId: 'u1', now: NOW })
    expect(s).toContain('TAZE: areaSqm = 850 (tkgm, 2025-09-10)')
    expect(s).toContain('TAZE: imarDurumu = "Konut Alanı" (kullanici, 2026-10-05)')
    expect(s).toContain('BAYAT: emsal = 1.5 (kullanici, 2026-03-29) → kullanıcıya TARİHİYLE teyit ettir')
    expect(s).toContain('EKSİK: katAdedi → sor')
  })

  it('uzun değerler kısaltılır ve listeler 5 ile sınırlıdır', async () => {
    const long = 'x'.repeat(200)
    const db = makeDb(
      [],
      [
        {
          id: 'pd1',
          il: 'A',
          ilce: 'B',
          mahalle: 'C',
          ada: '1',
          parsel: '2',
          olgular: [{ key: 'imarDurumu', value: long, source: 'kullanici', recordedAt: daysAgo(1) }],
        },
      ],
    )
    const s = await buildMemoryContext(db, { userId: 'u1', now: NOW })
    expect(s).not.toContain(long)
    expect(s).toContain('…')
    expect(db.parselDosyasi.findMany.mock.calls[0][0].take).toBe(5)
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/akifProje/__tests__/context.test.ts --no-coverage`

- [ ] **Step 3: Uygula**

```ts
// Akif-5c — her turda system prompt'a eklenen, SİSTEM tarafından hesaplanmış
// hafıza bağlamı. Bayatlık kararı burada KOD ile verilir; model yalnız okur.

import type { PrismaClient } from '@prisma/client'
import { classifyFacts, type FactRow } from './freshness'
import { istanbulDateString } from './dateRange'

const MAX_ITEMS = 5
const MAX_VALUE_CHARS = 60

const day = (d: Date) => istanbulDateString(d)

function showValue(v: unknown): string {
  const s = JSON.stringify(v)
  return s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS) + '…' : s
}

const factLine = (label: 'TAZE' | 'BAYAT', f: FactRow) =>
  `  ${label}: ${f.key} = ${showValue(f.value)} (${f.source}, ${day(f.recordedAt)})` +
  (label === 'BAYAT' ? ' → kullanıcıya TARİHİYLE teyit ettir' : '')

export async function buildMemoryContext(
  db: PrismaClient,
  a: { userId: string | null; now: Date },
): Promise<string> {
  const lines = [
    'HAFIZA BAĞLAMI (sistem tarafından hesaplandı; tarih, kayıtlı proje ve parsel olguları için tek doğru kaynak):',
    `BUGÜN: ${day(a.now)} (Europe/Istanbul)`,
  ]
  if (!a.userId) {
    lines.push('HESAP: bağlı değil (telefon bir ArsaBil hesabına bağlı değil; kaydetme araçları kayıt yerine üyelik bağlantısı üretir)')
    return lines.join('\n')
  }
  lines.push('HESAP: bağlı')

  const projects = await db.projeKarti.findMany({
    where: { userId: a.userId },
    orderBy: { updatedAt: 'desc' },
    take: MAX_ITEMS,
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      parseller: { select: { parselDosyasi: { select: { il: true, ilce: true, mahalle: true, ada: true, parsel: true } } } },
    },
  })
  if (projects.length) {
    lines.push('KAYITLI PROJELER (en yeni güncelleme önce):')
    for (const p of projects) {
      const parcels = p.parseller
        .map((x) => `${x.parselDosyasi.il}/${x.parselDosyasi.ilce}/${x.parselDosyasi.mahalle} ada ${x.parselDosyasi.ada} parsel ${x.parselDosyasi.parsel}`)
        .join('; ')
      lines.push(
        `- id=${p.id} | "${p.name ?? 'Adsız proje'}" | oluşturma ${day(p.createdAt)} | güncelleme ${day(p.updatedAt)} | ${parcels}`,
      )
    }
  } else {
    lines.push('KAYITLI PROJELER: yok')
  }

  const parcels = await db.parselDosyasi.findMany({
    where: { userId: a.userId },
    orderBy: { updatedAt: 'desc' },
    take: MAX_ITEMS,
    select: {
      id: true,
      il: true,
      ilce: true,
      mahalle: true,
      ada: true,
      parsel: true,
      olgular: { where: { supersededAt: null }, select: { key: true, value: true, source: true, recordedAt: true } },
    },
  })
  if (parcels.length) {
    lines.push('KAYITLI PARSELLER:')
    for (const p of parcels) {
      lines.push(`- ${p.il}/${p.ilce}/${p.mahalle} ada ${p.ada} parsel ${p.parsel}`)
      const c = classifyFacts(p.olgular as unknown as FactRow[], a.now)
      for (const f of c.taze) lines.push(factLine('TAZE', f))
      for (const f of c.bayat) lines.push(factLine('BAYAT', f))
      for (const k of c.eksik) lines.push(`  EKSİK: ${k} → sor`)
    }
  }
  return lines.join('\n')
}
```

- [ ] **Step 4: Çalıştır → PASS**

Run: `npx jest src/lib/akifProje/__tests__/context.test.ts --no-coverage`

- [ ] **Step 5: Commit**

```bash
git add src/lib/akifProje/context.ts src/lib/akifProje/__tests__/context.test.ts
git commit -m "feat(akif-5c): hafıza bağlamı (tarih, projeler, taze/bayat/eksik olgular)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Sözleşme (`ProjectCard`) ve orchestrator dalı

**Files:**
- Modify: `src/lib/ai/akif/contract.ts` (ParcelCard'dan sonra ToolResultCard'dan önce)
- Modify: `src/lib/ai/akif/orchestrator.ts:~246` (`toolResult.kind === 'term' || ...`)
- Test: `src/lib/ai/akif/__tests__/orchestrator.test.ts` (yeni test ekle)

**Interfaces:**
- Produces: `interface ProjectCard { kind: 'project'; op: 'found' | 'summary' | 'created' | 'updated' | 'fact_saved' | 'needs_signup' | 'not_found' | 'rate_limited' | 'failed'; data?: Record<string, unknown> }`; `ToolResultCard = TermCard | ScenarioCard | ParcelCard | ProjectCard`.

- [ ] **Step 1: Başarısız testi yaz**

`orchestrator.test.ts` içinde `(k)` testinden hemen sonra, `(l)` testinden önce ekle:

```ts
  it('(k2) tool_result kind:project ise dönüşümsüz turn.tool_result\'a atanır (rows.map ile çökmez)', async () => {
    const { deps } = makeDeps()
    const PROJECT_CARD = { kind: 'project' as const, op: 'summary' as const, data: { projectId: 'pk1', ad: 'Maçka' } }
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'findProjects',
      toolArgs: {},
      toolCallId: 'call_5',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    ;(deps.dispatch as unknown as jest.Mock).mockResolvedValueOnce(PROJECT_CARD)
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn.tool_result).toEqual(PROJECT_CARD)
  })
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/ai/akif/__tests__/orchestrator.test.ts --no-coverage -t "k2"`
Beklenen: tip hatası (`'project'` ToolResultCard'a atanamaz) veya `rows.map` çökmesi.

- [ ] **Step 3: Sözleşmeyi genişlet**

`contract.ts` içinde `export type ToolResultCard = TermCard | ScenarioCard | ParcelCard` satırını şununla değiştir:

```ts
// Akif-5c — WhatsApp proje kartı araçlarının (findProjects, summarizeProject,
// createProject, updateProject, rememberFact) sonucu. `data` modele aynen
// JSON olarak verilir; web/voice bu türü hiç üretmez.
export interface ProjectCard {
  kind: 'project'
  op:
    | 'found'
    | 'summary'
    | 'created'
    | 'updated'
    | 'fact_saved'
    | 'needs_signup'
    | 'not_found'
    | 'rate_limited'
    | 'failed'
  data?: Record<string, unknown>
}

export type ToolResultCard = TermCard | ScenarioCard | ParcelCard | ProjectCard
```

- [ ] **Step 4: Orchestrator dalını güncelle**

`orchestrator.ts` içinde:
```ts
    if (toolResult.kind === 'term' || toolResult.kind === 'parcel') {
```
satırını şununla değiştir:
```ts
    if (toolResult.kind === 'term' || toolResult.kind === 'parcel' || toolResult.kind === 'project') {
```

- [ ] **Step 5: Tip taraması + test**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
npx jest src/lib/ai/akif/__tests__/orchestrator.test.ts --no-coverage
```
Beklenen: orchestrator testleri PASS. `tsc` başka dosyalarda `ProjectCard` yüzünden tip hatası verirse (ör. `AkifChat.tsx`, `voiceToolBridge.ts`, `__evals__/score.ts` içindeki `kind` daraltmaları) o dosyalarda **yalnız tip daraltmasını** düzelt (davranış değişmesin); bulunan her dosyayı commit mesajına yaz. `tsc` zaten başlangıçta hatalıysa (`git stash` ile kıyasla) yeni hata eklemediğini doğrula.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/akif/contract.ts src/lib/ai/akif/orchestrator.ts src/lib/ai/akif/__tests__/orchestrator.test.ts
git commit -m "feat(akif-5c): ProjectCard sözleşmesi ve orchestrator dalı

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: WhatsApp proje araçları (`projectTools.ts`)

**Files:**
- Create: `src/lib/whatsapp/projectTools.ts`
- Test: `src/lib/whatsapp/__tests__/projectTools.test.ts`

**Interfaces:**
- Consumes: Task 2 (`validateCreateArgs`, `validateInputs`, `validateFact`, `validateParcelRef`), Task 4 (`parseDateRange`, `istanbulDateString`), Task 5 (`upsertParsel`, `recordFact`), Task 6 (`createProject`, `updateProject`, `findProjects`, `getProjectSummary`, `ProjectSummary`), Task 7 (`createClaim`, `ClaimDraft`), Task 9 (`ProjectCard`), `OpenAiToolDef`/`ValidateResult` (`toolRegistry.ts`).
- Produces: `type ProjectToolName = 'findProjects' | 'summarizeProject' | 'createProject' | 'updateProject' | 'rememberFact'`; `isProjectToolName(n: string): n is ProjectToolName`; `PROJECT_TOOL_DEFS: OpenAiToolDef[]`; `validateProjectToolArgs(name: ProjectToolName, args: unknown): ValidateResult`; `interface ProjectToolDeps { db: PrismaClient; phone: string; now: () => Date; baseUrl: string; checkRateLimit: (key: string, opts: { limit: number; windowMs: number }) => { ok: boolean } }`; `dispatchProjectTool(name: ProjectToolName, args: unknown, deps: ProjectToolDeps): Promise<ProjectCard>`.
- Çıktı biçimi (modele giden `data`): özet için `{ projectId, ad, olusturma, sonGuncelleme, parseller: string[], guncelGirdiler, degisiklikler: [{ tarih, alan, eski, yeni, kanal }], kesildi }` (tarihler `YYYY-MM-DD`, değişiklikler en yeni → en eski).

- [ ] **Step 1: Başarısız testi yaz**

```ts
import type { PrismaClient } from '@prisma/client'
import {
  PROJECT_TOOL_DEFS,
  isProjectToolName,
  validateProjectToolArgs,
  dispatchProjectTool,
  type ProjectToolDeps,
} from '../projectTools'

const NOW = new Date('2026-10-15T12:00:00Z')
const PHONE = '905321234567'
const PARCEL = { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45' }

function makeDeps(opts: { linked?: boolean } = {}) {
  const linked = opts.linked ?? true
  const tx = {
    user: { findUnique: jest.fn().mockResolvedValue(linked ? { id: 'u1' } : null) },
    phoneClaim: { create: jest.fn().mockResolvedValue({}) },
    parselDosyasi: { upsert: jest.fn().mockResolvedValue({ id: 'pd1' }), update: jest.fn() },
    parselOlgu: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(), create: jest.fn() },
    projeKarti: {
      create: jest.fn().mockResolvedValue({ id: 'pk1', name: 'Maçka' }),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    projeRevizyon: { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  }
  const db = { ...tx, $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) }
  const deps: ProjectToolDeps = {
    db: db as unknown as PrismaClient,
    phone: PHONE,
    now: () => NOW,
    baseUrl: 'https://www.arsabil.com',
    checkRateLimit: jest.fn().mockReturnValue({ ok: true }),
  }
  return { deps, tx }
}

describe('araç kaydı', () => {
  it('5 araç, isProjectToolName doğru çalışır', () => {
    expect(PROJECT_TOOL_DEFS.map((d) => d.function.name)).toEqual([
      'findProjects',
      'summarizeProject',
      'createProject',
      'updateProject',
      'rememberFact',
    ])
    expect(isProjectToolName('createProject')).toBe(true)
    expect(isProjectToolName('lookupParcel')).toBe(false)
  })
})

describe('validateProjectToolArgs', () => {
  it('findProjects: filtresiz serbest; geçersiz tarih/ters aralık hata', () => {
    expect(validateProjectToolArgs('findProjects', {})).toEqual({ ok: true })
    expect(validateProjectToolArgs('findProjects', { dateFrom: '2026-01-01', dateTo: '2026-01-31' })).toEqual({ ok: true })
    expect(validateProjectToolArgs('findProjects', { dateFrom: '2026-02-30' }).ok).toBe(false)
    expect(validateProjectToolArgs('findProjects', { dateFrom: '2026-03-01', dateTo: '2026-01-01' }).ok).toBe(false)
    expect(validateProjectToolArgs('findProjects', { nameLike: 5 }).ok).toBe(false)
  })

  it('summarizeProject: projectId zorunlu', () => {
    expect(validateProjectToolArgs('summarizeProject', { projectId: 'pk1' })).toEqual({ ok: true })
    expect(validateProjectToolArgs('summarizeProject', {}).ok).toBe(false)
  })

  it('createProject: validateCreateArgs ile aynı kurallar', () => {
    expect(validateProjectToolArgs('createProject', { parcels: [PARCEL] })).toEqual({ ok: true })
    expect(validateProjectToolArgs('createProject', { parcels: [] }).ok).toBe(false)
  })

  it('updateProject: projectId + (changes veya name) zorunlu', () => {
    expect(validateProjectToolArgs('updateProject', { projectId: 'p', changes: { arsaSahibiPayiYuzde: 50 } })).toEqual({ ok: true })
    expect(validateProjectToolArgs('updateProject', { projectId: 'p', name: 'Yeni' })).toEqual({ ok: true })
    expect(validateProjectToolArgs('updateProject', { projectId: 'p' }).ok).toBe(false)
    expect(validateProjectToolArgs('updateProject', { projectId: 'p', changes: { arsaAlani: 1 } }).ok).toBe(false)
  })

  it('rememberFact: parsel alanları + key/value/source', () => {
    expect(validateProjectToolArgs('rememberFact', { ...PARCEL, key: 'emsal', value: 1.5, source: 'kullanici' })).toEqual({ ok: true })
    expect(validateProjectToolArgs('rememberFact', { ...PARCEL, key: 'emsal', value: 99, source: 'kullanici' }).ok).toBe(false)
    expect(validateProjectToolArgs('rememberFact', { key: 'emsal', value: 1.5, source: 'kullanici' }).ok).toBe(false)
  })
})

describe('dispatchProjectTool — bağlı olmayan telefon', () => {
  it('createProject: taslakla claim üretir, kayıt YAPMAZ', async () => {
    const { deps, tx } = makeDeps({ linked: false })
    const card = await dispatchProjectTool('createProject', { name: 'Maçka', parcels: [PARCEL], inputs: { arsaAlani: 850 } }, deps)
    expect(card.kind).toBe('project')
    expect(card.op).toBe('needs_signup')
    expect(String(card.data?.url)).toMatch(/^https:\/\/www\.arsabil\.com\/akif\/baglan\?t=/)
    expect(card.data?.gecerlilikDakika).toBe(15)
    expect(card.data?.taslakKaydedildi).toBe(true)
    expect(tx.phoneClaim.create.mock.calls[0][0].data.draft).toMatchObject({ op: 'createProject' })
    expect(tx.projeKarti.create).not.toHaveBeenCalled()
  })

  it('diğer araçlar: taslaksız claim', async () => {
    const { deps, tx } = makeDeps({ linked: false })
    const card = await dispatchProjectTool('findProjects', {}, deps)
    expect(card.op).toBe('needs_signup')
    expect(card.data?.taslakKaydedildi).toBe(false)
    expect(tx.phoneClaim.create.mock.calls[0][0].data.draft).toBeUndefined()
  })

  it('claim istekleri saatte 3 ile sınırlı', async () => {
    const { deps, tx } = makeDeps({ linked: false })
    ;(deps.checkRateLimit as jest.Mock).mockReturnValue({ ok: false })
    const card = await dispatchProjectTool('findProjects', {}, deps)
    expect(card.op).toBe('rate_limited')
    expect(tx.phoneClaim.create).not.toHaveBeenCalled()
    expect(deps.checkRateLimit).toHaveBeenCalledWith('wa-claim:' + PHONE, { limit: 3, windowMs: 3_600_000 })
  })
})

describe('dispatchProjectTool — bağlı telefon', () => {
  it('createProject: kartı oluşturur', async () => {
    const { deps, tx } = makeDeps()
    const card = await dispatchProjectTool('createProject', { name: 'Maçka', parcels: [PARCEL], inputs: { arsaAlani: 850 } }, deps)
    expect(card.op).toBe('created')
    expect(card.data).toMatchObject({ projectId: 'pk1', ad: 'Maçka', olusturma: '2026-10-15', girdiler: { arsaAlani: 850 } })
    expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { whatsappPhone: PHONE }, select: { id: true } })
    expect(tx.projeKarti.create.mock.calls[0][0].data.userId).toBe('u1')
  })

  it('updateProject: başka kullanıcının/uydurma id → not_found (Review Focus 1)', async () => {
    const { deps } = makeDeps()
    const card = await dispatchProjectTool('updateProject', { projectId: 'uydurma', changes: { arsaSahibiPayiYuzde: 50 } }, deps)
    expect(card.op).toBe('not_found')
  })

  it('updateProject: değişiklikleri Türkçe alanlarla döner', async () => {
    const { deps, tx } = makeDeps()
    tx.projeKarti.findFirst.mockResolvedValue({ id: 'pk1', name: 'Maçka', inputs: { arsaSahibiPayiYuzde: 40 } })
    const card = await dispatchProjectTool('updateProject', { projectId: 'pk1', changes: { arsaSahibiPayiYuzde: 50 } }, deps)
    expect(card.op).toBe('updated')
    expect(card.data).toMatchObject({
      projectId: 'pk1',
      degisiklikler: [{ alan: 'arsaSahibiPayiYuzde', eski: 40, yeni: 50 }],
    })
    expect(card.data?.degisiklikYok).toBe(false)
  })

  it('findProjects: tek eşleşmede özeti de döner (en yeni → en eski, TR tarihleri)', async () => {
    const { deps, tx } = makeDeps()
    const created = new Date('2026-10-14T21:30:00Z') // TR: 15 Ekim 00:30
    const row = {
      id: 'pk1',
      name: 'Maçka',
      createdAt: created,
      updatedAt: NOW,
      parseller: [{ parselDosyasi: { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' } }],
    }
    tx.projeKarti.findMany.mockResolvedValue([row])
    tx.projeKarti.findFirst.mockResolvedValue({ ...row, inputs: { arsaSahibiPayiYuzde: 50 } })
    tx.projeRevizyon.findMany.mockResolvedValue([
      { field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50, changedAt: NOW, channel: 'whatsapp' },
      { field: 'arsaSahibiPayiYuzde', oldValue: null, newValue: 40, changedAt: created, channel: 'whatsapp' },
    ])
    const card = await dispatchProjectTool('findProjects', { dateFrom: '2026-10-15' }, deps)
    expect(card.op).toBe('summary')
    expect(card.data).toMatchObject({
      projectId: 'pk1',
      olusturma: '2026-10-15',
      guncelGirdiler: { arsaSahibiPayiYuzde: 50 },
      kesildi: false,
    })
    expect((card.data?.degisiklikler as Array<{ tarih: string }>).map((d) => d.tarih)).toEqual(['2026-10-15', '2026-10-15'])
    expect((card.data?.degisiklikler as Array<{ yeni: unknown }>)[0].yeni).toBe(50)
  })

  it('findProjects: birden çok eşleşmede aday listesi, sıfırda not_found', async () => {
    const { deps, tx } = makeDeps()
    const mk = (id: string) => ({ id, name: null, createdAt: NOW, updatedAt: NOW, parseller: [] })
    tx.projeKarti.findMany.mockResolvedValue([mk('a'), mk('b')])
    const many = await dispatchProjectTool('findProjects', {}, deps)
    expect(many.op).toBe('found')
    expect((many.data?.adaylar as unknown[]).length).toBe(2)
    tx.projeKarti.findMany.mockResolvedValue([])
    expect((await dispatchProjectTool('findProjects', {}, deps)).op).toBe('not_found')
  })

  it('summarizeProject: olmayan proje not_found', async () => {
    const { deps } = makeDeps()
    expect((await dispatchProjectTool('summarizeProject', { projectId: 'x' }, deps)).op).toBe('not_found')
  })

  it('rememberFact: olguyu kaydeder ve değişti bilgisini döner', async () => {
    const { deps, tx } = makeDeps()
    const card = await dispatchProjectTool('rememberFact', { ...PARCEL, key: 'emsal', value: 1.5, source: 'kullanici' }, deps)
    expect(card.op).toBe('fact_saved')
    expect(card.data).toMatchObject({ olgu: 'emsal', degisti: true })
    expect(tx.parselOlgu.create).toHaveBeenCalledTimes(1)
  })

  it('rememberFact: aynı değer teyidi degisti=false', async () => {
    const { deps, tx } = makeDeps()
    tx.parselOlgu.findFirst.mockResolvedValue({ id: 'o1', value: 1.5 })
    const card = await dispatchProjectTool('rememberFact', { ...PARCEL, key: 'emsal', value: 1.5, source: 'kullanici' }, deps)
    expect(card.data).toMatchObject({ olgu: 'emsal', degisti: false })
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/whatsapp/__tests__/projectTools.test.ts --no-coverage`

- [ ] **Step 3: Uygula**

```ts
// Akif-5c — WhatsApp-özel proje kartı araçları. Paylaşılan toolRegistry.ts'e
// HİÇ eklenmez; yalnız akifToolGateway.ts (WhatsApp) üzerinden açılır.
// Orchestrator tur başına TEK araç çağırır → findProjects tek eşleşmede özeti
// de döner, createProject olguları parsel başına `facts` ile alır.

import type { PrismaClient } from '@prisma/client'
import type { OpenAiToolDef, ValidateResult } from '@/lib/ai/akif/gateway/toolRegistry'
import type { ProjectCard } from '@/lib/ai/akif/contract'
import { validateCreateArgs, validateFact, validateInputs, validateParcelRef } from '@/lib/akifProje/validation'
import { istanbulDateString, parseDateRange } from '@/lib/akifProje/dateRange'
import { recordFact, upsertParsel } from '@/lib/akifProje/parselDosyasi'
import {
  createProject,
  findProjects,
  getProjectSummary,
  updateProject,
  type ProjectListItem,
  type ProjectSummary,
} from '@/lib/akifProje/projeKarti'
import { createClaim, CLAIM_TTL_MS, type ClaimDraft } from '@/lib/akifProje/claim'

export type ProjectToolName = 'findProjects' | 'summarizeProject' | 'createProject' | 'updateProject' | 'rememberFact'

const NAMES: readonly ProjectToolName[] = ['findProjects', 'summarizeProject', 'createProject', 'updateProject', 'rememberFact']
export const isProjectToolName = (n: string): n is ProjectToolName => (NAMES as readonly string[]).includes(n)

const CLAIM_RATE_LIMIT = { limit: 3, windowMs: 3_600_000 }

const PARCEL_PROPS = {
  il: { type: 'string' },
  ilce: { type: 'string' },
  mahalle: { type: 'string' },
  ada: { type: 'string' },
  parsel: { type: 'string' },
}

const INPUTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  description: 'Proje girdileri; yalnız bildirilen alanlar.',
  properties: {
    arsaAlani: { type: 'number', description: 'm²' },
    emsal: { type: 'number' },
    arsaSahibiPayiYuzde: { type: 'number', description: 'Arsa sahibinin payı, % (1-99)' },
    daireBuyuklugu: { type: 'number', description: 'm²' },
    katAdedi: { type: 'number' },
    birimMaliyet: { type: 'number', description: 'TL/m²' },
    kaliteSinifi: { type: 'string', enum: ['standart', 'orta', 'luks'] },
  },
}

const FACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'value', 'source'],
  properties: {
    key: { type: 'string', enum: ['areaSqm', 'imarDurumu', 'emsal', 'katAdedi', 'taks', 'hmax', 'malik', 'daireFiyati'] },
    value: { description: 'sayı, metin ya da daireFiyati için {m2, tl} nesnesi' },
    source: { type: 'string', enum: ['tkgm', 'goruntu', 'kullanici', 'ilan'] },
  },
}

export const PROJECT_TOOL_DEFS: OpenAiToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'findProjects',
      description:
        "Kullanıcının kayıtlı projelerini tarih/isim/parsel ile bulur. Tek eşleşmede özeti (revizyon geçmişi dahil) de döner. Filtre vermezsen son projeleri listeler. Tarihleri YYYY-MM-DD ver (BUGÜN'e göre hesapla).",
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
          dateTo: { type: 'string', description: 'YYYY-MM-DD' },
          nameLike: { type: 'string' },
          mahalle: { type: 'string' },
          ada: { type: 'string' },
          parsel: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarizeProject',
      description: 'Bir projenin girdilerini ve revizyon geçmişini (en yeniden en eskiye) getirir. projectId yalnız bağlamdan veya önceki araç sonucundan alınır.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['projectId'],
        properties: { projectId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createProject',
      description:
        'Yeni proje kartı oluşturur (kullanıcı hesabı bağlı değilse kayıt yerine üyelik bağlantısı üretir). Eski projeye dokunmaz. Parsellere bilinen olguları facts ile ekleyebilirsin.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['parcels'],
        properties: {
          name: { type: 'string', description: 'Kullanıcının verdiği isim (opsiyonel)' },
          parcels: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['il', 'ilce', 'mahalle', 'ada', 'parsel'],
              properties: { ...PARCEL_PROPS, facts: { type: 'array', items: FACT_SCHEMA } },
            },
          },
          inputs: INPUTS_SCHEMA,
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateProject',
      description: 'Var olan bir projenin girdilerini/ismini değiştirir; her değişiklik tarihli revizyon olarak kaydedilir. Yalnız DEĞİŞEN alanları gönder.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          changes: INPUTS_SCHEMA,
          name: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rememberFact',
      description:
        'Bir parselle ilgili olguyu (imar durumu, emsal, kat adedi vb.) Parsel Dosyası\'na kaydeder. Kullanıcı bayat bir olguyu "hâlâ geçerli" diye teyit ederse AYNI değerle çağır (tazelenir).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['il', 'ilce', 'mahalle', 'ada', 'parsel', 'key', 'value', 'source'],
        properties: { ...PARCEL_PROPS, ...FACT_SCHEMA.properties },
      },
    },
  },
]

// --- Doğrulama --------------------------------------------------------------

const OK: ValidateResult = { ok: true }
const bad = (field: string, reason: string): ValidateResult => ({ ok: false, field, reason })
const obj = (a: unknown): Record<string, unknown> =>
  a && typeof a === 'object' && !Array.isArray(a) ? (a as Record<string, unknown>) : {}

function optText(o: Record<string, unknown>, field: string, max: number): ValidateResult | null {
  const v = o[field]
  if (v === undefined || v === null) return null
  if (typeof v !== 'string' || v.length > max) return bad(field, 'geçersiz metin')
  return null
}

export function validateProjectToolArgs(name: ProjectToolName, args: unknown): ValidateResult {
  const o = obj(args)
  switch (name) {
    case 'findProjects': {
      for (const [f, max] of [['nameLike', 60], ['mahalle', 60], ['ada', 20], ['parsel', 20]] as const) {
        const r = optText(o, f, max)
        if (r) return r
      }
      const range = parseDateRange({ dateFrom: o.dateFrom, dateTo: o.dateTo })
      return range.ok ? OK : bad(range.field, range.reason)
    }
    case 'summarizeProject':
      return typeof o.projectId === 'string' && o.projectId.length > 0 && o.projectId.length <= 40
        ? OK
        : bad('projectId', 'eksik')
    case 'createProject': {
      const v = validateCreateArgs(args)
      return v.ok ? OK : bad(v.field, v.reason)
    }
    case 'updateProject': {
      if (typeof o.projectId !== 'string' || !o.projectId || o.projectId.length > 40) return bad('projectId', 'eksik')
      const nameErr = optText(o, 'name', 80)
      if (nameErr) return nameErr
      const inputs = validateInputs(o.changes)
      if (!inputs.ok) return bad(inputs.field, inputs.reason)
      const hasChanges = Object.keys(inputs.inputs).length > 0
      const hasName = typeof o.name === 'string' && o.name.trim().length > 0
      return hasChanges || hasName ? OK : bad('changes', 'değişiklik veya isim gerekli')
    }
    case 'rememberFact': {
      const p = validateParcelRef(args)
      if (!p.ok) return bad(p.field, p.reason)
      const f = validateFact(args)
      return f.ok ? OK : bad(f.field, f.reason)
    }
  }
}

// --- Dispatch ---------------------------------------------------------------

export interface ProjectToolDeps {
  db: PrismaClient
  phone: string
  now: () => Date
  baseUrl: string
  checkRateLimit: (key: string, opts: { limit: number; windowMs: number }) => { ok: boolean }
}

const parcelText = (p: { il: string; ilce: string; mahalle: string; ada: string; parsel: string }) =>
  `${p.il}/${p.ilce}/${p.mahalle} ada ${p.ada} parsel ${p.parsel}`

const listItem = (p: ProjectListItem) => ({
  id: p.id,
  ad: p.name,
  olusturma: istanbulDateString(p.createdAt),
  sonGuncelleme: istanbulDateString(p.updatedAt),
  parseller: p.parcels.map(parcelText),
})

function summaryCard(s: ProjectSummary): ProjectCard {
  return {
    kind: 'project',
    op: 'summary',
    data: {
      projectId: s.id,
      ad: s.name,
      olusturma: istanbulDateString(s.createdAt),
      sonGuncelleme: istanbulDateString(s.updatedAt),
      parseller: s.parcels.map(parcelText),
      guncelGirdiler: s.inputs,
      degisiklikler: s.revisions.map((r) => ({
        tarih: istanbulDateString(r.changedAt),
        alan: r.field,
        eski: r.oldValue ?? null,
        yeni: r.newValue,
        kanal: r.channel,
      })),
      kesildi: s.truncated,
    },
  }
}

async function needsSignup(name: ProjectToolName, args: unknown, deps: ProjectToolDeps, now: Date): Promise<ProjectCard> {
  if (!deps.checkRateLimit('wa-claim:' + deps.phone, CLAIM_RATE_LIMIT).ok) {
    return { kind: 'project', op: 'rate_limited' }
  }
  let draft: ClaimDraft | null = null
  if (name === 'createProject') {
    const v = validateCreateArgs(args)
    if (v.ok) draft = { op: 'createProject', args: v.value }
  }
  const { url } = await createClaim(deps.db, { phone: deps.phone, draft, now, baseUrl: deps.baseUrl })
  return {
    kind: 'project',
    op: 'needs_signup',
    data: { url, gecerlilikDakika: CLAIM_TTL_MS / 60_000, taslakKaydedildi: draft !== null },
  }
}

export async function dispatchProjectTool(name: ProjectToolName, args: unknown, deps: ProjectToolDeps): Promise<ProjectCard> {
  const now = deps.now()
  const user = await deps.db.user.findUnique({ where: { whatsappPhone: deps.phone }, select: { id: true } })
  if (!user) return needsSignup(name, args, deps, now)
  const userId = user.id
  const o = obj(args)

  switch (name) {
    case 'findProjects': {
      const range = parseDateRange({ dateFrom: o.dateFrom, dateTo: o.dateTo })
      if (!range.ok) return { kind: 'project', op: 'failed', data: { alan: range.field, neden: range.reason } }
      const { candidates, more } = await findProjects(deps.db, {
        userId,
        range: range.range,
        nameLike: typeof o.nameLike === 'string' ? o.nameLike : undefined,
        mahalle: typeof o.mahalle === 'string' ? o.mahalle : undefined,
        ada: typeof o.ada === 'string' ? o.ada : undefined,
        parsel: typeof o.parsel === 'string' ? o.parsel : undefined,
      })
      if (candidates.length === 0) return { kind: 'project', op: 'not_found' }
      if (candidates.length === 1 && !more) {
        const s = await getProjectSummary(deps.db, { userId, projectId: candidates[0].id })
        return s ? summaryCard(s) : { kind: 'project', op: 'not_found' }
      }
      return { kind: 'project', op: 'found', data: { adaylar: candidates.map(listItem), dahaFazlaVar: more } }
    }
    case 'summarizeProject': {
      const s = await getProjectSummary(deps.db, { userId, projectId: String(o.projectId) })
      return s ? summaryCard(s) : { kind: 'project', op: 'not_found' }
    }
    case 'createProject': {
      const v = validateCreateArgs(args)
      if (!v.ok) return { kind: 'project', op: 'failed', data: { alan: v.field, neden: v.reason } }
      const card = await createProject(deps.db, { ...v.value, userId, channel: 'whatsapp' }, now)
      return {
        kind: 'project',
        op: 'created',
        data: { projectId: card.id, ad: card.name, olusturma: istanbulDateString(now), girdiler: v.value.inputs },
      }
    }
    case 'updateProject': {
      const inputs = validateInputs(o.changes)
      if (!inputs.ok) return { kind: 'project', op: 'failed', data: { alan: inputs.field, neden: inputs.reason } }
      const nameArg = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : undefined
      const r = await updateProject(
        deps.db,
        { userId, projectId: String(o.projectId), changes: inputs.inputs, name: nameArg, channel: 'whatsapp' },
        now,
      )
      if (!r.ok) return { kind: 'project', op: 'not_found' }
      return {
        kind: 'project',
        op: 'updated',
        data: {
          projectId: String(o.projectId),
          degisiklikler: r.changes.map((c) => ({ alan: c.field, eski: c.oldValue ?? null, yeni: c.newValue })),
          adDegisti: r.nameChanged,
          degisiklikYok: r.changes.length === 0 && !r.nameChanged,
        },
      }
    }
    case 'rememberFact': {
      const p = validateParcelRef(args)
      const f = validateFact(args)
      if (!p.ok) return { kind: 'project', op: 'failed', data: { alan: p.field, neden: p.reason } }
      if (!f.ok) return { kind: 'project', op: 'failed', data: { alan: f.field, neden: f.reason } }
      const changed = await deps.db.$transaction(async (tx) => {
        const { id } = await upsertParsel(tx, userId, p.parcel)
        return (await recordFact(tx, id, f.fact, now)).changed
      })
      return {
        kind: 'project',
        op: 'fact_saved',
        data: { parsel: parcelText(p.parcel), olgu: f.fact.key, degisti: changed },
      }
    }
  }
}
```

- [ ] **Step 4: Çalıştır → PASS**

Run: `npx jest src/lib/whatsapp/__tests__/projectTools.test.ts --no-coverage`

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/projectTools.ts src/lib/whatsapp/__tests__/projectTools.test.ts
git commit -m "feat(akif-5c): WhatsApp proje kartı araçları (bul/özetle/oluştur/güncelle/hatırla)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Gateway, politika, handler ve route bağlantısı

**Files:**
- Modify: `src/lib/whatsapp/akifToolGateway.ts`
- Modify: `src/lib/whatsapp/akifToolPolicy.ts` (sona yeni sabit)
- Modify: `src/lib/whatsapp/akifHandleMessage.ts` (`AkifHandleDeps` + tur adımı)
- Modify: `src/app/api/whatsapp/webhook/route.ts`
- Test: `src/lib/whatsapp/__tests__/akifToolGateway.test.ts`, `src/lib/whatsapp/__tests__/akifToolPolicy.test.ts`, `src/lib/whatsapp/__tests__/akifHandleMessage.test.ts`, `src/app/api/whatsapp/webhook/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Task 10 (`PROJECT_TOOL_DEFS`, `isProjectToolName`, `validateProjectToolArgs`, `dispatchProjectTool`, `ProjectToolName`, `ProjectToolDeps`), Task 8 (`buildMemoryContext`).
- Produces: `WaToolName = ToolName | 'lookupParcel' | ProjectToolName`; `WaDispatchDeps` artık `projectToolDeps: ProjectToolDeps` içerir; `AKIF_WHATSAPP_PROJECT_POLICY: string`; `AkifHandleDeps.loadMemoryContext: (phone: string) => Promise<string>`.

- [ ] **Step 1: Gateway testlerini güncelle (önce başarısız yap)**

`akifToolGateway.test.ts` içinde:
1. İlk `describe` bloğundaki `it('3 mevcut aracı + lookupParcel içerir', ...)` testini şununla değiştir:

```ts
  it('3 mevcut araç + lookupParcel + 5 proje aracı içerir', () => {
    expect(WA_AKIF_TOOL_DEFS.length).toBe(AKIF_TOOL_DEFS.length + 1 + 5)
    expect(WA_AKIF_TOOL_DEFS.map((d) => d.function.name)).toEqual(
      expect.arrayContaining([
        ...AKIF_TOOL_DEFS.map((d) => d.function.name),
        'lookupParcel',
        'findProjects',
        'summarizeProject',
        'createProject',
        'updateProject',
        'rememberFact',
      ]),
    )
  })
```
2. `paylaşılan AKIF_TOOL_DEFS mutasyona uğramaz` testine ikinci bir assertion ekle:
```ts
    expect(AKIF_TOOL_DEFS.some((d) => d.function.name === 'createProject')).toBe(false)
```
3. `validateArgsWa` describe'ına ekle:
```ts
  it('proje araçları projectTools doğrulayıcısına delege eder', () => {
    expect(validateArgsWa('summarizeProject', { projectId: 'pk1' })).toEqual({ ok: true })
    expect(validateArgsWa('summarizeProject', {}).ok).toBe(false)
  })
```
4. `dispatchToolWa` describe'ındaki iki mevcut çağrıya `projectToolDeps: {} as never` ekle: `{ db: {} as never, lookupParcelDeps, projectToolDeps: {} as never }` ve `{ db: {} as never, lookupParcelDeps: {} as never, projectToolDeps: {} as never }`. Ayrıca ekle:

```ts
  it('proje araçlarını dispatchProjectTool\'a yönlendirir', async () => {
    const db = { user: { findUnique: jest.fn().mockResolvedValue(null) }, phoneClaim: { create: jest.fn() } }
    const card = await dispatchToolWa(
      'findProjects',
      {},
      {
        db: {} as never,
        lookupParcelDeps: {} as never,
        projectToolDeps: {
          db: db as never,
          phone: '905321234567',
          now: () => new Date('2026-10-15T12:00:00Z'),
          baseUrl: 'https://x.test',
          checkRateLimit: () => ({ ok: true }),
        },
      },
    )
    expect(card.kind).toBe('project')
    expect(db.user.findUnique).toHaveBeenCalled()
  })
```

`akifToolPolicy.test.ts` sonuna ekle (içe aktarmayı `import { AKIF_WHATSAPP_TOOL_POLICY, AKIF_WHATSAPP_PROJECT_POLICY } from '../akifToolPolicy'` olacak şekilde güncelle):

```ts
describe('AKIF_WHATSAPP_PROJECT_POLICY', () => {
  it('kritik kuralları içerir', () => {
    const p = AKIF_WHATSAPP_PROJECT_POLICY
    expect(p).toContain('EN FAZLA BİR araç')
    expect(p).toContain('needs_signup')
    expect(p).toContain('Bunun üzerinde değişiklik yapalım mı, yoksa yeni bir senaryo mu açalım?')
    expect(p).toContain('en yeni')
    expect(p).toContain('BAYAT')
    expect(p).toContain('projectId uydurma')
  })
})
```

`akifHandleMessage.test.ts`: `makeDeps` içindeki varsayılan deps nesnesine `loadMemoryContext: jest.fn().mockResolvedValue(''),` ekle (örn. `toolPolicy: 'TEST_POLICY',` satırının üstüne) ve `describe('runWhatsappAkifTurn', ...)` bloğunun içine ekle:

```ts
  it('hafıza bağlamı extraSystemPrompt\'a eklenir; boşsa yalnız politika', async () => {
    runAkifTurnMock.mockResolvedValue(TURN)
    const { deps } = makeDeps({ loadMemoryContext: jest.fn().mockResolvedValue('BUGÜN: 2026-10-15') })
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock.mock.calls[0][0].extraSystemPrompt).toBe('TEST_POLICY\n\nBUGÜN: 2026-10-15')

    runAkifTurnMock.mockClear()
    const { deps: d2 } = makeDeps()
    await runWhatsappAkifTurn(msg({ messageId: 'wamid.2' }), d2)
    expect(runAkifTurnMock.mock.calls[0][0].extraSystemPrompt).toBe('TEST_POLICY')
  })

  it('hafıza bağlamı yüklenemezse tur yine çalışır (yalnız politika)', async () => {
    runAkifTurnMock.mockResolvedValue(TURN)
    const { deps } = makeDeps({ loadMemoryContext: jest.fn().mockRejectedValue(new Error('db down')) })
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock.mock.calls[0][0].extraSystemPrompt).toBe('TEST_POLICY')
  })
```
(`runAkifTurnMock` dosyada zaten `jest.fn()`; testlerde `beforeEach`'te temizleniyorsa uyumludur, değilse yukarıdaki `mockClear` yeterli. Mevcut testlerin diğer `mockResolvedValue` kullanımını örnek al.)

`route.test.ts`: `jest.mock('@/lib/prisma', ...)` nesnesindeki `prisma` içine `user: { findUnique: jest.fn().mockResolvedValue(null) },` ekle; dosyadaki mevcut `WA_AKIF_TOOL_DEFS` assertion'ı `createAkifModel`'a tam listeyi geçtiğini doğruluyorsa otomatik uyar. Ayrıca POST testlerinden birine ekle (mevcut POST testinin kurulumunu örnek alarak): handler çağrısına verilen deps'in `loadMemoryContext` fonksiyonu içerdiğini doğrulayan assertion:

```ts
    expect(typeof handleMessageMock.mock.calls[0][1].loadMemoryContext).toBe('function')
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/whatsapp src/app/api/whatsapp --no-coverage`
Beklenen: gateway/policy/handler/route testleri FAIL (eksik export ve tip hataları).

- [ ] **Step 3: Gateway'i genişlet**

`akifToolGateway.ts` içinde:

(a) Import ekle (mevcut importların altına):
```ts
import {
  PROJECT_TOOL_DEFS,
  isProjectToolName,
  validateProjectToolArgs,
  dispatchProjectTool,
  type ProjectToolName,
  type ProjectToolDeps,
} from './projectTools'
```
(b) `export type WaToolName = ToolName | 'lookupParcel'` →
```ts
export type WaToolName = ToolName | 'lookupParcel' | ProjectToolName
```
(c) `export const WA_AKIF_TOOL_DEFS: OpenAiToolDef[] = [...AKIF_TOOL_DEFS, LOOKUP_PARCEL_DEF]` →
```ts
export const WA_AKIF_TOOL_DEFS: OpenAiToolDef[] = [...AKIF_TOOL_DEFS, LOOKUP_PARCEL_DEF, ...PROJECT_TOOL_DEFS]
```
(d) `isSharedToolName` gövdesi:
```ts
function isSharedToolName(name: WaToolName): name is ToolName {
  return name !== 'lookupParcel' && !isProjectToolName(name)
}
```
(e) `validateArgsWa` içinde `if (name === 'lookupParcel') {` bloğundan ÖNCE:
```ts
  if (isProjectToolName(name)) return validateProjectToolArgs(name, args)
```
(f) `WaDispatchDeps`:
```ts
export interface WaDispatchDeps extends DispatchDeps {
  lookupParcelDeps: LookupParcelDeps
  projectToolDeps: ProjectToolDeps
}
```
(g) `dispatchToolWa` içinde `if (name === 'lookupParcel') {` bloğundan ÖNCE:
```ts
  if (isProjectToolName(name)) {
    return dispatchProjectTool(name, args, deps.projectToolDeps)
  }
```

- [ ] **Step 4: Politika sabitini ekle**

`akifToolPolicy.ts` dosyasının sonuna:

```ts

export const AKIF_WHATSAPP_PROJECT_POLICY = `
PROJE KARTI POLİTİKASI (WhatsApp):
Araçlar: findProjects, summarizeProject, createProject, updateProject, rememberFact. Her turda EN FAZLA BİR araç çağırabilirsin.
"HAFIZA BAĞLAMI" bölümü sistem tarafından hesaplanır: bugünün tarihi, kayıtlı projeler ve parsel olguları için tek doğru kaynaktır.
- Tarih: kullanıcı yıl söylemediyse "Ocak" gibi bir ayı BUGÜN'e göre EN YAKIN GEÇMİŞ tarihe çöz; findProjects'e dateFrom/dateTo'yu YYYY-MM-DD olarak ver ("15 Ekim" için ikisi de aynı gün).
- Bir proje ararken birden fazla aday dönerse adayları (tarih, isim, parsel) listele ve hangisini kastettiğini sor. ASLA tahmin etme, projectId uydurma — yalnız bağlamdaki veya araç sonucundaki id'leri kullan.
- ÖZET ("summary" sonucu): değişiklikleri en yeniden en eskiye, en çok 6 satırda, her satırda tarih ve eski→yeni değerle anlat. Rakamları değiştirme, hesaplama. Özetin SON cümlesi her zaman aynıdır: "Bunun üzerinde değişiklik yapalım mı, yoksa yeni bir senaryo mu açalım?"
- Kullanıcı "değişiklik yapalım" derse updateProject (yalnız değişen alanlar); "yeni senaryo" derse createProject (eski projeye dokunma).
- Girdi alanları: arsaAlani (m²), emsal, arsaSahibiPayiYuzde (%), daireBuyuklugu (m²), katAdedi, birimMaliyet (TL/m²), kaliteSinifi (standart/orta/luks).
- Parsel olguları: BAĞLAMDA "TAZE" olanı tekrar SORMA. "BAYAT" olanı TARİHİYLE birlikte teyit ettir ("Mart'ta emsal 1.5 demiştiniz, hâlâ geçerli mi?"); kullanıcı "evet" derse AYNI değerle rememberFact çağır, farklı bir değer söylerse yeni değerle çağır. "EKSİK" olanı sor.
- Kaydetme araçları "needs_signup" dönerse kayıt HENÜZ yapılmadı: data.url bağlantısını ver, yaklaşık 15 dakika geçerli olduğunu söyle; data.taslakKaydedildi true ise üye olunca projenin kendiliğinden kaydedileceğini ekle. Kayıt yapılmış gibi konuşma.
- "rate_limited" dönerse biraz sonra tekrar denemesini söyle. "failed" dönerse neden alanını sade bir dille söyleyip doğru bilgiyi iste.
`.trim()
```

- [ ] **Step 5: Handler'a hafıza bağlamını bağla**

`akifHandleMessage.ts` içinde:

(a) `AkifHandleDeps` arayüzünde `toolPolicy: string` satırından sonra:
```ts
  /** Telefon bağlıysa hesabın projelerini/olgularını, değilse yalnız tarihi içeren bağlam metni. */
  loadMemoryContext: (phone: string) => Promise<string>
```
(b) `// 9. Tur akışı.` yorumundan hemen sonra, `let turn: AkifTurn` satırından önce:
```ts
  let memoryContext = ''
  try {
    memoryContext = await deps.loadMemoryContext(msg.from)
  } catch (e) {
    console.error('[wa-akif] memory context', e)
  }
```
(c) `runAkifTurn` çağrısındaki `extraSystemPrompt: deps.toolPolicy,` →
```ts
        extraSystemPrompt: memoryContext ? deps.toolPolicy + '\n\n' + memoryContext : deps.toolPolicy,
```

- [ ] **Step 6: Route'u telefon-bağlı hale getir**

`src/app/api/whatsapp/webhook/route.ts` içinde:

(a) Importlara ekle:
```ts
import { AKIF_WHATSAPP_PROJECT_POLICY } from '@/lib/whatsapp/akifToolPolicy'
import { buildMemoryContext } from '@/lib/akifProje/context'
import { checkRateLimit } from '@/lib/rate-limit'
```
ve mevcut `import { AKIF_WHATSAPP_TOOL_POLICY } from '@/lib/whatsapp/akifToolPolicy'` satırını sil (yukarıdaki birleşik import yerine şu tek satır olsun):
```ts
import { AKIF_WHATSAPP_TOOL_POLICY, AKIF_WHATSAPP_PROJECT_POLICY } from '@/lib/whatsapp/akifToolPolicy'
```
(b) `function buildAkifWhatsappDeps(): AkifHandleDeps {` →
```ts
function buildAkifWhatsappDeps(phone: string): AkifHandleDeps {
```
(c) `dispatchToolWa` çağrısında `lookupParcelDeps: { ... },` bloğundan sonra, aynı nesneye ekle:
```ts
        projectToolDeps: {
          db: prisma,
          phone,
          now: () => new Date(),
          baseUrl: process.env.AKIF_CLAIM_BASE_URL || 'https://www.arsabil.com',
          checkRateLimit,
        },
```
(d) Dönen nesnede `toolPolicy: AKIF_WHATSAPP_TOOL_POLICY,` →
```ts
    toolPolicy: AKIF_WHATSAPP_TOOL_POLICY + '\n\n' + AKIF_WHATSAPP_PROJECT_POLICY,
    loadMemoryContext: async (p) => {
      const u = await prisma.user.findUnique({ where: { whatsappPhone: p }, select: { id: true } })
      return buildMemoryContext(prisma, { userId: u?.id ?? null, now: new Date() })
    },
```
(e) `POST` içinde `await runWhatsappAkifTurn(m, buildAkifWhatsappDeps())` → `buildAkifWhatsappDeps(m.from)`.

- [ ] **Step 7: Çalıştır → PASS + tip denetimi**

```bash
npx jest src/lib/whatsapp src/app/api/whatsapp src/lib/ai/akif --no-coverage
npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Beklenen: tüm testler PASS; `tsc` yeni hata vermez. Route'ta `db: prisma` tip uyuşmazlığı çıkarsa `db: prisma as unknown as PrismaClient` kullan (import type `PrismaClient` from '@prisma/client').

- [ ] **Step 8: Commit**

```bash
git add src/lib/whatsapp src/app/api/whatsapp/webhook
git commit -m "feat(akif-5c): proje araçlarını WhatsApp Akif'e bağla (gateway, politika, hafıza bağlamı)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Güvenli yönlendirme (`safeRedirect`) ve login `next` desteği

**Files:**
- Create: `src/lib/safeRedirect.ts`
- Test: `src/lib/__tests__/safeRedirect.test.ts`
- Modify: `src/app/login/page.tsx` (`handleLogin` içindeki `window.location.href = "/"`)

**Interfaces:**
- Produces: `safeRedirectPath(raw: string | null | undefined, fallback?: string): string` — yalnız aynı-origin göreli yol (tek `/` ile başlar, `//` ve `/\` değil, kontrol karakteri yok) kabul eder, aksi halde `fallback` (`'/'`).

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { safeRedirectPath } from '../safeRedirect'

describe('safeRedirectPath', () => {
  it('aynı-origin göreli yolları kabul eder (sorgu dahil)', () => {
    expect(safeRedirectPath('/akif/baglan?t=abc')).toBe('/akif/baglan?t=abc')
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
  })

  it('açık yönlendirme girişimlerini reddeder', () => {
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', 'evil.com', '', '/x\n/y', '/x\r']) {
      expect(safeRedirectPath(bad)).toBe('/')
    }
  })

  it('null/undefined → fallback; özel fallback verilebilir', () => {
    expect(safeRedirectPath(null)).toBe('/')
    expect(safeRedirectPath(undefined, '/dashboard')).toBe('/dashboard')
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/lib/__tests__/safeRedirect.test.ts --no-coverage`

- [ ] **Step 3: Uygula**

`src/lib/safeRedirect.ts`:

```ts
// Giriş sonrası `next` yönlendirmesi için açık-yönlendirme (open redirect) koruması.
export function safeRedirectPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || raw.length > 500) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback
  return raw
}
```

- [ ] **Step 4: Login sayfasına bağla**

`src/app/login/page.tsx`: import ekle `import { safeRedirectPath } from "@/lib/safeRedirect";` ve `handleLogin` içindeki
```ts
            window.location.href = "/";
```
satırını şununla değiştir:
```ts
            const params = new URLSearchParams(window.location.search);
            window.location.href = safeRedirectPath(params.get("next") ?? params.get("callbackUrl"), "/");
```
(Kayıt akışı `?next=` sorgusunu URL'de tuttuğu için, kayıt sonrası login görünümüne dönen kullanıcı aynı `next` ile yönlendirilir.)

- [ ] **Step 5: Çalıştır → PASS**

```bash
npx jest src/lib/__tests__/safeRedirect.test.ts src/app/login --no-coverage
```
Beklenen: PASS (`login.scope.test.ts` ve `loginMobile.scope.test.ts` CSS testleri etkilenmez).

- [ ] **Step 6: Commit**

```bash
git add src/lib/safeRedirect.ts src/lib/__tests__/safeRedirect.test.ts src/app/login/page.tsx
git commit -m "feat(akif-5c): giriş sonrası güvenli next yönlendirmesi

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Bağlama web yüzü (`/api/akif/baglan` + `/akif/baglan`)

**Files:**
- Create: `src/app/api/akif/baglan/route.ts`
- Test: `src/app/api/akif/baglan/__tests__/route.test.ts`
- Create: `src/app/akif/baglan/page.tsx`, `src/app/akif/baglan/page.module.css`
- Test: `src/app/akif/baglan/page.test.tsx`

**Interfaces:**
- Consumes: `consumeClaim`, `ConsumeResult` (Task 7), `createSendText` + `readWhatsappConfig`, `safeRedirectPath` (Task 12 — sayfa tarafında `next` oluşturmak için).
- Produces: `POST /api/akif/baglan` body `{ token: string }` → `200 { ok: true, savedProjectName: string | null, saved: boolean }`; hata: `400 invalid`, `409 used|phone_taken|user_has_other_phone`, `410 expired`, `401` oturum yok, `429` rate-limit. Sayfa: `/akif/baglan?t=<token>`.

- [ ] **Step 1: Route testini yaz**

`src/app/api/akif/baglan/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const consumeClaimMock = jest.fn()
const sendTextMock = jest.fn().mockResolvedValue(undefined)
const checkRateLimitMock = jest.fn().mockReturnValue({ ok: true })

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: {} }))
jest.mock('@/lib/akifProje/claim', () => ({ consumeClaim: (...a: unknown[]) => consumeClaimMock(...a) }))
jest.mock('@/lib/whatsapp/config', () => ({ readWhatsappConfig: () => ({}) }))
jest.mock('@/lib/whatsapp/sendMessage', () => ({ createSendText: () => sendTextMock }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
}))

import { POST } from '../route'

const req = (body: unknown) =>
  new Request('http://localhost/api/akif/baglan', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  jest.clearAllMocks()
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  checkRateLimitMock.mockReturnValue({ ok: true })
})

describe('POST /api/akif/baglan', () => {
  it('oturum yoksa 401', async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await POST(req({ token: 't' }))).status).toBe(401)
    expect(consumeClaimMock).not.toHaveBeenCalled()
  })

  it('token eksik/uzun ise 400', async () => {
    expect((await POST(req({}))).status).toBe(400)
    expect((await POST(req({ token: 'x'.repeat(300) }))).status).toBe(400)
  })

  it('rate-limit aşılırsa 429', async () => {
    checkRateLimitMock.mockReturnValue({ ok: false })
    expect((await POST(req({ token: 't' }))).status).toBe(429)
  })

  it.each([
    ['invalid', 400],
    ['used', 409],
    ['expired', 410],
    ['phone_taken', 409],
    ['user_has_other_phone', 409],
  ])('claim %s → %i', async (reason, status) => {
    consumeClaimMock.mockResolvedValue({ ok: false, reason })
    const res = await POST(req({ token: 't' }))
    expect(res.status).toBe(status)
    expect(typeof (await res.json()).message).toBe('string')
    expect(sendTextMock).not.toHaveBeenCalled()
  })

  it('başarılı: taslak yoksa genel bağlandı mesajı yollar', async () => {
    consumeClaimMock.mockResolvedValue({ ok: true, phone: '905321234567' })
    const res = await POST(req({ token: 't' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, saved: false, savedProjectName: null })
    expect(sendTextMock).toHaveBeenCalledWith('905321234567', expect.stringContaining('bağlandı'))
  })

  it('başarılı + taslak: proje adı döner ve WhatsApp mesajı projeyi anar', async () => {
    consumeClaimMock.mockResolvedValue({ ok: true, phone: '905321234567', saved: { projectId: 'pk1', name: 'Maçka' } })
    const res = await POST(req({ token: 't' }))
    expect(await res.json()).toEqual({ ok: true, saved: true, savedProjectName: 'Maçka' })
    expect(sendTextMock).toHaveBeenCalledWith('905321234567', expect.stringContaining('Maçka'))
  })

  it('WhatsApp bildirimi başarısız olsa da bağlama başarılı sayılır', async () => {
    consumeClaimMock.mockResolvedValue({ ok: true, phone: '905321234567' })
    sendTextMock.mockRejectedValueOnce(new Error('24 saat penceresi'))
    expect((await POST(req({ token: 't' }))).status).toBe(200)
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**

Run: `npx jest src/app/api/akif/baglan --no-coverage`

- [ ] **Step 3: Route'u yaz**

`src/app/api/akif/baglan/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consumeClaim } from '@/lib/akifProje/claim'
import { readWhatsappConfig } from '@/lib/whatsapp/config'
import { createSendText } from '@/lib/whatsapp/sendMessage'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const FAIL: Record<string, { status: number; message: string }> = {
  invalid: { status: 400, message: 'Bağlantı geçersiz.' },
  used: { status: 409, message: 'Bu bağlantı daha önce kullanılmış.' },
  expired: { status: 410, message: "Bağlantının süresi dolmuş. WhatsApp'tan Akif'ten yeni bir bağlantı iste." },
  phone_taken: { status: 409, message: 'Bu telefon numarası başka bir hesaba bağlı.' },
  user_has_other_phone: { status: 409, message: 'Hesabın zaten başka bir telefona bağlı.' },
}

export async function POST(req: Request): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ message: 'Giriş gerekli.' }, { status: 401 })

  if (!checkRateLimit('akif-baglan:' + userId, { limit: 10, windowMs: 3_600_000 }).ok) {
    return NextResponse.json({ message: 'Çok fazla deneme. Biraz sonra tekrar dene.' }, { status: 429 })
  }

  let token: unknown
  try {
    token = ((await req.json()) as { token?: unknown })?.token
  } catch {
    token = undefined
  }
  if (typeof token !== 'string' || token.length === 0 || token.length > 200) {
    return NextResponse.json({ message: FAIL.invalid.message }, { status: 400 })
  }

  const res = await consumeClaim(prisma, { token, userId, now: new Date() })
  if (!res.ok) {
    const f = FAIL[res.reason] ?? FAIL.invalid
    return NextResponse.json({ message: f.message }, { status: f.status })
  }

  // En iyi çaba: WhatsApp onayı (24 saatlik pencere kapalıysa sessizce atlanır).
  try {
    const send = createSendText({ fetch, config: readWhatsappConfig() })
    const body = res.saved
      ? `Hesabın WhatsApp numarana bağlandı ✅ "${res.saved.name ?? 'Adsız proje'}" projen kaydedildi. Artık "geçen ayki projem" gibi sorabilirsin.`
      : 'Hesabın WhatsApp numarana bağlandı ✅ Artık projelerini kaydedebilirsin.'
    await send(res.phone, body)
  } catch (e) {
    console.error('[akif-baglan] whatsapp bildirimi', e)
  }

  return NextResponse.json({ ok: true, saved: !!res.saved, savedProjectName: res.saved?.name ?? null })
}
```

- [ ] **Step 4: Route testi PASS**

Run: `npx jest src/app/api/akif/baglan --no-coverage`

- [ ] **Step 5: Sayfa testini yaz**

`src/app/akif/baglan/page.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
import { useSession } from 'next-auth/react'

let tokenParam: string | null = 'TOK'
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 't' ? tokenParam : null) }),
}))

import BaglanPage from './page'

const fetchMock = jest.fn()
beforeEach(() => {
  jest.clearAllMocks()
  tokenParam = 'TOK'
  ;(global as unknown as { fetch: unknown }).fetch = fetchMock
})

describe('/akif/baglan', () => {
  it('token yoksa hata gösterir', () => {
    tokenParam = null
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
    render(<BaglanPage />)
    expect(screen.getByText(/geçersiz/i)).toBeInTheDocument()
  })

  it('oturum yoksa giriş/üye ol bağlantısı next ile birlikte', () => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })
    render(<BaglanPage />)
    const link = screen.getByRole('link', { name: /giriş yap veya üye ol/i })
    expect(link).toHaveAttribute('href', '/login?next=' + encodeURIComponent('/akif/baglan?t=TOK'))
  })

  it('oturum varken butona basınca bağlar ve başarıyı gösterir', async () => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, saved: true, savedProjectName: 'Maçka' }) })
    render(<BaglanPage />)
    fireEvent.click(screen.getByRole('button', { name: /whatsapp'a bağla/i }))
    await waitFor(() => expect(screen.getByText(/Maçka/)).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/akif/baglan',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'TOK' }) }),
    )
  })

  it('API hatasında mesajı gösterir', async () => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ message: 'Bu bağlantı daha önce kullanılmış.' }) })
    render(<BaglanPage />)
    fireEvent.click(screen.getByRole('button', { name: /whatsapp'a bağla/i }))
    await waitFor(() => expect(screen.getByText(/daha önce kullanılmış/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 6: Çalıştır → FAIL**, sonra sayfayı yaz

Run: `npx jest src/app/akif/baglan --no-coverage` → FAIL (modül yok).

`src/app/akif/baglan/page.tsx`:

```tsx
'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'

type Phase = 'idle' | 'loading' | 'done' | 'error'

function BaglanInner() {
  const token = useSearchParams().get('t')
  const { status } = useSession()
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')

  if (!token) {
    return <p className={styles.error}>Bağlantı geçersiz. WhatsApp&apos;tan Akif&apos;ten yeni bir bağlantı iste.</p>
  }

  if (status === 'loading') return <p>Yükleniyor…</p>

  if (status !== 'authenticated') {
    const next = encodeURIComponent(`/akif/baglan?t=${token}`)
    return (
      <>
        <p>Projelerini kaydetmek için ArsaBil hesabın gerekiyor.</p>
        <Link className={styles.button} href={`/login?next=${next}`}>
          Giriş yap veya üye ol
        </Link>
      </>
    )
  }

  const connect = async () => {
    setPhase('loading')
    try {
      const res = await fetch('/api/akif/baglan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setMessage(
          data.saved
            ? `Hesabın bağlandı. "${data.savedProjectName ?? 'Adsız proje'}" projen kaydedildi.`
            : 'Hesabın WhatsApp numarana bağlandı.',
        )
        setPhase('done')
      } else {
        setMessage(data.message ?? 'Bağlanamadı.')
        setPhase('error')
      }
    } catch {
      setMessage('Bağlantı hatası. Tekrar dene.')
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <>
        <p className={styles.success}>{message}</p>
        <Link className={styles.button} href="/dashboard/akif-projeler">
          Akif projelerimi gör
        </Link>
      </>
    )
  }

  return (
    <>
      <p>WhatsApp numaranı bu hesaba bağlıyorsun. Bundan sonra projelerin hem WhatsApp&apos;ta hem sitede görünür.</p>
      <button className={styles.button} onClick={connect} disabled={phase === 'loading'}>
        {phase === 'loading' ? 'Bağlanıyor…' : "WhatsApp'a bağla"}
      </button>
      {phase === 'error' && <p className={styles.error}>{message}</p>}
    </>
  )
}

export default function BaglanPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>WhatsApp bağlantısı</h1>
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <BaglanInner />
      </Suspense>
    </main>
  )
}
```

`src/app/akif/baglan/page.module.css`:

```css
.main {
  max-width: 480px;
  margin: 48px auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  font-size: 1.5rem;
  margin: 0;
}

.button {
  display: inline-block;
  align-self: flex-start;
  padding: 12px 20px;
  border: 0;
  border-radius: 10px;
  background: #1f6f4a;
  color: #fff;
  font-size: 1rem;
  text-decoration: none;
  cursor: pointer;
}

.button:disabled {
  opacity: 0.6;
  cursor: default;
}

.success {
  color: #1f6f4a;
}

.error {
  color: #b3261e;
}
```

- [ ] **Step 7: Çalıştır → PASS**

```bash
npx jest src/app/akif/baglan src/app/api/akif/baglan --no-coverage
```

- [ ] **Step 8: Commit**

```bash
git add src/app/api/akif/baglan src/app/akif/baglan
git commit -m "feat(akif-5c): WhatsApp-hesap bağlama sayfası ve API'si

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 14: "Akif Projelerim" web görünümü

**Files:**
- Create: `src/app/api/akif/projeler/route.ts`
- Test: `src/app/api/akif/projeler/__tests__/route.test.ts`
- Create: `src/app/dashboard/akif-projeler/page.tsx`, `src/app/dashboard/akif-projeler/page.module.css`
- Test: `src/app/dashboard/akif-projeler/page.test.tsx`
- Modify: `src/app/dashboard/layout.tsx` (navItems)

**Interfaces:**
- Produces: `GET /api/akif/projeler` → `200 { projects: Array<{ id; name: string | null; createdAt; updatedAt; inputs; parcels: string[]; revisions: Array<{ field; oldValue; newValue; changedAt; channel }> }> }` (en çok 50 proje, her biri en çok 30 revizyon, en yeni → en eski); `401` oturum yoksa.

- [ ] **Step 1: Route testini yaz**

```ts
const getServerSessionMock = jest.fn()
const findManyMock = jest.fn()
jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { projeKarti: { findMany: (...a: unknown[]) => findManyMock(...a) } } }))

import { GET } from '../route'

beforeEach(() => jest.clearAllMocks())

describe('GET /api/akif/projeler', () => {
  it('oturum yoksa 401', async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect(findManyMock).not.toHaveBeenCalled()
  })

  it('yalnız oturum sahibinin projelerini döner ve parselleri metne çevirir', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    findManyMock.mockResolvedValue([
      {
        id: 'pk1',
        name: 'Maçka',
        inputs: { arsaAlani: 850 },
        createdAt: new Date('2026-10-15T10:00:00Z'),
        updatedAt: new Date('2026-10-16T10:00:00Z'),
        parseller: [{ parselDosyasi: { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' } }],
        revizyonlar: [{ field: 'arsaAlani', oldValue: 800, newValue: 850, changedAt: new Date('2026-10-16T10:00:00Z'), channel: 'whatsapp' }],
      },
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(findManyMock.mock.calls[0][0].where).toEqual({ userId: 'u1' })
    expect(findManyMock.mock.calls[0][0].take).toBe(50)
    const body = await res.json()
    expect(body.projects[0]).toMatchObject({
      id: 'pk1',
      name: 'Maçka',
      parcels: ['TRABZON/ORTAHISAR/UĞURLU ada 123 parsel 45'],
    })
    expect(body.projects[0].revisions[0]).toMatchObject({ field: 'arsaAlani', oldValue: 800, newValue: 850 })
  })
})
```

- [ ] **Step 2: Çalıştır → FAIL**, sonra route'u yaz

Run: `npx jest src/app/api/akif/projeler --no-coverage` → FAIL.

`src/app/api/akif/projeler/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ message: 'Giriş gerekli.' }, { status: 401 })

  const rows = await prisma.projeKarti.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      inputs: true,
      createdAt: true,
      updatedAt: true,
      parseller: { select: { parselDosyasi: { select: { il: true, ilce: true, mahalle: true, ada: true, parsel: true } } } },
      revizyonlar: {
        orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
        take: 30,
        select: { field: true, oldValue: true, newValue: true, changedAt: true, channel: true },
      },
    },
  })

  return NextResponse.json({
    projects: rows.map((r) => ({
      id: r.id,
      name: r.name,
      inputs: r.inputs,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      parcels: r.parseller.map(
        (p) => `${p.parselDosyasi.il}/${p.parselDosyasi.ilce}/${p.parselDosyasi.mahalle} ada ${p.parselDosyasi.ada} parsel ${p.parselDosyasi.parsel}`,
      ),
      revisions: r.revizyonlar,
    })),
  })
}
```

- [ ] **Step 3: Route testi PASS**

Run: `npx jest src/app/api/akif/projeler --no-coverage`

- [ ] **Step 4: Sayfa testini yaz**

`src/app/dashboard/akif-projeler/page.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import AkifProjelerPage from './page'

const fetchMock = jest.fn()
beforeEach(() => {
  jest.clearAllMocks()
  ;(global as unknown as { fetch: unknown }).fetch = fetchMock
})

describe('Akif Projelerim', () => {
  it('projeleri, parselleri ve revizyon geçmişini (en yeni önce) gösterir', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [
          {
            id: 'pk1',
            name: 'Maçka arsası',
            inputs: { arsaSahibiPayiYuzde: 50 },
            createdAt: '2026-10-15T10:00:00.000Z',
            updatedAt: '2026-10-16T10:00:00.000Z',
            parcels: ['TRABZON/ORTAHISAR/UĞURLU ada 123 parsel 45'],
            revisions: [
              { field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50, changedAt: '2026-10-16T10:00:00.000Z', channel: 'whatsapp' },
              { field: 'arsaSahibiPayiYuzde', oldValue: null, newValue: 40, changedAt: '2026-10-15T10:00:00.000Z', channel: 'whatsapp' },
            ],
          },
        ],
      }),
    })
    render(<AkifProjelerPage />)
    await waitFor(() => expect(screen.getByText('Maçka arsası')).toBeInTheDocument())
    expect(screen.getByText(/ada 123 parsel 45/)).toBeInTheDocument()
    const rows = screen.getAllByTestId('revizyon')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('40 → 50')
    expect(rows[1]).toHaveTextContent('→ 40')
  })

  it('proje yoksa yönlendirici boş durum metni gösterir', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ projects: [] }) })
    render(<AkifProjelerPage />)
    await waitFor(() => expect(screen.getByText(/henüz kayıtlı proje yok/i)).toBeInTheDocument())
  })

  it('hata durumunda mesaj gösterir', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })
    render(<AkifProjelerPage />)
    await waitFor(() => expect(screen.getByText(/yüklenemedi/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 5: Çalıştır → FAIL**, sonra sayfayı yaz

`src/app/dashboard/akif-projeler/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface Revision {
  field: string
  oldValue: unknown
  newValue: unknown
  changedAt: string
  channel: string
}
interface AkifProject {
  id: string
  name: string | null
  inputs: Record<string, unknown>
  createdAt: string
  updatedAt: string
  parcels: string[]
  revisions: Revision[]
}

const LABELS: Record<string, string> = {
  arsaAlani: 'Arsa alanı (m²)',
  emsal: 'Emsal',
  arsaSahibiPayiYuzde: 'Arsa sahibi payı (%)',
  daireBuyuklugu: 'Daire büyüklüğü (m²)',
  katAdedi: 'Kat adedi',
  birimMaliyet: 'Birim maliyet (TL/m²)',
  kaliteSinifi: 'Kalite sınıfı',
  name: 'Proje adı',
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'long', year: 'numeric' })
const show = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export default function AkifProjelerPage() {
  const [projects, setProjects] = useState<AkifProject[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/akif/projeler')
      .then(async (res) => {
        if (!res.ok) throw new Error('http')
        const data = await res.json()
        if (alive) setProjects(data.projects as AkifProject[])
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  if (error) return <p className={styles.error}>Projeler yüklenemedi.</p>
  if (!projects) return <p>Yükleniyor…</p>
  if (projects.length === 0) {
    return <p>Henüz kayıtlı proje yok. WhatsApp&apos;ta Akif&apos;e arsanı anlatıp &quot;kaydet&quot; dediğinde burada görünür.</p>
  }

  return (
    <div className={styles.list}>
      {projects.map((p) => (
        <article key={p.id} className={styles.card}>
          <h2 className={styles.name}>{p.name ?? 'Adsız proje'}</h2>
          <p className={styles.meta}>
            Oluşturma {fmtDate(p.createdAt)} · Son değişiklik {fmtDate(p.updatedAt)}
          </p>
          {p.parcels.map((t) => (
            <p key={t} className={styles.parcel}>
              {t}
            </p>
          ))}
          <ul className={styles.revisions}>
            {p.revisions.map((r, i) => (
              <li key={i} data-testid="revizyon">
                <span className={styles.date}>{fmtDate(r.changedAt)}</span> {LABELS[r.field] ?? r.field}:{' '}
                {show(r.oldValue)} → {show(r.newValue)}
                <span className={styles.channel}> ({r.channel === 'whatsapp' ? 'WhatsApp' : 'Web'})</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
```

Not: ilk revizyonda eski değer boş olduğundan satır `... :  → 40` görünür; test `'→ 40'` içermeyi bekler (boşluk toleranslı `toHaveTextContent`).

`src/app/dashboard/akif-projeler/page.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 12px;
  padding: 16px;
}

.name {
  margin: 0 0 4px;
  font-size: 1.15rem;
}

.meta,
.parcel {
  margin: 0 0 4px;
  opacity: 0.75;
  font-size: 0.9rem;
}

.revisions {
  margin: 12px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date {
  font-weight: 600;
}

.channel {
  opacity: 0.6;
}

.error {
  color: #b3261e;
}
```

- [ ] **Step 6: Dashboard nav öğesi**

`src/app/dashboard/layout.tsx` içinde `navItems` dizisine `Projelerim` satırından sonra ekle:
```tsx
        { href: '/dashboard/akif-projeler', label: 'Akif Projelerim', icon: '💬' },
```

- [ ] **Step 7: Çalıştır → PASS (ilgili CSS kapsam testleri dahil)**

```bash
npx jest src/app/dashboard src/app/api/akif/projeler --no-coverage
```
Beklenen: PASS. `dashboardStyles.scope.test.ts` yeni CSS modülünü tarayıp başarısız olursa, testin kuralını oku ve yeni CSS'i kurala uydur (ör. sabit renk/seçici kısıtı).

- [ ] **Step 8: Commit**

```bash
git add src/app/api/akif/projeler src/app/dashboard/akif-projeler src/app/dashboard/layout.tsx
git commit -m "feat(akif-5c): web'de Akif Projelerim görünümü

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Dokümantasyon ve tam doğrulama

**Files:**
- Modify: `docs/akif/akif-2-insan-duman-kontrol-listesi.md` (sona "Akif-5c Aşama B" bölümü)
- Modify: `.env.example` (opsiyonel env)

- [ ] **Step 1: İnsan duman listesini ekle**

`docs/akif/akif-2-insan-duman-kontrol-listesi.md` sonuna ekle:

```markdown

## Akif-5c Aşama B (WhatsApp Proje Kartları)

Gerçek Meta webhook + gerçek telefon + gerçek ArsaBil hesabı gerektirir. **Ön koşul:** `prisma migrate deploy` (`20261015120000_add_akif_proje_kartlari`) çalıştırılmış olmalı; yeni env `AKIF_CLAIM_BASE_URL` (varsayılan `https://www.arsabil.com`).

- [ ] Hesapsız numaradan arsa bilgisini anlat, "kaydet" de → Akif kayıt yapılmadığını söyleyip `…/akif/baglan?t=…` bağlantısı verir; `PhoneClaim` satırında `tokenHash` var, ham token yok
- [ ] Bağlantıyı aç → giriş yap/üye ol → `/akif/baglan`'a geri dönülür → "WhatsApp'a bağla" → başarı; WhatsApp'a "bağlandı ✅ … projen kaydedildi" mesajı gelir; `User.whatsappPhone` dolu
- [ ] Aynı bağlantıyı ikinci kez aç → "daha önce kullanılmış"
- [ ] 15 dk sonra eski bir bağlantıyı aç → "süresi dolmuş"
- [ ] Başka bir hesapla aynı telefonu bağlamayı dene → "başka bir hesaba bağlı"
- [ ] Bağlı numaradan: proje oluştur, sonra "arsa payını %40 yap", ardından "%50 yap", "arsa alanı 900" de → `ProjeRevizyon` satırları eski→yeni ile oluşur
- [ ] Birkaç gün sonra "15 Ekim'deki projeyi hatırlıyor musun?" (kendi tarihini kullan) → Akif en yeniden en eskiye kısa özet verir ve "değişiklik mi, yeni senaryo mu?" diye sorar
- [ ] "Yeni senaryo" de → yeni `ProjeKarti` açılır, eskisi DEĞİŞMEZ
- [ ] Aynı ay içinde iki proje varsa ("Ocak'taki proje") → Akif adayları listeler, tahmin etmez
- [ ] 180+ gün önce kaydedilmiş bir emsal/imar için (DB'de `recordedAt` geriye çekerek simüle et) → Akif tarihiyle birlikte "hâlâ geçerli mi?" diye sorar; "evet" → `recordedAt` tazelenir, yeni satır açılmaz; taze olguyu tekrar SORMAZ
- [ ] Web: Dashboard → "Akif Projelerim" → aynı projeler ve revizyon geçmişi (WhatsApp kanal etiketiyle) görünür
```

- [ ] **Step 2: `.env.example`'a opsiyonel env ekle**

`AKIF_WHATSAPP_MONTHLY_BUDGET_USD=20 ...` satırının altına:
```
AKIF_CLAIM_BASE_URL=https://www.arsabil.com   # opsiyonel — WhatsApp hesap-bağlama linkinin tabanı (boşsa https://www.arsabil.com)
```

- [ ] **Step 3: Tam test paketi**

```bash
npx jest --no-coverage --roots "<rootDir>/src" 2>&1 | tail -40
```
Beklenen: tüm yeni testler PASS; mevcut testlerde regresyon YOK. Başlangıçta zaten kırık testler varsa (`git stash` ile kıyasla) bunları raporla, düzeltmeye çalışma.

- [ ] **Step 4: Tip ve lint**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | tail -20
npx eslint src/lib/akifProje src/lib/whatsapp src/app/api/akif src/app/akif src/app/dashboard/akif-projeler src/lib/safeRedirect.ts 2>&1 | tail -30
```
Beklenen: yeni hata yok.

- [ ] **Step 5: Gerçek build (Next/Turbopack build-time kısıtları yalnız build'de yakalanır)**

```bash
npm run build 2>&1 | tail -30
```
Beklenen: build başarılı; `useSearchParams` Suspense uyarısı yok. (Not: build + dev aynı anda çalışırsa `.next` bozulur; `next dev` açıksa önce kapat.)

- [ ] **Step 6: Commit**

```bash
git add docs/akif/akif-2-insan-duman-kontrol-listesi.md .env.example
git commit -m "docs(akif-5c): Aşama B insan duman listesi ve env notu

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-Review (plan yazarı)

**1. Spec kapsamı (Aşama B):** Veri modeli → T1; Parsel Dosyası + tarihli olgular + teyitte tazeleme → T5; Proje Kartı + Revizyon + tevhid (çoklu parsel) → T6; bayatlık politikası → T3 + T8; `findProjects` (tarih/isim/parsel, TR saati, çoklu aday, sıfır sonuç) → T4/T6/T10; `summarizeProject` (en yeni → en eski, sabit soru) → T10 + T11 politika; `createProject`/`updateProject`/`rememberFact` → T10; üyelik eşleştirme (15 dk, tek kullanım, hash, taslak, çakışma) → T7 + T13; web "Akif Projelerim" → T14; WhatsApp-özel araç sınırı (web/voice'a sızmaz) → T11; test stratejisi maddeleri (freshness sınırları, findProjects, summarize, claim, transaction, tevhid, regresyon) → ilgili görev testleri; deploy kapısı/insan dumanı → T15. Kapsam dışı (resim, imar sorma/daire fiyatı, `result`, web `Project` kopyalama) açıkça ertelendi ve spec §9'da yazıldı.

**2. Placeholder taraması:** "TBD/TODO/uygun hata yönetimi ekle" yok; her kod adımında tam kod var. Tek koşullu yönerge: T9 Step 5 ve T14 Step 7'de mevcut kodun beklenmedik tip/CSS-kapsam testlerine uyum — bunlar keşfedilecek gerçek kısıtlar için açık talimatla verildi (ne yapılacağı belli).

**3. Tip tutarlılığı:** `Tx` (parselDosyasi.ts) → `createProjectTx` (projeKarti.ts) → `consumeClaim` (claim.ts) zinciri aynı `Prisma.TransactionClient`; `ProjectToolDeps.db: PrismaClient` hem `db.user.findUnique` hem `db.$transaction` kullanıyor; `ClaimDraft.args: CreateProjectInput` ↔ `validateCreateArgs` çıktısı `CreateProjectInput`; `ProjectCard.data` anahtarları (T10) politika metniyle (`data.url`, `data.taslakKaydedildi`) ve T13/T14 tüketicileriyle uyumlu; araç adları `ProjectToolName` tek kaynaktan; revizyon alan adları `INPUT_KEYS` + `'name'`; `istanbulDateString` T4'te tanımlı, T8/T10'da aynı imzayla kullanılıyor.

**4. Review Focus kapsamı:** 1 → T6 (`updateProject`/`getProjectSummary` not_found), T10 (dispatch); 2 → T5 (teyitte tazeleme), T8 (taze/bayat bağlamı); 3 → T4 (gece yarısı/geçersiz/ters), T6 (OR kuralı), T10 (TR tarihleri); 4 → T2 (normalize eşitliği); 5 → T2 (diff), T6 (no-op); 6 → T7 (used/expired/phone_taken/bozuk taslak/yarış), T13 (API eşleme).
