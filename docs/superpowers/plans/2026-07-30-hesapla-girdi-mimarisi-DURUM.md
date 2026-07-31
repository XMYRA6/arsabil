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
| 10 — Final doğrulama | ⏳ fix turu uçuşta kaldı | `25608ff`..`08a39bb`+ |

**Doğrulama (HEAD `08a39bb`):** `npx tsc --noEmit` **0** · `npx jest --no-coverage`
**716/716** · `npx eslint src` **12** (2 hata/10 uyarı — baseline'ın aynısı) ·
`npm run build` başarılı · çalışma ağacı temiz.

## YARIN İLK İŞ

1. **Task 10'un fix turu bitti mi?** Oturum kapanırken arka planda çalışıyordu.
   `git log --oneline -3` ve `.superpowers/sdd/.../task-10-report.md`in sonuna bak.
   - Bitmişse: scoped re-review koş (`re-review-prompt.md`, `scripts/review-package <plan> 08a39bb HEAD`),
     sonra defterde `Task 10: complete` satırını yaz.
   - Bitmemişse: aynı düzeltmeyi yeniden dispatch et (aşağıda tarif var).
2. **Whole-branch review** — planın son adımı. `superpowers:requesting-code-review`in
   `code-reviewer.md`'si, **en yetenekli modelle**, aralık `c65e26c..HEAD`
   (`scripts/review-package <plan> c65e26c HEAD`). Review'a defterdeki **deferred minor ve
   parked** satırlarını da göster ki merge öncesi hangileri kapanmalı diye ayıklasın.
3. Sonra `superpowers:finishing-a-development-branch`.

### Task 10'un yarım kalan fix'i (bitmediyse)

**Kusur (canlı ölçüldü):** 390×844'te scroll=0 iken "Metrekareyi azalt/artır" ve "Toplam daire
sayısı üzerinden hesapla" toggle'ının **gerçek vuruş alanı** (`document.elementFromPoint`)
`StickyActionBar`/`BottomNavbar`'a ait — görsel konuma dokunuş YANLIŞ elemana gidiyor.
Sırasıyla 40px ve 100px kaydırınca temizleniyor (`maxScroll=263px`).

**Kök neden:** Task 5'in `KonumBlogu`'yu girdi kartının en üstüne alması (kart ~130-150px uzadı)
— yani bu planın kendi ayak izi, önceden var olan bir yoğunluk sorunu değil.

**Controller kararı:** düzeltilecek, `task-11-acik-kalemler.md`ye ertelenmeyecek. Brief Step 6
"bulgular varsa düzelt" diyor, carve-out yok. **Minimal düzeltme** istendi: kaydırma
konteynerine alt sabit çubukları temizleyecek kadar alt boşluk (`padding-bottom` /
`scroll-padding-bottom`), yeniden tasarım DEĞİL. Kural **`@media (max-width: 768px)` içinde**
kalmalı, `env(safe-area-inset-bottom)` hesaba katılmalı. Doğrulama: scroll=0'da tüm etkileşimli
elemanlar için `elementFromPoint` → `matchesSelf: true` (dev-only `NEXTJS-PORTAL` sayılmaz),
1440×900'de masaüstü değişmemiş.

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
