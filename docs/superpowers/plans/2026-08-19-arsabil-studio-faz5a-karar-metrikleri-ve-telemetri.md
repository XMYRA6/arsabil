# Arsabil Studio - Faz 5A Karar Metrikleri ve Telemetri Plani

> **For agentic workers:** Faz 4B ile kalici senaryo ve paylasim akisi kullanima girdikten sonra uygulanir. Bu faz AR, ic mimari veya marketplace ozelligi gelistirmez.

**Goal:** Studio'nun hangi bolumunun gercek is degeri urettigini ve sonraki yatirimin AR, ic mimari, marketplace veya cekirdek Studio iyilestirmesi mi olmasi gerektigini olculebilir kanitla belirlemek.

**Architecture:** Event contract'lari domain odaklidir; ham ekran tiklari degil kullanicinin tamamladigi karar akisini ifade eder. Kisisel veri ve teklif ayrintilari analytics payload'ina girmez. Dashboard agregasyon gorur, Studio ekranlari takip kodu bilmez.

**Depends on:** Faz 4A, Faz 4B.

## Global Constraints

- Analitik, parsel koordinati, paylasim tokeni, arsa sahibi adi veya parasal teklif satirlarini toplamaz.
- Bir olayi izlemek icin kullanici akisi degistirilmez veya gereksiz modal eklenmez.
- Metrikler vanity metric degil, karar kapisina bagli olmalidir.
- AR/ic mimari/marketplace ilgi formu, kullaniciya mevcut bir ozellik varmis gibi sunulmaz.

### Task 1: Studio event contract

**Files:**
- Add: `src/lib/studio/analyticsEvents.ts`
- Add: `src/lib/studio/analyticsEvents.test.ts`
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-event-sozlugu.md`

- [ ] Olaylari su seviyelerde tanimla: `studio_opened`, `massing_viewed`, `program_configured`, `offer_rebalanced`, `scenario_saved`, `proposal_exported`, `proposal_shared`, `proposal_reopened`.
- [ ] Her olay icin actor rolunu, scenario source durumunu, feature version'ini ve anonim sonuc etiketlerini sinirli enum olarak tanimla.
- [ ] Paylasim linki goruntulenmesini owner eyleminden ayri tut; public izleyici verisini anonim agregasyona indir.
- [ ] Geometri veya para degeri gibi hassas payload'lari sema dogrulamasiyla reddet.
- [ ] Event semasi ve PII redaksiyon testlerini yaz.

### Task 2: Funnel ve kalite olculeri

**Files:**
- Add: `src/lib/studio/studioMetrics.ts`
- Add: `src/lib/studio/studioMetrics.test.ts`
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-karar-metrikleri.md`

- [ ] Cekirdek funnel'i tanimla: hesap sonucu -> Studio acilis -> program -> teklif -> kayit -> export/share -> yeniden acilis.
- [ ] Veri kalitesi kesitlerini ayir: dogrulanmis/taslak geometri, otoriter/tahmini insaat alani, degerleme tamam/eksik.
- [ ] En az su karar metriklerini hesapla: teklif tamamlama orani, export/share orani, tekrar acma orani, teklif yeniden dengeleme orani, kritik uyariyla export orani.
- [ ] Metrikleri mutlak hacim, oran ve zaman kohortu olarak raporla; tek gunku dalgalanmayla karar alma.

### Task 3: Niyet toplama ve nitel kanit

**Files:**
- Add: `src/components/studio/StudioExpansionInterest.tsx`
- Add: `src/components/studio/StudioExpansionInterest.module.css`
- Add: `src/components/studio/StudioExpansionInterest.test.tsx`
- Add: `src/lib/studio/expansionInterest.ts`

- [ ] Rapor/paylasim sonrasi istege bagli tek soruluk ilgi yakalama tasarla: “Sonraki adimda neyi incelemek istersiniz?”
- [ ] Secenekleri `arsada 3D/AR`, `daire ici yerlesim`, `mobilya/urun secimi`, `daha ayrintili teklif` olarak sun; “talep olustur” ifadesi kullan.
- [ ] Serbest metni opsiyonel tut ve analytics yerine guvenli uygulama verisi olarak ayir.
- [ ] Niyetin gercek kullanim olmadigini dashboard ve karar logunda acikca etiketle.

### Task 4: Karar dashboardu ve gozden gecirme ritmi

**Files:**
- Add: `src/app/dashboard/studio-insights/page.tsx`
- Add: `src/components/studio/StudioDecisionDashboard.tsx`
- Add: `src/components/studio/StudioDecisionDashboard.module.css`
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-karar-gozden-gecirme.md`

- [ ] Dashboard'da cekirdek funnel, veri kalitesi, nitel niyet ve paylasim performansini ayri bolumlerde goster.
- [ ] En az aylik gozden gecirme ritmi, minimum orneklem ve karar sahibi tanimla.
- [ ] Dashboard'a “sonuc: devam et / cekirdek iyilestir / spike onayla / ertele” alanini ekle; otomatik karar verme.
- [ ] Yetki kontrolu, bos veri ve kucuk orneklem durumlari icin UI durumlari tasarla.

### Task 5: Verification

- [ ] Event sema/repository testlerini ve `npx tsc --noEmit` calistir.
- [ ] Dashboard'da PII/ham teklif tutari gorunmedigini denetle.
- [ ] En az bir sahte veri seti ile funnel, veri-kalitesi ve niyet kesitlerini browser smoke testiyle kontrol et.

## Exit Criteria

- Ekip Studio'nun hangi adimda deger kaybettigini ve hangi kullanici grubunun hangi genislemeyi istedigini gorur.
- AR, ic mimari veya marketplace yatirimi sadece ilgiye degil kullanima, export/share davranisina ve nitel geri bildirime dayanir.
