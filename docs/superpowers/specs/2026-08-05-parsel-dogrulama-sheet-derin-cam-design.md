# Parsel Doğrulama Sheet — Derin Cam'a Taşıma (Tasarım)

**Tarih:** 2026-08-05
**Durum:** Onaylandı, implementasyon planı bekliyor.
**Bağlam:** Kullanıcı onaylı mockup — `claude.ai/code/artifact/399cd73f-b66e-4efe-b9b0-81a1a0b4453f`
("ArsaBil — TKGM Sorgulama Akışı (Derin Cam)") — hiçbir zaman yazılı bir spec/plana dönüşmeden
mockup olarak kaldı. `2026-08-04-mobil-derin-cam-b-varyanti-design.md` bu akışı açıkça kapsam
dışı bıraktı ("Elle TKGM sorgulama formu ve konum tespiti ... ayrı bir spec/plan hak ediyor").
`4296c45` (2026-08-05 gece) bu iki özelliği (geolocation + elle giriş) fonksiyonel olarak
`ParcelPicker.tsx`'e ekledi ama mockup'ın görsel/etkileşim tasarımını uygulamadı — düz buton
satırı, Derin Cam yok, mockup'taki toggle yok. Kullanıcı bunu şu an canlıda fark etti.

## Kapsam

Parsel doğrulama akışının (harita + elle giriş + TKGM sorgusu + risk önerisi) **hem
`/hesapla` hem ilan sihirbazında (`/listings/new`)** ortak, tek bir bileşene taşınması ve bu
bileşenin mockup'taki Derin Cam tasarımına getirilmesi. Veri/API katmanına (TKGM lookup, risk
lookup, geocoding) dokunulmuyor — yalnızca sunum katmanı ve etkileşim modeli değişiyor.

**Kapsam dışı:** `/hesapla`'nın kendi risk-uygulama mantığı (`riskLevel` state, formül), TKGM/risk
API route'ları, `resmi-risk-katmanlari` planının WMS/ölçüm katmanı — hiçbiri değişmiyor.

## Mevcut durum (üç ayrı, tutarsız yüzey)

| Yüzey | Bileşen | Sunum | Derin Cam | Risk kartı |
|---|---|---|---|---|
| `/hesapla` masaüstü+mobil | `ParcelModal.tsx` | Ortalanmış modal (`overlay`+`backdrop-blur(8px)`), tüm genişliklerde aynı | Yok — düz `var(--card-bg)` | Var, "Uygula" ile `riskLevel`'a yazar |
| `/hesapla` mobil "Gelişmiş ayarlar" | `GelismisAyarlarSheet.tsx` | `BottomSheet` (mevcut, sürükle-kapat) | Kısmen (`--m-*` token'ları) | Aynı `RiskSuggestionCard`, ama parsel doğrulama ANINDAN AYRI, ayrı bir panelde |
| İlan sihirbazı Adım 1 | `ParcelPicker.tsx` gömülü | Modal yok, adımın içine gömülü | Yok | Yok — hiç render edilmiyor |

Üç yüzey üç farklı şey yapıyor; mockup ise TEK bir tutarlı akış öneriyor.

## Hedef mimari

**Yeni paylaşılan bileşen:** `src/components/listing-wizard/ParcelVerificationSheet.tsx` —
`src/app/hesapla/ParcelModal.tsx`'in yerini alır (taşınır, silinmez; import eden tek yer
`/hesapla/page.tsx`, güncellenir). `ParcelPicker.tsx` zaten bu klasörde yaşıyor ve zaten iki
sayfada da kullanılıyor — aynı emsal, yeni bir "paylaşılan bileşen" klasörü icat edilmiyor.

```
ParcelVerificationSheet
├── mobile (<768px): BottomSheet (src/components/mobile/BottomSheet.tsx, DEĞİŞTİRİLMEDEN
│   yeniden kullanılır — sürükle-kapat, portal, reduced-motion zaten çözülmüş)
├── desktop (≥768px): mevcut ParcelModal'ın ortalanmış-modal kabuğu (değişmez)
├── ToggleRow: "Haritadan" / "Elle gir" — segmented control, aktif moda göre içerik değişir
├── Harita modu: ParcelPicker (harita + pin + Doğrula), + haritanın köşesinde küçük
│   "konumumu bul" ikon-buton (bugünkü ayrı "📍 Konumumu Bul" satırının yerini alır)
├── Elle-giriş modu: bugünkü ManualParcelEntryModal'ın form alanları (İl/İlçe/Mahalle/
│   Ada/Parsel) — AYNI state/geocoding mantığı, farklı yer: kendi modalinden çıkıp bu
│   sheet'in içerik alanına taşınır. ManualParcelEntryModal.tsx silinir.
└── Sonuç alanı: TKGM eşleşme kartı (mevcut) + risk yükleniyor/sonuç (mevcut fetch mantığı)
    └── RiskSuggestionCard: `hideApply` prop'u eklenir (bkz. aşağı)
```

