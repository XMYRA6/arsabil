# SEO Mahalle Sayfaları (Alt-proje 6b) — Tasarım

**Tarih:** 2026-09-16
**Durum:** Onaylandı, plan aşamasına geçiliyor
**İlgili:** [[project_arsabil_edermi_rakip]] — edermi.com rakip kapatma yol haritasının 6b maddesi

## Amaç

Edermi.com'un en güçlü yanlarından biri her mahalle için ayrı, arama motorunda tırmanan "X Mahallesi Arsa Fiyatları" sayfaları üretmesi. ArsaBil'in artık bu içeriği besleyecek veri katmanı var (`AreaPriceStat`, `AreaPriceTrend`, `Neighborhood`, TÜİK demografi) ama hiçbir genel-erişimli SEO sayfası yok — bugüne kadar bu veriler yalnızca `/deger` kartının (parsel/nokta sorgusu gerektiren) içinde tüketiliyordu.

Bu iş, il/ilçe/mahalle bazında herkese açık, arama motoru tarafından indekslenebilir sayfalar üretir: mahalle sayfası ana hedef (en yüksek SEO hacmi), ilçe/il sayfaları hem kendi başına arama hacmi kazanır hem de iç linkleme hiyerarşisi (breadcrumb, crawl derinliği) sağlar.

## Kapsam dışı (bilinçli)

- Ulusal veri toplama (Proxy Faz 1/2) — bu spec'in konusu değil, veri arttıkça bu sistem otomatik büyüyecek şekilde tasarlanıyor.
- Tekil emsal ilan detaylarının (fiyat/tarih/link) kamuya açılması — sadece agrege sayı gösterilir, `/deger`'in üye-tier gating'iyle tutarlı.
- `/deger` sayfasına mahalle bazlı deep-link prefill (WhatsApp botunun `?mahalleId&ada&parsel` deseni) — CTA düz link olarak kalır, prefill ayrı bir takip konusu.
- Statik/prerender performans optimizasyonu ulusal ölçekte (binlerce sayfa) — ISR + `dynamicParams` seçimi bu riski azaltır ama build-time tuning bu spec'in kapsamı dışında, veri büyüdükçe ayrı değerlendirilecek.

## Veri gerçekleri (mevcut koddan doğrulandı)

- `AreaPriceStat`/`AreaPriceTrend`/`Neighborhood` anahtarları `normalizeAreaName()` ile **ASCII-katlanmış BÜYÜK harf** saklanıyor (`src/lib/areaPrices/normalizeAreaName.ts`) — İ/I ve ı/i ayrımı kasıtlı olarak kayboluyor, çünkü bu sadece bir eşleştirme anahtarı, gösterim için tasarlanmadı.
- `MarketListing.il/ilce/mahalle` ise crawler'ın `cleanTrName()` fonksiyonuyla (`crawler/pipeline/normalize.ts`) **doğru Türkçe locale-aware BÜYÜK harf** olarak saklanıyor (İ/I ayrımı korunuyor, sadece harf büyüklüğü tek biçim).
- `valuateParcel()` (`src/lib/areaPrices/valuation.ts`) zaten bir güven eşiği tanımlamış: mahalle `sampleCount>=8` → `confidence:'yuksek'`, ilçe `sampleCount>=5` → `'orta'`, il → `'dusuk'`. Bu SEO sayfası eşiği bu skaladan ödünç alıyor.
- `AreaPriceStat` satırı zaten `MIN_SAMPLE=3` altında hiç oluşturulmuyor (`src/lib/areaPrices/aggregate.ts`) — yani il-seviye sayfa için ekstra bir eşik gerekmiyor, satırın var olması yeterli.
- `priceTrend()` (`src/lib/deger/priceTrend.ts`) zaten ince-veri (`thinTrend`) durumunu işaretliyor — sayfa bu bayrağı doğrudan kullanır.

## Mimari

### Route yapısı

```
src/app/arsa-fiyatlari/
  page.tsx                          → il dizini (index)
  [il]/page.tsx                     → ilçe dizini + il-seviye istatistik/trend
  [il]/[ilce]/page.tsx              → mahalle dizini + ilçe-seviye istatistik/trend
  [il]/[ilce]/[mahalle]/page.tsx    → mahalle detay sayfası
```

URL örneği: `/arsa-fiyatlari/trabzon/akcaabat/durubinar-mahallesi`. Segment sırası coğrafi hiyerarşiyi izler; her dizin sayfası bir alt seviyenin linklerini listeler.

