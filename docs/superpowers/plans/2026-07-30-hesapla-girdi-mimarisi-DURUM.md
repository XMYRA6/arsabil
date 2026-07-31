# Girdi Mimarisi Planı — DURUM (2026-07-31 akşam, ara verildi)

Bu dosya **git'e commit'li** bir devam notudur. Ayrıntılı ledger
`.superpowers/sdd/2026-07-30-hesapla-girdi-mimarisi/progress.md` içinde ama o dizin
gitignored — `git clean -fdx` onu siler, worktree silinirse gider. Bu dosya hayatta kalır.

## Nerede kaldık

**Plan:** `docs/superpowers/plans/2026-07-30-hesapla-girdi-mimarisi.md` (10 task)
**Spec:** `docs/superpowers/specs/2026-07-29-hesapla-girdi-mimarisi-design.md`
**Branch:** `feature/mobil-liquid-glass` · **HEAD: `08a39bb`** · worktree
`.claude/worktrees/mobil-liquid-glass`
**Yürütme yöntemi:** `superpowers:subagent-driven-development`

| Task | Durum | Commit aralığı |
|---|---|---|
| 1 — Birim maliyet kaynağı / öncelik kuralı | ✅ complete | `ea25d66`..`f7d4c6f` |
| 2 — `KonumBlogu` | ✅ complete | `f7d4c6f`..`66830e3` |
| 3 — `KarsilastirmaBlogu` | ✅ complete | `66830e3`..`8a279a1` |
| 4 — `SonucKarti` satırları | ✅ complete | `8a279a1`..`00e72de` |
| 5 — Formül parametreleri yapraktan çıktı | ✅ complete | `00e72de`..`d75703b` |
| 6 — Tek kapı + `page.tsx` bağlaması | ✅ complete | `d75703b`..`33ffb3c` |
| 7 — Analiz drill-down + finansal özet | ✅ complete (1 fix turu) | `892ab70`..`b77aa66` |
| 8 — Masaüstü görünürlük (K7) | ✅ complete (1 fix turu) | `b77aa66`..`dd122d8` |
| 9 — Raporlarım'a PDF | ✅ complete | `dd122d8`..`25608ff` |
| 10 — Final doğrulama | ✅ complete (dokunma hedefi kalemi ölçümle triyaja alındı) | `25608ff`..`08a39bb` |

