# ArsaBil Görsel Yenileme — "Arazi" Yönü (Tasarım)

Tarih: 2026-10-22 · Durum: TASLAK — Figma mockup'ları hazır, Emre onayı bekliyor (onaydan önce ürün kodu yazılmaz)
Figma: https://www.figma.com/design/XHT2SYHmQzk9TzYJyDGmbF (3 sayfa: 00 Sistem, 01 Ana Sayfa & Harita, 02 Parsel & Geçişler). Not: Starter plan sayfa/mod sınırı yüzünden 3 sayfa, açık/koyu için 2 ayrı değişken koleksiyonu; mockup'ta Inter kullanıldı (web: system-ui, Inter yedek).

## 1. Niyet ve neden

ArsaBil'in en güçlü tarafı veri (gerçek TKGM parseli, TBDY risk, 70K+ ilan, hesap motoru), ama ilk izlenim bunu söylemiyor: harita düz uydu fotoğrafı, ana sayfa yalnızca cam kartlar + gradyanlı başlık, hareket yok. Rakip (edermi.com) animasyonlu 3D arsa çizimi ve m² fiyatıyla "ürün hissi" veriyor.

Emre'nin sözleriyle: "harita düz uydu gibi, ilk orası gözüme çarpıyor"; arsa için 3D animasyonlu çizim + **m² fiyatı olmazsa olmaz**; "Apple-like + popüler 3D animasyon/geçiş konsepti"; iCloud/apple.com geçişleri referans; "bunun daha iyisi lazım"; kapsam serbestliği verildi ("tüm context'e bakıp ekstra design üretebilirsin").

**Ana fikir: ArsaBil bir arazi platformu — arazi görünür, hissedilir ve fiyatı üstünde durur.** Düz uydu yerine kabartmalı (terrain) harita; jenerik illüstrasyon yerine *gerçek parsel geometrisinden* üretilmiş 3D plinth; her yerde aynı hareket dili.

## 2. Hedefler / hedef-olmayanlar / anti-hedefler

