# Girdi Mimarisi Planı — DURUM (2026-07-30 gece, ara verildi)

Bu dosya **git'e commit'li** bir devam notudur. Ayrıntılı ledger
`.superpowers/sdd/2026-07-30-hesapla-girdi-mimarisi/progress.md` içinde ama o dizin
gitignored — `git clean -fdx` onu siler. Bu dosya hayatta kalır.

## Nerede kaldık

**Plan:** `docs/superpowers/plans/2026-07-30-hesapla-girdi-mimarisi.md` (10 task)
**Spec:** `docs/superpowers/specs/2026-07-29-hesapla-girdi-mimarisi-design.md`
**Branch:** `feature/mobil-liquid-glass` · **HEAD: `33ffb3c`** · worktree
`.claude/worktrees/mobil-liquid-glass`
**Yürütme yöntemi:** `superpowers:subagent-driven-development` (her task için ayrı
implementer + bağımsız task review + gerekirse fix turu)

| Task | Durum | Commit aralığı |
|---|---|---|
| 1 — Birim maliyet kaynağı / öncelik kuralı | ✅ complete | `ea25d66`..`f7d4c6f` |
| 2 — `KonumBlogu` | ✅ complete (1 fix turu) | `f7d4c6f`..`66830e3` |
| 3 — `KarsilastirmaBlogu` | ✅ complete (1 fix turu) | `66830e3`..`8a279a1` |
| 4 — `SonucKarti` satırları | ✅ complete | `8a279a1`..`00e72de` |
| 5 — Formül parametreleri yapraktan çıktı | ✅ complete (1 fix turu) | `00e72de`..`d75703b` |
| 6 — Tek kapı + `page.tsx` bağlaması | ✅ complete (1 fix turu) | `d75703b`..`33ffb3c` |
| **7 — Analiz drill-down + finansal özet** | ⏭ **SIRADAKİ** | — |
| 8 — Masaüstü görünürlük (K7) | ⏳ bekliyor | — |
| 9 — Raporlarım'a PDF | ⏳ bekliyor | — |
| 10 — Final doğrulama | ⏳ bekliyor | — |

**Doğrulama (HEAD `33ffb3c`):** `npx tsc --noEmit` **0** · `npx jest --no-coverage`
**695/695** · `npx eslint src` **12** (2 hata/10 uyarı — baseline'ın birebir aynısı, hiçbiri
bu planın dosyalarında) · çalışma ağacı **temiz**, commit edilmemiş iş yok.

## Task 7'ye nasıl devam edilir

1. Worktree'ye gir, `npm install` / `npx prisma generate` gerekmiyor (bu worktree'de kurulu).
2. Brief üret:
   `<superpowers>/skills/subagent-driven-development/scripts/task-brief docs/superpowers/plans/2026-07-30-hesapla-girdi-mimarisi.md 7`
3. **Task 7 için önemli iki not:**
   - Task 6, grep şartı yüzünden `SekmeSecici`/`MobilSekme`/`SEKMELER` ve kullanılmayan
     `SegmentedTabs` import'unu `AnalizSekmesi.tsx`ten **zaten kaldırdı** (controller'ın
     dispatch hatası, kabul edildi). Task 7'nin brief'i o silmeleri hâlâ istiyor — **onlar
     yapılmış sayılacak**, tekrar aranmayacak. Kalan iş: `onKapat` prop'u, `FinancialDashboard`
     kartı, ve `Analiz.test.tsx`e finansal özet + `CostBreakdownChart` prop doğrulama testleri.
   - `AnalizSekmesi`'ne `onKapat` **zorunlu** prop olarak eklenince `page.tsx`teki
     `analiz={{ ... }}` çağrısı kırılır; **o çağrının sahibi Task 7'dir**, aynı task'ta
     `onKapat: () => setMobilAnalizAcik(false)` eklenecek. Her task `tsc`yi yeşil bırakır.

## Bu plan boyunca çıkan ve HÂLÂ AÇIK olan kalemler

**Task 10'un canlı turunda ölçülecek (spec §8 üç zorunlu doğrulama + bunlar):**
- `onParselAc` iki bölümü aynı anda vurguluyor (`bolum('kar','risk','iksa')` da `'risk'`
  içeriyor) ve hiçbirine kaydırmıyor; parsel bölümü yaprağın sonunda olduğu için ekran
  dışında açılabilir.
- Masaüstü pikselinin gerçekten değişmediği (kod yolu kanıtlı değişmemiş, görsel doğrulama
  yapılmadı) — 1440×900 turu.
- Masaüstü çekmecesinin `FormulParamsFields` render'ını koruyan otomatik test yok.

**Kod borcu (ertelenmiş, gerekçeli):**
- `analizAcik` + `fisAcik` iki bağımsız boolean → `fis && analiz` durumu erişilebilir.
  Tek bir `mobilDerinlik: 'girdi'|'fis'|'analiz'` union'ı bunu açık hale getirirdi.
- **`page.tsx:316-325` — önceden var olan bir `useEffect`, ilçe seçiliyken `apartmentSize`
  değişince `manualMarketPrice`'ı SESSİZCE yeniden hesaplıyor.** Ne toast atıyor ne
  `piyasaFiyatiElle` bayrağına dokunuyor. Yani kullanıcı elle piyasa fiyatı yazıp metrekareyi
  değiştirirse değeri bildirimsiz kaybediyor ve bayrak stale kalıyor. Task 6'nın düzeltmesi
  yalnızca ilçe yolunu kapsadı; bu ikinci sessiz ezme yolu **provenance işine dönen kişinin
  ele alması gereken en önemli açık kalem.**
- `kaynakEtiketi`'nin `switch`i `varsayilan`ı `default`la karşılıyor (dördüncü bir `tur`
  sessizce "Varsayılan" basar). `ilceSecildi`'de gereksiz `Math.round`.

## Bu plandan ÖNCEKİ işin durumu

Önceki plan (`2026-07-28-mobil-faz0-temel-faz1-hesapla.md`, 11 task) tamamlandı ve A1
whole-branch review borcu da kapatıldı (`c797c7f`..`7274b1c`). Onun açık kalemleri
`.superpowers/sdd/2026-07-28-mobil-faz0-temel-faz1-hesapla/task-11-acik-kalemler.md`de.
Kalan iki kalemi: **A1'in C2 kararı** (bu spec'le verildi) ve **B5** (`4f` yaprağının
tasarımdaki segment görünümü — hâlâ masaüstü çekmece işaretlemesi kullanıyor).

## Merge durumu

**Branch merge EDİLMEDİ ve edilmemeli** — insan kararı (2026-07-29, seçenek "a"): mobil,
il/ilçe seçici olmadan yayına gitmesin; önce bu spec bitsin. origin ÖLÜ
(`github.com/XMYRA6/arsabil.git` → "Repository not found"), push yok, her şey lokal.

## Ayrı spec bekleyen işler (bu planın kapsamı DIŞI)

- **Parça 1** — aramalı parsel sorgu ekranı (il/ilçe/mahalle/ada/parsel + haritanın uçması).
  TKGM'nin ada/parsel uç noktası `mahalleId` istiyor; o kimliğin kaynağı ayrı araştırma.
- **Parça 3** — masaüstü `/hesapla` yerleşimi: `HesapFişi`'nin sunumu, sticky davranışı,
  genişliği, fontu.
- **Parça 4** — senaryo karşılaştırma: masaüstü sürümünün mobile portu DEĞİL, her iki
  platform için yeni UX/UI çalışması.
