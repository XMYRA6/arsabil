# Arsabil Studio - Faz 6A Pilot Onboarding ve Aktivasyon Plani

> **For agentic workers:** Faz 4B'nin rapor/paylasim akisi ve Faz 5A telemetrisi kullanilabilir olduktan sonra uygulanir. Bu faz tum kullanicilara acilis degil, kontrollu pilot icindir.

**Goal:** Emlak/proje gelistirme kullanicisini ilk oturumunda “parsel -> senaryo -> on teklif -> paylasim” deger zincirine guvenli ve yardimsiz sekilde ulastirmak.

**Architecture:** Onboarding adimlari mevcut Studio contract'larini tuketir; paralel bir wizard state'i veya ikinci hesaplama yolu olusturmaz. Pilot erisimi feature flag/rol ile sinirlanir.

**Spec:** `docs/superpowers/specs/2026-08-19-arsabil-studio-pilot-operasyon-design.md`

## Global Constraints

- Onboarding resmi imar, hukuki teklif veya TKGM sonucunun dogrulugu konusunda garanti dili kullanmaz.
- Kullanici ornek senaryo ile gercek senaryoyu karistirmasin diye demo verisi belirgin etiketlenir.
- Kritik uyariyi atlatmak icin sadece “devam et” eylemi yeterli olmaz; neden/varsayim gorunur kalir.

### Task 1: Pilot erisimi ve roller

**Files:**
- Inspect/Modify: mevcut auth/role/feature-flag altyapisi
- Add: `src/lib/studio/pilotAccess.ts`
- Add: `src/lib/studio/pilotAccess.test.ts`

- [ ] Roller tanimla: pilot kullanicisi, pilot admini, destek gozlemcisi.
- [ ] Studio pilot erisimini user/org bazli feature flag ile kontrol et.
- [ ] Feature kapaliyken mevcut hesapla deneyimini bozma; yalnizca Studio girisini sakla.
- [ ] Yetkisiz erisim, davet suresi dolmasi ve role degisimi testlerini yaz.

### Task 2: Ilk deger akisi

**Files:**
- Add: `src/components/studio/StudioPilotOnboarding.tsx`
- Add: `src/components/studio/StudioPilotOnboarding.module.css`
- Add: `src/components/studio/StudioPilotOnboarding.test.tsx`
- Modify: `src/app/hesapla/page.tsx`

- [ ] Dort adimli, atlanabilir ama ilerlemesi izlenebilir onboarding tasarla: parsel kaynagi, alan varsayimi, program/teklif, rapor/paylasim.
- [ ] Her adimda bir sonraki karar icin gerekli en az bilgiyi iste; uzun form veya tur kullanma.
- [ ] Demo senaryosu ile gercek senaryoyu renk/etiket/copy seviyesinde ayir.
- [ ] Ilk basarili rapor/paylasimdan sonra onboarding'i tamamlanmis kabul et.

### Task 3: Uyari anlama ve destekli toparlanma

**Files:**
- Add: `src/components/studio/StudioDataQualityGuide.tsx`
- Add: `src/components/studio/StudioDataQualityGuide.test.tsx`
- Modify: Studio warning components

- [ ] “Geometri eksik”, “insaat alani tahmini”, “degerleme eksik”, “teklif yeniden dengeleme gerekli” durumlari icin eylem odakli aciklamalar ekle.
- [ ] Uyariyi teknik hata gibi degil, bir sonraki karar/duzeltme olarak ifade et.
- [ ] Kullanici uyarili senaryoyu kaydedip paylasmak isterse rapordaki uyari gorunurlugunu onizlet.
- [ ] Yardim talebi eylemi varsa senaryo ozeti ve hata sinifini aktar, hassas teklif verisini otomatik gonderme.

### Task 4: Aktivasyon olcumu ve pilot geri bildirimi

**Files:**
- Modify: `src/lib/studio/analyticsEvents.ts`
- Add: `src/lib/studio/pilotFeedback.ts`
- Add: `src/lib/studio/pilotFeedback.test.ts`
- Add: `src/components/studio/StudioPilotFeedback.tsx`

- [ ] Aktivasyon olayini “ilk kayit” degil, gecerli senaryo + teklif + rapor/paylasim tamamlama olarak tanimla.
- [ ] Kisa geri bildirimde karar kolayligi, guven duzeyi ve sonraki ihtiyac sorularini topla.
- [ ] Geri bildirimi scenario kaynak kalitesi ve rol ile anonim/aggregate analize bagla.

### Task 5: Verification

- [ ] Rol/feature flag, onboarding state ve veri kalitesi testlerini calistir.
- [ ] `npx tsc --noEmit` calistir.
- [ ] Pilot kullanicisi ve yetkisiz kullanici akisini masaustu/mobil browser smoke testiyle kontrol et.

## Exit Criteria

- Pilot kullanicisi destek almadan ilk paylasilabilir teklifini tamamlayabilir.
- Kritik veri uyarilarinin ne anlama geldigi ve nasil duzeltilecegi anlasilir.
- Aktivasyon, yalnizca ekran goruntulemeye degil tamamlanmis karar akimina dayanir.