Projede hazır bir breadcrumb bileşeni yok (grep ile doğrulandı) — bu iş kapsamında yeni, küçük, paylaşılan bir `Breadcrumb` bileşeni eklenir (üç seviyenin de kullandığı ortak parça).

### Yeni saf modüller — `src/lib/areaSeo/`

**`slug.ts`**
- `slugify(displayName: string): string` — Türkçe karakterleri ASCII'ye katlar (ç→c, ğ→g, ı/İ→i, ö→o, ş→s, ü→u), boşlukları `-`'ye çevirir, küçük harfe indirger.
- Slug → normalize anahtar çözümü ayrı bir fonksiyon değil; `listSeoAreas()`'ın döndürdüğü listede her kayıt zaten hem slug hem normalize anahtarı taşıyor (bkz. aşağı), sayfa bileşeni bu listede slug eşleşmesiyle arama yapar. Slugify'nin bijektif olmaması (teorik çakışma riski) mevcut sınırlı il/ilçe/mahalle kümesinde pratikte gerçekleşmiyor; `listSeoAreas()` aynı slug'a iki farklı anahtar düşerse build zamanında bir uyarı loglar (sessizce üzerini yazmaz — hangi ikisinin çakıştığı görünür olsun).

**`displayName.ts`**
- `resolveDisplayNames(keys: {il,ilce,mahalle}[]): Map<string, {il,ilce,mahalle}>` — normalize edilmiş anahtarları `MarketListing` tablosundan tek bir `findMany({distinct:...})` sorgusuyla toplu çözer (N ayrı sorgu değil). Her `MarketListing.il/ilce/mahalle` alanı `normalizeAreaName()`'den geçirilip anahtarla eşleştirilir, eşleşen ilk satırın orijinal (doğru Türkçe BÜYÜK harf) değeri alınır.
- `toTitleCase(s: string): string` — `s.toLocaleLowerCase('tr-TR')` + kelime başlarını büyütme (tr-TR locale-aware, İ/I ayrımını koruyarak). "DURUBİNAR" → "Durubinar".
- Şema değişikliği YOK — hiçbir yeni sütun eklenmiyor.

**`listSeoAreas.ts`**
- `listSeoAreas(scope: 'il'|'ilce'|'mahalle'): Promise<SeoAreaEntry[]>` — `AreaPriceStat`'tan ilgili scope'un satırlarını çeker, eşik filtresi uygular:
  - `mahalle`: `sampleCount >= 8`
  - `ilce`: `sampleCount >= 5`
  - `il`: satır var olması yeterli (zaten `MIN_SAMPLE=3`)
- `resolveDisplayNames` + `slugify`'yi çağırıp her kayda `{ilSlug, ilceSlug?, mahalleSlug?, il, ilce?, mahalle?, ilDisplay, ilceDisplay?, mahalleDisplay?}` üretir.
- Bu fonksiyon hem `generateStaticParams`'ta hem sayfa bileşeninin kendisinde (slug'dan anahtara dönmek için) kullanılır — tek kaynak, iki tüketici.

**`areaSeoCard.ts`**
- `buildAreaSeoCard(key: {il,ilce?,mahalle?}, deps): Promise<AreaSeoCardDTO>` — `card.ts` ile aynı DI deseni.
- Toplar: `AreaPriceStat` (medyan/p25/p75/örnek sayısı), `priceTrend()` çıktısı, `findDistrictDemographics` (yalnızca ilçe biliniyorsa — mahalle sayfasında "ilçe geneli" notuyla gösterilir), karşılaştırma **sayısı** (`MarketListing.count()`, item yok), ve **mahalle seviyesinde** `Neighborhood.geojson` merkezinden (`polygonCentroid`, mevcut `src/lib/geo/`) `buildRiskSnapshot()` (mevcut `src/lib/risk/riskSnapshot.ts`) ile temsili sismik/taşkın risk.
- `Neighborhood` satırı yoksa risk bölümü sessizce atlanır (zorunlu değil).

### Render stratejisi

