# Alt-proje: Akif — Kalıcı Hafıza · Arsa Dosyası (Akif-3) tasarımı

**Tarih:** 2026-09-15
**Branch:** `codex/professional-ui-and-land-cost` (HEAD `7aa9a06` — Akif-2-Aksiyon sonrası)
**Üst bağlam:** `docs/arsabil-ai-akif-product-vision-v1.1.md`, `docs/superpowers/specs/2026-09-10-akif-2-aksiyon-design.md` (Akif dekompozisyon tablosu). [[project_arsabil]], [[project_arsabil_edermi_rakip]] (Akif = "alt-proje 4").

## 0. Akif dekompozisyonu — güncel

| Alt-proje | Kapsam | Durum |
|---|---|---|
| Akif-1 | Metin MVP | **BİTTİ** |
| Akif-2 | Sesli Danışman (salt-okunur) | **BİTTİ** |
| Akif-2.1 | Hardening (session-registry + reconnect) | **BİTTİ** |
| Akif-2-Aksiyon | Sesle senaryo kaydet | **KOD TAMAM**, insan duman testi + deploy bekliyor |
| **Akif-3 (bu spec)** | **Kalıcı hafıza + Arsa Dosyası.** Akif'in bir proje hakkında öğrendiği bilgiyi turlar arası hatırlaması. | YAZILIYOR |
| Akif-4 | Avatar + gerçek özel/lisanslı ses | ertelendi |
| Akif-5 | 5a/5b entegrasyonu (WhatsApp) | sonra |

## 1. Amaç, kapsam, onaylanan kararlar

**Amaç:** Bugün her `/akif` konuşması stateless'tir — kullanıcı bir arsa/proje hakkında konuştuğu bilgileri (bütçe üst sınırı, deprem riskine hassasiyet, hedef daire büyüklüğü, vb.) her yeni sohbette baştan anlatmak zorunda kalır. Akif-3, bu bilgiyi kullanıcının seçtiği bir `Project` kaydına bağlı, kısa bir özet ("Arsa Dosyası") olarak saklar ve sonraki turlarda otomatik hatırlar.

### Onaylanan kararlar (2026-09-15 brainstorming)

- **Veri modeli: ayrı tablo DEĞİL, `Project`e ek alan.** `akifMemory: String?`. Yeni bir `AkifNote`/context modeli açılmadı — proje zaten tekil sahiplik (`userId`) + yaşam döngüsüne (silinince kaskad) sahip, ek bir ilişki karmaşıklığı gerekmiyor.
- **İçerik türü: özetlenmiş öğrenilmiş-gerçekler, ham konuşma geçmişi DEĞİL.** `AkifTurnLog` zaten sayaç amaçlı var ve ham metin tutmuyor (bilinçli tasarım) — Akif-3 bunu bozmaz, ayrı bir küçük özet metni ekler.
- **Proje bağlama: kullanıcı seçer.** `/akif` sayfasında oturum açıkken bir proje seçici (mevcut `GET /api/projects` listesiyle dolar). Akif konuşmadan proje çıkarımı YAPMAZ (yanlış eşleştirme riski + LLM yükü nedeniyle reddedildi).
- **Güncelleme mekanizması: mevcut tur çağrısına eklenen alan, ayrı LLM çağrısı YOK.** `AkifTurn` sözleşmesine `memory_updates: string | null` eklenir; model zaten her turda yapılandırılmış JSON üretiyor, ek maliyet/gecikme yok.
- **Özet biçimi: tek serbest metin alanı, model REPLACE eder (append değil).** Model her turda mevcut dosyayı da görür, `memory_updates` alanına dosyanın GÜNCEL TAM halini yazar veya değişiklik yoksa `null` bırakır. Model kendi konsolide eder/kısaltır; sunucu yalnızca bir güvenlik-ağı karakter tavanı uygular (2000 karakter).
- **Kullanıcı kontrolü: görüntüle + temizle.** Dashboard → Projelerim'de proje kartında salt-okunur "Akif'in Hatırladıkları" bölümü + "Temizle" butonu. Serbest düzenleme YOK (model formatı ile kullanıcı düzenlemesi çakışabilir — v1 kapsamı dışı).
- **Projesiz sohbet: desteklenmeye devam eder.** Proje seçilmezse (veya oturum yoksa) Akif bugünkü gibi tamamen stateless çalışır — geriye dönük uyumlu, mevcut anonim akış hiç değişmez.

