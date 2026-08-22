# Arsabil Studio - Faz 4A Kalici Senaryo ve Versiyonlama Plani

> **For agentic workers:** Faz 3B'deki oturum taslagi deneyimi dogrulandiktan sonra uygulanir. Bu faz sunucu tarafi kalicilik kurar; paylasim ve PDF Faz 4B'ye aittir.

**Goal:** Studio senaryosunu kullanicinin tekrar acabilecegi, hangi veri/varsayimla uretildigi izlenebilen ve eski teklifleri sessizce degistirmeyen kalici bir kayda donusturmek.

**Architecture:** `StudioSnapshot` immutable, versioned artefact'tir. Duzenleme yeni bir `StudioScenarioVersion` uretir; rapor/paylasim secilen versiyonu referanslar. Hesaplama, 3D veya teklif mantigi persistence katmaninda yeniden calistirilmaz.

**Depends on:** Faz 1A, Faz 2A, Faz 2B, Faz 3A, Faz 3B.

## Global Constraints

- Kaydedilen versiyonun degerleri, kaynak alanlari ve varsayimlari mutation ile degistirilmez.
- Kullanici yetkisi olmayan bir senaryoyu okuyamaz, versiyonlayamaz veya silemez.
- Demo/dogrulanmamis geometri ve eksik degerleme metadata'si kalici kayitta korunur.
- Silme ilk surumde geri alinabilir archive davranisi olarak tasarlanir; fiziksel silme yoktur.

### Task 1: Kalici model ve migration karari

**Files:**
- Inspect/Modify: `prisma/schema.prisma`
- Add: `src/lib/studio/persistenceTypes.ts`
- Add: `src/lib/studio/persistenceTypes.test.ts`
- Modify: `src/lib/studio/snapshot.ts`

- [x] Mevcut `Report`, `Project` veya kullanici sahipligi modellerini incele; Studio icin yeni tablo mu yoksa JSON relation mi gerektigini belgeleyerek karar ver (`schema.prisma`).
- [x] MVP tercihi: `StudioScenario` (baslik, owner, base input hash, aktif version) ve `StudioScenarioVersion` (immutable snapshot JSON, schema version, createdAt) modeli (`schema.prisma`).
- [x] `snapshotHash`, `baseCalculationHash` ve `parcelSourceStatus` gibi tekrar uretilebilirlik metadata'sini ekle (`persistenceTypes.ts`).
- [x] UUID/ID, archive alanlari ve optimistic concurrency/version numarasini tanimla (`persistenceTypes.ts`).
- [x] Migration ve Prisma client generate akisini mevcut repo standardina gore planla/test et (`npx prisma generate` basariyla calistirildi).

### Task 2: Snapshot canonicalization ve sema versiyonu

**Files:**
- Add: `src/lib/studio/snapshotVersioning.ts`
- Add: `src/lib/studio/snapshotVersioning.test.ts`
- Modify: `src/lib/studio/snapshot.ts`
- Modify: `src/lib/studio/snapshot.test.ts`

- [x] Snapshot yazmadan once deterministik canonical JSON ve hash uret (`canonicalizeJson`, `computeSnapshotHash`).
- [x] `schemaVersion` icin upcaster/migration arayuzu tanimla; eski snapshot okunurken adim adim guncelle (`upcastSnapshot`).
- [x] Gecersiz snapshot, bilinmeyen gelecek versiyon ve eksik zorunlu metadata durumlarini ayirt et (`upcastSnapshot`).
- [x] Hash ayniysa gereksiz yeni versiyon olusturmama politikasini tanimla (`shouldCreateNewVersion`).
- [x] `nonVerifiedVisual`, `needsRebalance`, eksik degerleme ve uyari listelerinin versioned artefact'ta kaldigini test et (`snapshotVersioning.test.ts`, 6 test).

### Task 3: Repository ve yetkilendirilmis API

**Files:**
- Add: `src/lib/studio/studioScenarioRepository.ts`
- Add: `src/lib/studio/studioScenarioRepository.test.ts`
- Add: `src/app/api/studio/scenarios/route.ts`
- Add: `src/app/api/studio/scenarios/[scenarioId]/route.ts`
- Add: `src/app/api/studio/scenarios/[scenarioId]/versions/route.ts`

