# Akif-5c Aşama C — İmar, Bölge Daire Fiyatı ve Hesap (Tasarım)

Tarih: 2026-10-15 · Durum: onay bekliyor (yazılı spec)
Üst spec: `2026-10-15-akif-5c-whatsapp-proje-kartlari-design.md` (§3.6 bu belgeyle somutlaşır). Aşama sırası B → **C** → A; B kodu `codex/professional-ui-and-land-cost` dalında.

## 1. Amaç ve anlaşılan ihtiyaç

Parseli bilinen müşteri WhatsApp'ta "kaç daire çıkar, bana kaç düşer?" diye sorduğunda Akif güvenilir cevap verir.

- Yalnız parsel sorgusu yetmez; **imar durumu** (kat, emsal) gerekir. Akif bunu müşteriye sorar.
- Müşteri imarı bilmiyorsa Akif bölgenin **konut ilanlarından** daire fiyatı çıkarır, "bu bölgede 150 m² daire ort. ~7 milyon, doğru mu?" diye doğrulatır. Onay → ilan kaynaklı olgu; düzeltme → kullanıcı değeri. Veri yoksa tahmin sunmadan fiyatı sorar.
- İmar biliniyorsa tam hesap (toplam daire, arsa sahibine düşen daire, piyasa değeri). Bilinmiyorsa yalnız fiyat üzerinden **yüzde** konuşulur (daire sayısı verilmez).
- Her hesap projeye ve revizyon günlüğüne yazılır; "15 Ekim'deki senaryo" özeti sonucu da içerir.

Kullanıcı kararları: konut taraması C'nin içinde (pilot iller: İstanbul, Ankara, İzmir, Trabzon; sonra genişletme ayrı iş); piyasa fiyatı motorun çekirdeğine girmez, yan girdi olur; ayrı `KonutFiyatStat` tablosu.

## 2. Kapsam dışı

81 ile genişletme, cron/yenileme düzeni, sahibinden/hepsiemlak konut taraması, görsel okuma (Aşama A), web'de yeni sonuç ekranı, `engine_v2` çekirdeği değişikliği.

## 3. Veri katmanı

### 3.1 Model `KonutFiyatStat` (migration)
`il`, `ilce`, `mahalle`, `scope` ("il"|"ilce"|"mahalle"), `medianPricePerSqm`, `p25`, `p75`, `sampleCount`, `medianAreaSqm`, `computedAt`. `AreaPriceStat`'tan FARKLI olarak `ilce`/`mahalle` null değil, üst ölçeklerde boş string ("") tutulur: Postgres unique kısıtında null'lar birbirine eşit sayılmaz, null'lı `[il, ilce, mahalle]` unique'i il/ilçe satırlarında çoğalmayı engellemez. Unique `[il, ilce, mahalle]`. Arsa tablosu ve `src/lib/areaPrices/aggregate.ts` değişmez.

### 3.2 Hesap `src/lib/konutPrices/aggregate.ts`
Kaynak `MarketListing`: konut türleri (`normalize.ts` sınıflaması: daire, konut, rezidans vb.), aktif durum. Elenenler: m² 40–400 dışı, fiyatsız, TL/m² değeri bölgenin p5–p95 bandı dışında. Her ölçek için medyan/p25/p75 upsert. Saf fonksiyonlar (test edilebilir) + ince DB sarmalayıcı.

### 3.3 Okuma `lookupKonutFiyat(il, ilce, mahalle, daireM2)`
Geri düşme: mahalle ≥8 örnek → ilçe ≥5 → il (`valuation.ts` deseni). Dönüş `{ tl, perSqm, scale, sampleCount, confidence }` (yuksek/orta/dusuk) veya yetersizse `null`. `tl = medyan TL/m² × daireM2`, yüzlüğe yuvarlanır. Girdi aralığı `numberSafety.RANGES` (daire 30–500).

### 3.4 Tarama ve çalıştırma
`npm run crawl -- --portal=emlakjet --il=<il> --category=konut` pilot illerde, tek worker ve partili (arsa taramasındaki bellek baskısı nedeniyle), ardından `package.json`'a eklenecek istatistik betiği. Bu bir **operasyon adımıdır**, kod testi değildir; sonucu (il başına ilan/örnek sayısı) kayda geçirilir.

## 4. Diyalog akışı ve araçlar

Tek araç/tur kuralı (orchestrator) korunur. Yeni araçlar yalnız WhatsApp, `src/lib/whatsapp/projectTools.ts` ve WhatsApp-özel gateway'e eklenir (web/voice görmez).

