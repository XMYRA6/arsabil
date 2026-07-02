# ArsaBil — Kapsamlı Geliştirme Raporu: Hesaplama Motoru, Parsel Mantığı, Harita Özellikleri ve TKGM Entegrasyonu

**Tarih:** 2026-07-01
**Kapsam:** Proje amacı, `engine_v2.ts` hesaplama motoru ve denklemleri, kat karşılığı / parsel hesaplama mantığı, Leaflet harita üzerinden arsa hesabı, TKGM/kadastro entegrasyonu değerlendirmesi
**Yöntem:** Doğrudan kod incelemesi (`src/lib/calculator/engine_v2.ts`, `SPEC.md`, `hesapla/page.tsx`, `MapView.tsx`, `prisma/schema.prisma`) + harici araştırma (TKGM MEGSİS servisleri)

---

## 1. Proje Amacı ve Değer Önerisi

ArsaBil, **kat karşılığı inşaat** modelinin (Türkiye'deki baskın kentsel dönüşüm/inşaat anlaşma biçimi — arsa sahibinin arazisini, tamamlanan dairelerin bir payı karşılığında müteahhide devretmesi) etrafında kurulu bir SaaS platformudur.

**README.md'den:** *"ArsaBil, Türkiye'deki kat karşılığı inşaat projelerinde arsa payı oranlarını, fizibilite skorlarını ve yatırım getirilerini otomatik hesaplayan bir SaaS platformudur."*

**Vizyon (landing page, `src/app/page.tsx`):**
> "Türkiye'nin her parselinde, inşaat potansiyelini bir tıkla şeffaflaştıran, dijital gayrimenkul geliştirme standartlarını belirleyen bir ekosistem olmak."

**Misyon:**
> "Arsa sahipleri ve müteahhitler arasındaki güven bariyerini, veriye dayalı anlık analizlerle yıkarak; adil ve hızlı inşaat süreçlerine öncülük etmek."

**Temel değer önerisi:** Geleneksel kat karşılığı pazarlığı büyük ölçüde enformel, uzman-raporuna-dayalı ve yavaştır — taraflar arasında bilgi asimetrisi ve güvensizlik yaratır. ArsaBil bunu, her iki tarafın da (arsa sahibi + müteahhit) güvenebileceği, formül-temelli, anında ve paylaşılabilir bir hesaplamayla ("Engine v2") değiştirmeyi; ardından bunu bir pazar yerine (fizibilite raporuna bağlı ilan → müteahhit teklifi → mesajlaşma → pazarlık) genişletmeyi hedefliyor.

**Hedef kullanıcılar:** Arsa sahipleri · Müteahhitler · Gayrimenkul danışmanları.

**Ürün felsefesi (`docs/superpowers/specs/2026-06-07-arsabil-gelistirme-yol-haritasi-design.md`):** "Ürün Önce" — *"Kullanıcıların ödemeye geçmesi için önce güçlü bir ürün deneyimi görmesi gerekir."* SaaS katmanlanması (FREE/PRO/VIP) ürün olgunluğundan sonra devreye giriyor.

---

## 2. Hesaplama Motoru (Engine v2) — Denklemler

Motor, `src/lib/calculator/engine_v2.ts` içinde **saf fonksiyonlardan oluşan, UI'dan bağımsız** bir hesaplama makinesi olarak tasarlanmış (dosya başlığı: *"Sadece saf fonksiyonlardan oluşan, UI'dan bağımsız hesaplama makinesi. SPEC.md kurallarına göre çalışmaktadır."*). Otoriter spesifikasyon `src/lib/calculator/SPEC.md`'de tutuluyor.

### 2.1 Girdiler

| Sembol | Anlamı | Zorunlu mu |
|---|---|---|
| `x` | Arsa payı oranı (0–1) | Evet |
| `L` | Kalite sınıfı katsayısı | Evet |
| `Ad` | Daire brüt alanı (m²) | Evet |
| `P` | Birim inşaat fiyatı (TL/m²) | Evet |
| `K` | Müteahhit kâr katsayısı | Evet |
| `Sd` | Toplam daire sayısı | Opsiyonel (toggle) |
| `Aa` | Arsa alanı (m²) | Opsiyonel (toggle) |
| `R` | Risk katsayısı | Opsiyonel (toggle) |
| `Z` / `MzOriginal` | İksa (yüzde/elle) | Opsiyonel (toggle) |

### 2.2 Formüller (kod ve SPEC.md ile birebir)

**A) İnşaat Maliyeti:**
```
Mi_base = L · P · Ad
```
İksa (kazı/istinat duvarı) maliyeti iki modda hesaplanır:
```
// Yüzde modu:  Mz = Z · Mi_base
// Elle modu:   Mz girilir, Z = Mz / Mi_base (geri hesaplanır)
```
Risk katsayısı uygulanmış toplam inşaat maliyeti:
```
Mi = (Mi_base + Mz) · R          (R varsayılan 1)
```

