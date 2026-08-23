# /hesapla Mobil Menü Sadeleştirmesi — Design Spec

## Problem

`SonucKarti.tsx` (mobil `/hesapla` ana kartı) şu anda sonuç metriklerinin
altında 7 adet eşit-ağırlıklı, düz buton listeliyor: Hesap Fişi, Analiz,
3D Önizleme, Program Dağılımı, Arsa Sahibi Teklifi, 2D Yerleşim Tahtası,
Senaryolar & Karşılaştırma. Kullanıcı bulgusu: "dünya çeşit karma karışık
bir menü" — hepsi aynı görsel ağırlıkta, aralarında hiçbir gruplama/öncelik
sinyali yok.

İnceleme sırasında iki somut kök neden bulundu (varsayım değil, kod
okunarak doğrulandı):

1. **Hesap Fişi ve Analiz'in ilk paneli (Maliyet Dağılımı) AYNI veriyi iki
   farklı sunumla gösteriyor** — biri liste (Mi/Ma/kâr), diğeri grafik.
   Gerçek içerik çakışması, sadece görsel tekrar değil.
2. **"Senaryo" kelimesi iki alakasız özellik için kullanılıyor**: sabit
   CTA çubuğundaki "+ Karşılaştır" → "Senaryo Karşılaştırması" (hesap
   girdilerini — arsa payı %, kâr seviyesi vb. — karşılaştırır) ile menü
   öğesi "Senaryolar & Karşılaştırma" → Studio tasarım taslaklarını
   (footprint, program mix, undo/redo, kaydet/paylaş/PDF) karşılaştırır.
   Aynı Türkçe ifade, iki farklı alan.
3. **2D Yerleşim Tahtası + Program Dağılımı + 3D Önizleme + Studio
   Senaryoları tek bir iş akışı** — 3D Önizleme, 2D'nin ürettiği
   `layoutDraft`'ı ve Program Dağılımı'nın ürettiği `programMixItems`'ı
   doğrudan girdi olarak tüketiyor (`StudioMobileLeaf.tsx:16-22`); Studio
   Senaryoları bu taslağın kaydet/karşılaştır/geri-al sarmalayıcısı.
   Dördü de aynı "aktif tasarım denemesi" üzerinde çalışıyor.

## Goals

- 7 düz menü öğesini, kullanıcının zihin modeline uyan 3 gruba indirmek.
- Hesap Fişi/Analiz'deki gerçek içerik çakışmasını (Maliyet Dağılımı)
  ortadan kaldırmak — gizlemek değil, silmek.
- "Senaryo" isim çakışmasını çözmek.
- Var olan tüm alt bileşenleri (`StudioPreview`, `Studio2DPreview`,
  `StudioLayoutControls`, `ProgramMixPanel`, `LandownerOfferPanel`,
  `StudioScenarioBar`, `ScenarioComparison`, grafik bileşenleri)
  **AYNEN korumak** — hiçbiri kopyalanmaz/yeniden yazılmaz, yalnızca
  hangi üst-seviye giriş noktasından erişildiği değişir.

## Non-Goals

- **Masaüstü hiç dokunulmaz.** Masaüstü ayrı bir JSX ağacında yaşıyor
  (`SmartContextCard`/`AdvancedSettingsSections` vb.); bu spec yalnızca
  `src/app/hesapla/mobile/` altını kapsar.
- **Hesap girdisi "Senaryo Karşılaştırması" sistemi (pill satırı + sabit
  "+ Karşılaştır" CTA + `SenaryoKarsilastirmaSekmesi.tsx`) DEĞİŞMEZ.**
  Yalnızca isim çakışmasını çözmek için Studio tarafının etiketi
  değişiyor, bu sistemin kendisi kapsam dışı.
- Yeni backend/API değişikliği yok.
- `CostBreakdownChart`/`SensitivityChart`/`BreakEvenChart`/
  `FinancialDashboard` bileşenlerinin KENDİSİ değişmez (başka yerlerde
  de kullanılıyor olabilir) — yalnızca mobil Analiz yaprağındaki hangi
  panellerin render edildiği değişir.
- Rebalance çapraz-linki (`onRebalanceClick`: Studio Senaryoları →
  Arsa Sahibi Teklifi) davranışsal olarak AYNEN korunur.

## New Structure

`SonucKarti.tsx` artık 3 buton gösterir:

1. **Sonuç Detayı** (çekirdek, ilk sırada) — Hesap Fişi + Analiz birleşimi
2. **Tasarım Stüdyosu** — 2D Yerleşim + Program Dağılımı + 3D Önizleme +
   Tasarım Senaryoları için iç-içe mini menü
