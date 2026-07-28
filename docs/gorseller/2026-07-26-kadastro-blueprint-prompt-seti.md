# ArsaBil Görsel Seti — "Kadastro Blueprint" Prompt Dokümanı

Tarih: 2026-07-26 · Yön: **Kadastro Blueprint** (kullanıcı onayı, 2026-07-26)
Hedef: ana sayfadaki 13 görselin tamamının tek bir görsel dille yeniden üretilmesi.

## Neden yeniden üretiliyor

Mevcut durumun tespit edilen kusurları:

1. **`cta-bg.png` canlıda İngilizce reklam metni taşıyor** — "ELEVATE YOUR WORKFLOW / Discover the future of SaaS efficiency / START FREE TRIAL" görselin içine basılmış (`page.tsx:817`).
2. **4 çift görsel birebir aynı dosya** (MD5 doğrulandı): `bento/engine-v2-bg.jpg` = `steps/step1-input.jpg`, `bento/cost-analysis-bg.jpg` = `steps/step2-report.jpg`, `bento/marketplace-bg.jpg` = `steps/step3-match.jpg`, `bento/security-pdf-bg.jpg` = `vision/vision-future.jpg`.
3. Canlıdaki `.jpg`'ler jenerik stok fotoğraf (gün batımı tarlası, villa, şantiye, gökdelen, oyuncak ev + anahtarlık); `public/images/**/*.png` altındaki AI üretimi set ise neon sci-fi holografik — ikisi de Mühür Lacivert / kadastro kimliğiyle uyuşmuyor.
4. PNG setinin ayrıca prodüksiyona çıkamama sebepleri: kareler bozuk metin içeriyor ("AROLLD_DYS", "Saa5 Fnenciol", "Commsrsial"), blockchain/kripto dili taşıyor ("SHA-256", "SMART CONTRACT DEPLOYED"), Amerikan emlak terminolojisi kullanıyor ("1.2 Acres", "C-1 Mixed-Use", "$475k"), hepsi 1:1 ve koyu-neon (sitenin varsayılan teması **light**).

## Değişmez kurallar

- **Görselin içinde HİÇ metin olmayacak.** Ne başlık, ne etiket, ne rakam, ne ölçü değeri, ne logo. Bozuk yazı sorununun tek kesin çözümü budur; tüm metin zaten HTML'de.
- **Tek palet:** mürekkep lacivert `#0F2A43` çizgi, sıcak kağıt beyazı `#F4F0E6` zemin, **tek** aksan aurora mavi `#4C8DFF` (kare başına yalnızca bir odak öğesinde).
- **Işıma yok:** neon, glow, hologram, 3B render, bokeh, lens flare yok. Bu marka için "premium" = güven ve kesinlik, parlaklık değil.
- **İnsan yok, foto-gerçekçilik yok.** Düz, teknik çizim dili.
- Bol boşluk. Kalabalık kompozisyon yok.

## Ortak stil bloğu (her prompt'un başına aynen yapıştır)

```
Technical cadastral blueprint illustration, flat 2D vector line art, ultra-thin
engineering line weights, drafting precision. Ink navy (#0F2A43) lines on warm
paper-white (#F4F0E6) background with subtle paper grain. A single accent color,
aurora blue (#4C8DFF), used sparingly as a flat fill on ONE focal element only.
Generous negative space, calm and corporate, architectural drafting aesthetic.
```

## Ortak negatif prompt (her üretimde kullan)

```
text, letters, words, numbers, typography, labels, captions, watermark, logo,
UI screenshot, dashboard, HUD, hologram, neon, glow, sci-fi, futuristic,
blockchain, circuit board, dark background, purple, teal, green, orange,
photorealistic, photograph, people, 3D render, cluttered, busy composition
```

---

## Slot listesi

Kareler iki gruba ayrılıyor; **grup A'nın kompozisyon kuralı farklı**, dikkat.

### GRUP A — Doku katmanları (5 kare)