**B) Toplam Proje Maliyeti ve Daire Satış Fiyatı** (`computeLandCostAndTotal` yardımcı fonksiyonu):
```
M  = Mi / (1 − x)        (x güvenlik için [0, 0.999] aralığına sıkıştırılır)
Ma = M − Mi               ← Arsa maliyeti (bu, geçici/Standart Modeldir — bkz. §2.4)
FD_total  = M · K
FD_per_m2 = FD_total / Ad
```

**C) Arsa Sahibinin Payı** (`Sd` girildiyse):
```
Sdx     = Sd · x                 ← Arsa sahibine düşen daire sayısı
FA      = Sdx · FD_total         ← Arsa sahibinin toplam değeri
FAbirim = FA / Aa                ← m² başına arsa değeri (Aa girildiyse)
```

### 2.3 Katsayı Tabloları (çalışma zamanında kullanılan gerçek değerler)

| Katsayı | Seçenekler | Kaynak |
|---|---|---|
| **L** (Yapı Standardı) | Standart=1.0, Orta=1.2, Lüks=1.4 (varsayılan Lüks) | `hesapla/page.tsx` sabit |
| **K** (Müteahhit Kazancı) | Düşük=1.15, Orta=1.30 (varsayılan), Yüksek=1.50 | `/api/settings/profit-levels` (fallback sabit) |
| **R** (Risk Payı) | Risksiz=0%, Düşük=5%, Orta=10% (varsayılan), Yüksek=15% → çarpan 1.00/1.05/1.10/1.15 | `/api/settings/risk-levels` (fallback sabit) |
| **İksa** | Düşük=%1, Orta=%2 (varsayılan yüzdeler) | `GlobalSettings` Prisma modeli |

### 2.4 Bilinen ve Şeffafça Belgelenmiş Boşluk: `Ma` Modeli

`SPEC.md` şu notu **açıkça** taşıyor:

> `Ma`: *[TBD - 3 alternatif geliştirilecek]* — "Şimdilik bir placeholder/stub fonksiyon kullanılacak... Geçici Standart Model: M = Mi / (1 - x), Ma = M - Mi."

Yani şu anda kullanılan `Ma = M − Mi` (arsa maliyetinin, toplam maliyetten inşaat maliyeti çıkarılarak **dolaylı** türetilmesi) **kalıcı model değil, kabul edilmiş bir geçici modeldir**. Bunun yerini alacak 3 alternatiften **ilki tasarlanmış ama henüz kodlanmamış**:

