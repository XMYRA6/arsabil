# Arsabil Studio - Faz 1A Gercek Parsel Geometrisi ve Emsal Contracti

> **For agentic workers:** Faz 0 contractlari ve Faz 1 ilk render sonrasi uygulanir. Adimlar takip icin checkbox kullanir.

**Goal:** Demo polygon fallback'ini gecici tutarak Studio'ya kaynak etiketli parsel geometrisi ve insaat alani contracti eklemek. Hedef, “gorsel kutle” ile “dogrulanmis parsel” arasindaki farki kullanicidan saklamamaktir.

**Architecture:** Veri normalizasyonu `src/lib/studio/*` altinda saf fonksiyonlardadir. Sayfa ve 3D sahne yalnizca normal hale getirilmis contract'i goruntuler. TKGM ile gercek API/portal entegrasyonu bir adapter sinirinin arkasinda kalir; bu plan yetkisiz veri cekmez.

**Spec:** `docs/superpowers/specs/2026-08-19-arsabil-studio-parsel-geometrisi-ve-emsal-contract-design.md`

## Global Constraints

- Demo polygon resmi veya dogrulanmis veri olarak kaydedilmez.
- Renderer, emsal ya da insaat alani hesaplamasi yapmaz.
- Harici parsel kaynagi kullanilacaksa veri lisansi, kullanici yetkisi ve hata davranisi ayri karar olarak onaylanir.
- Geometri eksikligi, teklif/program hesaplarini bloklamaz.

### Task 1: Kaynak etiketli parsel modeli

**Files:**
- Modify: `src/lib/studio/types.ts`
- Add: `src/lib/studio/parcelGeometry.ts`
- Add: `src/lib/studio/parcelGeometry.test.ts`

- [x] `ParcelGeometrySource`, `ParcelGeometryStatus` ve `ConstructionAreaSource` tiplerini ekle.
- [x] Polygon kapatma, minimum nokta sayisi, alan hesaplama ve kendi kendini kesme kontrollerini saf fonksiyonlarda uygula.
- [x] Polygon/bildirilen alan farki icin esik-tabanli uyari uret; kaydi engelleme.
- [x] Gecersiz koordinat, sifir alan ve demo kaynak durumlarini kapsayan birim testleri yaz.

### Task 2: Hesap motoru adapterini acik hale getir

**Files:**
- Modify: `src/lib/studio/calculatorAdapter.ts`
- Modify: `src/lib/studio/calculatorAdapter.test.ts`
- Modify: `src/lib/studio/massing.ts`
- Modify: `src/lib/studio/massing.test.ts`

- [x] `grossConstructionAreaM2` degerini `estimated` veya `authoritative` kaynak etiketiyle don.
- [x] Mevcut `Sd * Ad` turevini yalnizca tahmini fallback kabul et.
- [x] Otoriter insaat alani verildiginde fallback'i asan ve ayni kutle sonucunu deterministik veren testi ekle.
- [x] Eksik alan veya geometri durumunda mevcut uyari mesajlarini kaynak bilgisiyle genislet.

### Task 3: Parsel girisi adapter siniri

**Files:**
- Add: `src/lib/studio/parcelInputAdapter.ts`
- Add: `src/lib/studio/parcelInputAdapter.test.ts`
- Possibly add: `src/app/api/studio/parcel/route.ts` (yalnizca bir yetkili kaynak karar verilirse)

- [x] Kullanici cizimi, JSON/GeoJSON importu ve dogrulanmis harici yaniti tek `ParcelGeometrySource` formatina cevir.
- [x] Harici kaynak yoksa “baglanmamis kaynak” sonucunu basarisiz istek yerine kontrollu durum olarak don.
- [x] Kimlik alanlarini geometri kullanilamasa bile saklanabilir taslak metadata olarak ele al.
- [x] Adapter sinirinda giris semasi ve hata durumlari icin test yaz.

### Task 4: Hesapla/Studio kaynak gorunurlugu

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/components/studio/StudioPreview.tsx`
- Modify: `src/components/studio/StudioPreview.module.css`
- Add/update: ilgili component testleri

- [x] “Dogrulanmis parsel”, “taslak geometri” ve “geometri eksik” durumlarinin her biri icin ayri ama sakin bir bilgi alani tasarla.
- [x] 3D Canvas sadece gecerli polygon varken acilsin; sayisal program/teklif ozetleri geometri olmadan gorunebilsin.
- [x] Insaat alani tahminse gorunur bir varsayim etiketi ve duzeltme yonlendirmesi koy.
- [x] Ekran okuyucu icin kaynak, alan ve uyari bilgisini metin ozetine ekle.

### Task 5: Snapshot ve rapor guvenligi

**Files:**
- Modify: `src/lib/studio/snapshot.ts`
- Modify: `src/lib/studio/snapshot.test.ts`

- [x] Kaynak etiketi, parsel kimligi, polygon ve insaat alani kaynagini snapshot'a ekle.
- [x] Demo/fallback geometri ile olusan snapshot'a `nonVerifiedVisual` uyarisi ekle.
- [x] JSON roundtrip ve eski snapshot geriye uyumluluk testleri yaz.

### Task 6: Verification

- [x] `npx jest src/lib/studio src/components/studio` calistir.
- [x] `npx tsc --noEmit` calistir.
- [x] `/hesapla` icin masaustu ve mobilde uc kaynak durumunu tarayici smoke testi ile kontrol et.
- [x] Paylasim veya kayit varsa demo geometri etiketinin kaybolmadigini kontrol et.

## Exit Criteria

- Gecerli parsel polygonu 3D kutleyi demo fallback olmadan besler.
- Kullanici geometri ve insaat alani kaynagini ayirt eder.
- Tahmini insaat alani, otoriter veri gibi gosterilmez.
- TKGM icin teknik adapter hazirdir; resmi entegrasyon izni olmadan otomasyon yapilmaz.

## Validation Notes

- `ParcelGeometrySourceKind`, `ParcelGeometryStatus`, `ParcelGeometrySource` and expanded `StudioPolygon` metadata added.
- `parcelGeometry` now validates polygon closure, minimum points, finite coordinates, positive area, self-intersection and reported-area mismatch warnings.
- `parcelInputAdapter` added for user-drawn, imported GeoJSON, verified parcel and controlled unavailable states. No external scraping/API automation was added.
- `calculatorAdapter` authoritative construction-area override covered by tests; `Sd * Ad` remains `estimated_apartment_area` fallback.
- `massing` now carries source-aware geometry warnings and treats demo geometry as nonblocking but explicit.
- `StudioPreview` shows explicit geometry badges for verified, draft, demo and missing states; construction-area estimate note is visible and screen-reader reachable through the source summary.
- `StudioSnapshotDraft` now stores parcel geometry source, parcel identity and construction-area source; demo snapshots add `NON_VERIFIED_VISUAL`.
- `npx jest src/lib/studio src/components/studio --no-coverage --roots "<rootDir>/src"` PASS: 8 suites / 34 tests.
- `npx tsc --noEmit` PASS.
- `npm run build` PASS. Existing Next workspace-root and middleware/proxy warnings remain.
- `npx jest --no-coverage --roots "<rootDir>/src"` PASS: 175 suites / 1376 tests.
- `node output/playwright/studio-faz1a-smoke.cjs` PASS. Desktop `/hesapla` demo scenario: Canvas present, `canvasUniqueColors=126`, `Demo geometri` badge and estimated construction-area note visible, no horizontal overflow. Mobile `/hesapla`: no horizontal overflow. Verified/draft statuses are covered at component level because a live verified parcel browser fixture is not available in this worktree.