3. **Arsa Sahibi Teklifi** — değişmeden kalır, kendi başına buton

### 1. Sonuç Detayı (yeni: `SonucDetayiMobileLeaf.tsx`)

Tek başlık + "Kapat" (mevcut `analizKapatSatiri` deseniyle aynı), altında
2 sekmeli bir segment kontrolü (mevcut `.segmentKap`/`.segment`/
`.segmentAktif` CSS sınıfları — `GirdiKarti`'nin "yapı standardı" 3'lü
segment'iyle AYNI görsel dil, 2 sütunluk varyant için yeni bir
`.segmentKap2` grid-column override eklenir, `.segment`/`.segmentAktif`
DEĞİŞMEDEN paylaşılır):

- **Özet** sekmesi (varsayılan) — bugünkü `FiyatAciklamasi` gövdesi
  (3 satırlık liste + "Mühendis görünümü" anahtarı + `HesapFisi`).
  `FiyatAciklamasi.tsx`'in KENDİ `<header>`/Kapat satırı kaldırılır
  (artık sarmalayıcı leaf'in başlığı bunu karşılıyor) — component'in
  geri kalanı (state, toggle, satırlar) AYNEN kalır.
- **Grafikler** sekmesi — bugünkü `AnalizSekmesi`'nin 4 panelinden
  **Maliyet Dağılımı ÇIKARILIR** (Özet sekmesiyle aynı veri), kalan 3
  panel (Hassasiyet, Kırılma Noktası, Finansal Özet) aynen kalır.
  `AnalizSekmesi.tsx`'in KENDİ `<header>`/Kapat satırı da kaldırılır.

Sekme seçimi **yaprak içinde `useState` ile yaşar, `page.tsx`'e
taşınmaz** — geçici sunum durumu, her açılışta "Özet"e döner (mevcut
"Mühendis görünümü" toggle'ının `useState`+`localStorage` deseniyle
tutarlı bir karar: o da lifted değil).

**Davranış değişikliği (kullanıcı onayıyla, bilinçli karar):** Bugünkü
Hesap Fişi, `analizAcik`/`studioAcik`/vb.'nin aksine TAM EKRAN bir leaf
DEĞİL — `HesaplaMobile.tsx:139-159`'da `SonucKarti` her zaman render
edilirken `fisAcik` yalnızca ALTINDA `FiyatAciklamasi`'yi `GirdiKarti`
yerine gösteren, iç-içe bir dal. Yeni `SonucDetayiMobileLeaf` bu deseni
KORUMAZ — `AnalizSekmesi` gibi TAM EKRAN bir üst-seviye ternary dalı
olur (kendi başlık+Kapat+2 sekme, `SonucKarti` gizlenir). Kazanım: 7
öğenin 6'sı zaten bu tam-ekran deseni kullanıyordu, tek bir tutarlı leaf
deseni kalır. Kayıp: sonuç fiyatı üstte sabit görünmez (Özet sekmesi
zaten fiyat dökümünü kendi içinde tekrarladığı için küçük bir kayıp).

`page.tsx`'te `mobilFisAcik` + `mobilAnalizAcik` → **tek**
`mobilSonucDetayiAcik` durumuna birleşir. `onFisAc`/`onAnalizAc` →
tek `onSonucDetayiAc`. `HesaplaMobile.tsx`'in ana ternary zincirinde
`sonucDetayiAcik` artık `karsilastirmaAcik` ile aynı seviyede, TOP-LEVEL
bir dal olarak yer alır (aşağıdaki "Ternary Zinciri" bölümüne bkz.) —
`SonucKarti`'nin altına iç-içe GÖMÜLMEZ.

### 2. Tasarım Stüdyosu (yeni: `TasarimStudyosuHub.tsx`)

Kullanıcı onayıyla: **iç-içe menü**, sekme ŞERİDİ DEĞİL — projenin
`AnalizSekmesi.tsx:10-17`'de belgelenmiş "tek kapı" kararıyla (önceki bir
fazda sekme şeridi bilinçli olarak kaldırılmıştı) tutarlı, sıfır yeni
etkileşim deseni.

Başlık + "Kapat" + 4 buton (`SonucKarti`'nin bugünkü `.fisButonu`
görsel dili ile, küçültülmüş bir varyant):