`.cardBgImage` ve `.ctaBgImage` bu görselleri `opacity: 0.22` + `mix-blend-mode: overlay`
ile basıyor. Yani görsel **görünür bir fotoğraf değil, çok soluk bir doku**. İnce çizgi
detayı bu katmanda tamamen kaybolur.

Bu 5 kare için ek kural: **kalın-ölçekli, yüksek kontrastlı, az öğeli** kompozisyon.
Tek bir büyük geometrik motif, birkaç kalın çizgi. Küçük detay koyma — görünmeyecek.

| Dosya | Bölüm | Oran | Hedef px |
|---|---|---|---|
| `bento/engine-v2-bg` | Hesap Motoru | 3:2 | 1800×1200 |
| `bento/cost-analysis-bg` | Maliyet Analizi | 3:2 | 1800×1200 |
| `bento/marketplace-bg` | Müteahhit Pazar Yeri | 3:2 | 1800×1200 |
| `bento/security-pdf-bg` | Güvenli PDF Rapor | 3:2 | 1800×1200 |
| `cta-bg` | Alt CTA şeridi | 16:5 | 2400×750 |

**1. `bento/engine-v2-bg` — Hesap Motoru**
```
[ortak stil bloğu] +
A single land parcel seen from directly above, subdivided into a few large
share segments by thick straight boundary lines, like a cadastral share diagram.
One segment filled flat aurora blue. Bold large-scale geometry, only a handful
of shapes, wide empty margins.
```

**2. `bento/cost-analysis-bg` — Maliyet Analizi**
```
[ortak stil bloğu] +
A simple architectural cross-section of a multi-storey building, floors drawn as
a few thick horizontal bands stacked vertically, seen straight on. One single band
filled flat aurora blue. Large scale, minimal, no small details.
```

**3. `bento/marketplace-bg` — Müteahhit Pazar Yeri**
```
[ortak stil bloğu] +
A cadastral map sheet seen from above: a small number of large adjacent land
parcels with thick irregular boundary lines, like a land registry plan. One
parcel filled flat aurora blue. Bold shapes, wide spacing, no small parcels.
```

**4. `bento/security-pdf-bg` — Güvenli PDF Rapor**
```
[ortak stil bloğu] +
A large circular wax-seal stamp motif drawn as concentric geometric rings with
a simple notched outer edge, next to the corner of a single large document sheet
outline. The seal filled flat aurora blue. Bold, sparse, centered.
```

**5. `cta-bg` — Alt CTA şeridi (16:5)**
```
[ortak stil bloğu] +
A wide panoramic cadastral grid receding toward a low horizon line, drawn with a
few thick perspective lines. The CENTER of the frame must stay almost empty and
uniform — the composition's weight sits at the far left and far right edges only.
Extremely minimal, wide open space.
```
> CTA'da gerçek başlık ve buton görselin ortasına gelir; merkez boş kalmazsa metin okunmaz.

---

### GRUP B — Görünür görseller (8 kare)

Bunlar tam opaklıkla, kırpılarak gösteriliyor. Detay burada görünür — ama yine metin yok.

| Dosya | Bölüm | Oran | Hedef px |
|---|---|---|---|
| `steps/step1-input` | Adım 1: Konumu gir | 4:3 | 1600×1200 |
| `steps/step2-report` | Adım 2: Raporu al | 4:3 | 1600×1200 |
| `steps/step3-match` | Adım 3: Eşleş | 4:3 | 1600×1200 |
| `vision/vision-future` | Vizyon | 4:3 | 1600×1200 |
| `vision/mission-trust` | Misyon | 4:3 | 1600×1200 |
| `blog/trends-2026` | Blog 1 | 16:9 | 1600×900 |
| `blog/valuation-methods` | Blog 2 | 16:9 | 1600×900 |
| `blog/transparency-trust` | Blog 3 | 16:9 | 1600×900 |

> Adım ve vizyon kartlarının kırpma oranı şu an CSS'te tanımsız (`.howStepImg` /
> `.visionImg` kuralı yok). Aynı branch'te `aspect-ratio` + `object-fit: cover`
> ekleniyor; 4:3 üretmek bu yüzden güvenli.

