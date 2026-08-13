# Hesapla Masaüstü Girdi Sırası — Tasarım

## Amaç

ArsaBil hesap motoru denetiminin (2026-08-14) yan bulgusu: masaüstü
`/hesapla` girdi kartlarının sırası gerçek bir müteahhit iş akışını
yansıtmıyor, ve mobille (bu oturumda daha önce yeniden sıralanmış)
taban tabana zıt bir sıra kullanıyor — aynı uygulamanın iki yüzü
kullanıcıya iki farklı zihinsel model dayatıyor. Ayrıca arsa payı (x)
İKİ ayrı, birbirinden uzak kontrol noktasından yönetiliyor.

Kullanıcı onayladı: masaüstü mobille AYNI sıraya getirilecek, arsa payı
TEK bir bloğa birleştirilecek. Görsel dil (renkler, kart stili) DEĞİŞMİYOR
— yalnızca sıralama ve arsa payı kontrolünün birleşmesi.

## Mevcut Durum (masaüstü, `src/app/hesapla/page.tsx`)

Sol sidebar (`Proje Bilgileri`), yukarıdan aşağı:
1. Daire Standardı (satır 632-646)
2. Ortalama Daire Metrekaresi (648-662)
3. Toplam Daire Sayısı toggle + (açıksa) daire-sayısı slider'ları (664-691)
4. `<SmartContextCard>` — Konum + Deprem Riski + Arsa Alanı, SABİT bu sırada, TEK bileşen (697-710)
5. Birim İnşaat Maliyeti (712-718)

Ayrı olarak, `<main>` (sonuçlar sütunu) içinde, sonuçlardan SONRA:
6. "Arsa Payı" yüzde slider'ı (813-840) — `isApartmentCountEnabled` açıksa salt-okunur özet, kapalıysa DÜZENLENEBİLİR yüzde slider'ı. Bu, arsa payının İKİNCİ, ayrı kontrol noktası.

`SmartContextCard` (`SmartContextCard.tsx`), üç alt-bileşeni (`LocationHeader`/`RiskSection`/`AreaSection`, hepsi `SmartContextCardSections.tsx`'te) SABİT sırada birleştiren ince bir sarmalayıcı — kendi docstring'i bunu "masaüstü için BİREBİR ÖNCEKİ GİBİ kalır" diye açıklıyor. Mobil (`GirdiKarti.tsx`) bu oturumda ÖNCEDEN bu üç bileşeni AYRI AYRI, kendi sırasında kullanmaya geçmişti — `SmartContextCard` artık YALNIZCA masaüstü tarafından render ediliyor (grep ile doğrulandı: `<SmartContextCard` yalnızca `page.tsx` ve kendi test dosyasında geçiyor).

## Hedef Durum

Sol sidebar, yukarıdan aşağı:
1. **Konum** (`LocationHeader`)
2. **Arsa Alanı** (`AreaSection`)
3. **Daire Standardı** (mevcut, taşınıyor)
4. **Ortalama Daire Metrekaresi** (mevcut, taşınıyor)
5. **Birim İnşaat Maliyeti** (mevcut, taşınıyor)
6. **Arsa Payı** — TEK blok: toggle (`isApartmentCountEnabled`) + açıksa daire-sayısı slider'ları + derive edilmiş yüzde notu, kapalıysa yüzde slider'ı. Mevcut "Toplam Daire Sayısı" bloğu (664-691) ile `<main>`'deki yüzde slider'ının (813-840) BİRLEŞİMİ.
7. **Deprem Riski** (`RiskSection`) — artık SONDA

`<main>`'deki eski "Arsa Payı" bloğu (813-840) TAMAMEN KALDIRILIYOR — işlevi sidebar'daki birleşik bloğa taşınıyor. `<main>`'de bu bloğun bulunduğu yer boş kalmaz; `actionsSection` bir önceki kardeşi olarak zaten oradaydı, o direkt üstte kalır (spacing `settingsGroup`/`sliderArea` deseniyle korunur, ayrıntı implementasyon sırasında CSS'e bakılarak netleştirilir).

`SmartContextCard` bileşeni ve sarmalayıcısı (`SmartContextCard.tsx`, `SmartContextCard.module.css` ilgili kısımları, `SmartContextCard.test.tsx`) artık HİÇBİR YERDEN render edilmeyeceği için ÖLÜ KOD olur — silinir.

