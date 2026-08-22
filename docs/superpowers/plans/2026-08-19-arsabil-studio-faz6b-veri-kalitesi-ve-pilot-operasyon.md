# Arsabil Studio - Faz 6B Veri Kalitesi ve Pilot Operasyon Plani

> **For agentic workers:** Faz 6A ile pilot kullanici akisi tanimlandiktan sonra uygulanir. Bu bir admin CAD veya manuel teklif duzeltme araci degildir.

**Goal:** Pilot sirasinda hatali/eksik kaynak verisi, kullanilamayan teklif ve destek talebini erken gorup siniflandirmak; ekibin sorunlari kullanicinin senaryosunu degistirmeden yonetmesini saglamak.

**Architecture:** Quality issue'lar `StudioScenarioVersion`dan ayri operational kayitlar olarak tutulur. Admin yalnizca durum, not ve takip kaydi tutar; senaryo verisini owner adina degistiremez.

**Spec:** `docs/superpowers/specs/2026-08-19-arsabil-studio-pilot-operasyon-design.md`

## Global Constraints

- Admin, kullanicinin teklifini veya parsel geometrisini gizlice degistiremez.
- Duzeltme onerisi gerekiyorsa kullanici yeni taslak/versiyon olusturur.
- Quality dashboard ham arsa sahibi verisi veya paylasim tokeni gostermez.
- Operasyon kaydi hukuki degerlendirme veya resmi onay kaydi degildir.

### Task 1: Kalite issue modeli

**Files:**
- Add: `src/lib/studio/qualityIssue.ts`
- Add: `src/lib/studio/qualityIssue.test.ts`
- Inspect/Modify: `prisma/schema.prisma`

- [ ] Sorun tipleri tanimla: `missing_geometry`, `area_mismatch`, `estimated_construction_area`, `missing_valuation`, `offer_needs_rebalance`, `render_failure`, `user_reported`.
- [ ] Severity, state, scenario/version reference, anonim metadata ve owner-visible aciklama alanlarini tasarla.
- [ ] Issue olusumunu kalite sinyali olarak kaydet; teklif degerlerini issue kaydina kopyalama.
- [ ] Duplicate issue birlestirme, archive ve state gecisi testlerini yaz.

### Task 2: Otomatik kalite kontrolleri ve escalation

**Files:**
- Add: `src/lib/studio/qualityRules.ts`
- Add: `src/lib/studio/qualityRules.test.ts`
- Add: `src/lib/studio/qualityIssueRepository.ts`
- Add: `src/app/api/studio/quality-issues/route.ts`

- [ ] Snapshot kaydi/export/paylasim aninda mevcut uyarilardan quality issue turet.
- [ ] Kritik issue durumunda paylasim policy'si ile entegrasyon kur; sert bloklama policy ile tanimlansin.
- [ ] Tekrar eden render veya input hatalarini incident sinyali olarak grupla.
- [ ] Kullaniciya iletilecek aciklama ile internal operational notu birbirinden ayir.

### Task 3: Pilot operasyon paneli

**Files:**
- Add: `src/app/dashboard/studio-operations/page.tsx`
- Add: `src/components/studio/StudioOperationsQueue.tsx`
- Add: `src/components/studio/StudioOperationsQueue.module.css`
- Add: `src/components/studio/StudioOperationsQueue.test.tsx`

- [ ] Kuyrukta kalite sorunu, yas, severity, kaynak durumu ve operasyon state'ini goster; teklif tutari gosterme.
- [ ] Filtreleri sorun tipi, role, kaynak kalitesi ve aciklik durumuyla sinirla.
- [ ] Admin aksiyonlari: not ekle, takipte, kullaniciya duzeltme oner, kapat. “Senaryoyu duzelt” aksiyonu yok.
- [ ] Bos kuyruk, yetkisiz erisim, yuksek hacim ve hata durumlari tasarla.

### Task 4: Pilot karar ritmi ve rollout kapisi

**Files:**
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-pilot-review-template.md`
- Add: `src/lib/studio/pilotReadiness.ts`
- Add: `src/lib/studio/pilotReadiness.test.ts`

- [ ] Haftalik pilot review'da aktivasyon, kalite issue oranlari, paylasim, destek yukunu ve nitel geri bildirimleri birlestir.
- [ ] Genis acilisa gecis icin minimum aktivasyon, kritik issue, destek yanit suresi ve privacy kriterleri tanimla.
- [ ] Sonucu `expand`, `extend pilot`, `fix core`, `pause` olarak kaydet; otomatik rollout yapma.

### Task 5: Verification

- [ ] Quality rule/repository/API testlerini ve `npx tsc --noEmit` calistir.
- [ ] Pilot admininin senaryo verisini mutasyona ugratamadigini yetki testiyle kanitla.
- [ ] Kalite issue, destek yonlendirmesi ve rollout readiness akisini smoke testiyle kontrol et.

## Exit Criteria

- Pilot ekibi veri kalitesi sorunlarini sistematik gorur, fakat kullanicinin senaryosuna el koymaz.
- Genis acilisa gecis kararinin teknik, kullanici ve operasyon kaniti vardir.