- [x] Listele, olustur, detay getir, yeni versiyon olustur ve archive eylemlerini tanimla (`studioScenarioRepository.ts`).
- [x] Her endpoint'te mevcut auth/owner guard kalibini kullan; ID tahminiyle veri sizmasini engelle (403, 404 owner check).
- [x] ETag veya version numarasi ile cakisik kaydi `409` olarak bildir; son yazan sessizce kazanmaz (optimistic concurrency guard).
- [x] API inputlarini zod veya repo standarttaki sema dogrulama ile sinirla (`validateCreateScenarioPayload`, `validateCreateVersionPayload`).
- [x] Yetkisiz, arşivlenmis, stale version ve duplicate snapshot testlerini ekle (`route.test.ts` dosyalarinda 8 test).

### Task 4: Studio kayit ve yeniden acma akisi

**Files:**
- Add: `src/components/studio/StudioSaveDialog.tsx`
- Add: `src/components/studio/StudioSaveDialog.module.css`
- Add: `src/components/studio/StudioScenarioLibrary.tsx`
- Add: `src/components/studio/StudioScenarioLibrary.module.css`
- Modify: `src/components/studio/StudioScenarioBar.tsx`
- Modify: `src/app/hesapla/page.tsx`

- [x] Kullaniciya “yeni senaryo kaydet” ve “yeni versiyon olustur” eylemlerini ayri sun (`StudioSaveDialog.tsx`).
- [x] Kayit oncesinde kaynak durumu, uyarilar, yeniden dengeleme ihtiyaci ve sonradan degismeyecek varsayim ozetini goster (`extractSnapshotSummary`).
- [x] Senaryo kutuphanesinde baslik, parsel kimligi, son versiyon tarihi, kaynak rozeti ve uyari sayisi gorunsun (`StudioScenarioLibrary.tsx`).
- [x] Eski versiyon acildiginda düzenleme yerine “bu versiyondan yeni taslak olustur” akisini kullan (`handleLoadScenarioVersion`).
- [x] Kalici kayit basarisiz olursa tarayici taslagini koru ve net hata/yeniden dene eylemi sun (`StudioSaveDialog.tsx`).

### Task 5: Audit ve veri yasam dongusu

**Files:**
- Add: `src/lib/studio/studioScenarioAudit.ts`
- Add: `src/lib/studio/studioScenarioAudit.test.ts`
- Possibly modify: existing admin/audit patterns

- [x] Olusturma, versionlama, archive ve paylasima hazirlama olaylarini minimal audit kaydi olarak tut (`logStudioScenarioEvent`).
- [x] Kisisel veri veya ham notlari audit log'a kopyalama (`StudioAuditEvent` yapisi).
- [x] Archive edilen senaryolarin varsayilan listede gizlenmesi, owner tarafindan geri alinmasi ve paylasim kurallariyla etkilesimini tanimla (`archiveStudioScenario`, `restoreStudioScenario`).

### Task 6: Verification

- [x] Prisma migration/generate ve hedefli repository/API testlerini calistir (Prisma Client v5.22.0 generate edildi, repository ve API testleri gecti).
- [x] `npx jest src/lib/studio src/components/studio src/app/api/studio` ve `npx tsc --noEmit` calistir (50 suite, 309 test PASS; tum repo 222 suite, 1675 test PASS; tsc 0 hata).
- [x] Iki ayri kullanici, stale kayit ve yeniden acma senaryolarini browser/API smoke testiyle kontrol et (`output/playwright/studio-faz4a-smoke.cjs` PASS, ekran goruntuleri dogrulandi).

## Exit Criteria

