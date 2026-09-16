# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Üç birincil kullanıcı grubu:
- **Arsa sahipleri** — kat karşılığı inşaat teklifi değerlendiren, arsa payı oranını ve olası getiriyi hesaplamak isteyen kişiler.
- **Müteahhitler** — bir parselin fizibilitesini (maliyet, kâr, risk) hızla değerlendirip pazarlık pozisyonunu belirlemek isteyen inşaat firmaları/bireyleri.
- **Gayrimenkul danışmanları** — müşterilerine arsa değerlemesi ve fizibilite analizi sunan aracılar.

Mobilde kullanım bağlamı iki senaryoyu eşit ağırlıkta kapsar: (a) saha — kullanıcı fiziksel olarak parselin üzerinde/yakınında, hızlı bir fizibilite/değer kontrolü yapıyor (güneş altında okunabilirlik, büyük dokunma hedefleri önemli); (b) masa/koltuk — birden fazla ilanı/senaryoyu karşılaştırarak detaylı inceleme yapıyor (bilgi yoğunluğu, detay önceliği). Tasarım ikisini de dengelemeli.

## Product Purpose

ArsaBil, Türkiye'deki kat karşılığı inşaat projelerinde arsa payı oranını, fizibilite skorunu ve yatırım getirisini bilimsel/veri-temelli olarak saniyeler içinde hesaplayan bir SaaS platformu. Amaç: arsa sahibi ile müteahhit arasındaki "bu arsa ne eder, hangi şartlarda anlaşılır" belirsizliğini gerçek veriyle (TKGM parsel verisi, gerçek TBDY sismik/taşkın risk, bölgesel emlak fiyat verisi) kapatmak.

## Positioning

Rakiplerinden (ör. edermi.com gibi salt "arsa değerleme" siteleri) farkı: yalnızca değerleme değil, **kat karşılığı fizibilite motoru + arsa sahibi↔müteahhit teklifli pazar yeri + gerçek TBDY sismik/taşkın risk verisi + AI destekli danışman (Akif) + 3D fotogerçekçi görselleştirme (Studio)** bir arada. Konumlandırma "değerleme sitesi" değil "arsanı ne yapacağına karar ver" — komşu bir ürün yalnızca değerleme sunarak bunu taklit edemez.

## Operating Context

- Türkiye geneli, Türkçe arayüz; TKGM (Tapu Kadastro) canlı API entegrasyonu ile gerçek parsel/il/ilçe/mahalle verisi.
- PWA (standalone, portrait-öncelikli) — mobil kullanım birinci sınıf, masaüstü de destekleniyor.
- Mobil kullanım hem sahada (parselin üzerinde/yakınında, hızlı kontrol) hem masa başında (karşılaştırmalı inceleme) gerçekleşiyor.
- Marketplace: harita/liste/split görünüm, 81 il desteği, fizibilite skoru bazlı filtreleme, teklif sistemi.
- Akif: AI destekli sesli/metin danışman (OpenAI Realtime + metin), WhatsApp botu üzerinden de erişilebilir.
- Studio: 3D fotogerçekçi görselleştirme (fal.ai).
- SEO mahalle sayfaları: il/ilçe/mahalle bazlı herkese açık arsa fiyatı sayfaları.

## Capabilities and Constraints

- Next.js 16 (App Router) + Prisma/Postgres + TypeScript.
- Gerçek TKGM parsel verisi, gerçek TBDY sismik (diri fay mesafesi) + taşkın (Q100) risk verisi — rakiplerin sahip olmadığı bir veri katmanı.
- Kat karşılığı hesap motoru (engine_v2): arsa payı, daire fiyatı, m² birim fiyatı, risk payı, müteahhit kazancı parametreleri; PDF rapor çıktısı.
- Marketplace: ilan + teklif sistemi, harita (OpenStreetMap/Leaflet) + liste + split görünüm.
- Akif: metin + sesli AI danışman, aylık bütçe/kota sınırlı (OpenAI maliyeti).
- WhatsApp entegrasyonu: gelen sorgu botu + haftalık bildirim/abonelik.
- Studio: fal.ai üzerinden 3D fotogerçekçi render, aylık bütçe sınırlı.
- Veri kapsamı şu an Trabzon pilot ölçeğinde (crawler + fiyat istatistikleri); ulusal ölçeğe kod değişmeden büyüyecek şekilde tasarlandı.
- Undecided: mobil UI'ın genel kalite durumu henüz sistematik olarak denetlenmedi — bu, sıradaki `audit`/`critique` çalışmasının konusu.

## Brand Commitments

- Ad: **ArsaBil** ("arsa" + "bil" — "arsanı bil/tanı").
- Marka rengi: mavi `#1f6feb` (PWA theme_color, aurora-violet/blue/cyan gradyanı `globals.css`'te tanımlı).
- Arka plan: koyu lacivert `#0a2443`/`#0a0f1e` tonları (varsayılan tema koyu; açık tema da destekleniyor).
- Ton: profesyonel, veri-odaklı, güven verici (mühendislik/bilimsel dil — "bilimsel verilerle saniyeler içinde").

## Evidence on Hand

- Canlı ürün: `https://www.arsabil.com` (2026-07-20'den beri yayında).
- Kod tabanındaki tüm hesaplama/risk/veri iddiaları gerçek entegrasyonlara dayanıyor (TKGM, TUCBS risk WMS, kendi crawler'ı) — uydurma veri/metrik YOK.
- Henüz gerçek kullanıcı testimonial'ı, vaka çalışması veya basın kaydı YOK — gelecek çalışma bunları uydurmamalı.

## Product Principles

1. **Gerçek veri, uydurma yok** — her hesaplama, risk göstergesi veya istatistik gerçek bir veri kaynağına dayanmalı; placeholder/mock değer canlıya çıkmaz.
2. **Mobil birinci sınıf, masaüstü eşit değerli** — PWA'nın standalone/portrait önceliği tesadüf değil; tasarım kararları mobilde asla ikinci plana düşmemeli.
3. **Saha + masa başı ikisi de gerçek** — hızlı/kaba-kuvvet saha kontrolü ile yavaş/detaylı masa başı inceleme aynı ürün içinde çatışmadan bir arada yaşamalı.
4. **Şeffaflık kazanır** — "Min." gibi etiketler, güven seviyesi (yüksek/orta/düşük), ince veri uyarıları gibi dürüstlük sinyalleri kullanıcı güvenini artırdığı için korunmalı, kısayol için feda edilmemeli.
5. **Basit arayüz, karmaşık motor** — arkadaki hesaplama/veri katmanı karmaşık olabilir ama kullanıcıya sunulan arayüz sade ve anlaşılır kalmalı.

## Accessibility & Inclusion

Bilinen özel bir kullanıcı ihtiyacı veya yasal standart yok (kullanıcı onayıyla kaydedildi) — standart iyi pratikler (yeterli kontrast, okunabilir dokunma hedefleri, klavye/ekran okuyucu ile temel kullanılabilirlik) yeterli kabul ediliyor.
