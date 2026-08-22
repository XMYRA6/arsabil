# Arsabil Studio - Faz 3A Kontrollu 2D Yerlesim Tahtasi Plani

> **For agentic workers:** Faz 1A, Faz 2A ve Faz 2B sonrasinda uygulanir. 2D tahta, program/teklif motorunun yerine gecmez; ayni snapshot verisini goruntuler ve kontrollu gunceller.

**Goal:** Dogrulanmis veya taslak parsel uzerinde bina oturumunu, zemin ticaret cephesini ve konut programini kullanicinin mimar olmadan anlayip ayarlayabilecegi 2D proposal board'a donusturmek.

**Architecture:** SVG-first. `StudioLayoutDraft` serializable state'tir; geometri ve kapasite kontrolleri `src/lib/studio` altinda saf fonksiyonlarda kalir. Konva/Fabric ancak SVG kontrol modeli yetersiz kaldigini gosteren kullanici kaniti olursa degerlendirilir.

**Depends on:** Faz 1A parsel contracti, Faz 2A program envanteri.

## Global Constraints

- Resmi parsel siniri degistirilmez; sadece onerilen footprint overlay'i duzenlenir.
- Serbest cizim, duvar, oda, mobilya veya CAD komutu yoktur.
- Kontrol degisikligi, program kapasitesini ve teklif envanterini gecersiz kilarsa uyarir; sessizce veri degistirmez.
- 2D gorunum WebGL gerektirmez.

### Task 1: Layout draft ve sinirli degisiklik modeli

**Files:**
- Add: `src/lib/studio/layoutDraft.ts`
- Add: `src/lib/studio/layoutDraft.test.ts`
- Modify: `src/lib/studio/types.ts`

