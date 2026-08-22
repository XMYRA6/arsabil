# Arsabil Studio - Faz 3B Senaryo Taslagi, Gecmis ve Karsilastirma Plani

> **For agentic workers:** Faz 3A'dan sonra uygulanir. Kalici kayit, paylasim baglantisi ve PDF rapor Faz 4'te kalir.

**Goal:** Kullanici 2D yerlesim, program ve teklif ile oynarken neyi degistirdigini kaybetmesin; alternatifleri ayni parsel/fizibilite tabaninda yan yana karsilastirabilsin.

**Architecture:** `StudioScenarioDraft` tarayici oturumu icindeki serializable state'tir. Degisiklikler command/patch tabanli gecmiste tutulur. Server persistence yoktur; Faz 4 bu state'i kalici `StudioSnapshot`/rapor artefact'ina cevirir.

**Depends on:** Faz 2A, Faz 2B, Faz 3A.

## Global Constraints

- Undo/redo yalnizca Studio degisikliklerini etkiler; hesap sayfasinin diger form alanlarini geri almaz.
- Gecmis kaydi hassas veya buyuk ham geometriyi sinirsiz buyutmez.
- Senaryo kopyasi, kaynak parsel ve fizibilite referansini tasir; bunlari birbirinden koparmaz.
- “Kaydedildi” ifadesi kalici sunucu kaydi yoksa kullanilmaz; “bu oturumda taslak” denir.

### Task 1: Senaryo ve command modeli

**Files:**
- Add: `src/lib/studio/scenarioDraft.ts`
- Add: `src/lib/studio/scenarioDraft.test.ts`
- Add: `src/lib/studio/scenarioHistory.ts`
- Add: `src/lib/studio/scenarioHistory.test.ts`
- Modify: `src/lib/studio/types.ts`

- [x] `StudioScenarioDraft` icine taban snapshot referansi, layout, program, teklif ve varsayim bolumlerini koy (`scenarioDraft.ts`, `types.ts`).
- [x] `ScenarioCommand` ile layout/program/teklif/varsayim degisikliklerini ayrik tiplerde temsil et (`types.ts`, `applyScenarioCommand`).
- [x] Undo, redo, dirty state ve maksimum gecmis derinligini deterministic uygula (`scenarioHistory.ts`).
- [x] Geri al/ileri al, yeni degisiklik sonrasi redo temizligi ve gecersiz command testlerini yaz (`scenarioHistory.test.ts`, 17 test).

### Task 2: Yeniden hesaplama etkisi

**Files:**
- Add: `src/lib/studio/scenarioImpact.ts`
- Add: `src/lib/studio/scenarioImpact.test.ts`
- Modify: `src/lib/studio/offerValidation.ts`

- [x] Her command icin etki alani tanimla: gorsel, program, degerleme, teklif veya kaynak-veri (`scenarioImpact.ts`).
- [x] Footprint/program degisirse teklifleri otomatik kesin sonuc gibi tutma; `needsRebalance` durumuna cek (`checkRequiresRebalance`).
- [x] Sadece metin/not degisikligi teklif dengesini gecersiz kilmasin (`checkRequiresRebalance`).
- [x] Etki tablosu ve `needsRebalance` mantigi icin saf testler yaz (`scenarioImpact.test.ts`, `offerValidation.test.ts`, 14 test).

### Task 3: Senaryo cubugu ve geri al/ileri al

**Files:**
- Add: `src/components/studio/StudioScenarioBar.tsx`
- Add: `src/components/studio/StudioScenarioBar.module.css`
- Add: `src/components/studio/StudioScenarioBar.test.tsx`
- Modify: `src/app/hesapla/page.tsx`

