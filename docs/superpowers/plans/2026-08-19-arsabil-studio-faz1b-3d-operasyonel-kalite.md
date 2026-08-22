# Arsabil Studio - Faz 1B 3D Operasyonel Kalite Plani

> **For agentic workers:** Faz 1 ilk 3D render ve Faz 1A veri kaynak contracti ile birlikte veya hemen sonrasinda uygulanir.

**Goal:** 3D bina kutlesini etkileyici bir demo olmaktan cikarip hesap ekraninda guvenilir, mobilde kontrollu ve veriye sadik bir karar destek gorunumune donusturmek.

**Architecture:** `StudioScene` sadece render davranisini yonetir; is kurali ve maliyet/uygunluk karari `src/lib/studio` tarafinda kalir. WebGL olmayan cihazlar icin ayni veriyi kullanan HTML/CSS ozet fallback'i bulunur.

## Global Constraints

- 3D gorunum hukuki veya mimari uygulama projesi iddia etmez.
- Canvas, kullanici goruntulemek istemedikce agir kaynak tuketmez.
- Mobil cihazda karmaşık kontrol seti yerine az sayida tahmin edilebilir eylem kullanilir.
- Her gorsel bilgiye esdeger metin ozetinden ulasilir.

### Task 1: Acilis, gorunum ve kontrol modeli

**Files:**
- Modify: `src/components/studio/StudioPreview.tsx`
- Modify: `src/components/studio/StudioScene.tsx`
- Modify: `src/components/studio/StudioPreview.module.css`

- [x] Studio panelini varsayilan olarak kapali/tembel yuklenen hale getir; ilk hesap sonucunu geciktirme.
- [x] “Gorunumu sifirla”, “kat bantlari”, “tel kafes” kontrollerini tek bir kompakt kontrol grubunda tut.
- [x] Kamera icin parsel ve kutle boyutuna gore deterministik baslangic konumu tanimla.
- [x] Orbit kontrolunde asiri yakinlasma, ters donme ve sayfa kaydirma cakismasini sinirla.

### Task 2: Gorsel semantik

**Files:**
- Modify: `src/components/studio/StudioScene.tsx`
- Add: `src/components/studio/studioVisualTokens.ts`
- Add/update: geometry/scene testleri

- [x] Parsel zemini, onerilen kutle ve kat bantlari icin sabit anlamlar tanimla; program rengi gelmeden dekoratif cok renk kullanma.
- [x] Yukseklik, kat adedi ve insaat alani metriklerini sahne yanindaki ozetle ayni kaynaktan besle.
- [x] Uyari varken kutleyi gizleme; uyariyi sahneyi kaplamayan bir bilgi katmaninda goster.
- [x] Faz 2 program mix geldiginde kullanilacak renk slotlarini simdiden token olarak ayir.

### Task 3: WebGL fallback ve erisilebilirlik

**Files:**
- Modify: `src/components/studio/StudioPreview.tsx`
- Add: `src/components/studio/StudioFallback.tsx`
- Add: `src/components/studio/StudioFallback.test.tsx`

- [x] WebGL desteklenmiyorsa veya Canvas hata verirse HTML ozet, footprint semasi ve metrik tablosu goster.
- [x] Canvas yukleme, basarisizlik ve geometri eksikligi durumlarini birbirinden ayir.
- [x] Klavye ile control odagina ulasilabildigini; canvas olmayan fallback'in tum temel veriyi sundugunu test et.
- [x] `prefers-reduced-motion` icin kamera/animasyon davranisini azalt.

### Task 4: Performans ve mobil dayaniklilik

**Files:**
- Modify: `src/components/studio/StudioScene.tsx`
- Modify: `src/components/studio/StudioPreview.module.css`
- Add: `src/components/studio/studioPerformance.ts`