### Kapsam DIŞI (Akif-3 v1)

- Ham konuşma geçmişinin saklanması / geri çağrılması
- Serbest metin düzenleme (yalnız görüntüle + temizle)
- Akif'in konuşmadan proje çıkarımı yapması (otomatik eşleştirme)
- Sesli modda (Akif-2/2-Aksiyon) Arsa Dosyası entegrasyonu — bu spec yalnız metin turunu (`/api/akif/turn`) kapsar; ses tarafına genişletme ayrı bir takip konusu
- Birden fazla projeye aynı anda bağlı ortak/paylaşılan hafıza

## 2. Mimari — genel bakış

```
TARAYICI (/akif metin sohbeti)
  Kullanıcı proje seçer (opsiyonel) → projectId state'te tutulur
        │
        ▼  POST /api/akif/turn  { conversationId, history, userMessage, projectId? }
  route.ts
    projectId varsa: session + sahiplik doğrula (yoksa projectId sessizce yok say)
    geçerliyse: project.akifMemory oku
        │
        ▼
  runAkifTurn(..., { projectMemory })
    assembleSystemPrompt({ ..., projectMemory })  → mevcut dosya + memoryPolicy prompt katmanı
    OpenAI çağrı 1 (araç) → OpenAI çağrı 2 (yapılandırılmış JSON, memory_updates dahil)
        │
        ▼
  turn.memory_updates != null && projectId geçerliyse
    → prisma.project.update({ akifMemory: cap(memory_updates, 2000) })
        │
        ▼
  Response: AkifTurn (memory_updates istemciye de döner, ama UI ayrıca göstermez —
            "Akif'in Hatırladıkları" görünümü Dashboard/Projelerim'den, DB'nin
            kendisinden okunur, turn yanıtından değil)
```

## 3. Veri modeli

```prisma
model Project {
  id          String     @id @default(cuid())
  name        String
  description String?
  userId      String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  akifMemory  String?    // Arsa Dosyası — Akif'in bu proje hakkında öğrendiği özet (≤2000 karakter)
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  scenarios   Scenario[]
}
```

Yeni migration (`prisma migrate dev` ile üretilir), mevcut satırlarda `NULL` — davranış değişmez, geriye dönük uyumlu. Prod'a `prisma migrate deploy` Akif'in birikmiş migration kuyruğuna katılır (ayrı deploy yok, bkz. §6).

## 4. Sözleşme + prompt değişiklikleri

### 4.1 `contract.ts`

`AkifTurn` arayüzüne opsiyonel alan:

```ts
export interface AkifTurn {
  // ...mevcut alanlar
  memory_updates?: string  // Arsa Dosyası'na yazılacak GÜNCEL TAM özet; yoksa alan hiç yok
}
```

`AKIF_TURN_JSON_SCHEMA`'ya `needs_confirmation` ile aynı desende eklenir:

```ts
required: [ /* ...mevcut 8 alan... */, 'memory_updates' ],
properties: {
  // ...
  memory_updates: { type: ['string', 'null'] },
}
```

`parseAkifTurn`: `r.memory_updates` `string` ise `turn.memory_updates = r.memory_updates` atanır (boş string `''` de teknik olarak geçerli string — sunucu tarafında "boş/whitespace-only ise null muamelesi yap" kuralı DB yazma adımında uygulanır, parse aşamasında reddedilmez). `null`/eksik → alan hiç set edilmez.