Hedefler
- G1. Harita: uydu → kabartma/terrain tarzı (hillshade + eğim), hafif pitch, fiyat etiketli işaretçiler.
- G2. "Parsel Plinth'i": arsa kartında/detayda gerçek parsel poligonundan 3D blok, yükselme animasyonu, **üstünde yüzen ₺/m² etiketi**, ölçü çizgileri (m², cephe).
- G3. Ana sayfa hero: kaydırmayla ilerleyen sahne (Türkiye kabartması → il → ilçe → parsel plinth'i → fiyat). Apple ürün sayfası dilinde.
- G4. Ortak hareket dili: yay (spring) tabanlı, kesilebilir geçişler; sayfa/kart geçişlerinde paylaşılan eleman (View Transitions); `prefers-reduced-motion` tam destek.
- G5. Renk revizyonu: glass korunur, palet "toprak + gün ışığı" yönüne çekilir (§5).
- G6. Mobil önce: 390px birincil, 3D ağır cihazda poster/CSS fallback.

Hedef-olmayanlar
- Hesapla/Gelişmiş Ayarlar form akışlarını yeniden tasarlamak (bu tur değil).
- Chrome eklentisi (ertelendi).
- Yeni veri kaynağı entegrasyonu (mevcut TKGM/ilan verisi yeter).

Anti-hedefler (teknik olarak çalışsa bile başarısız sayılır)
- Düşük/orta Android telefonda takılan, pil yiyen, açılışı yavaşlatan 3D.
- Süsleme için animasyon: hareket bir şeyi **anlatmalı** (zoom = konuma in, yükselme = parselin oluşması, etiket = fiyat).
- Edermi'nin renklerini/illüstrasyonunu kopyalamak. Sahte veri/yorum/metrik uydurmak (PRODUCT.md).
- Okunabilirlik kaybı: saha kullanımı (güneş altı) için kontrast korunur.

## 3. Mevcut durum (recon, 2026-10-22)

- Harita: Leaflet (`useLeafletMap`) + Google satellite tile (`lyrs=y`) — `MapView`, `MiniMap`, `ParcelPicker`, `DegerMiniMap`, `EmsalMap`.
- Studio: Three.js (`@react-three/fiber`, `drei`) vitrin + fal.ai img2img; yalnız kat-karşılığı bina kütlesi senaryosunda, çıplak arsada yok.
- UI: aurora glass (34 CSS dosyası), marka mavisi `#1f6feb`, ana sayfa hero = gradyanlı başlık + "LIVE DEMO" kartı. Ekran görüntüleri alındı (1440 ve 390).
- Tema: açık/koyu var, PWA.

## 4. Sahneler (Figma'da çizilecek)

S1 Ana sayfa hero (masaüstü + mobil): 3 anlık kare — (a) Türkiye kabartması, (b) il yakınlaşması, (c) parsel plinth'i + fiyat etiketi.
S2 Marketplace harita/split: terrain tabanlı harita, fiyat çipleri (küme → yakınlaştırınca ayrışır), seçili parsel altın-halka, alttan kayan kart.
S3 İlan/parsel detay: sayfa üstünde interaktif plinth (döndürülebilir), ölçüler, ₺/m², risk katmanı (fay/taşkın) renkli halo.
S4 Geçiş: kart → detay paylaşılan-eleman geçişi (storyboard kareleri).
S5 Hareket spesifikasyonu: süre/yay değerleri, tetikleyiciler, reduced-motion karşılıkları.
S6 Palet + tipografi + bileşen (fiyat çipi, plinth etiketi, harita kontrolleri).

## 5. Görsel dil — önerim (benim kararım, Emre'nin onayı bekliyor)

- Zemin: koyu "gece arazisi" `#0b1220` + açık tema "kâğıt harita" `#f4f1ea`.
- Arazi tonları: adaçayı yeşili `#6f8f72`, kil/toprak `#b08968`, kar-kaya `#e9e4da`.
- Marka mavisi (`#1f6feb`) yalnızca etkileşim/bağlantı rengi olarak kalır; fiyat vurgusu için **amber `#f2b84b`** (m² etiketi, seçili parsel).
- Glass korunur ama daha az yoğun; derinlik için yumuşak gölge + ince 1px iç çizgi.
- Tipografi: Apple tarzı büyük/sıkı başlık, tabular rakamlar (fiyatlar için kritik). Font seçimi Figma turunda önerilecek.

## 6. Teknik yön (karar noktaları — onaydan sonra plan)

- Harita: MapLibre GL JS (vektör + terrain-DEM + hillshade + pitch). Leaflet'ten kademeli geçiş: önce `MapView` (marketplace), sonra mini haritalar. Taban stil için ücretsiz/barındırılabilir kaynak (OpenFreeMap / Protomaps + AWS Terrarium DEM) — **karar:** lisans/kota ve self-host kontrolü plan aşamasında. Anahtar gerektiren sağlayıcı (MapTiler vb.) Emre'ye sorulmadan seçilmez.
- Parsel plinth: mevcut react-three-fiber; geometri TKGM poligonundan `ExtrudeGeometry`, taban dokusu terrain/uydu karışımı. Lazy-load, `Suspense`, `<canvas>` yalnızca görünür olunca; düşük cihazda statik poster (önceden render edilmiş SVG/WebP) fallback.
- Hareket: `framer-motion` (zaten var) yay animasyonları + CSS scroll-driven animation / IntersectionObserver; sayfa geçişi için View Transitions API (destek yoksa sade fade).
- Performans bütçesi: ilk yükleme JS'ine 3D/harita kodu **eklenmez** (dinamik import); LCP hero metni/posteri; 60fps hedefi orta seviye Android.
- Kabul ölçütü: Lighthouse mobil Performans ≥ mevcut −5 puan; reduced-motion testi; gerçek telefon doğrulaması (Playwright yetmez).

## 7. Dilimler (plan aşamasında detaylanır)

1. Tasarım sistemi tokenları + hareket yardımcıları (palet, spring presetleri).
2. Terrain harita (marketplace) + fiyat çipleri.
3. Parsel plinth bileşeni + detay sayfası.
4. Hero sahnesi (scroll-driven) + fallback.
5. Geçişler (kart→detay) + mini haritalar + cilâ.

Her dilim ayrı PR/commit; her biri tek başına canlıya çıkabilir.

## 8. Emre'ye açık sorular

- Renk yönü (§5) uygun mu, yoksa marka mavisinde mi kalalım?
- Hero'da kaydırma-sahnesi mi (daha etkileyici, daha ağır) yoksa tek parça döngüsel animasyon mu (daha hafif)? **Benim önerim: kaydırma-sahnesi, mobilde poster fallback.**
- Harita tabanı için ücretli bir sağlayıcı (aylık ~$) kabul edilir mi, yoksa yalnız ücretsiz/self-host mu?