- [x] Ust cubukta senaryo adi, “bu oturumda taslak”, son degisiklik durumu, undo ve redo eylemlerini sun (`StudioScenarioBar.tsx`).
- [x] Klavye kisayollarini (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`) sadece Studio odagindayken uygula (`StudioScenarioBar.tsx`).
- [x] Tarihceyi birincil arayuz yapma; son anlamli 10-20 degisikligi acilir liste olarak goster (`ScenarioHistoryEntry`).
- [x] Gecersizlesmis teklif varsa cubukta sakin ama gorunur “teklifi dengele” cagrisi goster (`StudioScenarioBar.tsx`).

### Task 4: Alternatif senaryo kopyalama ve karsilastirma

**Files:**
- Add: `src/lib/studio/scenarioComparison.ts`
- Add: `src/lib/studio/scenarioComparison.test.ts`
- Add: `src/components/studio/ScenarioComparison.tsx`
- Add: `src/components/studio/ScenarioComparison.module.css`
- Add: `src/components/studio/ScenarioComparison.test.tsx`

- [x] “Alternatif olustur” eylemi mevcut taslagi yeni senaryo ID'siyle kopyalar (`cloneScenarioDraft`, `handleAddAlternative`).
- [x] En fazla uc aktif alternatif tut; limit asilirsa kullanicidan birini kapatmasini iste (`MAX_SCENARIO_ALTERNATIVES = 3`).
- [x] Karsilastirmada toplam alan, daire/dukkan envanteri, arsa sahibi teklifi, dengeleme farki ve uyari sayisini yan yana goster (`ScenarioComparison.tsx`).
- [x] Fark bilinmiyorsa bos veya sifir gosterme; “varsayim gerekli” durumunu koru (`cashEqualizationStatus`).

### Task 5: Oturum guvenligi ve Faz 4 devri

**Files:**
- Add: `src/lib/studio/sessionDraftStorage.ts`
- Add: `src/lib/studio/sessionDraftStorage.test.ts`
- Modify: `src/lib/studio/snapshot.ts`

- [x] Tarayici session storage kullanilacaksa sema versiyonu, TTL ve temizleme kurallari tanimla (`sessionDraftStorage.ts`, `STORAGE_SCHEMA_VERSION = 1`).
- [x] Oturum geri yuklemede kaynak/fizibilite hash'i degismisse taslagi “yeniden dogrulama gerekli” yap (`computeBaseSnapshotHash`).
- [x] Kalici kayit yoksa veri kaybi riskini cok kisa ve acik bir notla bildir (`"Bu oturumda taslak"` badge).
- [x] Faz 4 snapshot DTO'sunun senaryo/adim gecmisini degil, secilen son durumu export edecegini belgele (`createStudioSnapshotFromScenarioDraft`).

### Task 6: Verification

- [x] `npx jest src/lib/studio src/components/studio src/app/hesapla` calistir (70 suite, 590 test PASS; tum repo 213 suite, 1642 test PASS).
- [x] `npx tsc --noEmit` calistir (Temiz, kod 0).
- [x] Undo/redo, teklif gecersizlesmesi, alternatif kopyalama ve mobil scenario bar akisini tarayici smoke testiyle kontrol et (`output/playwright/studio-scenario-smoke.cjs` PASS, ekran goruntuleri dogrulandi).

## Exit Criteria

- [x] Kullanici senaryo duzenlerken son gecerli hale geri donebilir.
- [x] Bir footprint/program degisikliginin teklifi etkiledigi gizlenmez (`needsRebalance`).
- [x] En az iki alternatif ayni kaynak veride sayisal olarak karsilastirilabilir (`ScenarioComparison`).
- [x] Kalici rapor/kayit beklentisi ile oturum taslagi karistirilmaz ("Bu oturumda taslak" dili korundu).

---

## Faz 3B — TAMAMLANDI (2026-08-22)

- **Testler:** 213 test suite, 1642 testin tumu PASS (stale `.worktrees` haric tum `src/` temiz).
- **TypeScript:** `npx tsc --noEmit` 0 hata ile basarili.
- **Build:** `npm run build` (Turbopack production build) 0 hata ile basarili.
- **Tarayıcı Doğrulaması:** Playwright smoke testi (`studio-scenario-smoke.cjs`) hem 1440px masaüstü hem 390px mobil viewport'ta çalıştırıldı, görsel çıktılar `output/playwright/studio-scenario-*.png` kaydedilip doğrulandı.
- **Mobil Entegrasyonu:** `StudioScenarioMobileLeaf.tsx` ve `SonucKarti.tsx`ye eklenen "Senaryolar & Karşılaştırma" butonu ile masaüstü ve mobil paritesi sağlandı.
