# Arsabil Studio SP1 — Fotogerçekçi Render Katmanı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vitrin'in mevcut WebGL sahnesinden (kütle + malzeme) premium kullanıcılar için tek tuşla fotogerçekçi bir görsel üreten uçtan uca akışı kurmak.

**Architecture:** Vitrin sahnesi (Three.js/`@react-three/fiber`, `StudioVitrinScene.tsx`) DEĞİŞMEDEN kalır; sahneye yeni bir `StudioVitrinCapture` alt bileşeni eklenir, bu bileşen `forwardRef` ile dışarıya `captureFrame()` sunar (renkli ekran görüntüsü + Three.js'in kendi derinlik pass'inden çıkarılan derinlik haritası). Bu iki görüntü, yeni bir `POST /api/studio/scenarios/[scenarioId]/versions/[versionNumber]/render` route'una gönderilir; route premium yetkisini ve mevcut senaryo sahipliğini doğrular, kullanıcı-özel cache'e bakar, aylık bütçe tavanını (Akif'in `checkMonthlyBudget` genel yardımcı fonksiyonu yeniden kullanılarak) kontrol eder, img2img+ControlNet sağlayıcısını (fal.ai, düz `fetch` ile — yeni bir SDK bağımlılığı eklenmez) çağırır ve sonucu döner. Sağlayıcının kendi CDN URL'i doğrudan saklanır — ayrı bir obje depolama katmanı (R2/Docker volume) bu MVP'de KURULMAZ, YAGNI.

**Tech Stack:** Next.js (App Router) API route + React Server Component sayfa, Prisma/PostgreSQL, `@react-three/fiber`/Three.js (mevcut), fal.ai REST API (`fetch`, yeni SDK yok), Jest + Testing Library (mevcut test altyapısı).

**Spec:** `docs/superpowers/specs/2026-09-05-arsabil-studio-sp1-fotorealistic-render-design.md`

## Global Constraints

- Bu katman hiçbir fizibilite/emsal/teklif hesabı YAPMAZ — yalnızca zaten hesaplanmış kütleyi görselleştirir (spec §Mimari, Vitrin'in "değişmeyen ilke"si).
- Fotogerçekçi üretim yalnızca `user.plan === 'PRO'` kullanıcılara açık (spec §Erişim ve Maliyet Modeli).
- Cache **kullanıcı-özel** (paylaşımlı DEĞİL) — `(userId, cacheKey)` bileşik anahtar.
- Kalite hedefi "prosedürelden bariz iyi" — dergi/V-Ray kalitesi hedeflenmiyor, bu nedenle post-processing/upscale katmanı EKLENMEZ.
- Sağlayıcı hatasında kullanım hakkı/kredi düşülmez, cache'e yazılmaz (spec §Hata Yönetimi).
- Bekleme UX'i senkron/canlı — arka plan işleme + bildirim modeli YOK (spec, Soru 4).
- Görsel depolama: sağlayıcının döndürdüğü URL doğrudan saklanır; yeni bir obje depolama sağlayıcısı bu plan kapsamında KURULMAZ.

---

### Task 1: Prisma şeması — `StudioRenderCache` modeli

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `StudioRenderCache` Prisma modeli — `{ id, userId, cacheKey, imageUrl, estCostUsd, createdAt }`, `@@unique([userId, cacheKey])` (Prisma bunu otomatik `userId_cacheKey` bileşik anahtarı olarak adlandırır — Task 2 bunu kullanır).

- [ ] **Step 1: Modeli ekle**

`prisma/schema.prisma` dosyasında `model StudioShareToken` bloğundan hemen sonra:

```prisma
// SP1 — fotogerçekçi render cache + harcama denetim izi. Her satır bir
// GERÇEK üretilen (cache miss) render'ı temsil eder; cache hit yeni
// satır YAZMAZ — bu yüzden aylık harcama toplamı bu tablonun estCostUsd
// toplamından güvenle hesaplanabilir (StudioScenarioAuditLog ile aynı
// gevşek/FK'siz desen — userId'ye referans verir ama Cascade bağlamaz).
model StudioRenderCache {
  id         String   @id @default(cuid())
  userId     String
  cacheKey   String
  imageUrl   String
  estCostUsd Float
  createdAt  DateTime @default(now())

  @@unique([userId, cacheKey])
  @@index([userId])
  @@index([createdAt])
}
```

- [ ] **Step 2: Formatla ve migration üret**

Run: `npx prisma format && npx prisma migrate dev --name add_studio_render_cache`
Expected: migration klasörü `prisma/migrations/<timestamp>_add_studio_render_cache/` altında oluşturulur, `npx prisma generate` otomatik tetiklenir, hata vermez.

- [ ] **Step 3: Client tiplerinin üretildiğini doğrula**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | head -20`
Expected: `StudioRenderCache` ile ilgili tip hatası YOK (Prisma client'ın `PrismaClient` tipine yeni model eklendiğini doğrular).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(studio): StudioRenderCache modeli + migration"
```

---

### Task 2: Render cache anahtarı + repository

**Files:**
- Create: `src/lib/studio/render/renderCacheRepository.ts`
- Test: `src/lib/studio/render/renderCacheRepository.test.ts`

**Interfaces:**
- Consumes: `canonicalizeJson` (`@/lib/studio/snapshotVersioning`, mevcut — deterministik JSON serileştirme)
- Produces: `computeRenderCacheKey(scenarioId: string, versionNumber: number, camera: { position: [number, number, number] }): string`; `type RenderCacheDb`; `getCachedRender(db: RenderCacheDb, userId: string, cacheKey: string): Promise<string | null>`; `saveCachedRender(db: RenderCacheDb, params: { userId: string; cacheKey: string; imageUrl: string; estCostUsd: number }): Promise<void>`; `monthSpendUsd(db: RenderCacheDb, now: Date): Promise<number>` — Task 6 (API route) bunları tüketir.

- [ ] **Step 1: Başarısız testi yaz**

```typescript
// src/lib/studio/render/renderCacheRepository.test.ts
import {
  computeRenderCacheKey,
  getCachedRender,
  saveCachedRender,
  monthSpendUsd,
  type RenderCacheDb,
} from './renderCacheRepository';

describe('computeRenderCacheKey', () => {
  it('aynı senaryo+versiyon+kamera için deterministik aynı anahtarı üretir', () => {
    const a = computeRenderCacheKey('scn1', 3, { position: [10, 12, 10] });
    const b = computeRenderCacheKey('scn1', 3, { position: [10, 12, 10] });
    expect(a).toBe(b);
  });

  it('farklı versiyon numarası farklı anahtar üretir', () => {
    const a = computeRenderCacheKey('scn1', 3, { position: [10, 12, 10] });
    const b = computeRenderCacheKey('scn1', 4, { position: [10, 12, 10] });
    expect(a).not.toBe(b);
  });

  it('kamera pozisyonu 0.5 birim hassasiyetle yuvarlanır — küçük OrbitControls sürüklemesi cache miss üretmez', () => {
    const a = computeRenderCacheKey('scn1', 3, { position: [10.05, 12.02, 10.1] });
    const b = computeRenderCacheKey('scn1', 3, { position: [10.2, 12.1, 10.3] });
    expect(a).toBe(b);
  });

  it('anlamlı derecede farklı kamera açısı farklı anahtar üretir', () => {
    const a = computeRenderCacheKey('scn1', 3, { position: [10, 12, 10] });
    const b = computeRenderCacheKey('scn1', 3, { position: [-10, 12, -10] });
    expect(a).not.toBe(b);
  });
});

function createMockDb(): RenderCacheDb & {
  findUniqueMock: jest.Mock;
  createMock: jest.Mock;
  aggregateMock: jest.Mock;
} {
  const findUniqueMock = jest.fn();
  const createMock = jest.fn();
  const aggregateMock = jest.fn();
  return {
    studioRenderCache: {
      findUnique: findUniqueMock,
      create: createMock,
      aggregate: aggregateMock,
    },
    findUniqueMock,
    createMock,
    aggregateMock,
  };
}

describe('getCachedRender', () => {
  it('kayıt varsa imageUrl döner', async () => {
    const db = createMockDb();
    db.findUniqueMock.mockResolvedValue({ imageUrl: 'https://cdn.example/x.png' });
    const result = await getCachedRender(db, 'user1', 'key1');
    expect(result).toBe('https://cdn.example/x.png');
    expect(db.findUniqueMock).toHaveBeenCalledWith({
      where: { userId_cacheKey: { userId: 'user1', cacheKey: 'key1' } },
    });
  });

  it('kayıt yoksa null döner', async () => {
    const db = createMockDb();
    db.findUniqueMock.mockResolvedValue(null);
    const result = await getCachedRender(db, 'user1', 'key1');
    expect(result).toBeNull();
  });
});

describe('saveCachedRender', () => {
  it('verilen alanlarla create çağırır', async () => {
    const db = createMockDb();
    db.createMock.mockResolvedValue({});
    await saveCachedRender(db, {
      userId: 'user1',
      cacheKey: 'key1',
      imageUrl: 'https://cdn.example/x.png',
      estCostUsd: 0.035,
    });
    expect(db.createMock).toHaveBeenCalledWith({
      data: { userId: 'user1', cacheKey: 'key1', imageUrl: 'https://cdn.example/x.png', estCostUsd: 0.035 },
    });
  });
});

describe('monthSpendUsd', () => {
  it('ay başlangıcından itibaren estCostUsd toplamını döner', async () => {
    const db = createMockDb();
    db.aggregateMock.mockResolvedValue({ _sum: { estCostUsd: 1.75 } });
    const spend = await monthSpendUsd(db, new Date('2026-09-15T12:00:00.000Z'));
    expect(spend).toBe(1.75);
    expect(db.aggregateMock).toHaveBeenCalledWith({
      _sum: { estCostUsd: true },
      where: { createdAt: { gte: new Date(Date.UTC(2026, 8, 1)) } },
    });
  });

  it('hiç kayıt yoksa 0 döner', async () => {
    const db = createMockDb();
    db.aggregateMock.mockResolvedValue({ _sum: { estCostUsd: null } });
    const spend = await monthSpendUsd(db, new Date());
    expect(spend).toBe(0);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/studio/render/renderCacheRepository.test.ts`
Expected: FAIL — `Cannot find module './renderCacheRepository'`

- [ ] **Step 3: Minimum implementasyonu yaz**

```typescript
// src/lib/studio/render/renderCacheRepository.ts
import { createHash } from 'crypto';
import { canonicalizeJson } from '@/lib/studio/snapshotVersioning';

export interface RenderCameraView {
  position: [number, number, number];
}

// 0.5 birim hassasiyet: OrbitControls sürüklemesinin ürettiği küçük kamera
// titremesi gereksiz cache miss/tekrar ücretli render üretmesin, ama gerçekten
// farklı bir açı (kullanıcının bilerek döndürdüğü) yeni anahtar üretsin.
function roundCoord(n: number): number {
  return Math.round(n * 2) / 2;
}

export function computeRenderCacheKey(
  scenarioId: string,
  versionNumber: number,
  camera: RenderCameraView
): string {
  const roundedPosition = camera.position.map(roundCoord) as [number, number, number];
  const canonical = canonicalizeJson({ scenarioId, versionNumber, cameraPosition: roundedPosition });
  return createHash('sha256').update(canonical).digest('hex');
}

export interface RenderCacheDb {
  studioRenderCache: {
    findUnique(args: unknown): Promise<{ imageUrl: string } | null>;
    create(args: unknown): Promise<unknown>;
    aggregate(args: unknown): Promise<{ _sum: { estCostUsd: number | null } }>;
  };
}

export async function getCachedRender(
  db: RenderCacheDb,
  userId: string,
  cacheKey: string
): Promise<string | null> {
  const row = await db.studioRenderCache.findUnique({
    where: { userId_cacheKey: { userId, cacheKey } },
  });
  return row?.imageUrl ?? null;
}

export async function saveCachedRender(
  db: RenderCacheDb,
  params: { userId: string; cacheKey: string; imageUrl: string; estCostUsd: number }
): Promise<void> {
  await db.studioRenderCache.create({ data: params });
}

export async function monthSpendUsd(db: RenderCacheDb, now: Date): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const result = await db.studioRenderCache.aggregate({
    _sum: { estCostUsd: true },
    where: { createdAt: { gte: monthStart } },
  });
  return result._sum.estCostUsd ?? 0;
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest src/lib/studio/render/renderCacheRepository.test.ts`
Expected: PASS (9 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/studio/render/renderCacheRepository.ts src/lib/studio/render/renderCacheRepository.test.ts
git commit -m "feat(studio): render cache anahtarı + repository (Task 2)"
```

---

### Task 3: Ortam değişkeni okuyucu

**Files:**
- Create: `src/lib/studio/render/env.ts`
- Test: `src/lib/studio/render/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `interface StudioRenderEnvConfig { falApiKey: string; modelId: string; monthlyBudgetUsd: number; estCostPerRenderUsd: number }`; `readStudioRenderEnv(env?: Record<string, string | undefined>): StudioRenderEnvConfig` (fırlatır: `'studio_render_unavailable'` — Task 6 route'u bunu `503`'e çevirir) — Task 4 ve Task 6 tüketir.

- [ ] **Step 1: Başarısız testi yaz**

```typescript
// src/lib/studio/render/env.test.ts
import { readStudioRenderEnv } from './env';

describe('readStudioRenderEnv', () => {
  it('STUDIO_RENDER_FAL_KEY yoksa fırlatır', () => {
    expect(() => readStudioRenderEnv({})).toThrow('studio_render_unavailable');
  });

  it('yalnızca zorunlu değişkenle çağrılırsa varsayılanları uygular', () => {
    const cfg = readStudioRenderEnv({ STUDIO_RENDER_FAL_KEY: 'key123' });
    expect(cfg).toEqual({
      falApiKey: 'key123',
      modelId: 'fal-ai/flux-general/depth',
      monthlyBudgetUsd: 50,
      estCostPerRenderUsd: 0.035,
    });
  });

  it('tüm değişkenler verilirse hepsini kullanır', () => {
    const cfg = readStudioRenderEnv({
      STUDIO_RENDER_FAL_KEY: 'key123',
      STUDIO_RENDER_MODEL_ID: 'fal-ai/custom-model',
      STUDIO_RENDER_MONTHLY_BUDGET_USD: '75',
      STUDIO_RENDER_EST_COST_USD: '0.05',
    });
    expect(cfg).toEqual({
      falApiKey: 'key123',
      modelId: 'fal-ai/custom-model',
      monthlyBudgetUsd: 75,
      estCostPerRenderUsd: 0.05,
    });
  });

  it('boş string sayısal env değişkenini SESSİZCE 0 yapıp bütçeyi kapatmaz — fallback\'e düşer', () => {
    const cfg = readStudioRenderEnv({
      STUDIO_RENDER_FAL_KEY: 'key123',
      STUDIO_RENDER_MONTHLY_BUDGET_USD: '',
    });
    expect(cfg.monthlyBudgetUsd).toBe(50);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/studio/render/env.test.ts`
Expected: FAIL — `Cannot find module './env'`

- [ ] **Step 3: Minimum implementasyonu yaz**

```typescript
// src/lib/studio/render/env.ts
export interface StudioRenderEnvConfig {
  falApiKey: string;
  modelId: string;
  monthlyBudgetUsd: number;
  estCostPerRenderUsd: number;
}

type EnvLike = Record<string, string | undefined>;

// Akif'teki numEnv ile AYNI desen (openaiClient.ts): boş string veya
// NaN'ı 0 olarak kabul ETME — aksi halde container UI'ları (Coolify vb.)
// set edilmemiş değişkeni '' verir ve monthlyBudgetUsd=0 özelliği
// sessizce her isteği 503'e düşürür.
function numEnv(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : fallback;
}

export function readStudioRenderEnv(env: EnvLike = process.env): StudioRenderEnvConfig {
  const falApiKey = env.STUDIO_RENDER_FAL_KEY;
  if (!falApiKey) throw new Error('studio_render_unavailable');
  return {
    falApiKey,
    modelId: env.STUDIO_RENDER_MODEL_ID || 'fal-ai/flux-general/depth',
    monthlyBudgetUsd: numEnv(env.STUDIO_RENDER_MONTHLY_BUDGET_USD, 50),
    estCostPerRenderUsd: numEnv(env.STUDIO_RENDER_EST_COST_USD, 0.035),
  };
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest src/lib/studio/render/env.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: `.env.example`'a belgele**

`.env.example` dosyasında `AKIF_EVAL_BUDGET_USD=2` satırından sonra ekle:

```
STUDIO_RENDER_FAL_KEY=              # zorunlu — fal.ai API anahtarı, boşsa fotogerçekçi render 503 döner
STUDIO_RENDER_MODEL_ID=fal-ai/flux-general/depth  # opsiyonel — img2img+ControlNet model slug'ı
STUDIO_RENDER_MONTHLY_BUDGET_USD=50 # opsiyonel — aylık render harcama tavanı (boş bırakılırsa 50)
STUDIO_RENDER_EST_COST_USD=0.035    # opsiyonel — render-başı tahmini maliyet, bütçe hesabında kullanılır
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/studio/render/env.ts src/lib/studio/render/env.test.ts .env.example
git commit -m "feat(studio): render ortam değişkeni okuyucu (Task 3)"
```

---

### Task 4: fal.ai img2img+ControlNet istemcisi

**Files:**
- Create: `src/lib/studio/render/falClient.ts`
- Test: `src/lib/studio/render/falClient.test.ts`

**Interfaces:**
- Produces: `interface FalRenderInput { colorImageDataUrl: string; depthImageDataUrl: string; prompt: string }`; `interface FalRenderDeps { apiKey: string; modelId: string; fetchImpl?: typeof fetch }`; `generatePhotorealisticRender(input: FalRenderInput, deps: FalRenderDeps): Promise<{ imageUrl: string }>`; `buildRenderPrompt(): string` — Task 6 tüketir.

- [ ] **Step 1: Başarısız testi yaz**

```typescript
// src/lib/studio/render/falClient.test.ts
import { generatePhotorealisticRender, buildRenderPrompt } from './falClient';

function mockFetchOnce(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('buildRenderPrompt', () => {
  it('boş olmayan bir prompt metni döner', () => {
    expect(buildRenderPrompt().length).toBeGreaterThan(10);
  });
});

describe('generatePhotorealisticRender', () => {
  const input = {
    colorImageDataUrl: 'data:image/png;base64,AAA',
    depthImageDataUrl: 'data:image/png;base64,BBB',
    prompt: 'test prompt',
  };

  it('başarılı yanıtta imageUrl döner ve doğru gövdeyi/başlığı gönderir', async () => {
    const fetchImpl = mockFetchOnce(200, { images: [{ url: 'https://cdn.fal.ai/x.png' }] });
    const result = await generatePhotorealisticRender(input, {
      apiKey: 'key123',
      modelId: 'fal-ai/flux-general/depth',
      fetchImpl,
    });
    expect(result).toEqual({ imageUrl: 'https://cdn.fal.ai/x.png' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fal.run/fal-ai/flux-general/depth',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Key key123' }),
      })
    );
    const [, options] = fetchImpl.mock.calls[0];
    const sentBody = JSON.parse(options.body);
    expect(sentBody).toEqual({
      image_url: input.colorImageDataUrl,
      control_image_url: input.depthImageDataUrl,
      prompt: input.prompt,
    });
  });

  it('sağlayıcı HTTP hatası döndürürse fırlatır', async () => {
    const fetchImpl = mockFetchOnce(500, {});
    await expect(
      generatePhotorealisticRender(input, { apiKey: 'key123', modelId: 'm', fetchImpl })
    ).rejects.toThrow('fal_request_failed:500');
  });

  it('yanıtta görsel yoksa fırlatır', async () => {
    const fetchImpl = mockFetchOnce(200, { images: [] });
    await expect(
      generatePhotorealisticRender(input, { apiKey: 'key123', modelId: 'm', fetchImpl })
    ).rejects.toThrow('fal_no_image_returned');
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/studio/render/falClient.test.ts`
Expected: FAIL — `Cannot find module './falClient'`

- [ ] **Step 3: Minimum implementasyonu yaz**

```typescript
// src/lib/studio/render/falClient.ts
export interface FalRenderInput {
  colorImageDataUrl: string;
  depthImageDataUrl: string;
  prompt: string;
}

export interface FalRenderDeps {
  apiKey: string;
  modelId: string;
  fetchImpl?: typeof fetch;
}

export interface FalRenderResult {
  imageUrl: string;
}

export async function generatePhotorealisticRender(
  input: FalRenderInput,
  deps: FalRenderDeps
): Promise<FalRenderResult> {
  const fetchFn = deps.fetchImpl ?? fetch;
  const res = await fetchFn(`https://fal.run/${deps.modelId}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${deps.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: input.colorImageDataUrl,
      control_image_url: input.depthImageDataUrl,
      prompt: input.prompt,
    }),
  });

  if (!res.ok) {
    throw new Error(`fal_request_failed:${res.status}`);
  }

  const data = (await res.json()) as { images?: { url?: string }[] };
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('fal_no_image_returned');
  }

  return { imageUrl };
}

// Kalite hedefi "prosedürelden bariz iyi" (spec §Product Decision, Soru 3) —
// dergi/V-Ray kalitesi hedeflenmiyor, bu yüzden prompt sade tutuluyor.
export function buildRenderPrompt(): string {
  return 'photorealistic architectural exterior render of this building on its lot, natural daylight, professional real estate photography style, high detail materials';
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest src/lib/studio/render/falClient.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/studio/render/falClient.ts src/lib/studio/render/falClient.test.ts
git commit -m "feat(studio): fal.ai img2img+ControlNet istemcisi (Task 4)"
```

---

### Task 5: API route — `POST .../render`

**Files:**
- Create: `src/app/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/render/route.ts`
- Test: `src/app/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/render/__tests__/route.test.ts`
- Modify: `src/lib/rate-limit.ts`

**Interfaces:**
- Consumes: `getStudioScenarioVersionDetail` (`@/lib/studio/studioScenarioRepository`, mevcut); `readStudioRenderEnv` (Task 3); `generatePhotorealisticRender`, `buildRenderPrompt` (Task 4); `computeRenderCacheKey`, `getCachedRender`, `saveCachedRender`, `monthSpendUsd`, `type RenderCacheDb` (Task 2); `checkMonthlyBudget` (`@/lib/ai/akif/costGuard`, mevcut, jenerik); `checkRateLimit`, `RATE_LIMITS` (`@/lib/rate-limit`)
- Produces: `POST` handler — 200 `{ imageUrl: string; cached: boolean }`; 400/403/404/429/502/503/500 hata gövdeleri `{ message: string }` — Task 8 (frontend) tüketir.

- [ ] **Step 1: Rate limit sabitini ekle**

`src/lib/rate-limit.ts`'de `AKIF_TURN` satırından sonra:

```typescript
    STUDIO_RENDER: { limit: 5, windowMs: 60_000 }, // kullanıcı başına 5/dk — pahalı üretim, cache çoğu tekrarı zaten önler
```

- [ ] **Step 2: Başarısız testi yaz**

```typescript
// src/app/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/render/__tests__/route.test.ts
const getServerSessionMock = jest.fn();
const getVersionDetailMock = jest.fn();
const userFindUniqueMock = jest.fn();
const readEnvMock = jest.fn();
const generateRenderMock = jest.fn();
const buildPromptMock = jest.fn(() => 'prompt');
const getCachedRenderMock = jest.fn();
const saveCachedRenderMock = jest.fn();
const monthSpendUsdMock = jest.fn();
const checkRateLimitMock = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) } },
}));
jest.mock('@/lib/studio/studioScenarioRepository', () => ({
  getStudioScenarioVersionDetail: (...args: unknown[]) => getVersionDetailMock(...args),
}));
jest.mock('@/lib/studio/render/env', () => ({
  readStudioRenderEnv: (...args: unknown[]) => readEnvMock(...args),
}));
jest.mock('@/lib/studio/render/falClient', () => ({
  generatePhotorealisticRender: (...args: unknown[]) => generateRenderMock(...args),
  buildRenderPrompt: (...args: unknown[]) => buildPromptMock(...args),
}));
jest.mock('@/lib/studio/render/renderCacheRepository', () => ({
  computeRenderCacheKey: jest.fn(() => 'cachekey123'),
  getCachedRender: (...args: unknown[]) => getCachedRenderMock(...args),
  saveCachedRender: (...args: unknown[]) => saveCachedRenderMock(...args),
  monthSpendUsd: (...args: unknown[]) => monthSpendUsdMock(...args),
}));
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  RATE_LIMITS: { STUDIO_RENDER: { limit: 5, windowMs: 60_000 } },
}));

import { POST } from '../route';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/studio/scenarios/s1/versions/1/render', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const validBody = {
  colorImageDataUrl: 'data:image/png;base64,AAA',
  depthImageDataUrl: 'data:image/png;base64,BBB',
  cameraPosition: [10, 12, 10],
};

const params = Promise.resolve({ scenarioId: 's1', versionNumber: '1' });

describe('POST .../render', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimitMock.mockReturnValue({ ok: true });
    getServerSessionMock.mockResolvedValue({ user: { id: 'user1' } });
    userFindUniqueMock.mockResolvedValue({ plan: 'PRO' });
    getVersionDetailMock.mockResolvedValue({ versionNumber: 1, schemaVersion: 1, snapshot: {} });
    readEnvMock.mockReturnValue({
      falApiKey: 'key',
      modelId: 'model',
      monthlyBudgetUsd: 50,
      estCostPerRenderUsd: 0.035,
    });
    getCachedRenderMock.mockResolvedValue(null);
    monthSpendUsdMock.mockResolvedValue(0);
    generateRenderMock.mockResolvedValue({ imageUrl: 'https://cdn.fal.ai/out.png' });
    saveCachedRenderMock.mockResolvedValue(undefined);
  });

  it('oturum yoksa 403 döner', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(403);
  });

  it('rate limit aşılırsa 429 döner', async () => {
    checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 30 });
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(429);
  });

  it('PRO olmayan kullanıcı için 403 döner', async () => {
    userFindUniqueMock.mockResolvedValue({ plan: 'FREE' });
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(403);
    expect(generateRenderMock).not.toHaveBeenCalled();
  });

  it('senaryo/versiyon bulunamazsa (sahip değil veya yok) 404 döner', async () => {
    getVersionDetailMock.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(404);
  });

  it('geçersiz gövdede 400 döner', async () => {
    const res = await POST(makeReq({ colorImageDataUrl: 'not-a-data-url' }), { params });
    expect(res.status).toBe(400);
  });

  it('cache hit ise sağlayıcı çağrılmadan cached:true ile döner', async () => {
    getCachedRenderMock.mockResolvedValue('https://cdn.fal.ai/cached.png');
    const res = await POST(makeReq(validBody), { params });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ imageUrl: 'https://cdn.fal.ai/cached.png', cached: true });
    expect(generateRenderMock).not.toHaveBeenCalled();
  });

  it('aylık bütçe aşıldıysa 503 döner, sağlayıcı çağrılmaz', async () => {
    monthSpendUsdMock.mockResolvedValue(999);
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(503);
    expect(generateRenderMock).not.toHaveBeenCalled();
  });

  it('sağlayıcı hatası verirse 502 döner, cache YAZILMAZ', async () => {
    generateRenderMock.mockRejectedValue(new Error('boom'));
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(502);
    expect(saveCachedRenderMock).not.toHaveBeenCalled();
  });

  it('başarılı üretimde 200 + cached:false döner ve cache\'e yazar', async () => {
    const res = await POST(makeReq(validBody), { params });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ imageUrl: 'https://cdn.fal.ai/out.png', cached: false });
    expect(saveCachedRenderMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'user1', cacheKey: 'cachekey123', imageUrl: 'https://cdn.fal.ai/out.png', estCostUsd: 0.035 })
    );
  });

  it('env okunamazsa (FAL_KEY yok) 503 döner', async () => {
    readEnvMock.mockImplementation(() => {
      throw new Error('studio_render_unavailable');
    });
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `npx jest --testPathPattern="versions.*render/__tests__/route.test.ts"`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 4: Route implementasyonunu yaz**

```typescript
// src/app/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/render/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStudioScenarioVersionDetail } from '@/lib/studio/studioScenarioRepository';
import { readStudioRenderEnv } from '@/lib/studio/render/env';
import { generatePhotorealisticRender, buildRenderPrompt } from '@/lib/studio/render/falClient';
import {
  computeRenderCacheKey,
  getCachedRender,
  saveCachedRender,
  monthSpendUsd,
  type RenderCacheDb,
} from '@/lib/studio/render/renderCacheRepository';
import { checkMonthlyBudget } from '@/lib/ai/akif/costGuard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

interface RawBody {
  colorImageDataUrl?: unknown;
  depthImageDataUrl?: unknown;
  cameraPosition?: unknown;
}

interface ValidBody {
  colorImageDataUrl: string;
  depthImageDataUrl: string;
  cameraPosition: [number, number, number];
}

function isValidBody(body: RawBody): body is ValidBody {
  return (
    typeof body.colorImageDataUrl === 'string' &&
    body.colorImageDataUrl.startsWith('data:image/') &&
    typeof body.depthImageDataUrl === 'string' &&
    body.depthImageDataUrl.startsWith('data:image/') &&
    Array.isArray(body.cameraPosition) &&
    body.cameraPosition.length === 3 &&
    body.cameraPosition.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ scenarioId: string; versionNumber: string }> }
) {
  try {
    const { scenarioId, versionNumber } = await params;
    const versionNum = Number(versionNumber);
    if (!Number.isInteger(versionNum) || versionNum <= 0) {
      return NextResponse.json({ message: 'Geçersiz versiyon numarası.' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 403 });
    }
    const userId = session.user.id as string;

    const rl = checkRateLimit(`studio-render:user:${userId}`, RATE_LIMITS.STUDIO_RENDER);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Çok fazla istek, lütfen biraz bekleyin.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (user?.plan !== 'PRO') {
      return NextResponse.json({ message: 'Bu özellik yalnızca premium kullanıcılara açık.' }, { status: 403 });
    }

    // Sahiplik doğrulaması — mevcut owner-only repository fonksiyonu
    // yeniden kullanılıyor (aynı desen: vitrin sayfası, share route).
    const versionRecord = await getStudioScenarioVersionDetail(scenarioId, versionNum, userId);
    if (!versionRecord) {
      return NextResponse.json({ message: 'Senaryo veya versiyon bulunamadı.' }, { status: 404 });
    }

    const rawBody = (await req.json().catch(() => null)) as RawBody | null;
    if (!rawBody || !isValidBody(rawBody)) {
      return NextResponse.json({ message: 'Geçersiz istek gövdesi.' }, { status: 400 });
    }

    let env;
    try {
      env = readStudioRenderEnv();
    } catch {
      return NextResponse.json({ message: 'Fotogerçekçi render şu an kullanılamıyor.' }, { status: 503 });
    }

    const db = prisma as unknown as RenderCacheDb;
    const cacheKey = computeRenderCacheKey(scenarioId, versionNum, { position: rawBody.cameraPosition });

    const cachedImageUrl = await getCachedRender(db, userId, cacheKey);
    if (cachedImageUrl) {
      return NextResponse.json({ imageUrl: cachedImageUrl, cached: true });
    }

    const mb = await checkMonthlyBudget({
      monthSpendUsd: (now) => monthSpendUsd(db, now),
      budgetUsd: env.monthlyBudgetUsd,
      now: () => new Date(),
    });
    if (!mb.ok) {
      return NextResponse.json(
        { message: 'Aylık render bütçesine ulaşıldı, lütfen daha sonra tekrar deneyin.' },
        { status: 503 }
      );
    }

    let result;
    try {
      result = await generatePhotorealisticRender(
        {
          colorImageDataUrl: rawBody.colorImageDataUrl,
          depthImageDataUrl: rawBody.depthImageDataUrl,
          prompt: buildRenderPrompt(),
        },
        { apiKey: env.falApiKey, modelId: env.modelId }
      );
    } catch (err) {
      console.error('[API studio render POST] sağlayıcı hatası', err);
      // Kullanım hakkı düşülmez, cache yazılmaz (spec §Hata Yönetimi).
      return NextResponse.json({ message: 'Render üretilemedi, lütfen tekrar deneyin.' }, { status: 502 });
    }

    await saveCachedRender(db, {
      userId,
      cacheKey,
      imageUrl: result.imageUrl,
      estCostUsd: env.estCostPerRenderUsd,
    });

    return NextResponse.json({ imageUrl: result.imageUrl, cached: false });
  } catch (err) {
    console.error('[API studio render POST]', err);
    return NextResponse.json({ message: 'Render işlenemedi.' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Testin geçtiğini doğrula**

Run: `npx jest --testPathPattern="versions.*render/__tests__/route.test.ts"`
Expected: PASS (11 test)

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts "src/app/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/render"
git commit -m "feat(studio): POST .../render API route (Task 5)"
```

---

### Task 6: R3F yakalama bileşeni (`StudioVitrinCapture`) + `StudioVitrinScene` kablolaması

**Files:**
- Create: `src/components/studio/StudioVitrinCapture.tsx`
- Modify: `src/components/studio/StudioVitrinScene.tsx`
- Modify: `src/components/studio/StudioVitrinScene.scope.test.ts`

**Interfaces:**
- Produces: `interface VitrinCaptureResult { colorImageDataUrl: string; depthImageDataUrl: string; cameraPosition: [number, number, number] }`; `interface VitrinCaptureHandle { captureFrame(): VitrinCaptureResult }`; `StudioVitrinCapture` (forwardRef, prop yok); `StudioVitrinScene` artık `forwardRef<VitrinCaptureHandle, StudioVitrinSceneProps>` — Task 7 (frontend UI) tüketir.

Bu görev Canvas/WebGL gerçek bir tarayıcı olmadan jsdom'da çalıştırılamadığı için, projenin var olan deseni (`StudioVitrinScene.scope.test.ts`) izlenir: kaynak dosya üzerinde regex ile kritik davranış noktaları denetlenir. Gerçek görsel doğrulama Task 9'daki Playwright/manuel adımda yapılır.

- [ ] **Step 1: `StudioVitrinCapture.tsx`'i oluştur**

```typescript
// src/components/studio/StudioVitrinCapture.tsx
'use client';

import * as THREE from 'three';
import { forwardRef, useImperativeHandle } from 'react';
import { useThree } from '@react-three/fiber';

export interface VitrinCaptureResult {
  colorImageDataUrl: string;
  depthImageDataUrl: string;
  cameraPosition: [number, number, number];
}

export interface VitrinCaptureHandle {
  captureFrame(): VitrinCaptureResult;
}

/**
 * Canvas prop almaz — Canvas içine <StudioVitrinCapture ref={...} /> olarak
 * eklenir, useThree() ile aktif gl/scene/camera'ya erişir.
 *
 * Derinlik haritası ControlNet'in en sadık koşullama sinyali (spec §Mimari):
 * ayrı bir 3D modelleme adımı GEREKMEZ — sahne zaten gerçek 3D olduğu için
 * MeshDepthMaterial override ile aynı sahneyi ikinci kez render edip
 * doğrudan derinlik görüntüsü üretiyoruz, sonra kullanıcının gördüğü renkli
 * kareyi geri çiziyoruz (sahne capture sonrası bozuk/siyah kalmasın).
 */
export const StudioVitrinCapture = forwardRef<VitrinCaptureHandle>(function StudioVitrinCapture(_props, ref) {
  const { gl, scene, camera } = useThree();

  useImperativeHandle(
    ref,
    () => ({
      captureFrame: () => {
        gl.render(scene, camera);
        const colorImageDataUrl = gl.domElement.toDataURL('image/png');

        const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
        const prevOverride = scene.overrideMaterial;
        scene.overrideMaterial = depthMaterial;
        gl.render(scene, camera);
        const depthImageDataUrl = gl.domElement.toDataURL('image/png');
        scene.overrideMaterial = prevOverride;
        gl.render(scene, camera);
        depthMaterial.dispose();

        return {
          colorImageDataUrl,
          depthImageDataUrl,
          cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
        };
      },
    }),
    [gl, scene, camera]
  );

  return null;
});
```

- [ ] **Step 2: `StudioVitrinScene.tsx`'i `forwardRef`'e çevir**

`import React, { useMemo, useState, useEffect, Suspense } from 'react';` satırını değiştir:

```typescript
import React, { useMemo, useState, useEffect, Suspense, forwardRef } from 'react';
```

`import { STUDIO_SCENE_COLORS } from './studioVisualTokens';` satırından sonra ekle:

```typescript
import { StudioVitrinCapture, type VitrinCaptureHandle } from './StudioVitrinCapture';
```

`export function StudioVitrinScene({ snapshot }: StudioVitrinSceneProps) {` satırını değiştir:

```typescript
export const StudioVitrinScene = forwardRef<VitrinCaptureHandle, StudioVitrinSceneProps>(
  function StudioVitrinScene({ snapshot }, ref) {
```

Fonksiyon gövdesinin sonundaki iki `return` noktasını (`if (!effectiveMass) { return null; }` HARİÇ — sahne yokken yakalanacak bir şey de yoktur) ve son `return (<Canvas ...)` bloğunu kapatan `);` ile fonksiyonun kapanışını güncelle: `<Canvas>` içine, `<OrbitControls .../>` bloğundan hemen sonra ekle:

```typescript
      {/* 5. Yakalama Köprüsü — Canvas dışına capture API sunar (Task 8 tüketir) */}
      <StudioVitrinCapture ref={ref} />
```

Dosyanın en sonundaki kapanışı `}` yerine `}\n);` yap (forwardRef'in fonksiyon argümanını ve `forwardRef(...)` çağrısını kapat).

- [ ] **Step 3: Scope testine yeni assertion'lar ekle**

`src/components/studio/StudioVitrinScene.scope.test.ts` dosyasındaki `it('StudioVitrinScene.tsx kaynak dosyasini denetler', ...)` bloğunun sonuna (mevcut 8 assertion grubundan sonra) ekle:

```typescript
    // 9. forwardRef ile capture handle disari sunulmali (Task 6/8 —
    // ust bilesenin StudioVitrinCapture.captureFrame'e erisebilmesi icin).
    expect(source).toMatch(/forwardRef\s*<\s*VitrinCaptureHandle/);
    expect(source).toMatch(
      /import\s*\{[^}]*StudioVitrinCapture[^}]*\}\s*from\s*'\.\/StudioVitrinCapture'/
    );
    expect(source).toMatch(/<StudioVitrinCapture\s+ref=\{ref\}\s*\/>/);
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest src/components/studio/StudioVitrinScene.scope.test.ts`
Expected: PASS (yeni assertion'lar dahil)

- [ ] **Step 5: `StudioVitrinPreview.tsx`'in mevcut kullanımının kırılmadığını doğrula**

Run: `npx jest src/components/studio/StudioVitrinPreview.test.tsx`
Expected: PASS (Task 6 henüz `StudioVitrinPreview`'e ref geçmiyor — `next/dynamic`, `forwardRef` export'unu ref'siz de normal component gibi render eder, mevcut testler etkilenmez)

- [ ] **Step 6: TypeScript derlemesini doğrula**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "StudioVitrinScene\|StudioVitrinCapture"`
Expected: (boş çıktı — hata yok)

- [ ] **Step 7: Commit**

```bash
git add src/components/studio/StudioVitrinCapture.tsx src/components/studio/StudioVitrinScene.tsx src/components/studio/StudioVitrinScene.scope.test.ts
git commit -m "feat(studio): R3F yakalama bileşeni + StudioVitrinScene forwardRef kablolaması (Task 6)"
```

---

### Task 7: Frontend buton + bekleme UX + sonuç + premium kapısı

**Files:**
- Modify: `src/components/studio/StudioVitrinPreview.tsx`
- Modify: `src/components/studio/StudioVitrinPreview.module.css`
- Modify: `src/components/studio/StudioVitrinPreview.test.tsx`
- Modify: `src/app/studio/scenarios/[scenarioId]/versions/[versionNumber]/vitrin/page.tsx`

**Interfaces:**
- Consumes: `VitrinCaptureHandle` (Task 6); `POST /api/studio/scenarios/[scenarioId]/versions/[versionNumber]/render` (Task 5)
- Produces: `StudioVitrinPreviewProps` genişler: `scenarioId?: string; versionNumber?: number; isPro?: boolean`

- [ ] **Step 1: `StudioVitrinPreview.test.tsx`'i güncelle — forwardRef mock + yeni testler**

Dosyanın en üstündeki mock bloğunu değiştir:

```tsx
/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioVitrinPreview } from './StudioVitrinPreview';
import type { StudioSnapshotDraft } from '@/lib/studio/types';
import type { VitrinCaptureHandle } from './StudioVitrinCapture';

let mockCaptureHandle: VitrinCaptureHandle | null = {
  captureFrame: () => ({
    colorImageDataUrl: 'data:image/png;base64,color',
    depthImageDataUrl: 'data:image/png;base64,depth',
    cameraPosition: [10, 10, 10],
  }),
};

const sceneMock = jest.fn((_props?: unknown) => <div data-testid="vitrin-scene" />);
jest.mock('./StudioVitrinScene', () => ({
  StudioVitrinScene: React.forwardRef((props: unknown, ref: React.Ref<VitrinCaptureHandle>) => {
    React.useImperativeHandle(ref, () => mockCaptureHandle as VitrinCaptureHandle, [mockCaptureHandle]);
    return sceneMock(props);
  }),
}));

const isWebGLAvailableMock = jest.fn(() => true);
jest.mock('./webglSupport', () => ({
  isWebGLAvailable: () => isWebGLAvailableMock(),
}));
```

Mevcut `snapshot` sabitinden sonra, dosyanın sonuna (mevcut `describe` bloğunu KAPATMADAN önce, en son testten sonra) yeni testler ekle:

```tsx
  it('isPro=false ise render butonu gösterilmez', async () => {
    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} scenarioId="s1" versionNumber={1} isPro={false} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');
    expect(screen.queryByRole('button', { name: /Fotogerçekçi/i })).not.toBeInTheDocument();
  });

  it('isPro=true, sahne hazır: buton tıklanınca fetch çağrılır ve sonuç görseli gösterilir', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://cdn.fal.ai/out.png', cached: false }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} scenarioId="s1" versionNumber={1} isPro={true} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');

    await user.click(screen.getByRole('button', { name: /Fotogerçekçi/i }));

    await waitFor(() => {
      expect(screen.getByAltText(/Fotogerçekçi bina görseli/i)).toHaveAttribute('src', 'https://cdn.fal.ai/out.png');
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/studio/scenarios/s1/versions/1/render',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sağlayıcı hata döndürürse hata mesajı gösterir', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Render üretilemedi, lütfen tekrar deneyin.' }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} scenarioId="s1" versionNumber={1} isPro={true} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');
    await user.click(screen.getByRole('button', { name: /Fotogerçekçi/i }));

    expect(await screen.findByText('Render üretilemedi, lütfen tekrar deneyin.')).toBeInTheDocument();
  });

  it('capture ref hazır değilse fetch ÇAĞRILMADAN hata gösterir', async () => {
    mockCaptureHandle = null;
    global.fetch = jest.fn();

    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} scenarioId="s1" versionNumber={1} isPro={true} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');
    await user.click(screen.getByRole('button', { name: /Fotogerçekçi/i }));

    expect(await screen.findByText(/sahne henüz hazır değil/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    mockCaptureHandle = {
      captureFrame: () => ({
        colorImageDataUrl: 'data:image/png;base64,color',
        depthImageDataUrl: 'data:image/png;base64,depth',
        cameraPosition: [10, 10, 10],
      }),
    };
  });
```

- [ ] **Step 2: Testlerin başarısız olduğunu doğrula**

Run: `npx jest src/components/studio/StudioVitrinPreview.test.tsx`
Expected: FAIL — `Fotogerçekçi` metniyle eşleşen buton bulunamıyor / `Cannot find module './StudioVitrinCapture'` (tip importu için de derleme hatası verebilir, henüz component güncellenmedi)

- [ ] **Step 3: `StudioVitrinPreview.tsx`'i güncelle**

Tüm dosyanın yeni hali:

```tsx
'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { isWebGLAvailable } from './webglSupport';
import { StudioSceneBoundary } from './StudioSceneBoundary';
import type { StudioSnapshotDraft } from '@/lib/studio/types';
import type { VitrinCaptureHandle } from './StudioVitrinCapture';
import styles from './StudioVitrinPreview.module.css';

const StudioVitrinScene = dynamic(
  () => import('./StudioVitrinScene').then((mod) => mod.StudioVitrinScene),
  {
    ssr: false,
    loading: () => <div className={styles.canvasLoading}>3D vitrin sahnesi yükleniyor…</div>,
  }
);

export interface StudioVitrinPreviewProps {
  snapshot: StudioSnapshotDraft | null;
  scenarioId?: string;
  versionNumber?: number;
  isPro?: boolean;
}

type RenderState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; imageUrl: string };

export function StudioVitrinPreview({ snapshot, scenarioId, versionNumber, isPro }: StudioVitrinPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [renderState, setRenderState] = useState<RenderState>({ status: 'idle' });
  const captureRef = useRef<VitrinCaptureHandle>(null);

  if (!snapshot || !snapshot.buildingMass) {
    return (
      <div className={styles.emptyBox}>
        <span>3D Vitrin için veri bekleniyor…</span>
      </div>
    );
  }

  const webglSupported = isWebGLAvailable();
  const canGenerateRender = Boolean(isPro && scenarioId && versionNumber);

  async function handleGenerateRender() {
    const handle = captureRef.current;
    if (!handle) {
      setRenderState({ status: 'error', message: 'Sahne henüz hazır değil, tekrar deneyin.' });
      return;
    }

    setRenderState({ status: 'loading' });
    try {
      const frame = handle.captureFrame();
      const res = await fetch(`/api/studio/scenarios/${scenarioId}/versions/${versionNumber}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colorImageDataUrl: frame.colorImageDataUrl,
          depthImageDataUrl: frame.depthImageDataUrl,
          cameraPosition: frame.cameraPosition,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setRenderState({ status: 'error', message: data?.message || 'Render üretilemedi.' });
        return;
      }

      const data = (await res.json()) as { imageUrl: string };
      setRenderState({ status: 'success', imageUrl: data.imageUrl });
    } catch {
      setRenderState({ status: 'error', message: 'Bağlantı hatası, tekrar deneyin.' });
    }
  }

  return (
    <div className={styles.container} data-testid="studio-vitrin-preview">
      {!isOpen ? (
        <div className={styles.previewClosed}>
          <h3 className={styles.closedTitle}>3D Vitrin & Çevre Görselleştirmesi</h3>
          <p className={styles.closedSubtitle}>
            Pencereli prosedürel kütle, site bağlamı ağaçları ve PBR asfalt yolu içeren zengin 3D vitrin görünümü.
          </p>
          <button
            type="button"
            className={styles.showButton}
            onClick={() => setIsOpen(true)}
            aria-label="3D Vitrini Göster"
          >
            🏢 3D Vitrini Göster
          </button>
        </div>
      ) : !webglSupported ? (
        <div className={styles.fallbackBox}>
          <h4 className={styles.fallbackTitle}>3D Sahne Desteklenmiyor</h4>
          <p className={styles.fallbackText}>
            Tarayıcınızda veya cihazınızda WebGL donanım hızlandırması desteklenmiyor. Aşağıdaki metin özet ve 2D plan görünümünden devam edebilirsiniz.
          </p>
        </div>
      ) : (
        <div className={styles.sceneWrapper}>
          <div className={styles.topBar}>
            <span className={styles.badge}>✨ 3D Vitrin Önizleme</span>
            <button
              type="button"
              className={styles.hideButton}
              onClick={() => setIsOpen(false)}
              aria-label="3D Vitrini Gizle"
            >
              Kapat
            </button>
          </div>

          <StudioSceneBoundary fallback={<div className={styles.canvasLoading}>3D vitrin sahnesi yüklenemedi.</div>}>
            <StudioVitrinScene ref={captureRef} snapshot={snapshot} />
          </StudioSceneBoundary>
        </div>
      )}

      {isOpen && canGenerateRender && (
        <div className={styles.renderPanel}>
          <button
            type="button"
            className={styles.renderButton}
            onClick={handleGenerateRender}
            disabled={renderState.status === 'loading'}
          >
            {renderState.status === 'loading' ? 'Fotogerçekçi görsel hazırlanıyor…' : '✨ Fotogerçekçi Görsel'}
          </button>
          {renderState.status === 'error' && <p className={styles.renderError}>{renderState.message}</p>}
          {renderState.status === 'success' && (
            <div className={styles.renderResult}>
              <img
                src={renderState.imageUrl}
                alt="Fotogerçekçi bina görseli"
                className={styles.renderImage}
              />
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <p className={styles.disclaimer}>
          * Bu görsel bir ön fizibilite prototipidir; bağlayıcı bir mimari çizim, resmi imar onayı veya taahhüt değildir.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: CSS ekle**

`StudioVitrinPreview.module.css` dosyasının sonuna:

```css
.renderPanel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.renderButton {
  background: #7c3aed;
  color: #ffffff;
  border: none;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.renderButton:hover:not(:disabled) {
  background: #6d28d9;
}

.renderButton:disabled {
  opacity: 0.7;
  cursor: wait;
}

.renderError {
  font-size: 13px;
  color: #b91c1c;
  margin: 0;
  text-align: center;
}

.renderResult {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.renderImage {
  width: 100%;
  height: auto;
  display: block;
}
```

- [ ] **Step 5: Testlerin geçtiğini doğrula**

Run: `npx jest src/components/studio/StudioVitrinPreview.test.tsx`
Expected: PASS (9 test — 5 eski + 4 yeni)

- [ ] **Step 6: `page.tsx`'te `isPro`'yu bağla**

`src/app/studio/scenarios/[scenarioId]/versions/[versionNumber]/vitrin/page.tsx` dosyasında `import Link from 'next/link';` satırından sonra ekle:

```typescript
import { prisma } from '@/lib/prisma';
```

`const versionRecord = await getStudioScenarioVersionDetail(scenarioId, versionNum, userId);` satırından sonra ekle:

```typescript
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
```

`<StudioVitrinPreview snapshot={versionRecord.snapshot} />` satırını değiştir:

```typescript
          <StudioVitrinPreview
            snapshot={versionRecord.snapshot}
            scenarioId={scenarioId}
            versionNumber={versionNum}
            isPro={user?.plan === 'PRO'}
          />
```

- [ ] **Step 7: TypeScript derlemesini doğrula**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "StudioVitrinPreview\|vitrin/page"`
Expected: (boş çıktı)

- [ ] **Step 8: Commit**

```bash
git add src/components/studio/StudioVitrinPreview.tsx src/components/studio/StudioVitrinPreview.module.css src/components/studio/StudioVitrinPreview.test.tsx "src/app/studio/scenarios/[scenarioId]/versions/[versionNumber]/vitrin/page.tsx"
git commit -m "feat(studio): fotogerçekçi render butonu + bekleme/sonuç UX + premium kapısı (Task 7)"
```

---

### Task 8: Showcase — ana sayfa hook box'ı

**Files:**
- Create: `src/components/home/StudioRenderHookBox.tsx`
- Create: `src/components/home/StudioRenderHookBox.module.css`
- Create: `src/components/home/StudioRenderHookBox.test.tsx`
- Modify: `src/app/page.tsx`
- Create (gerçek görsel, manuel): `public/studio-assets/showcase/demo-01.jpg`

Bu bileşen `/api/studio/.../render`'ı TETİKLEMEZ — statik, herkese açık bir pazarlama parçasıdır (spec §Bileşenler, "Showcase"). Amaç: ücretsiz ziyaretçiye wow-etkisini göstermek, gerçek üretimi premium'a yönlendirmek.

- [ ] **Step 1: Başarısız testi yaz**

```tsx
// src/components/home/StudioRenderHookBox.test.tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StudioRenderHookBox } from './StudioRenderHookBox'

it('başlık + demo görsel + /hesapla linki render eder', () => {
  render(<StudioRenderHookBox />)
  expect(screen.getByText(/fotoğraf gibi gör/i)).toBeInTheDocument()
  expect(screen.getByAltText(/fotogerçekçi bina görseli örneği/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Studio'yu Dene/i })).toHaveAttribute('href', '/hesapla')
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/components/home/StudioRenderHookBox.test.tsx`
Expected: FAIL — `Cannot find module './StudioRenderHookBox'`

- [ ] **Step 3: Bileşeni yaz**

```tsx
// src/components/home/StudioRenderHookBox.tsx
import Link from 'next/link'
import Image from 'next/image'
import styles from './StudioRenderHookBox.module.css'

const DEMO_IMAGE_SRC = '/studio-assets/showcase/demo-01.jpg'

export function StudioRenderHookBox() {
  return (
    <section className={styles.box}>
      <div className={styles.imageWrap}>
        <Image
          src={DEMO_IMAGE_SRC}
          alt="ArsaBil Studio ile üretilmiş fotogerçekçi bina görseli örneği"
          width={640}
          height={400}
          className={styles.image}
        />
      </div>
      <h2 className={styles.title}>Arsanın üzerindeki binayı fotoğraf gibi gör</h2>
      <p className={styles.desc}>
        Kütleni Studio&apos;da oluştur, Premium ile o binanın arsandaki fotogerçekçi görselini saniyeler içinde üret.
      </p>
      <Link href="/hesapla" className={styles.link}>
        Studio&apos;yu Dene →
      </Link>
    </section>
  )
}
```

- [ ] **Step 4: CSS'i yaz**

```css
/* src/components/home/StudioRenderHookBox.module.css */
.box { max-width: 720px; margin: 24px auto; padding: 20px; background: #f5f5f7; border-radius: 16px; text-align: center; }
.imageWrap { border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
.image { width: 100%; height: auto; display: block; }
.title { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
.desc { font-size: 14px; color: #6e6e73; margin-bottom: 14px; }
.link { display: inline-block; background: #7c3aed; color: #fff; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; }
```

- [ ] **Step 5: Testin geçtiğini doğrula**

Run: `npx jest src/components/home/StudioRenderHookBox.test.tsx`
Expected: PASS

- [ ] **Step 6: Ana sayfaya yerleştir**

`src/app/page.tsx` dosyasında `import { AkifHookBox } from '@/components/home/AkifHookBox';` satırından sonra ekle:

```typescript
import { StudioRenderHookBox } from '@/components/home/StudioRenderHookBox';
```

`<AkifHookBox />` satırından (yaklaşık 652. satır) hemen sonra ekle:

```tsx
      <StudioRenderHookBox />
```

- [ ] **Step 7: Gerçek demo görselini üret (manuel, kod değil)**

Task 5'teki API route çalışır durumda ve gerçek bir `STUDIO_RENDER_FAL_KEY` mevcut olduğunda: mevcut dev-only `/studio/scenarios/[scenarioId]/versions/[versionNumber]/vitrin` sayfasında dolu bir senaryo üzerinde "Fotogerçekçi Görsel" butonuna basıp üretilen görseli indir, `public/studio-assets/showcase/demo-01.jpg` olarak kaydet. Bu adım gerçek bir API anahtarı gerektirdiği için otomatik test kapsamı DIŞINDADIR — Task 9'daki tam doğrulama sırasında tamamlanır.

- [ ] **Step 8: Commit**

```bash
git add src/components/home/StudioRenderHookBox.tsx src/components/home/StudioRenderHookBox.module.css src/components/home/StudioRenderHookBox.test.tsx src/app/page.tsx
git commit -m "feat(home): Studio fotogerçekçi render showcase hook box (Task 8)"
```

(Not: `public/studio-assets/showcase/demo-01.jpg` dosyası Step 7 tamamlanınca ayrı bir commit'te eklenir — görsel üretimi bu görevin kod kısmını bloklamaz.)

---

### Task 9: Tam doğrulama — build + gerçek tarayıcı akışı

**Files:** (yok — yalnızca doğrulama)

- [ ] **Step 1: Tam test paketini çalıştır (Task 1-8 + regresyon)**

Run: `npx jest`
Expected: PASS — hem yeni SP1 testleri hem de mevcut hiçbir testin kırılmadığı doğrulanır (Vitrin spec'in belirttiği gibi, `StudioVitrinScene`/`StudioVitrinPreview` değişiklikleri geriye dönük uyumlu olmalı)

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: `npx prisma@5.22.0 generate` + `next build` hatasız tamamlanır — `StudioRenderCache` client tipleri, yeni API route, yeni bileşenler build'e dahil olur (Turbopack'in `composes`/statik-import kısıtlarını yakalaması için gerçek build şart — bkz. proje geçmişi, dev sunucusu/jest tek başına yetersiz).

- [ ] **Step 3: Gerçek tarayıcıda uçtan uca akış (STUDIO_RENDER_FAL_KEY set edilmiş bir ortamda)**

`npm run dev` ile başlat, sahibi olunan bir senaryonun `/vitrin` sayfasına PRO planlı bir kullanıcıyla giriş yap:
- WebGL sahnesi normal açılıyor mu (regresyon yok)?
- PRO olmayan kullanıcıda "Fotogerçekçi Görsel" butonu HİÇ görünmüyor mu?
- PRO kullanıcıda butona basınca bekleme durumu görünüyor, ~5-15sn içinde gerçek bir görsel dönüyor mu?
- Aynı kamera açısıyla ikinci kez basınca (cache hit) görsel ANINDA dönüyor mu (ağ sekmesinde sağlayıcıya yeni istek gitmediğini doğrula)?
- Sağlayıcı anahtarını geçici olarak bozup (yanlış `STUDIO_RENDER_FAL_KEY`) hata mesajının kullanıcıya düzgün gösterildiğini doğrula.
- Ana sayfada showcase hook box'ının (Task 8) demo görseliyle birlikte göründüğünü doğrula.

Expected: hepsi beklendiği gibi çalışır; bulunan sapmalar bu adımda düzeltilir (ayrı commit).

- [ ] **Step 4: Commit (yalnızca Step 3'te düzeltme yapıldıysa)**

```bash
git add -A
git commit -m "fix(studio): SP1 uçtan uca doğrulamada bulunan düzeltmeler (Task 9)"
```