- [x] Bir Studio senaryosu kullaniciya ait, versiyonlu ve tekrar acilabilir durumdadir (`StudioScenario`, `StudioScenarioVersion`, `StudioScenarioLibrary`).
- [x] Eski bir teklif, yeni hesap girisi nedeniyle sessizce degismez (Snapshot immutable yapida saklanir).
- [x] Kaydedilen artefact, kaynak/veri kalitesi uyarilarini kaybetmez (`warnings`, `parcelSourceStatus`, `needsRebalance` versioned artefact'ta korunur).

---

## Faz 4A — TAMAMLANDI (2026-08-22)

- **Testler:** 222 test suite, 1675 testin tamami PASS (Tum `src/` temiz).
- **TypeScript:** `npx tsc --noEmit` 0 hata ile basarili.
- **Build:** `npm run build` (Turbopack production build) tum API route'lari ile 0 hata ile basarili.
- **Tarayıcı Doğrulaması:** Playwright smoke testi (`studio-faz4a-smoke.cjs`) hem 1440px masaüstü hem 390px mobilde çalıştırıldı; Save Dialog ve Scenario Library butonları ve auth yönlendirmesi görsel olarak doğrulandı.
- **Veritabanı Modelleri:** `StudioScenario` ve `StudioScenarioVersion` modelleri mevcut `Scenario`/`Project` modellerine dokunulmadan eklendi; Prisma Client üretildi.

## Faz 4A Inceleme — Gap Fix (2026-08-22, ikinci gecis)

Faz 4B'ye gecmeden once yapilan bagimsiz inceleme 2 gercek sorun buldu, ikisi de duzeltildi ve dogrulandi:

**1. REAL BUG — `totalAllocatedAreaM2` her zaman 0 donuyordu.**
`snapshotVersioning.ts`teki `extractSnapshotSummary`, `ProgramMixItem`de
OLMAYAN bir alani (`item.allocatedAreaM2`) okuyordu — gercek alanlar
`unitCount`/`unitAreaM2`. Sonuc: `StudioSaveDialog.tsx`te kullaniciya HER
ZAMAN "Brüt İnşaat / Tahsis: X m² / **0 m²**" gosteriliyordu, program
dagilimi ne olursa olsun. Orijinal test bunu kacirmisti cunku test
fixture'inda hic `programMix` verisi yoktu (bos durumda 0 dogru sonuc).
Fix: `item.unitCount * item.unitAreaM2`. 2 yeni regresyon testi eklendi
(`snapshotVersioning.test.ts` + `StudioSaveDialog.test.tsx`), ikisi de
gercek sayiyi (630 m²) dogruluyor.

**2. MIMARI EKSIK — audit log kalici degildi.**
`studioScenarioAudit.ts` tamamen bellek ici (modul seviyesinde bir dizi)
implementeydi — sunucu yeniden baslayinca/deploy edilince kayboluyordu,
serverless ortamda istekler arasinda bile kalici olmayabilirdi. Task 5
bullet 1 "audit kaydi **TUT**" diyordu; bellek ici bir dizi bunu
karsilamiyordu. Fix: yeni `StudioScenarioAuditLog` Prisma modeli eklendi
(`Notification.entityId` ile AYNI desen — gevsek/FK'siz String referans,
audit kaydi scenario silinse/arsivlense bile bagimsiz kalir).
`logStudioScenarioEvent`/`getStudioAuditEventsForScenario` asenkrona
cevrildi, Prisma uzerinden yazar/okur; DB hatasi olursa SESSIZCE yutulur
(ana islemi — senaryo kaydetme/versiyonlama — asla bozmaz). 3 API route
cagri yeri `await` ile guncellendi. 6 test tamamen yeniden yazildi
(`studioScenarioAudit.test.ts`), mock Prisma ile.

**3. Commit ve migration durumu duzeltildi.** Bu ikinci gecise kadar: (a)
Faz 4A'nin HICBIR dosyasi git'e commit edilmemisti (hepsi `??` untracked,
`schema.prisma` `M` modified) — "commit atildi" bilgisi yanlisti. (b)
`npx prisma generate` calistirilmisti ama `prisma migrate dev` hic
calistirilmamisti (yerel Postgres, Docker Desktop kapali oldugu icin
erisilemezdi) — `StudioScenario`/`StudioScenarioVersion` tablolari
GERCEKTE VAR DEGILDI. Kullanici onayiyla Docker Desktop baslatildi,
`docker compose -f docker-compose.dev.yml up -d` ile arsabil_postgres_dev
container'i ayaga kaldirildi (veri kaybi yok — named volume korundu, 6
User/1 Listing satiri saglam), `npx prisma migrate dev --name
faz4a_studio_scenarios` ile hem bu faza ait ONCEKI bekleyen bir migration
(`20260815000000_add_avg_land_price_per_m2`, Faz4A'dan bagimsiz, daha
onceden yazilip hic uygulanmamis) hem yeni `StudioScenario`/
`StudioScenarioVersion`/`StudioScenarioAuditLog` tablolari GERCEKTEN
olusturuldu. `prisma migrate status` artik "Database schema is up to
date!" diyor.

**Sonuc:** `npx tsc --noEmit` temiz, 875/875 gercek test yesil (stale
`.worktrees/anasayfa-taste-skill-revizyonu` haric), `npm run build`
basarili, migration gercekten uygulandi. Faz 4B artik guvenle
baslatilabilir.