- Her üç seviyede de `export const revalidate = 86400` (günlük) + `generateStaticParams` (build zamanında `listSeoAreas()` çıktısından tüm bilinen slug'ları üretir) + `dynamicParams: true`.
- Bilinen küme dışında bir slug'a ilk istek geldiğinde (örn. veri yeni eklendi ama henüz revalidate olmadı) Next.js JIT üretir ve cache'ler — kod değişmeden veri büyüdükçe sayfa sayısı otomatik büyür.
- Eşiği geçmeyen bir mahalle/ilçe için route 404 döner (`notFound()`) — ince/kopya içerik riski yerine "henüz yeterli veri yok" sinyali hiç sayfa üretmemekle veriliyor.
- Risk snapshot'ı (TUCBS WMS, ~6sn üst sınır) yalnızca mahalle sayfası üretimi anında bir kez çağrılır; sonraki isteklerde ISR cache'den gelir, canlı trafik için tekrar çağrılmaz.

### İçerik (üç seviyede de tamamen açık — üyelik kilidi yok)

**Mahalle sayfası (ana SEO hedefi):**
- `<title>`/`<meta description>` dinamik (`generateMetadata`): "{Mahalle} Mahallesi Arsa Fiyatları {Yıl} — {İlçe}, {İl} | ArsaBil" kalıbı.
- Breadcrumb: Anasayfa › Arsa Fiyatları › {İl} › {İlçe} › {Mahalle}.
- Fiyat kartı: medyan ₺/m², p25–p75 aralığı, örnek sayısı.
- 12 aylık trend grafiği (`PriceTrendChart`, mevcut bileşen) — `thinTrend` ise küçük bir uyarı notu, grafik yine de gösterilir (veri az ama yanıltıcı değil).
- Temsili risk satırı (varsa): "Bu mahallenin merkezine en yakın diri fay hattı: X km" / taşkın bilgisi.
- İlçe demografi özeti (varsa) — "ilçe geneli" notuyla.
- Karşılaştırma sayısı: "Son dönemde bu mahallede N satılık arsa ilanı."
- Aynı ilçedeki diğer mahalle sayfalarına linkler (iç linkleme).
- CTA: "Bu mahallede kendi parselini değerlendir" → `/deger`, "Kat karşılığı fizibilite hesapla" → `/hesapla`.

**İlçe sayfası:**
- Kendi istatistik/trend'i + ilçe demografi.
- İçindeki mahalle sayfalarını (yalnızca eşiği geçenler) medyan ₺/m² ile karşılaştıran bir tablo/link listesi.
- Breadcrumb, üst seviyeye (il) link.

**İl sayfası:**
- Kendi istatistik/trend'i.
- İçindeki ilçe sayfalarına linkler.
- Breadcrumb, üst seviyeye (dizin) link.

**Dizin sayfası (`/arsa-fiyatlari`):**
- Veri olan illerin listesi (şu an yalnızca Trabzon) + özellik açıklaması.

### Sitemap

`src/app/sitemap.ts` içine `listSeoAreas()` çıktısından üç seviyenin route'ları da eklenir — mevcut `listings` ekleme desenine benzer (bkz. dosyanın mevcut hâli).

## Test planı

- `slug.ts`/`displayName.ts`/`listSeoAreas.ts`/`areaSeoCard.ts` saf modüller → birim test (mevcut `stats.test.ts`/`normalizeAreaName.test.ts` deseniyle, DI mock'lu).
- `listSeoAreas` eşik filtresi (mahalle<8/ilçe<5 dışarıda kalıyor mu) ve slug çakışma uyarısı için özel testler.
- Sayfa bileşenleri: mevcut proje deseninde route testi varsa onunla; yoksa en azından `generateMetadata`/breadcrumb/CTA linklerinin doğru render olduğunu doğrulayan bir test + gerçek dev sunucuda Playwright ile bir mahalle/ilçe/il sayfası dolaşımı (breadcrumb tıklanabilir mi, 404 eşik-altı senaryosunda doğru dönüyor mu).
- `tsc` + tam proje `jest` regresyon taraması (proje deseni — bu ölçekte yeni route grubu eklerken).

## Açık riskler / kabul edilen v1 kalıntıları

- Slug çakışması teorik olarak mümkün (farklı iki mahalle aynı slug'a düşerse) — build-time uyarı ile görünür kılınıyor, otomatik çözüm yok (mevcut Trabzon verisinde gerçekleşmedi).
- `displayName.ts` bir mahalle için `MarketListing`'de hiç satır yoksa (yalnızca `Neighborhood`'dan geldiyse) düzgün casing kaynağı bulamaz — bu durumda normalize anahtar üzerinden `toTitleCase` uygulanır (İ/I ayrımı kaybedilmiş olabilir, kozmetik risk, nadir).
- Risk snapshot'ının build-time'da binlerce mahalle için toplu çağrılması ulusal ölçekte build süresini uzatabilir — ISR+`dynamicParams` bu riski JIT üretime yayarak azaltıyor ama ayrı bir performans değerlendirmesi gerekebilir (ulusal veri geldiğinde).
- `/deger` deep-link prefill yok (CTA düz link) — bilinçli kapsam dışı, ayrı takip konusu.
