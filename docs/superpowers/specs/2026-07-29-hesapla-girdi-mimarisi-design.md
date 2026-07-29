# `/hesapla` Girdi Mimarisi — Tasarım Dokümanı

**Tarih:** 2026-07-29
**Durum:** Onaylandı (insan onayı 2026-07-29)
**Kapsam:** Hesapla ekranının girdi mimarisi — hangi değer birinci sınıf, hangisi
derinlikte, hangisi nereden türüyor. Mobil öncelikli; iki karar masaüstüne de uzanır.

---

## 1. Problem

Hesaplama tutarlı bir fikir üzerine kurulmuş ama fikir kullanıcıya görünmüyor.

İlçe seçilince **iki değer birden** otomatik doluyor:

| Değer | Kaynak | Ne yapar |
|---|---|---|
| `globalUnitPrice` | `districtPrices[].avgUnitConstructionPrice` | **Hesabı süren asıl sayı** — motora `P` olarak gider |
| `manualMarketPrice` | `avgSalesPricePerM2 × apartmentSize` | Hesaba GİRMEZ; yalnızca karşılaştırma (rozet + kırılma noktası grafiği) |

Kullanıcı bunların hiçbirini görmüyor:

- **Birim inşaat maliyetinin hiçbir ekranı yok** — masaüstünde bile. Elle değiştiren
  bir kontrol de yok; tümüyle yönetici varsayılanı → ilçe verisi zincirinden türüyor.
- **Piyasa fiyatı** ⚙ dişlisinin arkasındaki çekmecede.
- **İl/ilçe seçici mobilde tamamen kayıp** (mobil ağaç `page.tsx`te erken `return`
  ile devreye girdiği için altında kaldı). Yani mobilde iki değer de hiç dolmuyor,
  kullanıcı tenant varsayılanına mahkûm.

Sonuç: kullanıcı "hangi fiyattan hesaplıyor bilmiyorum" diyor ve haklı. Ayrıca
ekranda **iki farklı "konum" kavramı** birbirine karışmış — başlıktaki "Konum seç"
çipi parsel haritasını (lat/lng) açıyor, ama o harita il/ilçeyi asla değiştiremez.