**`docs/superpowers/specs/2026-07-01-emsal-arsa-maliyeti-design.md`** ("Onaylandı, implementasyon bekliyor"):
- `DistrictPrice` modeline yeni bir `avgLandPricePerM2` alanı (bölgenin **arsanın kendi** m² fiyatı — mevcut `avgSalesPricePerM2`'nin (dairenin satış fiyatı) karıştırılmaması gerektiği açıkça belirtiliyor).
- `engine_v2.ts`'e yeni bir `landCostModel?: 'proportional' | 'comparable'` girdisi: `comparable` modda `Ma = Aa · districtLandPricePerM2`, `M = Mi + Ma`, `derivedX = Ma / M` — yani arsa maliyeti oransal olarak türetilmek yerine **emsal/karşılaştırmalı piyasa verisinden doğrudan** hesaplanacak. Veri eksikse sessizce mevcut orantısal modele düşülüyor (fallback).

**Doğrulama:** `LocationSelector.tsx`'te `avgLandPricePerM2` alanı henüz yok — bu tasarım **onaylı ama uygulanmamış** durumda.

### 2.5 Dış Doğrulama: "Arsabil Denklemleri.docx" ile Kod Tutarlılığı

Proje sahibinin sağladığı referans Word belgesi (`.gitignore`'da yerel-arşiv dosyası olarak işaretli, repoda yok) daha önceki bir oturumda ayrıştırılıp kodla satır satır karşılaştırılmış (`docs/case-study-tema-restorasyonu-2026-06-30.md` §3):

| Formül (Belge) | Kod (`engine_v2.ts`) | Sonuç |
|---|---|---|
| Mi = (L·P·Ad + Mz) · R | `Mi = (Mi_base + finalMz) * finalR` | ✅ Tutarlı |
| M = Mi / (1−x) | `M = Mi / (1 - safeX)` | ✅ Tutarlı |
| Ma = M − Mi | `Ma = M - Mi` | ✅ Tutarlı |
| FD = M · K | `FD_total = M * K` | ✅ Tutarlı |
| Sdx = Sd · x | `Sdx = Sd * x` | ✅ Tutarlı |
| FA = Sdx · FD | `FA = Sdx * FD_total` | ✅ Tutarlı |
| FAbirim = FA / Aa | `FAbirim = FA / Aa` | ✅ Tutarlı |

**Not:** Eski bir `v1` motoru (`src/lib/calculator/engine.ts`, farklı sabit değerler ve %20 ortak-alan payı içeren basitleştirilmiş bir model) hâlâ dosya sisteminde duruyor ama **hiçbir üretim import noktası yok** — ölü kod, referans amaçlı tutulmuş.

---

## 3. Parsel vs. Arsa — Veri Modelindeki Boşluk

Kod tabanı "parsel" (kadastral parsel) ile "arsa" (arazi) arasında **temiz bir ayrım yapmıyor** — bu ikisi UI kopyasında büyük ölçüde birbirinin yerine kullanılıyor. Somut bulgular:

- İlan detay sayfası (`listing/[id]/page.tsx`) bölümü "**Parsel Detayları**" olarak etiketlenmiş ve `İmar Durumu`, `Emsal` (2.0 gibi bir kat alanı katsayısı), `Arsa Payı` (min-max aralığı) alanlarını listeliyor — **ama bunlar yalnızca frontend mock/gösterim verisi**, Prisma şemasında karşılığı yok.
- `FilterSidebar.tsx`'te bir **emsal (FAR) aralık filtresi** var (varsayılan 0.8–3.0) — yine sadece UI, DB'de karşılığı yok.
- Gerçekte **şemaya giren** alanlar farklı isimlerle: `Listing.zoning` (`"KONUT"|"TICARI"|"KARMA"|"TARIM"`) ve `Listing.titleDeed` (`"KAT_MULKIYETI"|"ARSA"|"HISSELI"|"DIGER"`) — plan dokümanındaki isimlendirme (`imarDurumu`) ile üretime giren isimlendirme (`zoning`) **birbirinden sapmış**, ve frontend mock verisi (`imarDurumu`, `emsal`) henüz bu gerçek alanlara bağlanmamış.
- `Report`/`Scenario` modelleri motorun tüm girdi/çıktı setini birebir yansıtıyor (`landShareRatio`, `minApartmentPrice`, `landCost`, `fdTotal`, `mi`, `ma`, `sdx`, `fabirim` vb.) — hesaplama tarafı tutarlı, eksik olan **parsel/emsal/imar** tarafının veri modeline oturmamış olması.

**Sonuç:** "Emsal" ve "İmar Durumu" şu an **hesaplama motoruna hiç girmiyor** — yalnızca pazar yeri filtreleme/gösterim katmanında, gerçek veriyle bağlantısız mock alanlar olarak var. Bu, §2.4'teki `avgLandPricePerM2`/comparable-model çalışmasıyla birlikte ele alınabilecek doğal bir sonraki adım.

---

## 4. Leaflet Harita Üzerinden Arsa Hesabı

`src/components/marketplace/MapView.tsx`'teki araç çubuğu (7 araç):

| Araç | İşlev |
|---|---|
| 🗺️ Harita stili | Tile katmanı değiştirme |
| 📍 Parsel pinle | Tıkla-pinle + Nominatim reverse-geocoding (OpenStreetMap) ile adres çözümleme |
| 🔥 Isı haritası | `leaflet.heat`, fizibilite skoruna göre ağırlıklandırılmış |
| 📐 Mesafe ölç | Leaflet'in yerleşik jeodezik `map.distance()` fonksiyonuyla toplam mesafe |
| ✏️ **Bölge çiz** | **Doğrudan poligon-çizerek arsa alanı hesabı** — aşağıda detaylı |
| 🗺 İl sınırı | 81 il GeoJSON overlay (GitHub'dan public kaynak) |
| 📏 Kadastro | **Devre dışı, "Yakında" rozetli** — §5'te ele alınıyor |

### 4.1 "Bölge Çiz" — Poligon ile Arsa Alanı Hesabı

Bu, sorduğunuz "harita üzerinden arsa hesabı" özelliğinin **zaten var olan** karşılığı. Kullanıcı haritada tıklayarak köşe noktaları ekliyor, çift-tıkla poligonu kapatıyor. Sistem:

1. **Nokta-poligon-içinde testi** (ray-casting algoritması, elle yazılmış):
```ts
function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
```
2. **Alan hesabı** (küresel Shoelace formülü, **turf.js kullanılmıyor** — elle yazılmış, Dünya yarıçapı 6.371.000 m varsayımıyla):
```ts
function polygonArea(coords) {
  const R = 6371000;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += toRad(coords[j][1] - coords[i][1]) * (2 + Math.sin(toRad(coords[i][0])) + Math.sin(toRad(coords[j][0])));
  }
  return Math.abs(area * R * R / 2);
}
```
3. Sonuç hem **m²**, hem **hektar**, hem de geleneksel Türk birimi **dönüm** (1 dönüm = 1000 m²) olarak gösteriliyor, aynı zamanda poligon içindeki ilan sayısı da raporlanıyor.

**Değerlendirme:** Bu araç şu an genel bölge-seçimi/pazar-yeri filtreleme amaçlı kullanılıyor (poligon içindeki ilanları saymak için), ama matematiksel olarak **tek bir arsanın sınırlarını çizip alanını hesaplamak için de doğrudan kullanılabilir** — zaten `Aa` (arsa alanı) girdisi motorun bir parametresi. Bugün bu iki akış (haritadan alan çizme ↔ hesap makinesine `Aa` girme) **birbirine bağlı değil**; kullanıcı haritada gördüğü alanı manuel olarak `hesapla` sayfasına girmek zorunda. Doğal bir geliştirme: "Bölge çiz" sonucundan "Bu alanı hesaplamaya aktar" butonu.

---

## 5. TKGM / Kadastro Entegrasyonu Değerlendirmesi

### 5.1 Mevcut Durum

`MapView.tsx:689` içinde tek satırlık bir arayüz iskeleti var:
```tsx
<ToolBtn icon="📏" label="Kadastro" disabled onClick={() => { }} badge="Yakında" />
```
Repo genelinde ("Kadastro", "TKGM", "Tapu Kadastro" için tam metin arama) **bu tek satır dışında hiçbir spesifikasyon, plan veya tasarım belgesi bulunamadı**. Bu, ne yapacağı henüz tanımlanmamış, sadece bir yer tutucu.

### 5.2 TKGM'nin Gerçek Teknik Durumu (harici araştırma)

- **MEGSİS** (Mekânsal Gayrimenkul Sistemi), TKGM'nin kadastro verilerini merkezi bir sistemde toplayıp paylaştığı resmi altyapıdır.
- MEGSİS, **WMS/WFS harita servisleri** sunuyor — ama bunlar **"protokoller kapsamında talep eden kurum, kuruluş ve belediyeler ile"** paylaşılıyor. Yani **açık, genel-kullanıma-açık bir REST API yok** — kurumsal bir protokol/veri paylaşım anlaşması gerekiyor.
- **Parsel Sorgu Uygulaması** (parselsorgu.tkgm.gov.tr), vatandaşa açık ama **tarayıcı-tabanlı, manuel sorgulama arayüzü** — programatik/toplu erişim için tasarlanmamış.
- e-Devlet üzerinden de vatandaş bazlı sorgu sunuluyor (yine manuel, kişisel kullanım amaçlı).

### 5.3 Gerçekçi Entegrasyon Yolları (öncelik sırasıyla)

| Seçenek | Açıklama | Efor | Hukuki/Ticari Risk |
|---|---|---|---|
| **A. Deep-link (MVP)** | Kullanıcının haritada pinlediği/çizdiği konumun il/ilçe/koordinatını, TKGM'nin kendi `parselsorgu.tkgm.gov.tr` sayfasına önceden-doldurulmuş bir bağlantıyla yönlendirmek ("TKGM'de bu parseli sorgula →" butonu) | Çok düşük — sadece URL oluşturma | Yok — kullanıcı TKGM'nin kendi arayüzünü kullanıyor |
| **B. Kurumsal Protokol (WMS/WFS)** | ArsaBil'in tüzel kişilik olarak TKGM'ye başvurup MEGSİS WMS/WFS erişimi için resmi protokol imzalaması, ardından "İl sınırı" aracındaki gibi bir kadastral-parsel-sınırı katmanını haritaya overlay etmesi | Yüksek — resmi başvuru süreci, muhtemelen gerekçe/kurumsal doğrulama gerektirir | Orta — TKGM'nin onayına ve sözleşme şartlarına bağlı |
| **C. Üçüncü-taraf veri sağlayıcı** | TKGM protokolüne zaten sahip ticari bir GIS/emlak-veri sağlayıcıdan (varsa) API üzerinden parsel verisi satın almak | Orta | Belirsiz — böyle bir sağlayıcının var olup olmadığı bu araştırmada doğrulanmadı, ayrıca araştırılmalı |
| **D. Belediye açık veri portalları** | Bazı büyükşehir belediyeleri kendi imar/parsel GIS verilerini açık veri portalları üzerinden paylaşıyor (il bazlı, tutarsız kapsam) | Değişken | Düşük ama parçalı/güvenilmez kapsam |

**Öneri:** MVP için **Seçenek A** (deep-link) — sıfıra yakın geliştirme maliyetiyle, kullanıcıya gerçek değer sağlayan (TKGM'nin resmi, güncel verisine tek tıkla erişim), hiçbir hukuki risk taşımayan bir başlangıç. "Yakında" rozeti bu haliyle kaldırılıp gerçek bir link'e dönüştürülebilir. Seçenek B (gerçek harita-üzerinde-kadastral-sınır overlay'i, "İl sınırı" aracına benzer şekilde) uzun vadeli, kurumsal bir girişim olarak ayrı bir plan/spec dokümanı gerektirir — bu raporun kapsamı dışında, ama net bir sonraki-adım önerisi olarak buraya not düşülüyor.

---

## 6. Boşluklar ve Öneriler (Özet)

| # | Boşluk | Konum | Öncelik önerisi |
|---|---|---|---|
| 1 | `Ma` (arsa maliyeti) modeli hâlâ geçici/orantısal; onaylı "comparable" model henüz kodlanmamış | `SPEC.md`, `2026-07-01-emsal-arsa-maliyeti-design.md` | Yüksek — motorun doğruluğunu doğrudan etkiliyor |
| 2 | `emsal`/`imarDurumu` yalnızca UI mock verisi, DB şemasında yok, motora hiç girmiyor | `listing/[id]/page.tsx`, `FilterSidebar.tsx`, `prisma/schema.prisma` | Orta — pazar yeri filtreleri gerçek veriyle çalışmıyor |
| 3 | "Bölge çiz" haritadan hesaplanan alan, `hesapla` sayfasındaki `Aa` girdisine otomatik aktarılmıyor | `MapView.tsx` ↔ `hesapla/page.tsx` | Orta — kullanıcı deneyimi iyileştirmesi |
| 4 | "Kadastro" butonu tanımsız yer tutucu, hiç spec yok | `MapView.tsx:689` | Düşük-Orta — §5.3 Seçenek A ile hızlıca somutlaştırılabilir |
| 5 | Plan dokümanındaki alan isimlendirmesi (`imarDurumu`) ile üretime giren isimlendirme (`zoning`) sapmış | `prisma/schema.prisma` vs. plan dokümanı | Düşük — teknik borç, davranışı etkilemiyor |

---

## 7. Gelecek Vizyonu — 3D Bina Yerleştirme, AR Görselleştirme ve İç Mimari Tasarım Aracı

Talep edilen vizyon: haritada belirlenen bir arsa üzerine — kamerayla gerçek dünyada görüntülenen — 3D bir bina kütlesi yerleştirmek; bu kütleyi 1+1/2+1/3+1 (karışık) daire tipleriyle yapılandırmak; ve dairenin iç mekânını **Roomstyler** benzeri (sürükle-bırak mobilya, 2D→3D plan, web+mobil) bir araçla tasarlamak. Bu, ArsaBil'in bugünkü "sayısal fizibilite" ürününden "görsel, uçtan uca proje deneyimi"ne uzanan büyük bir ürün genişlemesidir — dört fazlı, birbirine bağımlı bir yol haritası olarak öneriliyor.

> **Kritik ön koşul bağımlılığı:** Faz A'nın kat-sayısı türetmesi `emsal` değerine dayanıyor — ama §3'te tespit edildiği gibi, `emsal` şu an yalnızca UI mock verisi, veritabanı şemasında yok. Faz A'ya başlamadan önce §6 Öneri 2'nin (emsal'in gerçek veri modeline oturtulması) çözülmesi gerekiyor.

### Faz A — Parselden 3D Bina Kütlesi Üretimi *(Temel / Ön Koşul)*

"Bölge çiz" poligonunu, motorun emsal/inşaat-alanı çıktısından türetilen kat sayısı kadar dikey ekstrüzyonla otomatik bir 3D kütleye dönüştürmek.
- **Teknoloji:** Three.js / react-three-fiber (React ekosistemiyle uyumlu), poligon ekstrüzyonu için `ExtrudeGeometry`.
- **Entegrasyon noktası:** `hesapla` sayfasına yeni bir "3D Önizleme" sekmesi; `Aa`/`Ad`/emsal çıktılarını doğrudan tüketir.

### Faz B — Daire Karışımı Konfigüratörü *(A ile paralel)*

Şu anki tek-tip `Sd` (toplam daire sayısı) girdisini, tipli bir diziye genişletmek: `[{tip:'1+1', adet, m2}, {tip:'2+1', ...}, {tip:'3+1', ...}]` — karışık kombinasyonlara izin verecek şekilde. Toplam inşaat alanına göre doğrulama (validation) gerekir.
- **Şema:** `Report`/`Scenario`'ya yeni bir `unitMix Json?` alanı veya ayrı bir `UnitType` ilişkisel modeli.
- 3D kütle üzerinde kat bazlı daire-tipi renklendirmesiyle görsel geri bildirim verilebilir.

### Faz C — Kamera ile AR Yerleştirme (Mobil) *(A'ya bağımlı, native app gerektirir)*

Faz A'da üretilen 3D kütleyi, kullanıcının çizdiği poligonun **gerçek GPS konumunda**, telefon kamerasıyla canlı olarak gerçek dünya üzerine bindirmek.
- **Teknoloji:** `ARCore Geospatial API` (Android + iOS'u da kapsıyor) — WGS84 lat/lng/altitude ile "Geospatial Anchor" oluşturup, Google'ın Visual Positioning System'iyle (VPS, Street View verisine dayalı) cihaz konumunu hassas biçimde eşliyor.
- **Web tarafı basitleştirilmiş alternatif:** `<model-viewer>` web bileşeni ile "AR'da Gör" butonu (Android'de Scene Viewer, iOS'ta Quick Look üzerinden) — ama bu GPS-anchor'lı değil, yalnızca genel yüzey-tespitli bir önizlemedir.

### Faz D — İç Mimari Tasarım Aracı (Web + Mobil) *(Bağımsız, paralel başlatılabilir)*

Referans: **Roomstyler** ("Rayon Design" olarak kastedilen, gerçek ve bilinen bir ürün — 120.000+ mobilya kataloğu, sürükle-bırak 2D plan → fotogerçekçi 3D render, web tarayıcısında ve tablet/mobilde çalışıyor). Yapı taşları: 2D kat-planı editörü (duvar/oda çizimi) + mobilya kataloğu sahnesi (react-three-fiber) + 3D render/gezinti (walkthrough).

### Faz E — Mobilya Marketplace: 3D Katalog, AR, Sepet ve Kredi *(D'ye bağımlı, yeni bir iş kolu)*

Faz D'nin iç mimari aracını, gerçek mobilya markalarının ürünleriyle (fiyat, stok, sepet, ödeme) bir ticaret katmanına dönüştürmek — "yatak odası takımı" gibi çok-parçalı set kataloglarına kadar genişletilebilir. Detay: §7.4.

### 7.1 Öncelik ve Bağımlılık Sırası

```
A (3D kütle üretimi) → B (daire karışımı, A ile paralel yürütülebilir)
                      ↓
                      C (AR yerleştirme — A'nın çıktısını tüketir, native mobil app şart)

D (iç mimari aracı) — A/B/C'den bağımsız, ayrı bir ekip/zaman çizelgesiyle paralel başlatılabilir
                      ↓
                      E (mobilya marketplace — D'nin editörü üzerine inşa edilir, D olmadan anlamsız)
```

### 7.2 İç Mimari Aracı İçin Build-vs-Buy Değerlendirmesi

| Seçenek | Açıklama |
|---|---|
| **Sıfırdan İnşa** | Tam kontrol, ArsaBil'e özel entegrasyon (daire planına doğrudan bağlı); yüksek efor (2D plan editörü + 3D sahne motoru + mobilya kataloğu üretimi); mobilya/materyal varlık kütüphanesi maliyeti sürekli büyür |
| **Açık Kaynak Çekirdek Üzerine İnşa** | Mevcut açık kaynak 3D oda-planlayıcı motorları üzerine (varsa, lisans/bakım durumu ayrıca araştırılmalı) ArsaBil markasıyla inşa; orta efor, daha hızlı MVP; bağımlılık riski: üçüncü-parti projenin bakımı durabilir |

**Öneri:** Bu, ArsaBil'in çekirdek fizibilite işinden (arsa payı/kat karşılığı hesaplama) tamamen farklı bir ürün yatırımı kategorisidir — 3D/AR/interior-design mühendisliği ayrı bir uzmanlık gerektirir. Önce Faz A+B (mevcut hesaplama motoruyla doğrudan entegre, düşük-orta efor) ile "3D Önizleme" MVP'si çıkarılıp kullanıcı talebi/ilgisi ölçülmeli; Faz C (native AR) ve Faz D (iç mimari) için ayrı, özel olarak fonlanan bir sonraki-faz kararı olarak değerlendirilmelidir.

### 7.3 Riskler (Faz A-D)

- **VPS/Street View kapsaması:** ARCore Geospatial API'nin hassasiyeti Google Street View kapsamına bağlı — Türkiye'de büyükşehir dışında zayıf olabilir, doğrulanmalı.
- **Native mobil app zorunluluğu:** Tam Geospatial AR deneyimi WebXR/PWA ile sağlanamıyor — App Store/Play Store'da native bir uygulama gerektiriyor, bu da ArsaBil'in bugünkü web-only mimarisine yeni bir dağıtım/bakım katmanı ekliyor.
- **Emsal veri boşluğu:** §3'te belgelendiği gibi, Faz A'nın kat-sayısı türetmesi henüz var olmayan bir veri alanına dayanıyor — sıralama buna göre planlanmalı.
- **Mobilya/3D varlık maliyeti (Faz D):** Roomstyler'ın 120.000+ ürün kataloğu, yıllar süren bir içerik yatırımının sonucu — MVP çok daha dar bir katalogla başlamalı.

### 7.4 Faz E Detayı — Mobilya Marketplace: 3D Katalog, AR, Sepet ve Kredi

Talep edilen genişleme: mobilya markalarının ürünlerini 3D artifact'lere dönüştürüp fiyatlarıyla listelemek, odanın içinde AR ile nasıl göründüğünü göstermek, sepete ekleyebilmek, ve hatta **ihtiyaç kredisi** (tüketici finansmanı) ile satın alabilmek — "yatak odası takımı" gibi çok-parçalı setlere kadar. Bu, Faz D'nin (iç mimari editörü) üzerine inşa edilen, ama iş modeli olarak ArsaBil'in çekirdek B2B fizibilite ürününden **tamamen ayrı bir B2C e-ticaret + fintech-bitişik iş kolu**dur — bu ayrımın en baştan netleştirilmesi öneriliyor.

**E1 — Marka Kataloğu ve 3D Artifact Üretim Hattı**
Mobilya markalarıyla B2B veri/görsel ortaklığı (ürün fotoğrafı, ölçü, fiyat, stok akışı). 3D model üretimi iki yoldan biriyle: **(a)** markanın kendi CAD/3D dosyalarını glTF/USDZ'ye dönüştürmek (daha ucuz, markanın işbirliğine bağlı) veya **(b)** fotogrametri ile ürünü tarayıp 3D model üretmek (markadan bağımsız ama pahalı, ürün başına stüdyo süreci gerektirir). IKEA Place emsali: **%98 ölçek doğruluğu** ile gerçek-ölçekli 3D modeller — bu kalite çıtası hedeflenmeli.

**E2 — Oda İçinde AR Önizleme** *(Faz C'den FARKLI bir AR teknolojisi)*
Önemli teknik ayrım: Bu, Faz C'nin (dış mekân, GPS-anchor'lı ARCore Geospatial API) kullandığı teknolojiden farklıdır. Oda-içi mobilya AR'ı, IKEA Place'in kullandığı gibi **standart düzlem-tespiti (plane detection)** teknolojisine dayanır — ARKit/ARCore'un temel, GPS gerektirmeyen özelliği (zemin/yüzey algılama + true-scale 3D model yerleştirme). Faz D'nin oda editörüyle entegre: kullanıcı ya kendi telefon kamerasıyla gerçek odasında (native app), ya da web'deki 3D oda editöründe (react-three-fiber sahne) ürünü deniyor.

**E3 — Fiyatlandırma, Sepet ve Sipariş Yönetimi** *(Net iş modeli kararı gerekli)*
Marka envanteri/fiyat senkronizasyonu (gerçek zamanlı stok — marka API'si veya periyodik feed). Temel iş modeli sorusu, teknik çalışmadan önce netleşmeli: ArsaBil bir *marketplace* mi (siparişi markaya yönlendirir, komisyon alır — düşük operasyonel yük) yoksa *doğrudan satıcı* mı (kendi stoğu, lojistik/teslimat/iade sorumluluğu — yüksek operasyonel yük ama daha yüksek marj)? Bu karar, "yatak odası takımı" gibi çok-parçalı setlerin sepete nasıl ekleneceğini (tekil ürün mü, paket mi) de belirler.

**E4 — İhtiyaç Kredisi / BNPL Entegrasyonu** *(Lisans gerektirir — ArsaBil kendisi kredi veremez)*
ArsaBil'in kendisi **lisanslı bir finansman kuruluşu değil** — Türkiye'de tüketici kredisi/BNPL, Finansal Kiralama, Faktoring ve Finansman Şirketleri Kanunu kapsamında yetkili finansman şirketleri tarafından sunulabiliyor. Gerçekçi yol: lisanslı bir BNPL sağlayıcısıyla (ör. `iyzico` gibi ödeme altyapılarının sunduğu "Şimdi Al Sonra Öde" eklentisi) veya bir bankanın Açık Bankacılık API'si (2020'de 6493 sayılı Kanun değişikliğiyle yasal temeli oluşan) üzerinden **API/plugin entegrasyonu** — kendi kredi altyapısını inşa etmek değil, mevcut bir sağlayıcıyı checkout akışına eklemek.

### 7.5 Faz E Riskleri

- **Yasal/lisans gereksinimleri:** Tüketici kredisi sunumu düzenlemeye tabi — ArsaBil'in kendi başına kredi vermesi mümkün değil, lisanslı bir ortak şart.
- **Lojistik/teslimat sorumluluğu belirsizliği:** Marketplace mi doğrudan satıcı mı kararı verilmeden teknik mimari (stok, iade, kargo entegrasyonu) tasarlanamaz.
- **Marka ortaklığı müzakere süreci:** 3D model/fiyat/stok verisi almak için her mobilya markasıyla ayrı ayrı iş ortaklığı kurulması gerekiyor — teknik değil, iş geliştirme süreci.
- **3D içerik üretim maliyeti çok-parçalı setlerde katlanıyor:** "Yatak odası takımı" gibi setler her biri ayrı 3D model gerektiren çoklu parçalardan oluşur (yatak, dolap, komodin, aynalı konsol vb.) — E1'in maliyeti ürün-başına değil, set-başına çarpanla büyür.
- **Kapsam ve organizasyon:** Bu faz, ArsaBil'in B2B arsa-fizibilite SaaS çekirdeğinden tamamen farklı bir B2C e-ticaret + fintech-bitişik iş modeli — muhtemelen ayrı bir ürün ekibi, hatta ayrı bir marka/tüzel yapı altında değerlendirilmesi daha sağlıklı olur.

---

## Ekler

- İncelenen ana dosyalar: `src/lib/calculator/engine_v2.ts`, `src/lib/calculator/SPEC.md`, `src/lib/calculator/engine.ts` (v1, ölü kod), `src/app/hesapla/page.tsx`, `src/components/marketplace/MapView.tsx`, `src/components/marketplace/FilterSidebar.tsx`, `src/app/listing/[id]/page.tsx`, `prisma/schema.prisma`, `src/app/page.tsx`, `README.md`
- İlgili tasarım belgeleri: `docs/superpowers/specs/2026-07-01-emsal-arsa-maliyeti-design.md`, `docs/superpowers/specs/2026-06-07-arsabil-gelistirme-yol-haritasi-design.md`
- Dış doğrulama kaynağı: `docs/case-study-tema-restorasyonu-2026-06-30.md` §3 (Arsabil Denklemleri.docx ↔ kod karşılaştırması)
- TKGM MEGSİS bilgisi: [tkgm.gov.tr/projeler/mekansal-gayrimenkul-sistemi-megsis](https://www.tkgm.gov.tr/projeler/mekansal-gayrimenkul-sistemi-megsis), [parselsorgu.tkgm.gov.tr](https://parselsorgu.tkgm.gov.tr/)