- [x] `StudioLayoutDraft`, `FootprintDraft`, `SetbackAssumption` ve `CommercialFrontageDraft` tiplerini olustur. (`types.ts`.)
- [x] Footprint'i serbest nokta listesi yerine merkez, donus, olcek ve opsiyonel inset parametreleriyle temsil et. (`FootprintDraft: {centerX, centerY, rotationDeg, scale, insetM?}`.)
- [x] Faz 2A `ProgramBand` kimliklerini layout katmanlarina referansla bagla. (`programBandIds: string[]` — kopyalamaz, yalnizca ID referansi; bilinmeyen referans `LAYOUT_REFERENCES_UNKNOWN_PROGRAM_BAND` ile yakalanir.)
- [x] Gecerli parsel, geometri yok, cok kucuk footprint ve parsel disina tasma durumlari icin test yaz. (`validateLayoutDraft` — 9 test, `layoutDraft.test.ts`. NOT: konum/donus bazli TAM poligon-icinde-kalma kontrolu kasitli olarak Task 2'ye birakildi — bu fonksiyon geometri motorundan BAGIMSIZ, olcek/alan-butcesi/referans butunlugu duzeyinde kaba bir kapidir.)

### Task 2: Saf 2D geometri katmani

**Files:**
- Add: `src/lib/studio/geometry2d.ts`
- Add: `src/lib/studio/geometry2d.test.ts`

- [x] Polygon bounds, centroid, viewBox fit, alan ve basit containment yardimcilarini uygula. (`computePolygonBounds`, `computeCentroid`, `computeViewBox`, `isPointInPolygon`/`isPolygonWithin`; alan icin mevcut `calculatePolygonAreaM2` — parcelGeometry.ts'ten YENIDEN KULLANILDI, kopyalanmadi.)
- [x] Olcek/donus parametrelerinden footprint polygonu deterministik uret. (`deriveFootprintPolygon` — merkeze gore olcekle→dondur→merkez ofseti→opsiyonel inset.)
- [x] Parsel icinde kalmayan veya alan butcesini asan footprint icin siniflandirilmis uyarilar don. (`classifyFootprintAgainstParcel` — AYRI kodlar: `LAYOUT_FOOTPRINT_OUTSIDE_PARCEL` (konum) vs `LAYOUT_FOOTPRINT_EXCEEDS_AREA_BUDGET` (alan), tek koda karistirilmadi.)
- [x] Koordinat birimini, kaynak etiketini ve geometri toleransini test verisinde acik tut. (Test dosyasi basinda metre birimi + `toBeCloseTo` toleransi aciklandi.) (18 test, `geometry2d.test.ts`.)

**REAL BUG (Task 3/6 Playwright ile yakalandi, birim testleri kacirmisti):**
`isPointInPolygon`in standart ray-casting'i, test edilen nokta TAM BIR KOSE
oldugunda dejenere oluyordu (`a.y > point.y !== b.y > point.y` o kosenin
kendisiyle karsilastirilinca her zaman `false`). Sonuc: kimlik taslak
(`scale=1`) ile `deriveFootprintPolygon` taban poligonun (duzensiz demo
parseli) KENDI koselerini birebir uretiyor, ama bu koseler kendi parseline
karsi test edilince "disarida" cikiyordu — DEGISTIRILMEMIS varsayilan
durumda bile sahte "Footprint parsel sınırının dışına taşıyor." uyarisi
goruluyordu (canli tarayicida). Birim testleri bunu KACIRMISTI cunku
`isPolygonWithin`in tum test senaryolarinda inner/outer AYRI (farkli)
poligonlerdi — bir poligonun kendi koselerini kendine karsi test eden
senaryo hic yoktu. Fix: `isPointOnPolygonBoundary` (kenara `1e-6`m
toleransla yakinlik kontrolu) eklendi, sinirdaki/sinira yakin noktalar
ONCE kontrol edilip ICERIDE sayiliyor — hem matematiksel olarak dogru
(kapali poligonun siniri kendisi de "icinde" sayilir) hem kose-
dejenerasyonunu kokten cozuyor. 2 regresyon testi eklendi (`geometry2d.test.ts`,
toplam 20 test); `output/playwright/studio-2d-layout-smoke.cjs` ile
duzeltme sonrasi varsayilan durumda uyari GORUNMEDIGI, 180% kapsamada ise
DOGRU sekilde goruldugu dogrulandi (`studio-2d-layout-default.png` vs
`studio-2d-layout-outside-parcel.png`).

### Task 3: Read-only 2D proposal board

**Files:**
- Add: `src/components/studio/Studio2DPreview.tsx`
- Add: `src/components/studio/Studio2DPreview.module.css`
- Add: `src/components/studio/Studio2DPreview.test.tsx`

- [x] SVG ile parsel siniri, footprint, yaklasik cekme mesafesi, ticari cephe isareti ve program legend'ini goster. (Cekme mesafesi = parselin `deriveFootprintPolygon` ile KENDI insetM'i kadar kucultulmus hali — Task 2'nin fonksiyonu YENIDEN KULLANILDI, yeni geometri kodu yazilmadi.)
- [x] Katmanlar arasinda net hiyerarsi kur: parsel referanstir, footprint oneridir, program renktir, uyari ayrik bilgi katmanidir. (4 ayri SVG katmani + uyarilar SVG DISINDA ayri bir liste.)
- [x] Geometri yoksa bos canvas yerine sayisal alan ve “parsel ekle” cagrisi sun.
- [x] Mobilde sabit oranli gorunum, masaustunde kontrol/legend yan kolonu uygula. (`aspect-ratio:1` + `900px` breakpoint'te `1fr 260px` grid'e gecis — ProgramMixPanel'deki AYNI responsive desen.) (8 test, `Studio2DPreview.test.tsx`.)

**Kablolama TAMAMLANDI** (Task 4 ile birlikte, ayni oturumda — Bilinen Boşluk #1 dersi geregi): `page.tsx`e hem masaustu (`Studio2DPreview`+`StudioLayoutControls`, `programBands`/`layoutDraft`/`effectiveLayoutDraft` state'i) hem mobil (yeni `Studio2DMobileLeaf.tsx` — iki masaustu panelini TEK yaprakta ustuste sarmalar, `SonucKarti`'ye 6. buton "2D Yerleşim Tahtası") kablolandi. `effectiveLayoutDraft = layoutDraft ?? (mass ? createDefaultLayoutDraft(programBands) : null)` — kullanici ilk kontrolu degistirene kadar taze hesaplanir, sonra state'e "yapisir."

### Task 4: Kontrollu yerlesim kontrolleri

**Files:**
- Add: `src/components/studio/StudioLayoutControls.tsx`
- Add: `src/components/studio/StudioLayoutControls.module.css`
- Add: `src/components/studio/StudioLayoutControls.test.tsx`

- [x] Footprint kapsama, yon, yaklasik cekme ve zemin ticaret cephesi icin sayisal/segment/slayt kontrolleri sun. (Kapsama=sayisal %, yon=segment on-ayar (0/90/180/270°)+ince ayar sayisal, cekme=3 sayisal alan, cephe=kenar secici (`<select>`) + sayisal uzunluk.)
- [x] Her kontrolun yaninda etkiledigi alan veya program sonucunu goster. (Kapsama yaninda tahmini footprint alani m² — `mass.footprint.areaM2 * scale²`, YENIDEN HESAPLAMA yok, taban alan `calculatePolygonAreaM2`den okunur.)
- [x] Gecersiz degisiklikte son gecerli durumu koru, nedenini inline uyarida acikla. (Her alan icin `Number.isFinite`+domain kontrolu; basarisizsa `onLayoutDraftChange` HIC CAGRILMAZ, yerel red mesaji gosterilir.)
- [x] Birinci surumde surukle-birak handle ekleme; ancak kontrol API'sini ileride handle olaylarini kabul edecek sekilde kur. (TEK mutasyon kanali: `onLayoutDraftChange(next: StudioLayoutDraft)` — ileride bir handle da AYNI callback'i cagirabilir.) (10 test, `StudioLayoutControls.test.tsx`.)

**Dogrulama:** `npx tsc --noEmit -p .` temiz, `npm run build` basarili (ayni dosya icinde `composes` kullanimi — bu proje daha once cross-file `composes`in Turbopack'te farkli davrandigini bulmustu; burada AYNI dosya ici oldugu icin guvenli, gercek build ile teyit edildi).

### Task 5: 3D ve teklif baglantisi

**Files:**
- Modify: `src/components/studio/StudioScene.tsx`
- Modify: `src/components/studio/ProgramMixPanel.tsx`
- Modify: `src/lib/studio/snapshot.ts`
- Add/update tests

- [x] 2D footprint degisince 3D kutleye ayni geometriyi aktar. (`resolveEffectiveMass` — YENI, `buildMassGeometry.ts`'e eklendi (Files listesinde yoktu ama `createMassGeometry`in KENDISI DEGISMEDI, saf ek export) — yalnizca `footprint.points`i degistirir, `heightM`/`floorCount` AYNEN kalir. `StudioScene` geometri/kamera/kat bantlari/program bantlari icin TEK bu kaynaktan okur. `StudioPreview` yeni `layoutDraft` propundan `deriveFootprintPolygon` ile hesaplar. Canli Playwright ile GORSEL olarak dogrulandi: 3D kutle 2D'deki %60 kapsama degisikligini yansitiyor (ince, dar bir kule — `studio-2d-layout-3d-mass-activated.png`).)
- [x] Program bandlari 2D legend, 3D bant ve envanter ozetinde ayni ID ile eslessin. (`deriveProgramBands` zaten saf/deterministik — ID = kat araligi+kullanim anahtari, tarih/sayac YOK. Determinizm garantisi kilitlendi (`programInventory.test.ts`). `StudioPreview` artik opsiyonel `programBands` propu KABUL EDER (verilirse ICERIDE YENIDEN TURETMEZ) — `page.tsx` TEK `programBands`i hem `Studio2DPreview`e hem `StudioPreview`e verir, "ayni kaynaktan" garantisi kod-seviyesinde de saglanir.)
- [x] Layout degisikligi kapasiteyi etkiliyorsa Faz 2B teklif panelinde “yeniden hesaplama gerekli” durumunu gorunur yap. (Files listesi `LandownerOfferPanel.tsx` degil `ProgramMixPanel.tsx`yi modify olarak isaretliyor — plan metni ile dosya listesi CELISIYORDU, dosya listesine uyuldu: yeni `layoutRequiresRecalculation` propu, `scale!==1 || insetM!==0` iken gorunur ama BLOKLAMAYAN banner. Canli Playwright ile dogrulandi.)
- [x] `layoutDraft` JSON snapshot'a eklenir ve roundtrip test edilir. (`StudioSnapshotDraft.layoutDraft`, `CreateStudioSnapshotDraftInput.layoutDraft` — mevcut `landownerOffer`/`valuationAssumptions` ile AYNI ekleme deseni. 2 yeni test, `snapshot.test.ts` toplam 10 test.)

**Dogrulama:** `npx tsc --noEmit -p .` temiz, `npm run build` basarili, `npx jest src/lib/studio src/components/studio src/app/hesapla` 793/793 gercek test yesil (stale `.worktrees/anasayfa-taste-skill-revizyonu` haric). `output/playwright/studio-2d-layout-smoke.cjs` genisletildi: kapsama degisince banner+3D senkronizasyonu dogrulandi.

### Task 6: Verification

- [x] `npx jest src/lib/studio src/components/studio` calistir. (Bu iki dizin: 240+ test yesil. Daha genis `+ src/app/hesapla` kapsamiyla toplam 793/793 — stale `.worktrees/anasayfa-taste-skill-revizyonu` haric.)
- [x] `npx tsc --noEmit` calistir. (Temiz.)
- [x] Masaustu ve mobilde dogrulanmis, taslak ve eksik geometri durumlarini tarayici smoke testiyle kontrol et. (`output/playwright/studio-2d-layout-smoke.cjs` — taslak/demo geometri (varsayilan + kapsama/donus degisikligi + parsel disina tasma), eksik geometri (bos sayfa: "Parsel ekle" CTA + sayisal ozet), mobil (yatay tasma yok, kontroller mobilde de calisiyor) hepsi PASS. NOT: "dogrulanmis" (verified_tkgm) senaryosu bu ortamda gercek TKGM API cagrisi gerektirdigi icin CANLI test edilemedi — Studio2DPreview/StudioLayoutControls'un kendi birim testleri `verified_tkgm` kaynagini ayrica kapsiyor (`parcelPolygon.source` bagimsiz kod yolu degil, ayni render mantigi).)

## Exit Criteria

- Kullanici parsel, bina oturumu, ticaret cephesi ve programin iliskisini tek 2D gorunumde anlar. **KARSILANDI** — tek SVG'de 4 katman (parsel/cekme/footprint/cephe) + ayri program legend'i.
- Kontroller sinirli, geri alinabilir ve mali/teklif etkisi gorunur niteliktedir. **KARSILANDI** — gecersiz girdi reddedilir (son gecerli durum korunur), `layoutRequiresRecalculation` banner'i mali/teklif etkisini gorunur kilar.
- Studio CAD araci gibi davranmaz. **KARSILANDI** — serbest cizim/duvar/oda YOK, yalnizca kapsama/yon/cekme/cephe parametreleri; "basit containment" bilerek kesin CAD-seviyesi kesisim testi degil.

## Faz 3A — TAMAMLANDI (2026-08-22)

Task 1-6 hepsi tamamlandi. Yeni/degisen test sayisi: `layoutDraft.test.ts` (9), `geometry2d.test.ts` (20, 2 regresyon dahil), `Studio2DPreview.test.tsx` (8), `StudioLayoutControls.test.tsx` (10), `Studio2DMobileLeaf.test.tsx` (3), `buildMassGeometry.test.ts` (+3), `StudioScene.scope.test.ts` (+2), `StudioPreview.test.tsx` (+3), `ProgramMixPanel.test.tsx` (+2), `snapshot.test.ts` (+2), `programInventory.test.ts` (+1), `SonucKarti.test.tsx` (+1), `HesaplaMobile.test.tsx` (+1). `npx tsc --noEmit -p .` temiz, `npm run build` basarili. Bir REAL BUG bulundu ve duzeltildi: `isPointInPolygon` kose-dejenerasyonu (bkz. Task 2 notu) — varsayilan durumda sahte "parsel disina tasiyor" uyarisi. Sonraki adim icin bkz. `EXECUTION-QUEUE.md`/`NEXT-DISPATCH.md`.
