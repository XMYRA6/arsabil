# Arsabil Studio - Faz 2B Arsa Sahibi Teklif ve Dengeleme Plani

> **For agentic workers:** Faz 2A'nin program envanterinden sonra uygulanir. Bu faz on teklif senaryolari uretir; hukuki sozlesme veya baglayici degerleme uretmez.

**Goal:** Arsa payindan gelen kesirli hak edisi (ornek `9.2`) gorunur bir pazarlik nesnesine cevirmek: secilmis daireler, opsiyonel dukkan, nakit dengeleme ve mahsup notuyla anlasilir teklif alternatifleri.

**Architecture:** `landownerOffer` saf hesap motorudur. Degerleme varsayimlari ayri bir modelde tutulur; UI bir teklifi asla “kesin” gibi adlandirmaz. Secili envanter, Faz 2A `UnitInventoryItem` kimliklerine gore referanslanir.

**Depends on:** Faz 2A program envanteri ve mevcut hesap motorunun arsa payi/hak edis ciktisi.

## Re-scope Notu (2026-08-22, kullanici karariyla)

Bu plan `src/lib/studio/landownerOffer.ts`'i **"Add"** olarak listeliyordu ama
dosya zaten Faz 2'de kuruldu ve calisiyor: `calculateLandownerEntitlement`/
`createLandownerOfferOptions`, 6 test, `snapshot.ts`'e kablolu. Plan, Faz 2'nin
varliginidan habersiz yazilmis (Faz 2/Faz 2A'daki cakismayla AYNI kok neden).

**Kullanici karari — "calculator dogru hesap yapiyor, mantiksiz olabilecek bir
degisiklikle etkilenmesin":**

- **Mevcut `calculateLandownerEntitlement`/`createLandownerOfferOptions`
  DEGISTIRILMEZ.** Kurucunun orijinal spec'i (docx) ve Engine v2 ile ayni
  varsayimi paylasir (tek/ortalama daire degeri — `Ad`/`Sd`); iki denetim
  turundan gecmis, test edilmis, DOGRU calisiyor.
- **Task 2 bullet 3 ("gerçek envanter değerine göre denge hesapla" — birim
  turune gore FARKLI deger, hangi ozel envanter ID'lerinin sahibe gittigini
  secme) BU FAZDAN CIKARILDI.** Gerekce: plan bunun icin bir SECIM KURALI
  tanimlamiyor (hangi birimler? en ucuzdan mi? sahibin tercihine mi?) — kural
  olmadan uygulamak tutarsiz/mantiksiz sonuclar uretme riski tasir. Karma
  program (Faz 2A) nedeniyle GELECEKTE gercek bir ihtiyac olabilir ama once
  acik bir is kurali gerekir — bu, AYRI bir karar noktasidir.
- **`ValuationAssumptions` (Task 1) EKLENIR ama EKLEMELI kalir:** para
  birimi/tarih/m² deger/dukkan deger gibi zengin metadata tasir, ama
  `createLandownerOfferOptions`'un mevcut `unitValueTl: number | null`
  parametresine COZULUR (resolve edilir) — fonksiyonun kendisi degismez,
  yeni bir "girdi zenginlestirme" katmani eklenir.
- Task 3 (`LandownerOfferPanel`/`OfferComposer`) MEVCUT, degismemis
  fonksiyonlarin UZERINE kurulur. "Faz 2A `UnitInventoryItem` kimlikleri"
  referansi hatali — o tip Faz 2A'da bilerek EKLENMEDI, `ProgramMixItem.id`
  kullanilir.
- Task 4 (`offerValidation.ts`) degismeden kalir — yeni, cakismayan is.
- Task 5 "ekle" degil "genislet" olarak okunmali — `landownerOffer` Faz 2'den
  beri zaten snapshot'ta.

## Global Constraints

- Kesirli pay sessizce yukari veya asagi yuvarlanmaz.
- Nakit dengeleme icin acik bir degerleme tabani gerekir.
- ~~Aynı envanter kalemi iki farkli aliciya ayni senaryoda atanamaz.~~ **Uygulanamaz/CIKARILDI** — bu fazda per-unit atama yok (Re-scope Notu).
- "On teklif", "senaryo" ve "denge odemesi" dili kullanilir; sozlesme dili kullanilmaz.
- Para birimi, KDV/masraf varsayimi ve degerleme tarihi gizli sabit olmaz.

### Task 1: Degerleme varsayim modeli (EKLEMELI — mevcut hak edis fonksiyonu degismez)

**Files:**
- Add: `src/lib/studio/valuationAssumptions.ts`
- Add: `src/lib/studio/valuationAssumptions.test.ts`
- ~~Add: `src/lib/studio/landownerOffer.ts`~~ **zaten var (Faz 2), DEGISTIRILMEZ.**

- [ ] ~~`LandownerEntitlement`...~~ **Gerek yok** — `LandownerEntitlementResult` (Faz 2) zaten toplam/tam/kesirli alanlari tasiyor; "hesap kaynagi" alani eklemek istenirse mevcut tipe KUCUK bir ek olur, yeniden tasarim degil.
- [x] `ValuationAssumptions` icinde daire bazli deger, m2 birim degeri, dukkan degeri/kira carpani, para birimi ve degerleme tarihi tanimla.
- [x] `resolveUnitValueTl(assumptions: ValuationAssumptions): number | null` — `ValuationAssumptions`i mevcut `createLandownerOfferOptions({ unitValueTl })` parametresine COZER. Fonksiyonun kendisi degismez.
- [x] Degerleme yoksa (`resolveUnitValueTl` null donerse) mevcut `MISSING_UNIT_VALUE_BASIS` uyarisi zaten devreye giriyor — yeniden uretilmez.
- [x] `ValuationAssumptions` icin gecerli/eksik/tarihli senaryolarda test yaz. (5 test.)

### Task 2: Otomatik teklif secenekleri — ZATEN TAMAMLANDI (Faz 2), bu fazda DEGISIKLIK YOK

**Files:** Yok — mevcut `landownerOffer.ts`/`landownerOffer.test.ts` dokunulmaz.

- [x] `9.2` icin en az uc secenek uret: `9 daire + nakit`, `10 daire + mahsup`, `ozel teklif`. (Faz 2'de tamamlandi.)
- [ ] ~~Seceneklerde secilen inventory ID'leri...~~ **CIKARILDI** — tekil (aritmetik) teklif modelinde "secilen envanter ID'si" kavrami yok, cunku birimler ayirt edilmiyor.
- [ ] ~~Birimlerin degerleri farkliysa... gercek envanter degerine gore denge hesapla.~~ **BU FAZDAN CIKARILDI** (bkz. yukaridaki Re-scope Notu — secim kurali tanimsiz, mantiksiz sonuc riski).
- [ ] Dukkan veya kira hakki bir teklife dahil edilirse bunun satis/gelir varsayimini ayri kalem olarak acikla. (UI seviyesinde, Task 3'te ele alinir — `commercialScenario.ts` zaten Faz 2'de var.)
- [x] Yuvarlama, esitlik toleransi ve para formati kurallarini tek yerde tanimla. (Faz 2'de `landownerOffer.ts` icinde zaten tek yerde.)

### Task 3: Teklif Senaryoları UI (mevcut, degismemis fonksiyonlarin uzerine)

**Files:**
- Add: `src/components/studio/LandownerOfferPanel.tsx`
- Add: `src/components/studio/LandownerOfferPanel.module.css`
- Add: `src/components/studio/LandownerOfferPanel.test.tsx`
- Add: `src/components/studio/OfferComposer.tsx`

- [x] Ustte "hesaplanan hak edis: 9.2 birim esdegeri" ifadesini; tam/kesir dagilimini ayni satirda goster.
- [x] Otomatik secenekleri (mevcut `createLandownerOfferOptions().options`) karsilastirilabilir kartlar olarak sun; secili teklif tek bakista anlasilsin.
- [x] Ozel teklifte kullanici daire sayisi + nakit tutarini elle girer (mevcut `customOverride` parametresi) — envanterden BAGIMSIZ BOLUM SECIMI bu fazda YOK (Re-scope Notu geregi). (`OfferComposer.tsx`.)
- [x] Degerleme eksikse (`ValuationAssumptions` cozulemedi) para alanini engellemek yerine varsayim formuna yonlendir. (Panel icinde her zaman erisilebilir "Degerleme varsayimi" formu; eksikken uyari notu.)
- [x] Degisiklikle teklif denge durumu aninda guncellensin; ama kullaniciya "tahmini" etiketi gorunsun. (Her secenek kartinda "tahmini" rozeti.) (11 test, `LandownerOfferPanel.test.tsx` + `OfferComposer.test.tsx`.)

**Mobil entegrasyon (Faz2A Bilinen Bosluk #1 dersiyle AYNI oturumda dahil edildi, ayri bir gorev olarak birakilmadi):** `SonucKarti.tsx`'e 5. buton ("Arsa Sahibi Teklifi"), yeni `LandownerOfferMobileLeaf.tsx` (ProgramMixMobileLeaf ile ayni kabuk deseni), `HesaplaMobile.tsx`/`page.tsx`'te `landownerOfferAcik` state. Masaustu+mobil AYNI `valuationAssumptions`/`landownerCustomOverride` state'ini paylasir — iki ayri kopya YOK. `shareRatio = landShareRatio/100`, `totalUnitCount = totalApartments`, `averageUnitAreaM2 = apartmentSize` mevcut ana hesaplayicidan (page.tsx) okunur, YENIDEN HESAPLANMAZ.
- [x] `npx tsc --noEmit -p .` temiz (stale `.worktrees/anasayfa-taste-skill-revizyonu` kopyasi haric — ayri, ilgisiz bir dal).
- [x] `npm run build` basarili, `/hesapla` derlendi.

**Kendi bulgum (Task 6 taramasi oncesi, tarayiciya gecmeden yakalandi):** Ilk kablolama `shareRatio={landShareRatio / 100}` kullaniyordu — ama ana motor `landShareRatio`i DEGIL, `effectiveLandShareRatio`i kullanir (`isApartmentCountEnabled` true iken `ownerApartmentShare/totalApartments`, false iken `landShareRatio/100` — `computeEffectiveLandShareX`, `calculatorUiHelpers.ts:41`). "Daire sayisi" modunda `landShareRatio` state guncel kalmiyor; panel yanlis hak edis gosterirdi. Duzeltildi: `effectiveLandShareRatio / 100` (masaustu + mobil, page.tsx:132 zaten mevcut degeri okuyor, YENIDEN HESAPLANMADI).

### Task 4: Cakisma, durum ve aciklama katmani

**Files:**
- Add: `src/lib/studio/offerValidation.ts`
- Add: `src/lib/studio/offerValidation.test.ts`
- Modify: `src/components/studio/LandownerOfferPanel.tsx`

- [x] ~~Cift atanmis daire, stok disi birim~~ **CIKARILDI** — per-unit atama bu fazda yok (Re-scope Notu). Negatif nakit, eksik degerleme ve kesir gizleme hatalarini dogrula. (`offerValidation.ts` — `validateCustomOffer`, 7 test.)
- [x] Uyariyi karar yolunu kapatmayan ancak kesinlikle gorunen bir formatta sun. (Uyarilar `LandownerOfferPanel` icinde gorunur liste; ozel teklif secenegi/Uygula butonu bloklanmaz.)
- [x] Her teklif icin “hesaplanan / varsayilan / elle girilen” bilgi bolumu olustur. (Her secenek kartinda kaynak rozeti: otomatik secenekler "hesaplanan", ozel teklif "elle girilen".)
- [x] Hukuki onay gerektiren durumlar icin spesifik sozlesme tavsiyesi vermeden uygunluk notu goster. (Panelde sabit not: "ön teklif ... bağlayıcı değildir ... hukuki danışmanlık alınması önerilir.") (4 yeni test, `LandownerOfferPanel.test.tsx` toplam 11 test.)

### Task 5: Snapshot — GENISLETME (landownerOffer Faz 2'den beri zaten snapshot'ta)

**Files:**
- Modify: `src/lib/studio/snapshot.ts`
- Modify: `src/lib/studio/snapshot.test.ts`
- Prepare interfaces for: Faz 4 rapor/paylasim modulleri

- [x] `valuationAssumptions` alanini snapshot'a ekle (mevcut `landownerOffer` alani zaten var, DEGISMEZ). (`StudioSnapshotDraft.valuationAssumptions`, `CreateStudioSnapshotDraftInput.valuationAssumptions`.)
- [x] Snapshot'ta para birimi/tarih bilgisi olmadan parasal degeri gecersiz kabul et. (`sanitizeValuationAssumptions` — currency/valuationDate bossa `unitValueTl`/`unitValuePerM2Tl`/`shopValueTl` `null`'a cekilir + yeni `INVALID_VALUATION_METADATA` uyarisi. 8 test, `snapshot.test.ts`.)
- [ ] ~~Paylasilabilir ozet icin sade bir teklif DTO'su tanimla; ham kullanici notlarini varsayilan olarak disari cikarma.~~ **ERTELENDI** — Faz 4 (rapor/paylasim) bu oturumda BASLAMADI ve mevcut modelde "ham kullanici notu" diye bir alan YOK (`customOverride` yalnizca `{unitCount, cashTl}`, Re-scope Notu geregi not alani bilerek eklenmedi). Somut bir ihtiyac/sekil olmadan simdiden bir DTO icat etmek spekulatif olurdu — Faz 4 baslayinca, o zamanki gercek paylasim yuzeyine gore tanimlanmali.

### Task 6: Verification

- [x] `npx jest src/lib/studio src/components/studio` calistir. (175/175 yesil — stale `.worktrees/anasayfa-taste-skill-revizyonu` kopyasi haric, o ayri/ilgisiz bir dal.)
- [x] `npx tsc --noEmit` calistir. (Temiz.)
- [x] `9.2`, `9.0`, eksik degerleme ve dukkan dahil tekliflerle tarayici smoke testi yap. (~~farkli daire degerleri~~ bu fazda yok.) (`output/playwright/landowner-offer-smoke.cjs` — ornek proje varsayilani totalApartments=24 oldugundan tam "9.2"/"9.0" yerine esdegeri 9,6 (kesirli) ve 6 (tam, %25 arsa payi) senaryolari kullanildi; ayni matematiksel durumu kanitlar. Tum 4 senaryo + mobil PASS, ekran goruntuleri `output/playwright/landowner-offer-*.png`.)
- [x] Mobilde teklif karsilastirma ve ozel teklif formunun yatay tasma olmadan kullanilabildigini kontrol et. (`document.documentElement.scrollWidth <= clientWidth` — hem yapragi actiktan hem ozel teklif formu doldurup Uygula'ya bastiktan sonra dogrulandi, ikisinde de tasma yok. Tam sayfa ekran goruntusundeki gorunen "orta-sayfa" cakismasi — StickyActionBar/alt nav sabit konumlu — daha once bu oturumda dogrulanmis bilinen bir `fullPage` birlestirme illuzyonu, gercek bug degil.)

**Kendi bulgum (bu Task sirasinda yakalandi, ayri commit/dispatch beklemeden duzeltildi):** `shareRatio={landShareRatio / 100}` yanlisti — `effectiveLandShareRatio / 100` olmali (bkz. Task 3 sonundaki not). Tarayiciya gecmeden, kodu tekrar okurken bulundu.

## Exit Criteria

- Kullanici `9.2` hak edisinin neden 9 veya 10 daire olmadigini, aradaki farkin nasil dengelendigiyle gorur. **KARSILANDI** — ust satirda tam/kesir dagilimi + iki karsilastirilabilir kart (round-down/round-up).
- Her teklif tarihli, para birimi belirtilmis bir degerleme varsayimina dayanir. (~~secilebilir envanter~~ bu fazda yok.) **KARSILANDI** — `ValuationAssumptions.currency`/`valuationDate` her zaman goruntulenir/duzenlenebilir; eksikse snapshot'ta `INVALID_VALUATION_METADATA` ile gecersiz sayilir.
- Sistem teklif sunar; hukuki baglayicilik iddia etmez. **KARSILANDI** — sabit uygunluk notu ("ön teklif ... bağlayıcı değildir ... hukuki danışmanlık alınması önerilir").
- **Mevcut `calculateLandownerEntitlement`/`createLandownerOfferOptions` matematigi degismedi** — bu fazin hicbir adimi Faz 2'nin dogru calisan hesabini bozmaz. **DOGRULANDI** — `landownerOffer.ts` bu oturumda HIC duzenlenmedi, orijinal 6 testi degismeden yesil kaldi (bkz. Task 6 dogrulama sonuclari).

## Faz 2B — TAMAMLANDI (2026-08-22)

Task 1-6 hepsi tamamlandi. Toplam yeni/degisen test: `valuationAssumptions.test.ts` (5), `OfferComposer.test.tsx` (4), `LandownerOfferPanel.test.tsx` (13), `offerValidation.test.ts` (7), `snapshot.test.ts` (+3, toplam 8), `LandownerOfferMobileLeaf.test.tsx` (2), `SonucKarti.test.tsx` (+1). `npx tsc --noEmit -p .` temiz, `npm run build` basarili. Sonraki adim icin bkz. `EXECUTION-QUEUE.md`/`NEXT-DISPATCH.md`.
