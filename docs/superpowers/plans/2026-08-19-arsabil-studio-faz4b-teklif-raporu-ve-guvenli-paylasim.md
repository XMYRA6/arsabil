# Arsabil Studio - Faz 4B Teklif Raporu ve Guvenli Paylasim Plani

> **For agentic workers:** Faz 4A kalici, versioned scenario modelinden sonra uygulanir. Rapor ve share sayfasi hesaplama yapmaz; tam olarak secilen senaryo versiyonunu okur.

**Goal:** Bir Studio senaryosunu arsa sahibi, ortak veya yatirimciyla tartisilabilecek; gorsel once, sayisal aciklama sonra gelen, varsayimlari saklamayan paylasilabilir teklif artefact'ina donusturmek.

**Architecture:** `StudioProposalViewModel`, immutable `StudioScenarioVersion`dan turetilir. Web share page ve PDF/export ayni view model'i kullanir. Thumbnails istemci tarafi veya guvenli background is ile uretilir; sunucu WebGL calistirmaz.

**Depends on:** Faz 4A.

## Global Constraints

- Rapor “on teklif/senaryo” dilini kullanir; hukuki sozlesme, resmi imar onayi veya garantili getiri iddia etmez.
- Eksik degerleme, taslak geometri, needs-rebalance ve tum kritik uyarilar hem sayfada hem exportta gorunur.
- Paylasim linki sadece secilen versiyona baglanir; yeni versiyon otomatik yansimaz.
- Ham kullanici notu, internal audit verisi veya diger senaryolar varsayilan olarak paylasilmaz.

### Task 1: Proposal view model ve export uygunluk kontrolu

**Files:**
- Add: `src/lib/studio/proposalViewModel.ts`
- Add: `src/lib/studio/proposalViewModel.test.ts`
- Add: `src/lib/studio/exportReadiness.ts`
- Add: `src/lib/studio/exportReadiness.test.ts`

- [x] Parsel, fizibilite, 2D/3D gorsel referans, program, secili teklif, varsayim ve uyari alanlarini tek okunur modele donustur.
- [x] Hesaplanan, varsayilan ve elle duzenlenen degerleri ayri gruplarda sun.
- [x] Kritik uyari varsa exportu tamamen yasaklamak yerine `draft`/`attention` durumu tanimla; ekip tercihine gore sert bloklama esigini tek policy'de topla.
- [x] `needsRebalance` veya bilinmeyen snapshot schema versiyonunda paylasimi engelle.
- [x] Degerleme tarihi, para birimi ve kaynak rozeti eksik senaryolarin testlerini yaz.

### Task 2: Gorsel capture ve thumbnail stratejisi

**Files:**
- Add: `src/lib/studio/proposalAssets.ts`
- Add: `src/lib/studio/proposalAssets.test.ts`
- Add: `src/components/studio/ProposalVisualCapture.tsx`
- Add: `src/components/studio/ProposalVisualCapture.test.tsx`

- [x] 2D SVG gorunumu export icin serialize edilebilir vektor veya PNG olarak uret.
- [x] 3D icin WebGL zorunlu olmadan fallback kart/thumbnail uretebil; 3D capture varsa bunu istemci tarafinda kullan.
- [x] Asset'in hangi senaryo versiyonuna ait oldugunu hash/ID ile bagla.
- [x] Capture basarisiz olursa rapor gorselsiz fakat sayisal ve uyari bilgili olarak devam etsin.

### Task 3: Rapor onizleme ve PDF entegrasyonu

**Files:**
- Add: `src/components/studio/StudioProposalPreview.tsx`
- Add: `src/components/studio/StudioProposalPreview.module.css`
- Add: `src/components/studio/StudioProposalPreview.test.tsx`
- Add: `src/lib/pdf/StudioProposalDocument.tsx`
- Add: `src/lib/pdf/studioProposalPdfGenerator.ts`

- [x] Rapor akisini su sirayla kur: proje baglami -> gorsel ozet -> program -> arsa sahibi teklifi -> varsayim/uyarilar.
- [x] PDF'e ayni `StudioProposalViewModel` ile opsiyonel Studio bolumu ekle; ikinci hesaplama yolu yazma.
- [x] Uzun uyarilar, mobil/print kirilmalari ve gorsel yok durumlari icin duzen kur.
- [x] PDF veya print sonucunda kaynak rozetleri ve degerleme tarihi gorunur kalir.

### Task 4: Versiyona sabit paylasim linki

**Files:**
- Add: `src/app/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/share/route.ts`
- Add: `src/app/api/studio/share/[token]/route.ts`
- Add: `src/app/studio/share/[token]/page.tsx`
- Add: `src/lib/studio/shareToken.ts`
- Add: `src/lib/studio/shareToken.test.ts`

- [x] Token'i scenario yerine `StudioScenarioVersion`a bagla; expiration, revoke ve owner kontrolu ekle.
- [x] Public link minimum okunur artefact'i sunsun; duzenleme, archive, audit veya diger versiyonlar gorunmesin.
- [x] Paylasilan sayfada versiyon tarihi ve “on teklif” notu gorunsun.
- [x] Revoke edilen veya suresi gecen token icin bilgi sizdirmayan hata sayfasi tasarla.
- [x] Eger mevcut compare share altyapisi uygunsa, token policy'sini aynilastir; kopya auth mantigi yazma.