**6. `steps/step1-input` — Konumu gir**
```
[ortak stil bloğu] +
A geometric map pin drawn as a thin outline, standing over a grid of small land
parcels seen in flat top-down view. Thin crosshair guide lines converge on the
pin. The pin filled flat aurora blue.
```

**7. `steps/step2-report` — Raporu al**
```
[ortak stil bloğu] +
A single sheet of paper drawn in thin outline, slightly tilted, carrying abstract
chart glyphs made of pure geometry: a few plain bars and one polyline. No digits,
no axis labels. One bar filled flat aurora blue.
```

**8. `steps/step3-match` — Eşleş**
```
[ortak stil bloğu] +
Two land parcel outlines interlocking along a shared irregular boundary, like two
halves of a title deed fitting together. The seam line drawn in flat aurora blue.
Symmetrical, calm, no arrows.
```

**9. `vision/vision-future` — Vizyon**
```
[ortak stil bloğu] +
A flat elevation drawing of a small skyline: a row of simple buildings of varying
heights, drawn as thin outlines, rising from a single cadastral baseline with
parcel divisions beneath them. One building filled flat aurora blue.
```

**10. `vision/mission-trust` — Misyon**
```
[ortak stil bloğu] +
A balanced pair of scales reduced to pure line geometry: a horizontal beam, two
suspended pans — the left pan a square land parcel outline, the right pan a
circular seal outline. Perfectly level beam. The seal filled flat aurora blue.
```

**11. `blog/trends-2026` — İnşaat trendleri**
```
[ortak stil bloğu] +
A stepped ascending line rising across a flat cadastral grid, drawn as thin
engineering line work, each step a plain rectangle. The topmost step filled flat
aurora blue. Wide horizontal composition, lots of empty space above.
```

**12. `blog/valuation-methods` — Değerleme yöntemleri**
```
[ortak stil bloğu] +
Three overlapping square land parcel outlines of different sizes, arranged like
comparison overlays, with plain dimension lines and tick marks along two edges
(tick marks only, absolutely no numerals). The smallest square filled flat
aurora blue.
```

**13. `blog/transparency-trust` — Şeffaflık**
```
[ortak stil bloğu] +
A cadastral parcel plan half covered by a clean translucent sheet, the drawing
beneath clearly visible through it, the uncovered half drawn in crisp thin lines.
The edge of the translucent sheet traced in flat aurora blue.
```

---

## Üretim sonrası kontrol listesi

Her kare için, koda alınmadan önce:

- [ ] Görselde **hiç harf/rakam yok** (üretici modeller ısrarla ekler — büyütüp kontrol et).
- [ ] Zemin sıcak kağıt beyazı, çizgiler lacivert; ikinci bir renk **yok** (aurora mavi hariç).
- [ ] Aksan mavi **tek** öğede.
- [ ] Grup A kareleri: 3 metre uzaktan bakınca tek bir motif okunuyor mu? (opacity 0.22'de sadece o kalacak.)
- [ ] Doğru en-boy oranında (araç sadece 1:1 üretiyorsa: konuyu ortada ve geniş marjlı tut, kırpmayı ben yaparım).
- [ ] 13 karenin **hiçbiri diğeriyle aynı dosya değil** (mevcut hatanın tekrarlamaması için hash kontrolü yapılacak).

## Teslim ve entegrasyon

Üretilen dosyaları `public/images/_yeni/` altına, hedef dosya adıyla (uzantı fark etmez) bırakman yeterli. Sonrasında ben:

1. Doğru orana kırpar, hedef px'e ölçekler.
2. **WebP**'ye çevirir (kalite ~82) — mevcut 12 MB'lık kullanılmayan PNG seti de temizlenecek.
3. `page.tsx`'teki 13 referansı günceller.
4. Hash kontrolüyle "tekrar eden dosya yok" doğrulamasını yapar.
5. Light + dark temada, masaüstü + 390px mobilde Playwright ile görsel doğrulama yapar.
