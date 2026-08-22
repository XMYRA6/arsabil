# Arsabil Studio - Faz 2A Program Envanteri ve Kat Bantlari Plani

> **For agentic workers:** Faz 1A ile parsel/insaat alani kaynagi gorunur hale geldikten sonra uygulanir. Faz 2B teklif motoru bu fazin envanter ciktisini tuketir.

**Goal:** Bir bina kutlesini “60 daire” gibi tek sayi olmaktan cikarmak; zemin kat dukkan, 2+1, 3+1, ortak alan ve otopark gibi kullanislarla sinirli, izlenebilir bir program envanterine donusturmek.

**Architecture:** Hesaplama ve dogrulama saf domain modullerinde yapilir. UI, ayni `ProgramInventory` ciktisini form, ozet ve 3D kat bandi olarak gorur. 3D scene yeni bir fizibilite kuralini icine almaz.

**Depends on:** Faz 0, Faz 1A, Faz 1B, **Faz 2** (bkz. Model Birlestirme Notu).

## Model Birlestirme Notu (2026-08-22, kod incelemesiyle bulundu)

Bu plan ile Faz 2 (`2026-08-16-arsabil-studio-karma-program-ve-teklif-senaryolari.md`)
bagimsiz yazilmis, aynı kavram (program karisimi) icin iki farkli model
tanimliyordu: Faz 2'nin duz-liste `ProgramMixItem`i vs bu planin yapisal
`ProgramBand`/`UnitInventoryItem`i. Kullanici karariyla **Faz 2'nin modeli
korunup Faz 2A'nin fikirleri onun UZERINE insa edildi** — iki ayri,
birbirinden habersiz model birakilmadi:

- `UnitInventoryItem` ayri bir tip OLARAK EKLENMEDI — `ProgramMixItem`
  zaten ayni alanlari tasiyordu (id, tip, adet, alan). Tek eklenen alan:
  `manualOverride?: boolean` (kullanici alan-tahminli oneriyi elle
  degistirdiyse izlenebilir kalsin diye).
- `floorAllocation?: string` (serbest metin) → `floorRange?: FloorRange`
  (`{startFloor, endFloor}`, yapisal) olarak YUKSELTILDI.
- `ProgramBand` eklendi ama `src/lib/studio/programInventory.ts`de saf bir
  TUREME fonksiyonu (`deriveProgramBands`) olarak — ayrica saklanan bir
  veri modeli degil, `ProgramMixItem[]`den her seferinde hesaplanir.
- `ProgramInventory` ayri bir tip olarak eklenmedi — `ProgramMixSummary`
  genisletildi (`sellableAreaM2` eklendi); "toplam brut alan" zaten
  `BuildingMass.grossConstructionAreaM2`, "tahsisli/bos alan" zaten
  `totalAllocatedAreaM2`/`remainingAreaM2` olarak Faz 2'de vardi.

## Global Constraints

- Tam kat plani veya serbest CAD cizimi yapilmaz.
- Daire adetleri sadece uygun envanter sinirinda secilir; mevcut olmayan bagimsiz bolum teklif edilemez.
- Alanlar m2 cinsinden, brut/net ayrimi ve kaynak etiketiyle tutulur.
- Eksik daire alanlari varsayim olarak gorunur; arka planda sabit kabul edilmez.

### Task 1: Program ve envanter modeli

**Files:**
- Add: `src/lib/studio/programInventory.ts`
- Add: `src/lib/studio/programInventory.test.ts`
- Modify: `src/lib/studio/types.ts`

