# Mobil tasarım referansı — 2026-07-28

Claude Design projesi `335abf14-0488-4741-a438-275c4c421a28` (“Mobile app UI redesign iterations”), dosya `ArsaBil Mobil.dc.html`.

`kartlar/` altındaki dosyalar o tek dosyanın **kart kart ayrılmış** hâlidir. Her biri bir ekranın prototip markup'ı: `2a.html` = Hesapla, `4a.html` = “Bu fiyat nereden geliyor?”, vb. Kimlikler spec ve plandaki kimliklerle aynıdır.

## Bunlar üretim kodu DEĞİLDİR

Prototipte her şey **satır içi stille** yazılmıştır çünkü tek dosyada canlı akış içindir. Üretimde CSS Modules sınıflarına ve `globals.css` token'larına çevrilir. Kopyala-yapıştır yapılmaz.

Buradaki değerin kaynağı **kesin sayılardır**: renk, yarıçap, gölge, blur, padding, font ağırlığı/boyutu. Handoff README'si “hifi — birebir uygulanmalı” diyor, dolayısıyla bir ölçüde tereddüt edince buradaki markup'a bakılır, tahmin edilmez.

## Yetkili doküman

Ekran ekran davranış ve gerekçe: Claude Design projesindeki `design_handoff_arsabil_mobile/README.md`. Bu repo içindeki uygulama kararları: `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`.

## Eksik

`4u` (çevrimdışı + 404) markup'ı **yok**: kaynak dosya 265 KB ve MCP okuma sınırı 256 KiB olduğu için kırpılarak geldi. O ekranın metinsel tarifi handoff README'sinde var ve Faz 9'a kadar gerekmiyor; gerekirse dosya parça parça yeniden çekilebilir.