- **Yerleşim** → mevcut `Studio2DMobileLeaf` (değişmeden)
- **Program** → mevcut `ProgramMixMobileLeaf` (değişmeden)
- **3D Görünüm** → mevcut `StudioMobileLeaf` (değişmeden)
- **Tasarım Senaryoları** → mevcut `StudioScenarioMobileLeaf`, YALNIZCA
  kendi `<h2>` başlık metni "Senaryolar & Karşılaştırma" →
  **"Tasarım Senaryoları"** olarak değişir (isim çakışmasını çözmek
  için — bkz. Problem #2). Bileşenin geri kalanı AYNEN kalır.

Her 4 alt-yaprağın "Kapat" davranışı **hub'a geri döner, ana ekrana
değil** — bu, `page.tsx`'te yeni bir mantık GEREKTİRMEZ: her alt-yaprağın
`onKapat`'ı bugün olduğu gibi yalnızca KENDİ `mobilXAcik`'ini `false`
yapar (`mobilStudioHubAcik`'e dokunmaz), `HesaplaMobile.tsx`'in ternary
sırası zaten "hiçbir alt-yaprak açık değilse VE hub açıksa → hub'ı
göster" kuralına düşer (aşağıya bkz.).

`page.tsx`'te yeni `mobilStudioHubAcik` durumu eklenir +
`onStudioHubAc`/`onStudioHubKapat`. Mevcut `mobilStudioAcik`/
`mobilProgramMixAcik`/`mobilStudio2DAcik`/`mobilStudioScenarioAcik` VE
bunların `onKapat` handler'ları **DOKUNULMADAN** kalır.

### 3. Arsa Sahibi Teklifi

Değişmez. Kendi editable "valuation assumptions" + teklif kompozisyonu
olan bağımsız bir araç (rapor değil) — tasarım geometrisi iş akışıyla
gevşek bağlı (yalnızca `programMixItems`'ı okur, `layoutDraft`'ı
okumaz), farklı bir an/amaç için var (arsa sahibiyle pazarlık).
`onRebalanceClick` çapraz-linki (`page.tsx:1164-1167`) AYNEN kalır —
Landowner Offer hub'ın İÇİNDE olmadığı için bu jump'ın davranışını
etkilemez.

## HesaplaMobile.tsx Ternary Zinciri

Yeni sıra (üstten önceliğe göre, aynı desen — ilk `true` olan kazanır):

```
studioScenarioAcik  → StudioScenarioMobileLeaf   (değişmedi)
studio2DAcik        → Studio2DMobileLeaf         (değişmedi)
landownerOfferAcik  → LandownerOfferMobileLeaf   (değişmedi)
programMixAcik      → ProgramMixMobileLeaf       (değişmedi)
studioAcik          → StudioMobileLeaf           (değişmedi)
studioHubAcik        → TasarimStudyosuHub        (YENİ — yukarıdaki 4 flag'in hiçbiri true değilse buraya düşer)
sonucDetayiAcik      → SonucDetayiMobileLeaf      (YENİ — fisAcik/analizAcik'in yerini alır)
karsilastirmaAcik   → SenaryoKarsilastirmaSekmesi (değişmedi)
(hiçbiri)           → SonucKarti + GirdiKarti     (ana ekran, değişmedi)
```

## Component Envanteri

**Yeni dosyalar:**
- `src/app/hesapla/mobile/SonucDetayiMobileLeaf.tsx` — leaf kabuk +
  2 sekmeli segment kontrolü, `FiyatAciklamasi`/`AnalizSekmesi`'nin
  gövdelerini (header'sız) sarmalar.
- `src/app/hesapla/mobile/SonucDetayiMobileLeaf.test.tsx`
- `src/app/hesapla/mobile/TasarimStudyosuHub.tsx` — leaf kabuk + 4
  buton, mevcut `onStudioAc`/`onProgramMixAc`/`onStudio2DAc`/
  `onStudioScenarioAc` callback'lerini çağırır.
- `src/app/hesapla/mobile/TasarimStudyosuHub.test.tsx`

**Değişen dosyalar:**
- `SonucKarti.tsx` — 7 buton → 3 buton, prop yüzeyi değişir
  (`onFisAc`/`onAnalizAc`/`onStudioAc`/`onProgramMixAc`/
  `onStudio2DAc`/`onStudioScenarioAc` kaldırılır; `onSonucDetayiAc`/
  `onStudioHubAc` eklenir; `onLandownerOfferAc` kalır).
- `FiyatAciklamasi.tsx` — kendi `<header>`/Kapat satırı çıkarılır
  (`onKapat` prop'u kaldırılır), geri kalanı aynen kalır.
- `AnalizSekmesi.tsx` — kendi `<header>`/Kapat satırı VE Maliyet
  Dağılımı paneli çıkarılır (`onKapat` prop'u kaldırılır), 3 kalan
  panel aynen kalır.
- `StudioScenarioMobileLeaf.tsx` — yalnızca `<h2>` metni
  "Tasarım Senaryoları" olur.
- `HesaplaMobile.tsx` — ternary zinciri güncellenir, yeni prop'lar
  (`studioHubAcik`, `onStudioHubAc`/`onStudioHubKapat`,
  `sonucDetayiAcik`, `sonucDetayi` prop grubu) eklenir; eski
  `fisAcik`/`analizAcik`/`fiyatAciklamasi`/`analiz` prop'ları kaldırılır.
- `page.tsx` — `mobilFisAcik`+`mobilAnalizAcik` → `mobilSonucDetayiAcik`;
  yeni `mobilStudioHubAcik`; `SonucKarti`/`HesaplaMobile`'a geçen prop
  bloğu buna göre güncellenir. `mobilStudioAcik` vb. dört flag ve
  handler'ları DOKUNULMAZ.
- `mobile.module.css` — yeni `.segmentKap2` (2 sütunluk grid varyantı,
  `.segment`/`.segmentAktif` paylaşılır), `TasarimStudyosuHub`'ın 4
  butonu için (muhtemelen `.fisButonu`'nun küçük bir varyantı, yeni bir
  sınıf icat etmeden önce `.fisButonu`'nun aynen yeterli olup
  olmadığına bakılır).

**Dokunulmayan dosyalar (yalnızca giriş noktası değişiyor):**
`StudioPreview.tsx`, `Studio2DPreview.tsx`, `StudioLayoutControls.tsx`,
`ProgramMixPanel.tsx`, `LandownerOfferPanel.tsx`, `StudioScenarioBar.tsx`,
`ScenarioComparison.tsx`, `CostBreakdownChart`/`SensitivityChart`/
`BreakEvenChart`/`FinancialDashboard`, `StudioMobileLeaf.tsx`,
`ProgramMixMobileLeaf.tsx`, `Studio2DMobileLeaf.tsx`,
`LandownerOfferMobileLeaf.tsx` (kendileri — yalnızca giriş noktaları
`TasarimStudyosuHub`'a taşınır), `SenaryoKarsilastirmaSekmesi.tsx`,
hesap girdisi "Senaryo Karşılaştırması" sistemi.

## Testing

- `SonucKarti.test.tsx` — 3 butonun varlığı/callback'leri için
  güncellenir (7 değil).
- `FiyatAciklamasi.test.tsx` + `Analiz.test.tsx` — içerikleri
  `SonucDetayiMobileLeaf.test.tsx`'e taşınır/birleşir (header/Kapat
  testleri kaldırılır, çünkü artık orada render edilmiyor; Maliyet
  Dağılımı panelinin Grafikler sekmesinde OLMADIĞINI doğrulayan yeni
  bir regresyon testi eklenir).
- `HesaplaMobile.test.tsx` — yeni ternary dalları (hub, sonuç detayı)
  için güncellenir; eski `fisAcik`/`analizAcik` senaryoları kaldırılır.
- `TasarimStudyosuHub.test.tsx` — yeni, 4 butonun doğru callback'i
  çağırdığını doğrular.
- `StudioMobileLeaf.test.tsx`/`ProgramMixMobileLeaf.test.tsx`/
  `Studio2DMobileLeaf.test.tsx`/`LandownerOfferMobileLeaf.test.tsx` —
  DOKUNULMAZ (bu bileşenler değişmiyor).
- `StudioScenarioMobileLeaf.test.tsx` — yalnızca başlık metni
  assertion'ı güncellenir ("Tasarım Senaryoları").

## Doğrulama

Her adımda proje standardı: `tsc --noEmit` 0 hata + `jest` tüm paket
yeşil + gerçek `npm run build` (Turbopack build-time-only kısıtları
için — bkz. [[feedback_verification_needs_real_build_not_just_dev_or_tests]]).
Görsel/etkileşim doğrulaması Playwright ile mobil viewport'ta (390×844):
3 butonlu ana ekran, Sonuç Detayı'nın 2 sekmesi arası geçiş, Tasarım
Stüdyosu hub'ından 4 alt-yaprağa girip "Kapat" ile hub'a (ana ekrana
değil) dönüş, "Tasarım Senaryoları"ndan rebalance ile Arsa Sahibi
Teklifi'ne çapraz-geçiş — hepsi ekran görüntüsüyle doğrulanır.