- [x] `ProgramBand` tanimla: baslangic/bitis kati, kullanim turu, alan tahsisi, renk slotu ve kaynak bilgisi. (Kaynak bilgisi = `ProgramMixItem.id`/`use` uzerinden turer, ayri bir alan olarak saklanmadi.)
- [x] `UnitInventoryItem` tanimla — Model Birlestirme Notu geregi ayri tip degil, `ProgramMixItem`in kendisi (bkz. yukarida).
- [x] `ProgramInventory` icinde toplam brut alan, tahsisli alan, bos alan, satilabilir alan ve uyari listesi tut. (`ProgramMixSummary` genisletildi: `sellableAreaM2` eklendi.)
- [x] Aynı kat araliginda cakisan band, negatif adet, sifir alan ve kapasite asimi kontrollerini yaz.

### Task 2: Alan butcesi ve yerlesim kurallari

**Files:**
- Add: `src/lib/studio/programCapacity.ts`
- Add: `src/lib/studio/programCapacity.test.ts`

- [x] `grossConstructionAreaM2` ile program alan butcesini bagla. (Faz 2'de zaten `summarizeProgramMix(items, availableAreaM2)` ile vardi.)
- [ ] Zemin kat ticari alanini bina taban alani/zemin bandi ile sinirla; veri yoksa uyari uret. **ERTELENDI** — `commercialScenario.ts` zaten `availableGroundFloorAreaM2` parametresi kabul ediyor (Faz 2); `BuildingMass.footprint`den bu degeri turetmek bir UI-baglama isi, Task 3'te ele alinacak.
- [x] Ortak alan, otopark ve teknik alanlar icin opsiyonel rezerv hesapla. (`calculateCommonAreaReserve`.)
- [x] `2+1`/`3+1` adetlerini alan varsayimlarindan uret, fakat kullanicinin manuel adet girmesine izin ver; farki uyari olarak goster. (`deriveSuggestedUnitCount` + `compareManualUnitCount`.)
- [x] "Kapasiteyi asti", "alan tahmini eksik", "atanmamis alan var" senaryolarini test et.

### Task 3: Program Dagilimi operasyon ekranı

**Files:**
- Add: `src/components/studio/ProgramMixPanel.tsx`
- Add: `src/components/studio/ProgramMixPanel.module.css`
- Add: `src/components/studio/ProgramMixPanel.test.tsx`
- Modify: `src/app/hesapla/page.tsx`

- [x] Paneli su sirada kur: toplam potansiyel -> kat bantlari -> birim envanteri -> varsayimlar/uyarilar.
- [x] Zemin dukkanini ayri bir satir ve 3D legend ile vurgula; kira/satis degeri Faz 2B'ye ait oldugu icin burada zorunlu isteme. (`.satirZeminDukkan` + "Zemin Dükkan" rozeti; deger alanlari YOK.)
- [x] Her satirda **varsayilan vs kullanici degistirdigi** degerleri ayirt et ("Elle girildi" rozeti, `manualOverride`). **Kismi:** "hesaplanan" (alan butcesinden onerilen adet, `programCapacity.ts`) SATIR SEVIYESINDE henuz baglanmadi — birden fazla satirin ayni havuzu nasil paylasacagi ayri bir urun karari gerektiriyor, bu UI'da varsayilmadi.
- [x] Mobilde tablodan once okunabilir kart ozeti; masaustunde yogunluklu ama taranabilir tablo kullan. (CSS Grid `grid-template-areas` ile TEK bilesen, iki duzen — StudioPreview ile ayni yaklasim.)
- [x] Geometri yokken panelin sayisal kisimlarini calistir, 3D band gorunumunu pasif duruma al. (`aria-disabled` + opacity, test edildi.)

**Mobil entegrasyon (plan dosyasinda listelenmemisti, Bilinen Bosluk #1 dersiyle simdi baslangictan dahil edildi):** `SonucKarti.tsx`'e 4. buton, yeni `ProgramMixMobileLeaf.tsx` (StudioMobileLeaf ile ayni kabuk deseni), `HesaplaMobile.tsx`/`page.tsx`de `programMixAcik` state. Masaustu+mobil AYNI `programMixItems` state'ini paylasir.

### Task 4: 3D kat bandi eslemesi

**Files:**
- Modify: `src/components/studio/StudioScene.tsx`
- Modify: `src/components/studio/studioVisualTokens.ts`
- Add/update: `src/components/studio/buildMassGeometry.test.ts`

- [x] `ProgramBand` kat araliklarini kutle yuksekligine deterministik esle. (`programBandGeometry.ts` — `mapProgramBandsToWorldY`/`createProgramBandGeometry`, 5 test.)
- [x] Zemin ticaret, konut ve ortak alan icin token tabanli renk/kenar kurallari tanimla. (`PROGRAM_USE_COLORS`, `studioVisualTokens.ts`.)
- [x] Program verisi eksikse mevcut tek-kutle gorunumune zarifce geri don. (`ProgramBandOverlays`: `segments.length === 0 → null`.)
- [x] Legend, metin ozeti ve sahne renklerinin ayni envanterden geldigini test et. (`StudioScene.scope.test.ts` + `StudioPreview.test.tsx` "program bandı legend" — legend, `programBands` prop'u ve sahne AYNI `deriveProgramBands` cikisindan besleniyor.)

**Kok neden bulgusu (kapsamli, ayri fix):** Bu task'in kordinat matematigini turetirken mevcut `FloorBands` (kat bolme halkalari) bileseninde GERCEK bir konum hatasi bulundu — halkalar `heightM/2` kadar asagi kayiyor, bazilari kutlenin ALTINA (negatif Y) dusuyordu. Duzeltildi (`StudioScene.tsx`, regresyon testi eklendi) ve YENI `programBandGeometry.ts` AYNI (duzeltilmis) kordinat kuralini kullaniyor — iki sistem ayrisamaz.

**Canli dogrulama (Playwright, `output/playwright/studio-programband-3d-smoke.cjs`):** Zemin dukkan (turuncu) + 1-3 kat konut (mor) bantlari kutlenin TABANINDA, dogru sirada (turuncu en altta) goruntulendi — kok neden duzeltmesi gorsel olarak da dogrulandi. Ilk denemede konut rengi ana kutle rengiyle (`massFill`) AYNI oldugu icin GORUNMUYORDU — canli ekran goruntusunde yakalanip ayri bir renge (`#8b5cf6`) cevrildi.

### Task 5: Snapshot ve degisiklik izleme

**Files:**
- Modify: `src/lib/studio/snapshot.ts`
- Modify: `src/lib/studio/snapshot.test.ts`

- [x] Program bantlari, envanter ve alan varsayimlarini snapshot'a ekle. (Faz 2 Task 4'te zaten yapildi — `programMix`/`programSummary`/`landownerOffer`.)
- [x] Kullanici duzeltmelerini `manualOverride` olarak izlenebilir tut. (`ProgramMixItem.manualOverride` — Model Birlestirme Notu'nda eklendi, `programMix` icinde otomatik akar.)
- [x] Eski snapshot okunurken program verisi yoksa guvenli varsayilan/uyari ile devam et. (Test: "programMix/landownerOffer verilmezse snapshot eskisi gibi (undefined) kalir" — cokme yok, `ProgramBand`ler zaten TUREME oldugu icin `[]` doner.)

**Not:** Bu task'in tum maddeleri onceki fazlarda (Faz 2 Task 4, Faz 2A Task 1
Model Birlestirme) zaten karsilanmisti — burada sadece dogrulanip
isaretlendi, yeni kod yazilmadi.

### Task 6: Verification

- [ ] `npx jest src/lib/studio src/components/studio` calistir.
- [ ] `npx tsc --noEmit` calistir.
- [ ] Gecerli geometri, geometri yok ve alan asimi senaryolarini masaustu/mobil smoke testiyle incele.

## Exit Criteria

- Kullanici 2+1, 3+1, dukkan ve ortak alanin toplam kapasiteyle iliskisini gorur.
- Teklif motoru secilebilir, benzersiz daire/dukkan envanteri alir.
- 3D renkleri estetik sus degil, program verisinin acik anlami olur.