### Neden `BottomSheet`'i yeniden kullanıyoruz, yeni bir sheet inşa etmiyoruz

`BottomSheet.tsx` zaten sürükle-kapat, portal (`document.body`), odak yönetimi ve
`prefers-reduced-motion` davranışını (canlı ölçümle doğrulanmış, bkz. dosyanın kendi
yorumu — Task 10) çözmüş durumda. `GelismisAyarlarSheet` onu aynı sayfada (`/hesapla`)
zaten kullanıyor. Sıfırdan yeni bir sheet yazmak hem gereksiz kod tekrarı hem de
`prefers-reduced-motion` gibi ince bir davranışı tekrar keşfetme riski.

### `RiskSuggestionCard` — `hideApply` prop'u

Wizard'ın kendi `riskLevel` girdisi yok (Adım 4 yalnızca var olan bir `/hesapla` raporunu
ilana bağlıyor, hesap yapmıyor) — "Uygula" butonunun uygulayacağı bir yer yok. Ham risk
snapshot'ı (fay mesafesi, taşkın) zaten ilan kaydında sunucu tarafında otomatik alınıyor
(`riskSnapshot.ts`, `/api/listings/route.ts`) — bu, UI'dan bağımsız zaten çalışıyor.

```tsx
interface Props {
    risk: RiskMeasurement
    onApply?: (riskLevelPercent: number) => void  // opsiyonel olur
    hideApply?: boolean                            // yeni
}
```

`hideApply` true iken "Uygula" butonu render edilmez, kart yalnızca bilgi amaçlı kalır
(fay mesafesi, γF, önerilen R — hepsi görünür kalır, yalnızca aksiyon kalkar). `/hesapla`
mevcut davranışını `hideApply` vermeyerek (varsayılan `false`) korur.

## Etkileşim değişiklikleri

- **İlan sihirbazı Adım 1:** `WizardStep1Location`, gömülü `ParcelPicker` yerine "📍 Konumu
  Haritadan Seç" tetikleyici butonu gösterir (parsel doğrulanmışsa buton yerine özet satırı —
  mahalle/ada/parsel/alan — ve "Değiştir" linki). Tıklanınca `ParcelVerificationSheet` açılır,
  aynı `/hesapla`'daki `onConfirm` sözleşmesiyle (`{ parcelValue, risk, suggestedRiskPercent }`)
  kapanır ve `WizardFormData`'yı günceller.