Buna ek olarak aynı yaprağa üç ayrı kapı açılmış (başlık çipi, ⚙ dişlisi, "Gelişmiş
ayarlar" butonu) ve girdi kartı ile yaprak **aynı üç kontrolü farklı etiketlerle**
iki kez gösteriyor.

## 2. Kararlar

| # | Karar | Gerekçe |
|---|---|---|
| K1 | Birim inşaat maliyeti **ilçeden gelir, görünürdür, elle ezilebilir** | Otomasyonun değeri korunur, sihir kalkar. Kaynak etiketi yazılır: "Kadıköy ortalaması 12.000 TL/m² · değiştir" |
| K2 | İl/ilçe ve parsel pini **tek "Konum" bloğunda, iki kademe** | İl/ilçe birinci sınıf (fiyatları getirir); parsel isteğe bağlı ikinci kademe (yalnızca resmi risk verisi). İsim karmaşası biter |
| K3 | Piyasa fiyatı **sonuç kartının altında karşılaştırma bloğu** | Soru nerede doğuyorsa cevap orada: kullanıcı sonucu görür, hemen altında "piyasaya göre nasıl" |
| K4 | Gelişmiş ayarlara **tek kapı**: etiketli buton kalır, ⚙ dişlisi kalkar | Etiketli buton ne olduğunu söylüyor, ikon söylemiyor. Başlık sadeleşir |
| K5 | Hesap/Analiz **sekme şeridi kalkar**, Analiz etiketli bir satır olur | Ekranda tek etkileşim modeli: ana görünüm + etiketli satırlarla açılan derinlikler |
| K6 | PDF indirme mobil `/hesapla`'da **yer almaz**; rapor oluşturulduktan sonra **Raporlarım**'dan indirilir | PDF, var olan bir raporun çıktısı — kalıcı yeri raporun kendisidir, onu üreten ekran değil. Sabit çubuk tek birincil eylemle kalır |
| K7 | Piyasa fiyatının çekmeceden çıkması **hem mobil hem masaüstü** için geçerlidir | Aynı sorun iki platformda da var; bu bir yerleşim değil görünürlük kararı |

## 3. Ekran mimarisi (mobil)

```
Başlık        logo + "Hesapla"                    (çip ve dişli KALKTI)

Sonuç kartı   MİN. DAİRE FİYATI
              5.019.940 TL
              [Arsa payı %33]  [Birim 35.857/m²]
              ─────────────────────────────────
              Piyasa: 5.800.000 TL · değiştir      [%14 UCUZ]
              ▸ Hesap fişi · Mi → Ma → M → ×K → FD
              ▸ Analiz · maliyet dağılımı, hassasiyet, kırılma, finansal özet

Girdi kartı   KONUM
                İl / İlçe ....................... [seçici]
                └ Kadıköy ortalaması 12.000 TL/m² · değiştir
                └ ▸ Parseli haritadan işaretle — resmi risk (isteğe bağlı)
              YAPI STANDARDI   [Standart | Orta | Lüks]
              DAİRE BÜYÜKLÜĞÜ  [ 140 m²   −  + ]
              ARSA PAYI        [————o———]  %33

              [ Gelişmiş ayarlar · risk, iksa, kâr ]

Sabit CTA     Özet Rapor Oluştur
              (PDF: Raporlarım'dan indirilir, bu ekranda değil)
```

**Birim maliyet ilçenin altında iç içedir.** Yan yana iki bağımsız alan olsalardı
nedensellik görünmezdi; iç içe olunca "bu rakam ilçeden geldi" kendiliğinden okunur.

**Sonuç kartı üç etiketli satır taşır** — karşılaştırma, fiş, analiz. Üçü de aynı
biçimde açılır.

## 4. Veri akışı ve öncelik kuralı

```
ilçe seçildi
  ├→ globalUnitPrice   = entry.avgUnitConstructionPrice   (kaynak etiketi: "<ilçe> ortalaması")
  └→ manualMarketPrice = entry.avgSalesPricePerM2 × apartmentSize

kullanıcı birim maliyeti elle değiştirdi
  └→ globalUnitPrice = girilen değer                      (kaynak etiketi: "elle girildi")

ilçe DEĞİŞTİ (elle girilmiş değer varken)
  └→ yeniden doldurulur; bilgi satırı: "<yeni ilçe> ortalamasına güncellendi"

konum TEMİZLENDİ
  └→ yönetici varsayılanına dönülür (mevcut `originalUnitPrice` davranışı)

parsel pini değişti
  └→ YALNIZCA risk ölçümü. Fiyatlara DOKUNMAZ.
```

**Öncelik kuralı gerekçesi:** alternatif (elle girilen değer ilçeyi ezmeye devam
etsin) daha "akıllı" ama tahmin edilemez — kullanıcı ilçeyi değiştirip fiyatın neden
değişmediğini anlayamaz. Öngörülebilirlik akıllılığa tercih edildi.

## 5. Ne nereye taşınıyor

| Kontrol | Bugün | Bu spec sonrası |
|---|---|---|
| İl/ilçe seçici | Masaüstü sidebar; **mobilde YOK** | Girdi kartı, Konum bloğu (her iki platform) |
| Birim inşaat maliyeti | Hiçbir yerde görünmüyor | Konum bloğu altında, kaynak etiketiyle, ezilebilir |
| Piyasa fiyatı | ⚙ çekmecesi (her iki platformda) | Sonuç kartı altında karşılaştırma bloğu — **mobil ve masaüstü** |
| Parsel pini + risk kartı | Mobil yaprak / masaüstü sidebar | Konum bloğunun ikinci kademesi |
| Daire sayısı / arsa payı | **Girdi kartı VE yaprak (iki kez)** | Yalnızca girdi kartı |
| Kâr, risk, iksa | Yaprak (`RiskCostFields`) | Yaprak (değişmez) |
| Arsa alanı (`isAaEnabled`/`arsaAlani`) | Yaprak, `FormulParamsFields` içinde | Yaprakta kalır — ama `FormulParamsFields` **bütün olarak kullanılmaz**; yalnızca arsa alanı kısmı. Daire sayısı/arsa payı kontrolleri girdi kartına ait (yukarıdaki satır) |
| Finansal panel | Masaüstü özet sayfalayıcı; mobilde YOK | Analiz görünümüne katılır |
| PDF indir | Masaüstü `/hesapla`'da buton; mobilde YOK; **Raporlarım'da YOK** | Mobil `/hesapla`'ya eklenmez. **Raporlarım'a eklenir** (bugün orada hiç yok — yeni iş). Masaüstü `/hesapla`'daki mevcut buton bu spec'te değişmez |
| Senaryo karşılaştırma | Masaüstü; mobilde YOK | **Ertelenir ve kendi UX/UI çalışmasını bekler** — masaüstü sürümünün mobile portu DEĞİL. Ayrı bir tasarım kalemi (bkz. §6) |

## 6. Kapsam dışı

- **Masaüstü yerleşiminin yeniden tasarımı** (Parça 3): `HesapFişi`'nin sunumu,
  sticky davranışı, genişliği ve fontu. Bu spec'ten yalnızca iki karar masaüstüne
  uzanır (birim maliyet görünürlüğü, piyasa fiyatının dişliden çıkması) — ikisi de
  yerleşim değil veri görünürlüğü meselesi.
- **Aramalı parsel sorgu ekranı** (Parça 1): il/ilçe/mahalle/ada/parsel ile arama,
  haritanın oraya uçması. Konum bloğunun ikinci kademesi bugünkü `ParcelPicker`'ı
  olduğu gibi kullanır.
- **Senaryo karşılaştırmanın tasarımı (Parça 4).** İnsan kararı 2026-07-29: bu,
  masaüstü sürümünün mobile taşınması değil; **her iki platform için de** yeni bir
  UX/UI çalışması gerektiriyor. Kendi spec'ini bekler. Bu arada mobilde yok
  olmaya devam eder ve bu durum ledger'da açıkça kayıtlıdır.
- **Masaüstü `/hesapla`'daki mevcut "PDF İndir" butonu.** Bu spec onu kaldırmaz ya da
  taşımaz; yalnızca Raporlarım'a kalıcı bir indirme yolu ekler.

## 7. Bağımlılık

**A1 review'ının C1 bulgusu bu işten ÖNCE düzeltilmelidir:** `BottomSheet`'in
`drag="y"`si yaprak köküne `touch-action: pan-x` koyuyor ve altındaki her şeyin
dikey kaydırmasını öldürüyor (ölçüm: 1129px içerik, 652px görünür, 477px erişilemez).
Konum bloğunun harita kademesi bu düzeltilmeden kullanılabilir olmaz.

## 8. Doğrulama gereksinimleri

A1 turunun dersi spec'e yazılıyor: **ekran görüntüsü ve `getByRole` bu turda dört
gerçek kusurun dördünü de kaçırdı.** Yakalayanlar hesaplanmış stil okuması ve simüle
edilmiş jest oldu. Bu iş için üç doğrulama zorunludur:

1. **Jest testi:** yaprak parmakla kaydırılabiliyor; aşağı sürükleme içeriği
   kaydırıyor, yaprağı kapatmıyor (`touch-action` `pan-x` DEĞİL).
2. **Computed-style testi:** mobil ağaçta `--seal-*` gibi token'lar gerçekten
   çözülüyor (bugün `HesapFişi`'nin zemini ve ayraçları mobilde görünmez oluyor,
   çünkü `--seal-*` `.container`a scope'lu ve mobil ağaç onu hiç render etmiyor).
3. **Davranış testi:** ilçe seçilince iki değer de doluyor; elle ezme çalışıyor;
   ilçe değişince yeniden doldurma çalışıyor; konum temizlenince varsayılana dönüyor.

Bunlara ek olarak mevcut kısıtlar geçerlidir: masaüstü düzeni `≥769px`'te değişmez,
`engine_v2.ts` değişmez, `null` → `'—'` (asla `0`), yeni eslint ihlali yok.