- [x] DPR ust siniri, sade isik sayisi ve gerekmedikce kapali render dongusu ile mobil GPU yukunu sinirla.
- [x] Buyuk/karmaşık polygonlar icin nokta limiti ve sadeleştirme uyarisi belirle.
- [x] Panel gorunmez oldugunda render dongusunu durdur veya scene'i kaldir.
- [x] 360 px, 768 px ve masaustu genisliklerinde container boyutu ve bilgi hiyerarsisini kontrol et (statik CSS denetimi; canli tarayici QA Task 5'te).

### Task 5: Gorsel QA ve kabul senaryolari

- [x] Tarayici smoke: gecerli dogrulanmis geometri, taslak geometri, eksik geometri, WebGL fallback (verified/draft component seviyesinde kapsanir — Faz1A'daki ayni gerekce: canli dogrulanmis parsel fixture'i bu worktree'de yok).
- [x] Her durumda hesap ekraninin diger alanlari erisilebilir ve kaydirilabilir kalir.
- [x] Masaustu ve mobil ekran goruntulerini yalnizca QA yapildiginda `output/playwright/` altina kaydet.
- [x] `npx jest src/lib/studio src/components/studio` ve `npx tsc --noEmit` calistir.

## Exit Criteria

- 3D onizleme hesap sonucunun performansini veya mobil kullanilabilirligini bozmaz.
- Canvas olmadan da kullanici ayni temel karari verebilir.
- Faz 2'de gelecek 2+1, 3+1 ve dukkan bolgeleri icin gorsel dil ve renk slotlari hazirdir.

## Validation Notes

- Panel varsayilan kapali/tembel yuklenen (`next/dynamic`, `ssr:false`) hale getirildi; `StudioScene` (three/@react-three) yalnizca kullanici acikca actiginda indirilir/mount edilir.
- Kamera konumu artik kutlenin taban acikligina/yuksekligine gore deterministik (`studioCamera.ts`); OrbitControls sinirlari (min/maxDistance) bu mesafeyle orantili, zeminin altina donmeyi/asiri yakinlasmayi sinirlar; sayfa kaydirma cakismasi icin "etkilesimi baslat" katmani eklendi.
- Sabit renk sozlugu (`studioVisualTokens.ts`) + Faz 2 icin rezerve program renk slotlari eklendi; kat bandi hesap kaynaği (`floorBands.ts`) sahne ve ozet kartla ayni `mass` kaynagindan besleniyor; mass varken de uyarilar artik gosteriliyor (onceden sessizce dusuyordu).
- WebGL yok/canvas hata durumlari icin canvas gerektirmeyen HTML fallback (`StudioFallback.tsx`, footprint SVG semasi + metrik tablo) ve error boundary (`StudioSceneBoundary.tsx`) eklendi; `prefers-reduced-motion` icin orbit damping kapatiliyor.
- Performans: `frameloop="demand"`, DPR sinirlari korunuyor, >64 noktali footprint icin sadelestirme uyarisi (`studioPerformance.ts`), panel scroll ile ekran disina cikinca sahne tamamen sokuluyor (`useIsElementVisible.ts`, callback-ref tabanli — duz `RefObject` ile kosullu mount edilen elemanı asla gozlemleyemedigi canli testte yakalandi).
- **Onemli bulgu (kapsam disi, ayrica karar gerektirir):** Studio paneli su an YALNIZCA `/hesapla` masaustu dalinda kablolu (`page.tsx:939`); `HesaplaMobile.tsx`'te hic referansi yok. `isDesktopViewport` (`matchMedia('not all and (max-width: 768px)')`) 768px ve altinda her zaman false dondugu icin gercek mobil cihazlarda (360px, 390px) Studio hic gorunmuyor — bu Faz1B'nin degil, ayri bir entegrasyon kararinin kapsami.
- `npx jest src/lib/studio src/components/studio --no-coverage --roots "<rootDir>/src"` PASS: 19 suite / 86 test.
- `npx tsc --noEmit` PASS.
- `npm run build` PASS.
- `node output/playwright/studio-faz1b-smoke.cjs` PASS (exit 0): eksik geometri, demo/taslak geometri (desktop, `canvasUniqueColors=116`, tasma yok), WebGL fallback (metin ozet+metrik tablo dogru gosterildi, Studio canvas'i hic mount olmadi), 360px/390px mobil (Studio yok ama tasma da yok), 900px dar masaustu (tasma yok). Ekran goruntuleri `output/playwright/studio-faz1b-*.png`.