- **Toggle:** "Haritadan" varsayılan aktif mod. Mod değişince harita/form içerik alanı
  değişir, sheet başlığı ("Haritadan Parsel Doğrula") sabit kalır (mockup'la birebir).
- **Geolocation:** ayrı satır butonundan haritanın sağ-alt köşesinde küçük dairesel bir
  ikon-butona taşınır (yaygın harita UX deseni — Google Maps/Leaflet'in kendi "locate"
  kontrolüne benzer). Davranış (`navigator.geolocation.getCurrentPosition`, hata mesajları)
  değişmiyor, yalnızca buton yeri ve görseli.
- **Elle giriş:** "Sorgula" (mockup'taki buton adı) tıklanınca bugünkü
  `ManualParcelEntryModal`'ın yaptığını yapar — Nominatim ile yaklaşık geocode, pini
  haritaya koyar — ama modu otomatik "Haritadan"a döndürmez; kullanıcı pini
  ince-ayarlayıp "Parseli Doğrula"ya basana kadar elle-giriş formu bağlamı (girilen
  ada/parsel bilgisi) `manualNote` olarak görünür kalır (bugünküyle aynı).

## Görsel (Derin Cam) uygulaması

Yalnızca **mobil** (`@media (max-width: 768px)`), proje genelindeki kural aynen geçerli:

- Sheet kabuğu: `--seal-surface` (BottomSheet'in kendi `.sheet` arka planı, tema-scoped
  seçiciyle — bu oturumda `inbox`'ta doğrulanan desen).
- Toggle: aktif segment `--seal-accent` degrade dolgu + beyaz metin — **kontrast önceden
  ölçülüp** (bu oturumda kurulan `color-mix(in srgb, var(--seal-accent) 82%, #0F2A43)`
  deseniyle) uygulanacak, mockup'ın düz `--seal-accent` degrade'i KÖRÜKÖRÜNE kopyalanmayacak.
- Harita üstü ikon-buton (konumumu bul), "Parseli Doğrula"/"Sorgula" birincil butonları:
  aynı koyultulmuş `--seal-accent` tonu + kontrast doğrulaması.
- TKGM eşleşme kartı, risk kartı: `--seal-surface`/`--seal-border` (Task 4/5'teki desenle
  aynı — mevcut `!important` çakışması olup olmadığı implementasyon sırasında grep'lenip
  kontrol edilecek, bu oturumun Task 4 bulgusundan çıkarılan ders).
- Masaüstü: **hiçbir renk/yüzey token'ı değişmiyor** — `ParcelModal`'ın bugünkü ortalanmış-modal
  kabuğu (overlay, boyut, köşe yarıçapı, gölge) aynen kalır. Toggle ve harita-üstü
  geolocation ikonu gibi YAPISAL/etkileşim değişiklikleri ise masaüstünde de geçerlidir —
  bunlar renk/token değil, düzen değişikliği (Task 6'nın "animasyon mobile özel değil"
  istisnasıyla aynı mantık: bu spec'te "yalnızca mobil" kısıtı yalnızca `--seal-*` görsel
  katmanı için geçerli, bileşenin yapısı için değil).

## Test ve doğrulama yaklaşımı

Bu oturumda `subagent-driven-development` ile 7 task'lık bir plan üzerinde çalışılırken
öğrenilenler doğrudan uygulanacak:

1. **TDD, dosya başına scope test.** Her yeni/değişen dosya için önce başarısız test, sonra
   implementasyon (mevcut `ParcelPicker.test.tsx`, `ParcelPicker.map.test.tsx` deseni
   izlenecek).
2. **Canlı doğrulama zorunlu, regex-test yeterli değil.** `getComputedStyle` ile: (a) sheet
   arka planının gerçekten `--seal-surface`'e çözüldüğü, (b) toggle'ın aktif/pasif
   durumlarının doğru tonu taşıdığı, (c) yeni `!important` çakışması olup olmadığı —
   bu oturumda `.sidebar`/`.convItemActive`'de İKİ kez gerçek bug bulundu, aynı riske karşı
   baştan grep + canlı ölçüm.
3. **Kontrast ölçümü her yeni accent-dolgu buton için zorunlu.** Toggle'ın aktif segmenti ve
   harita ikon-butonu dahil — "sonradan whole-branch review'da bulunur" değil, baştan.
4. **Reduced-motion.** `BottomSheet` zaten `useReducedMotion` kullanıyor; yeni eklenen hiçbir
   içerik (toggle geçişi, ikon-buton) kendi animasyonunu EKLEMEYECEK — sheet'in mevcut
   giriş/çıkış geçişine güvenilecek.
5. **Masaüstü değişmedi kanıtı.** 1440px'te `ParcelModal`'ın mevcut görünümüyle piksel-piksel
   aynı olduğu (renk/yüzey açısından) doğrulanacak.

## Dosya değişiklikleri (özet)

| Dosya | İşlem |
|---|---|
| `src/components/listing-wizard/ParcelVerificationSheet.tsx` | **Yeni** — `ParcelModal.tsx`'in yerini alır |
| `src/components/listing-wizard/ParcelVerificationSheet.module.css` | **Yeni** |
| `src/app/hesapla/ParcelModal.tsx` | **Silinir** |
| `src/app/hesapla/ParcelModal.module.css` | **Silinir** |
| `src/components/listing-wizard/ManualParcelEntryModal.tsx` | **Silinir** (mantığı sheet'e taşınır) |
| `src/components/listing-wizard/ManualParcelEntryModal.module.css` | **Silinir** |
| `src/app/hesapla/page.tsx` | Import + kullanım güncellenir |
| `src/components/listing-wizard/WizardStep1Location.tsx` | Gömülü `ParcelPicker` → tetikleyici buton + özet satırı |
| `src/components/listing-wizard/ParcelPicker.tsx` | Buton satırı kaldırılır (sheet'e taşınan geolocation/elle-giriş tetikleyicileri) — harita+doğrula çekirdeği kalır |
| `src/components/risk/RiskSuggestionCard.tsx` | `hideApply` prop'u eklenir |
| İlgili `.test.ts(x)` dosyaları | Taşınan/silinen bileşenlere göre güncellenir |

## Açık bırakılan (bilinçli) kararlar

- Mockup'ın "risk-card"ındaki tam metin/format (`γF`, `R` gösterimi) zaten mevcut
  `RiskSuggestionCard`'da var — mockup'a uydurmak için yeniden yazılmayacak, sadece
  `hideApply` ile genişletilecek.
- `ManualParcelEntryModal`'ın "yaklaşık konum, kullanıcı pini ayarlar" tasarım kararı
  (TKGM'in il/ilçe/ada/parsel bazlı doğrudan sorgu ucu olmaması nedeniyle) korunuyor —
  mockup'ın "Sorgula" adı bu akışı DEĞİŞTİRMİYOR, yalnızca yeniden adlandırıyor.