## Yeni Bileşen: Birleşik Arsa Payı Bloğu

Mobilin `GirdiKarti.tsx`'teki `data-girdi-blok="arsa-payi"` JSX'i (satır 226-304) REFERANS ALINIR ama BİREBİR KOPYALANMAZ — masaüstü kendi görsel diline (`Toggle`, `RangeSlider`, `styles.stepperInput`/`styles.settingsGroup`) sahip, mobilin `styles.anahtar`/`styles.slider`/`ilerleme()` kendi CSS modülüne özel. Davranış BİREBİR aynı olacak:

- Toggle açıkken: toplam daire sayısı stepper'ı (mevcut, korunur) + `RangeSlider` ile "Arsa Sahibine Düşen Daire" (mevcut, korunur, `max={Math.max(totalApartments-1,0)}`) + salt-okunur türetilmiş yüzde notu (YENİ, masaüstünde şu an yok — `%{Math.round(effectiveLandShareRatio)}` zaten hesaplanıyor, `<main>`'deki eski slider'ın `sliderValueBox`'ından esinlenerek metne çevrilir).
- Toggle kapalıyken: `<main>`'deki eski yüzde slider'ının JSX'i (`sliderContainer`/`sliderTrack`/`sliderFill`/`sliderThumb`/`sliderTicks`, satır 820-838) AYNEN bu yeni bloğa taşınır (kopyalanır, silinmez — davranış/görsel BİREBİR korunur).

Yeni birleşik blok `settingsGroup` içinde, mevcut "Toplam Daire Sayısı" `<h4>`'ünün yerini alır (başlık "Arsa Payı" olarak güncellenebilir veya "Toplam Daire Sayısı" kalabilir — implementasyon sırasında görsel tutarlılığa bakılarak karar verilir, davranışı etkilemez).

## Kapsam Dışı

- Gelişmiş Ayarlar paneli (Piyasa Fiyatı/İksa/Müteahhit Kazancı) — kullanıcı onayıyla DOKUNULMUYOR, mobille tutarlı kalıyor.
- Görsel restyle — renk paleti, kart border-radius/shadow, tipografi DEĞİŞMİYOR.
- `RiskSection`/`AreaSection`/`LocationHeader` bileşenlerinin KENDİ içindeki tasarımı — yalnızca SAYFADAKİ SIRALARI değişiyor, içerikleri değişmiyor.
- Mobil (`GirdiKarti.tsx`) — zaten doğru sırada, dokunulmuyor.
- Grup D (PWA anasayfa) ve diğer bekleyen konular.

## Test Stratejisi

Mevcut `page.test.tsx`'teki testler (parsel modalı, boş durum, Gelişmiş
Ayarlar, C1/C3/C5/C6 regresyon testleri) DAVRANIŞ değişmediği için
KIRILMAMALI — ama bazıları DOM SIRASINA değil metne/role'e göre sorgu
yaptığı için muhtemelen etkilenmez; `within(sidebar)`/`.closest()`
kullanan sorgular yeni konumlarla uyumlu kalmalı (elle doğrulanacak).

Yeni testler:
- `page.tsx`'te sidebar içindeki kart sırasının (data-testid veya
  metin sırasına göre) hedef sırayla eşleştiğini doğrulayan bir
  regresyon testi (mobildeki `"kartin alan sirasi..."` testinin
  masaüstü eşdeğeri).
- Birleşik Arsa Payı bloğunun HER İKİ modda da (toggle açık/kapalı)
  doğru render olduğunu ve state'i doğru güncellediğini doğrulayan
  testler (muhtemelen zaten var olan C1 testinin yanına eklenir).
- `SmartContextCard.tsx` silindiğinde, ona ait test dosyalarının da
  silindiği (artık test edilecek bir şey kalmadığı için) doğrulanır —
  `SmartContextCard.test.tsx` silinir.

## Doğrulama

tsc 0 hata, jest tüm proje yeşil, Playwright ile gerçek masaüstü
(1440×900) görsel doğrulama — kart sırası + arsa payı bloğunun her iki
modda da doğru çalıştığı ekran görüntüsüyle teyit edilir.
