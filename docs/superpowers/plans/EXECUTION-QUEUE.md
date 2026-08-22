# Superpowers Execution Queue

Bu dosya plan arsivini uygulanabilir bir siraya indirger. `README.md` hangi spec'in hangi planla kapandigini gosterir; bu dosya ise hangi isi once baslatmanin daha mantikli oldugunu soyler.

## Queue Principles

- Once veri dogrulugu ve hesap motoru, sonra gorsel/yerlesim isleri.
- Ayni yuzeye dokunan planlar cakismayacak sekilde siralanir.
- Obsolete/closure/orchestration dosyalari dispatch edilmez.
- Her item kendi canonical planindaki test/build kapilariyla kapanir.
- Task checkbox'lari bitmis olsa bile final verification aciksa bir sonraki dispatch o planin kapanis dogrulamasidir.

---

## Completed / Closed In Current Branch

- [x] `2026-07-01-emsal-arsa-maliyeti.md` — kod commit: `c0fe45b`.
- [x] `2026-08-14-hesapla-masaustu-girdi-sirasi.md` — mevcut uygulama dogrulandi, kod commit: `c0fe45b`.
- [x] `2026-08-13-hesapla-masaustu-sutun-dengesi.md` — mevcut uygulama dogrulandi, kod commit: `c0fe45b`.
- [x] `2026-08-12-pazaryeri-veri-butunlugu.md` — mevcut uygulama dogrulandi, kod commit: `c0fe45b`.
- [x] `2026-08-13-pwa-guncelleme-bildirimi.md` — mevcut uygulama dogrulandi, kod commit: `c0fe45b`.
- [x] `2026-06-08-arsabil-professional-ui-redesign.md` — kod commit: `c0fe45b`; Playwright smoke PASS.
- [x] `2026-07-28-mobil-premium-liquid-glass.md` Gate 2 — Faz 2-9 detay planlari olusturuldu.
- [x] `2026-07-28-mobil-faz2-pazar-ilan-detay.md` — final verification ve validation notes tamam.
- [x] `2026-07-28-mobil-faz3-auth-ana-ekran.md` — final verification tamam.
- [x] `2026-07-28-mobil-faz4-mesaj-teklif.md` — final verification tamam.
- [x] `2026-07-28-mobil-faz5-portfoy.md` — final verification tamam.
- [x] `2026-07-28-mobil-faz6-profil-ayar-bildirim.md` — final verification tamam.
- [x] `2026-07-28-mobil-faz7-ilan-sihirbazi.md` — final verification tamam.
- [x] `2026-07-28-mobil-faz8-admin.md` — final verification tamam.
- [x] `2026-07-28-mobil-faz9-durum-ekranlari.md` — final verification tamam.
- [x] `2026-08-15-mobil-kart-dili-revizyonu-faz1.md` — final verification tamam.
- [x] `2026-08-15-mobil-kart-dili-revizyonu-faz2.md` — final verification tamam.
- [x] `2026-08-16-arsabil-studio-faz0-veri-ve-mimari-hazirlik.md` — mevcut uygulama dogrulandi.
- [x] `2026-08-16-arsabil-studio-faz1-3d-bina-kutlesi-mvp.md` — final verification tamam.
- [x] `2026-08-19-arsabil-studio-faz1a-gercek-parsel-geometrisi-ve-emsal-contract.md` — final verification tamam (8 suite/34 test, tsc, build, Playwright smoke PASS).
- [x] `2026-08-19-arsabil-studio-faz1b-3d-operasyonel-kalite.md` — final verification tamam (19 suite/86 test, tsc, build, Playwright smoke PASS — bkz. plan dosyasindaki Validation Notes).
- [x] `2026-08-16-arsabil-studio-faz2-karma-program-ve-teklif-senaryolari.md` — final verification tamam (22 suite/104 test, tsc, build PASS — saf `src/lib/studio/*` katmani, UI kodu bu fazda yok, bkz. plan dosyasindaki Validation Notes).
- [x] Studio mobil entegrasyonu (Bilinen Bosluk #1, ayri bir plan dosyasi yok — dogrudan kullanici talimatiyla yapildi) — final verification tamam: 700 test (4 stale worktree hatasi haric hepsi PASS), tsc, build, Playwright smoke (`studio-mobile-integration-smoke.cjs`) PASS. Detay asagida.
- [x] `2026-08-19-arsabil-studio-faz2a-program-envanteri-ve-kat-bantlari.md` — final verification tamam: 345 suite/2751 test (stale worktree haric hepsi PASS), tsc, build, Playwright smoke (`studio-programband-3d-smoke.cjs`) PASS. Mobil entegrasyonu da (Program Dagilimi paneli) bu fazda basindan dahil edildi. Kok neden bulgusu: mevcut `FloorBands` kat-halkasi konum hatasi duzeltildi. Detay plan dosyasindaki Validation Notes'ta.
- [x] `2026-08-19-arsabil-studio-faz2b-arsa-sahibi-teklif-ve-dengeleme.md` — final verification tamam: studio kapsami 175/175 test (`src/lib/studio` + `src/components/studio`), tsc, build, Playwright smoke (`landowner-offer-smoke.cjs`) PASS. Mobil entegrasyonu (Arsa Sahibi Teklifi yapragi) bu fazda basindan dahil edildi. Re-scope karariyla per-unit envanter secimi/atama KAPSAM DISI birakildi (bkz. plan dosyasindaki Re-scope Notu) — `landownerOffer.ts` bu oturumda HIC degismedi, orijinal 6 testi degismeden yesil kaldi. Kendi bulgum: `shareRatio` kablolamasi yanlislikla `landShareRatio` (ham state) kullaniyordu, `effectiveLandShareRatio` (motorun gercek kullandigi deger) olmali — tarayiciya gecmeden duzeltildi. Detay plan dosyasindaki Task 6/Exit Criteria notlarinda.
- [x] `2026-08-19-arsabil-studio-faz3a-kontrollu-2d-yerlesim-tahtasi.md` — final verification tamam: 793/793 gercek test (`src/lib/studio`+`src/components/studio`+`src/app/hesapla`, stale worktree haric), tsc, build, Playwright smoke (`studio-2d-layout-smoke.cjs`) PASS — taslak/kapsama-donus/parsel-disi-tasma/eksik-geometri/mobil hepsi kapsandi. Mobil entegrasyonu (2D Yerleşim Tahtası yapragi — masaustunun IKI paneli TEK yaprakta) bu fazda basindan dahil edildi. `layoutDraft`/`geometry2d.ts` saf lib katmani + `Studio2DPreview`/`StudioLayoutControls` UI + 3D senkronizasyonu (`resolveEffectiveMass`) + `ProgramMixPanel`e "yeniden hesaplama gerekli" banner'i + snapshot genisletmesi hepsi tamamlandi. REAL BUG: `isPointInPolygon`in standart ray-casting'i, bir poligonun KENDI koseleri kendine karsi test edilince dejenere oluyordu — degistirilmemis varsayilan durumda bile sahte "parsel disina tasiyor" uyarisi cikiyordu; Playwright ile yakalanip kok nedenden (`isPointOnPolygonBoundary` + 1e-6m tolerans) duzeltildi. Detay plan dosyasindaki Task 2/6 notlarinda.
- [x] `2026-08-19-arsabil-studio-faz3b-senaryo-taslagi-gecmis-ve-karsilastirma.md` — final verification tamam: 213 suite / 1642 test PASS (70 suite / 590 test Studio + Hesapla kapsami), `tsc --noEmit` temiz, `npm run build` (Turbopack) temiz, Playwright smoke (`studio-scenario-smoke.cjs`) masaüstü (1440px) ve mobil (390px) akışlarında PASS. `StudioScenarioBar`, `ScenarioComparison`, `StudioScenarioMobileLeaf`, `scenarioDraft.ts`, `scenarioHistory.ts`, `scenarioImpact.ts`, `scenarioComparison.ts`, `sessionDraftStorage.ts` ve Faz 4 devir fonksiyonu `createStudioSnapshotFromScenarioDraft` eksiksiz tamamlandı.
- [x] `2026-08-19-arsabil-studio-faz4a-kalici-senaryo-ve-versiyonlama.md` — final verification tamam: 222 suite / 1675 test PASS (50 suite / 309 test Studio + API kapsami), `tsc --noEmit` 0 hata ile temiz, `npm run build` (Turbopack) temiz, Playwright smoke (`studio-faz4a-smoke.cjs`) masaüstü (1440px) ve mobilde (390px) PASS. `StudioScenario`, `StudioScenarioVersion` Prisma modelleri, `persistenceTypes.ts`, `snapshotVersioning.ts`, `studioScenarioRepository.ts`, `StudioSaveDialog.tsx`, `StudioScenarioLibrary.tsx`, `studioScenarioAudit.ts` ve `/api/studio/scenarios/*` authenticated API route'ları eksiksiz kuruldu.
- [x] `2026-08-19-arsabil-studio-faz4b-teklif-raporu-ve-guvenli-paylasim.md` — final verification tamam: 232 suite / 1711 test PASS (61 suite / 349 test Studio, PDF ve API kapsamı), `tsc --noEmit` 0 hata ile temiz, `npm run build` (Turbopack) temiz, Playwright smoke (`studio-faz4b-smoke.cjs`) PASS. `StudioShareToken` Prisma modeli, `proposalViewModel.ts`, `exportReadiness.ts`, `proposalAssets.ts`, `ProposalVisualCapture.tsx`, `StudioProposalPreview.tsx`, `StudioProposalDocument.tsx`, `studioProposalPdfGenerator.ts`, `shareToken.ts`, `/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/share`, `/api/studio/share/[token]`, `/studio/share/[token]` public sayfası, `ShareProposalDialog.tsx`, `StudioScenarioBar.tsx`, `ortakKatmanlar` ve `StudioScenarioMobileLeaf.tsx` eksiksiz entegre edildi.
- [x] `2026-08-23-arsabil-studio-vitrin-3d-gorsel-zenginlestirme.md` — final verification tamam: 58 suite / 340 test Studio kapsamı (Tüm repo: 232 suite / 1711 test) PASS, `tsc --noEmit` 0 hata ile temiz, `npm run build` (Turbopack) temiz, Playwright smoke (`studio-vitrin-smoke.cjs`) PASS. Poly Haven CC0 self-host asset'leri (`tree-01.glb`, `tree-02.glb`, `road-asphalt`, `outdoor-env.hdr`, `LICENSE.md`), `proceduralFacade.ts`, `siteContext.ts`, `StudioVitrinScene.tsx`, `StudioVitrinPreview.tsx` ve `/studio/scenarios/[scenarioId]/versions/[versionNumber]/vitrin` geçici doğrulama route'u eksiksiz tamamlandı.

---

## Recommended Next Dispatch

Studio Vitrin 3D görsel zenginleştirme başarıyla tamamlandı. Sıradaki işler: Bilinen ihtiyaçlar (Emsal/Arsa Alanı/Taban Alanı hesaplama uyumu, Proje İsmi alanları, Raporlama başlık/açıklama özelleştirme vb.).

## Bilinen, Henüz Tasarlanmamış İhtiyaçlar (2026-08-23, kullanıcı talebiyle kayıt altına alındı)

Kullanıcıyla Studio Vitrin brainstorm'u sırasında 4 konu konuşuldu; yalnızca 1'i (yukarıdaki Vitrin) tam spec+plan aşamasına geldi. Diğer 2'si BİLİNÇLİ olarak bu turda tasarlanmadı — kaybolmasınlar diye burada isim olarak duruyorlar, ama "planlandı" DEĞİLLER, kendi brainstorm+spec turlarını bekliyorlar:

- **Otomatik yerleşim/daire sayısı önerisi algoritması** — arsa + program karışımından "kaç daire, hangi tip (örn. 2+1 65m²)" otomatik önerisi üreten bir hesap motoru. Şu an `ProgramMixPanel`de kullanıcı ELLE giriyor; bu, o girdiyi otomatikleştirecek bir öneri katmanı olurdu. **Henüz brainstorm yapılmadı — kendi spec turunu gerektirir.**
- **Kredi/abonelik ile rapor satışı** — Studio çıktısının (Faz 4B'nin raporu, Vitrin'in 3D sahnesi) kredi veya abonelik modeliyle ticarileştirilmesi. Bu tamamen bir billing/erişim-kontrolü konusu, 3D render'la ilgisi yok. **Henüz brainstorm yapılmadı — kendi spec turunu gerektirir.**

**Kontrol edilip GEREKSİZ bulunan madde:** TKGM Atlas tarzı "arazi/uydu görünümü" — bu ZATEN mevcut: `ParcelPicker.tsx` Esri uydu görüntüsü kullanıyor, `MapView.tsx` (pazar yeri) 3 katman arası geçiş sunuyor (Sokak Light/Dark + 🛰️ Uydu, aynı Esri kaynağı). Aksiyon gerekmiyor.

## Do Not Dispatch Directly

Bu dosyalar orchestration/closure/pointer dosyalaridir; dogrudan kod isi olarak baslatilmamali:

- `2026-06-07-arsabil-gelistirme-yol-haritasi.md`
- `2026-06-07-arsabil-faz2.md`
- `2026-06-07-arsabil-faz3b.md`
- `2026-06-07-mobile-ui-premium-redesign.md`
- `2026-06-08-arsabil-ui-design-system.md`
- `2026-07-03-mobile-ui-redesign.md`
- `2026-07-28-mobil-premium-liquid-glass.md`
- `2026-07-29-hesapla-girdi-mimarisi.md`
- `2026-08-15-mobil-kart-dili-revizyonu.md`
- `2026-08-16-arsabil-studio-2d-3d-mvp.md`
- `2026-08-16-arsabil-studio-karma-program-ve-teklif-senaryolari.md`
- `2026-08-16-arsabil-studio-2d-editor-lite.md`
- `2026-08-16-arsabil-studio-rapor-paylasim.md`
- `2026-08-16-arsabil-studio-ar-ic-mimari-marketplace-karar-kapisi.md`
- `2026-08-19-arsabil-studio-parsel-geometrisi-ve-emsal-contract.md`
- `2026-08-19-arsabil-studio-pilot-operasyon.md`








