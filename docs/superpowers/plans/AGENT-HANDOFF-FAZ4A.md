# Agent Handoff — Arsabil Studio Faz 4A

Bu dosya, Faz 3B'yi başarıyla tamamlayan modelin (Codex/Gemini, bu
konuşmanın belleği yok) **sıradaki** işi içindir: Faz 4A — Kalıcı Senaryo
ve Versiyonlama.

**ÖNCE `AGENT-HANDOFF-FAZ3B.md`yi oku** (aynı klasörde). Orada anlatılan 8
ders (bağımsız yazılmış plan çakışmaları, TDD disiplini, gerçek `npm run
build` zorunluluğu, Playwright ile görsel doğrulama, masaüstü+mobil
kablolama deseni, asla commit atma vb.) burada TEKRAR EDİLMİYOR ama
TAMAMEN GEÇERLİ. Bu dosya yalnızca Faz 4A'ya ÖZGÜ, ek bilgiyi içerir.

## Neredeyiz

- Faz 3B **TAMAMLANDI** ve doğrulandı (835/835 gerçek test yeşil, `tsc`
  temiz, `npm run build` temiz) — `EXECUTION-QUEUE.md`ye bak.
- **Plan:** `2026-08-19-arsabil-studio-faz4a-kalici-senaryo-ve-versiyonlama.md`
  — bu dosya ZATEN yazılmış (2026-08-19 tarihli, plan arşivinin bir
  parçası), yeniden yazmana gerek yok. Task 1'den başla.
- **Implementasyon durumu: %0.** Plan'ın "Add" dediği hiçbir dosya henüz
  yok (`persistenceTypes.ts`, `snapshotVersioning.ts`,
  `studioScenarioRepository.ts`, `StudioSaveDialog.tsx`,
  `StudioScenarioLibrary.tsx`, `api/studio/scenarios/*` route'ları —
  hiçbiri yok). `prisma/schema.prisma` bu fazda hiç değişmedi.

## Bu Fazın Faz 3B'den Farkı — Neden Daha Dikkatli Olunmalı

Faz 3B tamamen `src/lib/studio/*` + tarayıcı içi state'ti (sessionStorage
vb.) — sunucuya hiç dokunmadı. **Faz 4A ilk kez veritabanına yazıyor.**
Bu iki ek risk katmanı getiriyor:

### 1. Mevcut `Scenario`/`Project` modelleriyle KARIŞTIRMA

`prisma/schema.prisma`da ZATEN bir `Scenario` modeli var (satır ~227) —
ama bu, ana hesap makinesinin "senaryo karşılaştırma" özelliğine ait
(`ScenarioCompare.tsx`, `/api/projects/[id]/scenarios/route.ts`),
**Studio'nun senaryo taslağıyla (Faz 3B'nin `scenarioDraft.ts`) hiçbir
ilgisi yok.** Faz 4A planı yeni bir `StudioScenario`/`StudioScenarioVersion`
modeli öneriyor (Task 1) — isim çakışması YOK, ama iki farklı "senaryo"
kavramını birbirine karıştırmamak için dikkatli ol. Mevcut `Scenario`
modelini DEĞİŞTİRME.

### 2. Auth/owner-guard deseni ZATEN VAR — icat etme

`src/app/api/projects/[id]/scenarios/route.ts` bu projedeki auth-guard'lı
API route'ların referans deseni:

```ts
const session = await getServerSession(authOptions); // '@/lib/auth'
if (!session?.user?.id) return NextResponse.json({...}, { status: 403 });
const project = await prisma.project.findFirst({ where: { id, userId } });
if (!project) return NextResponse.json({...}, { status: 404 }); // owner değilse 404, 403 DEĞİL (ID varlığını sızdırma)
```

`src/lib/prisma.ts`, `src/lib/auth.ts`, `src/lib/plan.ts` (plan/limit
kontrolü için `checkPlanLimit`) zaten var — Faz 4A'nın Task 3'ü ("mevcut
auth/owner guard kalıbını kullan") tam olarak bunu kastediyor. Yeni bir
auth mekanizması kurma.

### 3. Migration'lar geri alınamaz — dikkatli ilerle

`prisma/schema.prisma`ya yeni model eklemek migration gerektirir. Bu
ortamda migration çalıştırmadan önce:
- Mevcut migration akışını (`prisma/migrations/` klasörü varsa) incele.
- `DATABASE_URL` env değişkeninin gerçek bir DB'ye mi yoksa yerel/test
  DB'sine mi işaret ettiğini kontrol et.
- Migration'ı **kullanıcıya sormadan production'a karşı ÇALIŞTIRMA** —
  bu, "asla commit atma" kuralının veritabanı karşılığı: geri alınamaz,
  paylaşılan bir etki. Şüpheliysen dur, sor.

### 4. Kaba "Faz 4" ile çakışma riski (bkz. NEXT-DISPATCH.md)

`2026-08-16-arsabil-studio-faz4-rapor-paylasim.md` (kaba, harfsiz) da
`snapshot.ts`i modify ediyor ve `StudioScenarioSummary.tsx` istiyor —
Faz 3B'nin varlığından habersiz yazılmış olabilir. Faz 4A'yı esas al,
kaba Faz 4'ü YOK SAY (execution-sequence.md'nin Faz 4A "Depends on"
satırı zaten kaba Faz 4'ü anmıyor).

## Faz 4A'nın 6 Task'ı (özet — detay için plan dosyasının kendisini oku)

1. **Kalıcı model kararı** — `StudioScenario`/`StudioScenarioVersion`
   Prisma modeli, `persistenceTypes.ts`.
2. **Snapshot canonicalization** — deterministik JSON hash,
   `schemaVersion` upcaster, aynı hash'te gereksiz versiyon oluşturmama.
3. **Repository + API** — CRUD + versiyon oluşturma, owner guard, 409
   conflict (stale write koruması), zod/şema doğrulama.
4. **Kayıt/yeniden-açma UI** — `StudioSaveDialog`, `StudioScenarioLibrary`,
   eski versiyon açıldığında "düzenle" değil "bu versiyondan yeni taslak
   oluştur" akışı.
5. **Audit** — oluşturma/versiyonlama/arşivleme olaylarının minimal kaydı,
   kişisel veri/ham not KOPYALANMAZ.
6. **Verification** — migration/generate, jest, tsc, iki-kullanıcı +
   stale-kayıt + yeniden-açma senaryolarının smoke testi.

## Bittiğinde

`AGENT-HANDOFF-FAZ3B.md`nin "Bittiğinde Ne Yapmalı" bölümündeki 5 adımı
AYNEN uygula (checkbox'ları işaretle, plan dosyasının sonuna "TAMAMLANDI"
bölümü ekle, `EXECUTION-QUEUE.md`/`NEXT-DISPATCH.md`yi Faz 4B'ye göre
güncelle, kullanıcıya commit sorması gerektiğini unutma).