### 4.2 Yeni prompt katmanı — `memoryPolicy.ts`

`assembleSystemPrompt`'un `PromptContext`'ine eklenir:

```ts
export interface PromptContext {
  hasHistory: boolean
  projectMemory?: string | null   // yeni
}
```

Proje aktifse (`projectMemory !== undefined`, yani projectId geçerliydi — `null` da olsa "proje aktif ama dosya boş" anlamına gelir) iki şey eklenir:

1. Sabit bir politika katmanı (LAYERS'a eklenir): *"Aşağıda bir Arsa Dosyası aktifse, kullanıcı hakkında (bütçe, tercih, risk toleransı, arsa/parsel detayı gibi) yeni ve somut bir bilgi öğrendiğinde `memory_updates` alanına dosyanın GÜNCEL TAM halini (kısa, madde/paragraf, ~150 kelimeyi geçmesin) yaz. Değişiklik yoksa `memory_updates`'i `null` bırak. Arsa Dosyası aktif değilse `memory_updates` HER ZAMAN `null`."*
2. Dinamik blok (mevcut dosya içeriği varsa): `Bu proje hakkında bildiklerin:\n${projectMemory}` — `SEPARATOR` ile diğer katmanlardan ayrılmış, prompt'un sonuna (dialect/humor'dan sonra, FIRST_MESSAGE_NOTE'tan önce) eklenir.

Proje aktif değilse (`projectMemory === undefined`) ne politika katmanı ne dinamik blok eklenir — bugünkü prompt birebir korunur (mevcut testler bozulmaz).

### 4.3 Orchestrator

`RunAkifTurnInput`'a `projectMemory?: string | null` eklenir, doğrudan `assembleSystemPrompt`'a geçirilir. Orchestrator DB'ye dokunmaz (mevcut DI-saf desen korunur) — okuma/yazma tamamen route.ts'te.

## 5. API + yetkilendirme

`POST /api/akif/turn` gövde doğrulamasına opsiyonel alan:

```ts
const { conversationId, history, userMessage, projectId } = body as {
  ...
  projectId?: unknown
}
// projectId: typeof === 'string' && length>0, yoksa undefined say (hata değil)
```

**Sahiplik akışı (yeni adım 3.5, env guard'dan önce, budget guard'dan sonra sorun değil — session sorgusu env okumadan bağımsız):**

```ts
let projectMemory: string | undefined
let validatedProjectId: string | undefined
if (typeof projectId === 'string' && projectId.length > 0) {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
      select: { akifMemory: true },
    })
    if (project) {
      validatedProjectId = projectId
      projectMemory = project.akifMemory ?? null
    }
  }
  // session yok veya proje bulunamadı → projectId sessizce yok sayılır,
  // istek 403 İLE REDDEDİLMEZ (mevcut anonim akışla tutarlı davranış).
}
```

Tur dönünce:

```ts
if (validatedProjectId && turn.memory_updates != null) {
  const trimmed = turn.memory_updates.trim()
  await prisma.project.update({
    where: { id: validatedProjectId },
    data: { akifMemory: trimmed.length > 0 ? trimmed.slice(0, 2000) : null },
  })
}
```

Boş/whitespace-only `memory_updates` → dosya temizlenmiş sayılır (`null` yazılır) — modelin "artık alakasız, sil" niyetini ifade etmesinin doğal yolu.

### 5.1 Yeni route — `PATCH /api/projects/[id]`

```ts
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return 403
  const body = await req.json()
  if (body?.action !== 'clear_memory') return 400
  const result = await prisma.project.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { akifMemory: null },
  })
  if (result.count === 0) return 404
  return { ok: true }
}
```

`updateMany` + `where: {id, userId}` deseni — tek sorguda hem varlık hem sahiplik kontrolü (projede başka yerlerde de kullanılan TOCTOU-güvenli desen, bkz. Akif-2-Aksiyon `commitPendingAction`).

## 6. Frontend

- **`/akif` sayfası:** `useSession` `authenticated` ise, sohbetin üstünde küçük bir proje seçici (`<select>` veya basit dropdown) — `GET /api/projects` ile doldurulur (`id`+`name`), varsayılan "Proje seçilmedi". Seçilen `projectId` component state'inde tutulur, her `POST /api/akif/turn` çağrısına eklenir. Seçim değişse bile `conversationId`/geçmiş SIFIRLANMAZ — yalnız sonraki turdan itibaren yeni projenin dosyası kullanılır.
- **Dashboard → Projelerim (`src/app/dashboard/projects/page.tsx`):** her proje kartına, `_count`/`scenarios` gösteriminin yanına, `akifMemory` varsa salt-okunur bir blok ("🎙 Akif'in Hatırladıkları" başlığı + metin) + "Temizle" butonu (`PATCH .../[id]` çağırır, başarılıysa local state'ten `akifMemory: null` yapar — tam liste yeniden çekilmeden). `akifMemory` yoksa blok hiç render edilmez (boş durum mesajı gerekmiyor, kart zaten sade).

## 7. Test / kenar durumları

- **`contract.test.ts`:** `memory_updates` string/`null`/eksik üç girdi de kabul edilir; JSON şemasında `memory_updates` `required` listesinde ve `type:['string','null']`.
- **`assemble.test.ts`:** `projectMemory` verilmezse çıktı BUGÜNKÜYLE BİREBİR AYNI (regresyon kilidi — mevcut testler zaten bunu örtük doğruluyor, `undefined` default davranışı net test edilir). `projectMemory: 'X'` verilince çıktıda politika katmanı + `X` metni var. `projectMemory: null` (dosya aktif ama boş) verilince politika katmanı var ama dinamik blok yok/boş gösteriliyor.
- **`orchestrator.test.ts`:** `projectMemory` geçirilmeden çağrılan MEVCUT testler değişmeden geçmeli. Yeni test: `projectMemory` geçirilince `assembleSystemPrompt`'a doğru iletiliyor (mock/spy).
- **`route.test.ts` (`/api/akif/turn`):** (a) `projectId` yok → davranış bugünküyle aynı; (b) `projectId` var + session yok → sessizce yok sayılır, 200 döner, DB'ye proje sorgusu/güncellemesi yapılmaz; (c) `projectId` var + başka kullanıcının projesi → aynı; (d) `projectId` geçerli + `memory_updates: null` → `prisma.project.update` HİÇ ÇAĞRILMAZ (mock assert); (e) `projectId` geçerli + `memory_updates: "X".repeat(3000)` → DB'ye 2000 karaktere kırpılmış yazılır; (f) `memory_updates: '   '` (whitespace) → `akifMemory: null` yazılır.
- **`PATCH /api/projects/[id]` testi:** sahiplik doğrulanır (başkasının projesi → 404), `action` eksik/yanlış → 400, başarı → `akifMemory: null`.
- **Migration:** dev DB'de `prisma migrate dev` ile üretilip commit edilir; prod'a `prisma migrate deploy` deploy gate listesine eklenir.

## 8. Deploy kapısı (Akif toplu deploy listesine eklenir)

- Yeni migration `..._add_project_akif_memory` prod'a `prisma migrate deploy` (bağımsız tek-kolon ekleme, sıra fark etmez, veri kaybı riski yok — mevcut satırlar `NULL`).
- Yeni env YOK.
- İnsan dumanı: gerçek bir projede birkaç tur konuşup (`OPENAI_API_KEY` ile) `akifMemory`'nin gerçekten dolduğunu + bir sonraki oturumda Akif'in bunu hatırladığını + "Temizle" butonunun çalıştığını doğrulamak (Playwright bunu simüle edemez — gerçek model çıktısına bağlı, insan kontrolü şart, `docs/akif/akif-2-insan-duman-kontrol-listesi.md`'ye Akif-3 için 3 madde eklenmeli).