### Task 5: Paylasim deneyimi ve privacy kontrolleri

**Files:**
- Add: `src/components/studio/ShareProposalDialog.tsx`
- Add: `src/components/studio/ShareProposalDialog.module.css`
- Add: `src/components/studio/ShareProposalDialog.test.tsx`
- Modify: `src/components/studio/StudioScenarioBar.tsx`
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/mobile/StudioScenarioMobileLeaf.tsx`

- [x] Kullaniciya hangi versiyonun paylasilacagini, hangi uyarilarin gorunecegini ve linkin son kullanma zamanini onizlet.
- [x] Kopyalama, revoke ve yeniden link olusturma eylemlerini gorunur durum geri bildirimiyle sun.
- [x] Iletisim bilgileri/serbest notlar icin varsayilan dahil-etme yerine opt-in tasarla.
- [x] Link olusturulmadan once export readiness durumunu acikla.

### Task 6: Verification

- [x] `npx jest src/lib/studio src/components/studio src/lib/pdf src/app/api/studio` ve `npx tsc --noEmit` calistir.
- [x] Mevcut PDF/report testleriyle Studio bolumunu test et.
- [x] Geçerli, taslak, eksik degerleme, revoked-token ve gorselsiz senaryolari masaustu/mobil/browser smoke ile denetle.
- [x] Paylasim sayfasi icin yetkisiz veri sizmasi kontrolu yap.

## Exit Criteria

- Kullanici belli bir Studio versiyonunu tekrar acar, raporlar veya paylasir.
- Alıcı ayni teklif/program rakamlarini ve onemli varsayimlari gorur.
- Paylasim, veri kalitesi sinirlarini ve teklifin on niteligini gizlemez.

---

## Faz 4B — Bagimsiz Inceleme (2026-08-22)

Gemini 3.7 implementasyonu bitirdi (tum 26 checkbox `[x]`). Bagimsiz
incelemede su bulundu ve duzeltildi:

**Bulunan (Gemini calisirken canli olarak yakalanan, kendisi de ayni
oturumda duzelttigi) gecici tsc hatalari:** `ProgramMixItem`de olmayan
`averageUnitAreaM2`/`allocatedAreaM2` alanlarinin okunmasi (`unitCount`/
`unitAreaM2` olmali — Faz4A'daki AYNI bug pattern), `BuildingMass.floors`
(dogrusu `floorCount`), `ProgramUse`e ait olmayan `office`/`amenity`
kategorileri, `logStudioScenarioEvent`in obje-argumanli cagrilmasi (gercek
imza pozisyonel), `parcelIdentity`nin parse edilmeden (ham JSON string
olarak) `ParcelIdentity` tipine atanmasi. Incelemeye basladigimda dosya
hala degisiyordu (Gemini aktifti) — kontrol ettigimde hepsi zaten dogru
sekilde duzeltilmisti (`parseStudioScenarioRecord`/
`parseStudioScenarioVersionRecord` yeniden kullanilarak, pozisyonel
`logStudioScenarioEvent` cagrisiyla).

**KENDI bulgum — migration izlenmiyordu:** `StudioShareToken` modeli
`prisma/schema.prisma`ya eklenmis ve tabloyu DB'de GERCEKTEN olusturmustu,
ama `prisma/migrations/` altinda buna karsilik gelen bir migration dosyasi
YOKTU (muhtemelen `prisma db push` ile senkronize edildi, `migrate dev`
ile degil). `_prisma_migrations` tablosunda kayit yoktu. Bu, production'da
`prisma migrate deploy` calistirildiginda bu tablonun HIC olusturulmayacagi
anlamina geliyordu. Fix: canli tablo yapisini (`\d "StudioShareToken"`)
birebir yansitan `20260822220000_faz4b_studio_share_token/migration.sql`
elle yazildi (Faz4A'nin migration.sql'iyle AYNI stil), `prisma migrate
resolve --applied` ile GERCEKTEN uygulanmis olarak isaretlendi (tekrar
CREATE TABLE calistirilmadi, sadece kayit duzeltildi). `prisma migrate
status` artik "up to date," 13 migration.

**Ek dogrulamalar:** PDF generator (`studioProposalPdfGenerator.ts`)
yalnizca `StudioProposalViewModel` tuketiyor, hicbir hesap fonksiyonu
import etmiyor (ikinci hesap yolu YOK). `summaryNotes` (serbest metin)
`StudioProposalViewModel`e HIC dahil edilmemis — "opt-in" sorunu VAR
OLMAYAN bir alanla cozulmus (en guvenli sekli).

**Sonuc:** `npx tsc --noEmit` temiz, 912/912 gercek test yesil (stale
`.worktrees/anasayfa-taste-skill-revizyonu` haric), `npm run build`
basarili (6 yeni route: `/api/studio/scenarios/[id]/versions/[n]/share`,
`/api/studio/share/[token]`, `/studio/share/[token]`), migration
GERCEKTEN izleniyor. Faz 4B tamamlandi.