**Doğrulama (HEAD `08a39bb`):** `npx tsc --noEmit` **0** · `npx jest --no-coverage`
**716/716** · `npx eslint src` **12** (2 hata/10 uyarı — baseline'ın aynısı) ·
`npm run build` başarılı · çalışma ağacı temiz.

## YARIN İLK İŞ

1. ~~**Task 10'un fix turu bitti mi?**~~ **KAPANDI (2026-07-31).** Fix turu hiç düşmemiş:
   `08a39bb` sonrasındaki tek commit `4c6de9a` ve o da yalnızca bu dokümanı değiştiriyor.
   Yeniden dispatch EDİLMEDİ — çünkü ölçüm, kararın dayandığı kök-neden modelini çürüttü
   (bkz. aşağıdaki bölüm). Task 10 `complete`. Plan 10/10.
2. ~~**Whole-branch review**~~ **YAPILDI (2026-07-31, `c65e26c..de8103a`, opus).**
   Verdict **With fixes** — Critical yok, 5 Important, 8 Minor. Reviewer masaüstü kısıtını
   `git diff` ile bizzat doğruladı ve üç insan override'ını bağımsız türetip haklı buldu.
   **I1 + I2 + I4 ve M4 + M5 kapatıldı (`de1a766`; jest 728/728, tsc 0, eslint 12 baseline).**
   Ayrıntı ve tam triyaj: `.superpowers/sdd/2026-07-30-hesapla-girdi-mimarisi/progress.md`
   sonundaki "WHOLE-BRANCH REVIEW" bölümü.

   **Sonraki branch'e devreden:** I3 (`.mobileSidebar` + `.mobileActionsSlot` — ~115 satır JSX
   iki yönde de ölü, silinirse `pageStyles.scope.test.ts` sadeleşir), I5 (`page.tsx`i render
   eden hiçbir davranış testi yok — I1/I2'nin gözden kaçmasının yapısal nedeni), M1/M2/M3/M6/
   M7/M8.

   **Recommendation 4 — İNSAN KARARI VERİLDİ (2026-07-31): dokunulmuyor, Parça 3'e devrediliyor.**
   Masaüstünde piyasa fiyatı alanı artık iki yerde görünüyor: Task 8'in eklediği "Piyasa Analizi"
   grubu (`page.tsx` sol sütun) ve `HesapOzetiSeridi`'nin kendi input'u (`:976` ve `:1043`, iki
   kopya). İkisi aynı state'e bağlı ve senkron kalıyor — **bug değil**, ama spec §5 alanı tek
   yerde tarif ediyor. Hangisinin sahip kalacağı bir yerleşim kararı, o yüzden **ayrı spec
   bekleyen "Parça 3 — masaüstü `/hesapla` yerleşimi + `HesapFişi` sunumu"** işinin kapsamında
   çözülecek. Bu branch'te değiştirilmedi.

   **Dokunma hedefi takip kalemine eklenecek not (reviewer'dan):** yanlış dokunuş no-op DEĞİL —
   `StickyActionBar`'a giden dokunuş `handleSaveReport`'u tetikliyor (`HesaplaMobile.tsx:105-114`
   → `page.tsx`), yani rapor kaydeder ya da auth modalını açar. Düşük olasılık, önemsiz olmayan
   sonuç; takip spec'inde "kozmetik" diye yeniden triyaj edilmesin.
3. Sonra `superpowers:finishing-a-development-branch`.

### Task 10'un dokunma hedefi kalemi — ÖLÇÜMLE KAPANDI, KOD YAZILMADI

**Kusur:** 390×844'te dinlenme halinde bazı girdi kontrollerinin **gerçek vuruş alanı**
(`document.elementFromPoint`) `StickyActionBar`/`BottomNavbar`'a ait — görsel konuma dokunuş
YANLIŞ elemana gidiyor.

**Önceki controller kararı (ARTIK GEÇERSİZ):** "minimal `padding-bottom` ile düzelt".
Bu karar, kaydırma konteynerinin alt dolgusunun EKSİK olduğu varsayımına dayanıyordu.

**2026-07-31 canlı ölçümü bu varsayımı çürüttü** (Playwright, 390×844, her etkileşimli eleman
için `elementFromPoint`):

```
viewport 844 · scrollHeight 1063 · maxScroll 219
main padding-bottom 96px (--mobile-nav-pb) + MobileScreen padding-bottom 72px = 168px
sabit çubuklar: StickyActionBar ~64px + BottomNavbar 96px = ~164px
scrollTop=0 → 2 ihlal · 40 → 3 · 100 → 2 · 150 → 1 · 219 (maxScroll) → 0 ihlal
```

**Alt dolgu zaten yeterli (168 > 164)** ve `maxScroll`'da her kontrol erişilebilir. Daha fazla
padding yalnızca `maxScroll`'u büyütür; `scrollTop=0`'daki isabet testini **matematiksel olarak
değiştiremez**, sadece ölü kaydırma alanı yaratır. Yani prescribed fix etkisiz olurdu.

**Gerçek kök neden:** içerik 1063px, kullanılabilir viewport 844 − 164 = **680px**. İçerik
kullanılabilir alanı 215px aşıyor, dolayısıyla dinlenme halinde son ~164px yarı saydam camın
altında kalıyor. Bu bir CSS dolgu bugu değil, **içerik yüksekliği** meselesi; minimal
dokunuşla kapanmaz. Kapatmak ~215px içerik kısaltmak (ör. arsa payı / daire sayısı satırlarını
gelişmiş ayarlar yaprağına almak) yani yeniden tasarım demek.

**Ölçüm notu:** bu turda "Metrekareyi azalt/artır" ihlal ETMİYOR (merkez 673, çubuk üstü ~680);
`task-10-report.md`'nin listesi `DistrictPrice` seed satırları yüzünden birkaç piksel kaymış.
Buna karşılık **`"Arsa payı yüzdesi"` input'u ve `"Gelişmiş ayarlar"` butonu raporda hiç
geçmiyordu ama ihlal ediyorlar.** Kusur sınıfı aynı, kapsanan eleman kimliği farklı.

**İnsan kararı (2026-07-31): kod yazılmayacak.** Bulgu whole-branch review'a "ölçülmüş, bilinen"
triyaj kalemi olarak gösterilecek ve **ayrı mobil yerleşim spec'ine aday** olarak yazılacak.

Ölçüm scripti tekrar koşulabilir (gitignored, dev server açıkken):
`SCROLLS=0,40,100,150,219 node .superpowers/touch-target-measure.mjs`

## Bu oturumda (2026-07-31) çıkan kalıcı dersler

- **Brief'in verbatim verdiği kod otorite değil.** Aynı plan üç kez kusurlu kod dayattı:
  hiç kırılamayan bir test (`'isSettingsSidebarOpen &&'` kodda yok, `indexOf` hep -1),
  temizlenemeyen kontrollü input (`Number('')===0` guard'a takılıyor), fiilen imkânsız bir
  DOM talimatı (`LocationSelector` bambaşka grid bölgesinde). Reviewer'a "plan böyle istedi"
  dedirtme; bulguyu insana taşı.
- **Karşılıklı mock körlük yaratır.** `HesaplaMobile` ile `AnalizSekmesi` iki ayrı "Analiz +
  Kapat" satırı basıyordu; her seviye diğerini mock'ladığı için hiçbir test görmedi. Çözüm:
  o tek test için `jest.requireActual` ile gerçek bileşeni render et.
- **Testin kırılabilirliğini kanıtlat.** Bu oturumda üç kez uygulandı: bugu kasten geri koy,
  testin kırıldığını gör, geri al, kanıtı rapora yaz.

## Bu plan boyunca çıkan ve HÂLÂ AÇIK olan kalemler

**Deferred minor'lar (whole-branch review'a triyaj için gösterilecek):**
- `analizAcik` + `fisAcik` iki bağımsız boolean → `fis && analiz` durumu erişilebilir.
  Tek bir `mobilDerinlik: 'girdi'|'fis'|'analiz'` union'ı bunu açık hale getirirdi.
- `SavedReportDocument.tsx` renk paleti + `StyleSheet`i `ReportDocument.tsx`ten yapısal olarak
  kopyalıyor (paylaşılan tema modülü yok) — biri restyle edilirse ikisi sessizce ayrışır.
- `savedReportContent.ts` `luxLevelModifier`i `nf.format()` olmadan basıyor (mevcut
  `reports/page.tsx` konvansiyonuyla tutarlı ama global `Intl.NumberFormat` kuralına uymuyor).
- İki PDF generator da aynı `React.createElement(...) as any` + eslint-disable bloğunu taşıyor.
- `kaynakEtiketi`'nin `switch`i `varsayilan`ı `default`la karşılıyor (dördüncü bir `tur`
  sessizce "Varsayılan" basar).

**İnsan onayı bekleyen (bloke etmiyor):** `SavedReportDocument.tsx`teki alt bilgi feragat
cümlesi spec'te yok — implementer'ın kendi işaretlediği UX kararı, reviewer düşük riskli buldu.

**Kod borcu — provenance işine dönen kişinin ele alması gereken en önemli kalem:**
`page.tsx`teki önceden var olan `useEffect`, ilçe seçiliyken `apartmentSize` değişince
`manualMarketPrice`'ı SESSİZCE yeniden hesaplıyor; ne toast atıyor ne `piyasaFiyatiElle`
bayrağına dokunuyor. Task 6'nın düzeltmesi yalnızca ilçe yolunu, Task 10'unki yalnızca
"konumu temizle" yolunu kapattı; bu üçüncü yol hâlâ açık.

## Merge durumu

**Branch merge EDİLMEDİ ve edilmemeli** — insan kararı (2026-07-29): mobil, il/ilçe seçici
olmadan yayına gitmesin. origin ÖLÜ (`github.com/XMYRA6/arsabil.git` → "Repository not found"),
push yok, her şey lokal. **Bu depoda `git add -A` KULLANMA** — takipsiz `hatalar/` ve ~12 MB
kullanılamaz `public/images/**` seti sessizce staging'e girer.

## Ayrı spec bekleyen işler (bu planın kapsamı DIŞI)

- **Parça 1** — aramalı parsel sorgu ekranı. TKGM'nin ada/parsel uç noktası `mahalleId` istiyor;
  o kimliğin kaynağı ayrı araştırma. **Merge'ü bekleten iş bu.**
- **Parça 3** — masaüstü `/hesapla` yerleşimi: `HesapFişi`'nin sunumu, sticky davranışı, genişliği.
- **Parça 4** — senaryo karşılaştırma: masaüstü sürümünün mobile portu DEĞİL, iki platform için
  yeni UX/UI çalışması.