Akış:
1. Parsel belli (`lookupParcel`; Parsel Dosyası'ndan okunur, tekrar sorulmaz).
2. İmar: taze (180 gün) olgu varsa sorulmaz; bayatsa tarihiyle teyit; eksikse sorulur; `rememberFact(emsal|kat)`.
3. İmar biliniyorsa `calculateProject` → tam hesap.
4. Bilinmiyorsa `estimateDaireFiyati` → "~X, doğru mu?" → evet: `rememberFact(daireFiyati, kaynak: ilan)`; düzeltme: kullanıcının değeri (`kullanici`); veri yoksa doğrudan sorulur.
5. Fiyat olgusu varsa `calculateProject` imarsız modda çalışır.

### 4.1 `estimateDaireFiyati { projectId }`
Parsel Dosyası'ndan konum, proje girdisinden `daireBuyuklugu` alır; `lookupKonutFiyat` çağırır. `ProjectCard.op`: `price_estimate` (`data`: tl, perSqm, ölçek, örnek sayısı, güven, "ilan fiyatı" notu) veya `price_unavailable`. Tahmin hiçbir zaman doğrulanmadan hesaba girmez.

### 4.2 `calculateProject { projectId }`
- `resolveEngineDefaults` ile eksik girdiler (birim maliyet P, K, kalite) varsayılanlarla dolar; kullanılanlar sonuçta `varsayimlar` listesinde döner.
- **Tam mod** (emsal+kat/alan var): mevcut `compareContractorOffers` mantığıyla toplam daire = ⌊arsaAlani×emsal/daireBüyüklüğü⌋, arsa sahibine düşen daire, o dairelerin piyasa değeri (= düşen daire × doğrulanan daire fiyatı, fiyat olgusu varsa) ve `Pmarket` = daire fiyatı verilerek `x_max`.
- **İmarsız mod** (emsal yok, `daireFiyati` var): motor tek daire için `Pmarket` ile çağrılır; `Mi = L·P·Ad` ve `Pmarket` daire-başı değerlerdir (`engine_v2.ts:101,147`), bu yüzden **daire sayısı gerekmeden** `x_max` çıkar. Çıktı: "müteahhit zarara girmeden en fazla yaklaşık %X'e kadar arsa payı verebilir" + bölge fiyatı + güven + "imarı öğrenince net sayı çıkarırız". `x_max` negatifse "bu fiyatla bu maliyette proje yapılamaz" diye motorun söylediği aynen aktarılır (gizlenmez).
- `ProjectCard.op`: `calculated` (`data.mod: 'tam'|'imarsiz'`). Rakamlar yalnız araç sonucundan gelir; Akif hesaplamaz.
- Sonuç `ProjeKarti.result` (Json, yeni kolon, migration) alanına ve `ProjeRevizyon` günlüğüne yazılır; sahiplik kontrolü Aşama B'deki userId kuralıyla aynı.

### 4.3 Bayatlık
`daireFiyati` 45 günden eskiyse Akif tarihiyle teyit ettirir; teyitte yeniden hesap önerilir. Mevcut `freshness` mekanizması kullanılır.

### 4.4 Politika
`AKIF_WHATSAPP_PROJECT_POLICY` genişler: sıralama (imar → fiyat → hesap), "ilan fiyatları, pazarlık payı içerir" notu, `price_unavailable` ve `calculated` sonuçlarını anlatma kuralı, araç sonuç metinlerinin veri olduğu. `ProjectCard` op birliği ve `mergeRecentProjects`/`renderCard` yeni op'lara göre güncellenir.

## 5. Hata durumları
Veri yetersiz (`price_unavailable`) → fiyatı sor; eksik girdi → `failed` + neden; az örnek (`dusuk` güven) → "yaklaşık" çerçevesi; sahipsiz/yanlış proje → mevcut `not_found`/`failed`.

## 6. Test
- Saf: aggregate (aykırı eleme, yüzdelik, ölçek, sınır örnek sayıları), `lookupKonutFiyat` (geri düşme, null, yuvarlama).
- Araç: argüman doğrulama, her op için akış (sahte gateway), `calculateProject` tam/imarsız mod bilinen değerlerle (`x_max` elle hesaplanmış), `result` yazımı + revizyon girdisi, sahiplik.
- Politika/handler: yeni op'lar kartta ve `recentProjects`'te doğru işlenir.
- Operasyon: pilot tarama + istatistik üretimi kayda geçer (kod testi değil).

## 7. Riskler
İlan fiyatı gerçekleşen fiyat değildir (Akif söyler, kullanıcı düzeltir); pilot dışı bölgede veri yoktur (normal yol: fiyatı sor); `x_max` yorumu müşteriye doğru aktarılmalıdır (politika + test). Canlıya almadan önce: Aşama B'nin migration'ı ile C'nin iki migration'ı (`KonutFiyatStat`, `ProjeKarti.result`) gerçek Postgres'te birlikte denenir; `npm run build` doğrulanır; gerçek telefon duman testi. Push/deploy kullanıcı onayı olmadan yapılmaz.

## 8. Başarı ölçütü
Pilot ilde müşteri parsel + "imarı bilmiyorum" derse Akif ~bölge fiyatını sorar, onay/düzeltmeyle kaydeder ve "en fazla %X arsa payı mantıklı" cevabını verir; imar verilirse tam daire hesabı çıkar; ikisi de projeye yazılır ve sonradan "o senaryo" denince özetlenir.
