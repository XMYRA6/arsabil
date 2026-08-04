# /hesapla — TKGM Bağlamı Konsolidasyonu (Tasarım)

**Tarih:** 2026-08-04
**Durum:** Onaylandı (bölüm bölüm insan onayı alındı), implementasyon planı bekliyor.
**İlgili branch:** `feature/masaustu-parsel-redesign` (bu spec o branch üzerine devam eder).

## Problem

Masaüstü parsel redesign'i (`SmartContextCard`/`ParcelModal`, TKGM parsel sorgusu) `/hesapla`'ya
eklendi ama aynı iki değer (`riskLevel`, `arsaAlani`) hâlâ birden fazla, birbirinden habersiz
arayüzde gösteriliyor/düzenlenebiliyor. Kullanıcı parseli seçip TKGM'den risk/alan alsa bile,
birkaç santim aşağıda aynı değerleri manuel değiştirebileceği ikinci (bazen üçüncü) bir kontrol
görüyor — hangisinin "gerçek" hangisinin "override" olduğuna dair hiçbir işaret yok.

Kod üzerinde doğrulanan somut tekrarlar:

1. **Risk seviyesi iki yerde:** `SmartContextCard`'ın risk rozeti (bilgilendirici, TKGM/son
   ayarlanan değerden) ile page.tsx'teki bağımsız "Risk Payı" buton grid'i (`page.tsx:670-679`,
   masaüstü) — aynı `riskLevel` state'i, iki farklı görsel dil, aralarında hiçbir bağlantı yok.
2. **Arsa alanı üç yerde olabiliyor:** `SmartContextCard`'ın kendi input'u,
   `FormulParamsFields`→`ArsaAlaniFields` (masaüstü çekmece + mobil sheet), ve mobil
   `GelismisAyarlarSheet`'in kendi `ArsaAlaniFields` render'ı.
3. **Masaüstünde çekmece komple artık:** `page.tsx:570`'teki ⚙ ikonu, zaten ekranda görünen
   `FormulParamsFields`/`RiskCostFields`'i (`isSettingsSidebarOpen` → `settingsDrawer`,
   `page.tsx:823-871`) İKİNCİ KEZ, farklı bir kaydırmalı panelde gösteriyor. Responsive bir
   varyant değil — aynı viewport'ta ikisi de erişilebilir.
4. **Mobilde `GelismisAyarlarSheet`, `GirdiKarti`'nin `SmartContextCard`'ıyla çakışıyor:**
   Sheet kendi `ArsaAlaniFields` + `RiskCostFields`'in risk kısmını render ediyor; ama
   `GirdiKarti` zaten her zaman görünür `SmartContextCard`'ı gösteriyor. Kullanıcı "Gelişmiş
   ayarlar" açınca aynı iki değeri farklı bir görselde tekrar görüyor.
5. **`page.tsx`'te erişilemez ölü kod:** `.mobileSidebar`/`.mobileAccordions` bloğu
   (`page.tsx:713-819`, kendi "Yapı Standardı"/"Daire Metrekaresi" kartları + `FormulParamsFields`/
   `RiskCostFields`'in ÜÇÜNCÜ bir kopyası) hiçbir zaman render edilmiyor: `page.tsx:466`
   `!isDesktopViewport` olduğunda `<HesaplaMobile>` döndürüp bu return path'ine hiç girmiyor.
   Kullanıcı görmüyor ama dosyayı okuyan/değiştiren herkesi yanıltıyor.

## TKGM verisinin müşteriye değeri (bağlam)

Bu redesign'in "neden" kısmı: TKGM + risk katmanları üç somut değer sağlıyor —

1. **Doğrulanmış alan → doğru hesap.** Kat karşılığı hesabında arsa alanı ana çarpan; TKGM'den
   gelen gerçek m², tahmine dayalı elle girişten çok daha güvenilir bir hesap üretir.
2. **Otomatik risk-ayarlı maliyet.** Fay hattına yakınlık / taşkın riski kullanıcı hiç
   bilmeden hesaba (iksa maliyeti) yansıyor.
3. **Güven rozeti / rapor kredibilitesi.** "TKGM kaydıyla doğrulandı" ibaresi, rakiplerin
   (ör. yerimden.com) sunamadığı bir ciddiyet katıyor.

Ortak nokta: TKGM'nin işi **arka planda sessizce doğruluğu artırmak**, kullanıcıya ekstra iş
çıkarmak değil. Bu yüzden tasarımın merkezi ilkesi: *her değerin TEK bir gösterim/düzenleme
yeri olacak, TKGM oraya bir rozetle katkı sağlayacak.*

## Kapsam

**Bu spec bilgi mimarisini** (hangi değer nerede, kim tek kaynak, kaynak-etiketi deseni nasıl
genişler) **tanımlar — piksel/renk/tipografi kararı vermez.** Mevcut görsel dil (mobil Liquid
Glass, `--aurora-cyan` vurgu) korunur; görsel uygulama bu spec onaylandıktan sonra
`frontend-design`/`ui-ux-pro-max` becerileriyle ayrı bir adımda yapılır.

**Birincil platform: mobil.** Karar belirsiz kaldığında mobil deneyim referans alınır, masaüstü
ona göre uyarlanır.

**Kapsam dışı:** Birim maliyet, piyasa fiyatı, müteahhit kazancı, iksa masrafı akışları —
bunlar zaten tek-kaynaklı ve çalışıyor, dokunulmuyor. Parsel sorgu ekranı, senaryo
karşılaştırma gibi ayrı işler bu spec'in konusu değil.

## Tasarım

### 1. Kaynak-etiketi deseni risk seviyesine genişler

`BirimMaliyetField`'in kanıtlanmış deseni (`birimMaliyetKaynagi: { tur: 'varsayilan'|'ilce'|'elle' }`,
tek input + küçük kaynak etiketi) risk seviyesine de uygulanır:

```ts
export type RiskKaynagi =
    | { tur: 'varsayilan' }
    | { tur: 'tkgm' }
    | { tur: 'elle' }
```

- `ParcelModal` üzerinden TKGM risk önerisi uygulanınca (`handleParcelConfirm`,
  `suggestedRiskPercent !== null`) → `riskKaynagi: { tur: 'tkgm' }`.
- Kullanıcı `SmartContextCard` içindeki risk pilini elle tıklarsa → `riskKaynagi: { tur: 'elle' }`.
- "Ayarları sıfırla" → `riskKaynagi: { tur: 'varsayilan' }` (mevcut reset handler'a eklenir,
  `birimMaliyetKaynagi` sıfırlamasıyla aynı yerde).

`arsaAlani` için zaten `isAreaVerified` (parcelContext.status === 'verified' ise "✓ TKGM Onaylı")
üzerinden örtük bir kaynak göstergesi var — ayrıca bir enum'a gerek yok, mevcut mantık korunur.

### 2. `SmartContextCard`: risk + alan için TEK yer, parsel şartı yok

`SmartContextCard` risk pillerini (Yok/Düşük/Orta/Yüksek) doğrudan içine alır; `riskLevels`,
`setRiskLevel`/`onRiskLevel`, `riskKaynagi` yeni prop'lar olarak eklenir.

**Kritik davranış değişikliği:** Şu an parsel seçilmemişken kart sadece
"📍 Haritadan parsel seç" butonu gösterip başka hiçbir şey render etmiyor — bu, TKGM'yi
zorunlu hâle getiriyor (regresyon riski). Yeni davranış: **risk pilleri ve arsa alanı input'u
`parcelContext`'ten BAĞIMSIZ, her zaman görünür.** Yalnızca adres satırı ve "TKGM Onaylı"
rozeti `parcelContext` varlığına bağlı. "Haritadan parsel seç" küçük bir link/buton olarak
kartın İÇİNDE kalır (kartın YERİNE geçmez).

Kartın olası üç durumu:
- Parsel yok: küçük "📍 Haritadan parsel seç" satırı + her zaman aktif risk pilleri + alan
  input'u (kaynak: varsayılan/elle).
- Parsel var, doğrulanmadı/TKGM cevap vermedi: adres satırı + risk pilleri (varsayılan/elle,
  TKGM risk verisi gelmediyse) + alan input'u.
- Parsel var, doğrulandı: adres + "✓ TKGM Onaylı" rozetli alan + TKGM kaynaklı risk rozeti
  (yine de pil'e tıklanıp elle değiştirilebilir).

### 3. Masaüstü: çekmece tamamen kalkıyor

- ⚙ ikonu (`page.tsx:570`) ve `isSettingsSidebarOpen` state'i, `settingsDrawerOverlay`/
  `settingsDrawer` JSX'i (`page.tsx:823-871`) siliniyor.
- Bağımsız "Risk Payı" `settingsGroup`'u (`page.tsx:670-679`) siliniyor — risk artık yalnızca
  `SmartContextCard` içinde.
- Kalan masaüstü sidebar sırası: Toplam Daire Sayısı → Arsa Alanı+Risk (`SmartContextCard`) →
  Piyasa Analizi (Birim Maliyet + Piyasa Fiyatı) → Müteahhit Kazancı → İksa Masrafı.
- Tek, her zaman görünür sidebar kalıyor; "gelişmiş ayarlar" kavramı masaüstünde artık yok.

### 4. Mobil: `GelismisAyarlarSheet` sadeleşiyor, dead code siliniyor

- `GelismisAyarlarSheet`'ten `ArsaAlaniFields` render'ı ve `RiskCostFields`'in risk kısmı
  kalkıyor (bunlar zaten `GirdiKarti`'nin her zaman görünen `SmartContextCard`'ında var).
- Sheet'te kalanlar: Müteahhit Kazancı + İksa Masrafı (`RiskCostFields`'in geri kalanı) ve
  Piyasa Fiyatı. "Arsa alanı" `role="group"` bölümü sheet'ten kalkıyor.
- `page.tsx:713-819` (`.mobileSidebar`/`.mobileAccordions`, erişilemez ölü kod) siliniyor —
  gerçek mobil deneyim zaten `HesaplaMobile`'dan geliyor, bu blok hiç render edilmiyor.

### 5. Component API değişiklikleri

- `AdvancedSettingsSections.tsx`: `RiskCostProps`'tan `riskLevel`/`setRiskLevel`/`riskLevels`
  çıkar; `RiskCostFields` yalnızca `builderProfit`/`profitLevels` + `iksaMode`/`iksaPercentage`/
  `iksaManualTL` render eder (isim aynı kalabilir veya `ProfitAndExcavationFields`e yeniden
  adlandırılabilir — implementasyon kararı).
- `SmartContextCardProps`: `riskLevels: RiskLevel[]`, `onRiskLevel: (v: number) => void`,
  `riskKaynagi: RiskKaynagi` eklenir.
- `page.tsx`: yeni `riskKaynagi` state'i, `handleParcelConfirm`'de TKGM risk uygulamasında
  set edilir, `onRiskLevel` handler'ı elle seçimde `{ tur: 'elle' }`'e çeker (birim maliyetin
  `onBirimMaliyet` deseniyle birebir), reset handler'ına `riskKaynagi` sıfırlaması eklenir.
- `GelismisAyarlarSheet`: `ArsaAlaniProps` ve risk'le ilgili prop'lar kalkar; `AyarBolumu` union
  tipinden (`'kar'|'risk'|'iksa'|'piyasa'`) `'risk'` değerinin hâlâ anlamlı bir hedefi olup
  olmadığı implementasyon sırasında kontrol edilir (muhtemelen `'kar'`/`'iksa'` ile aynı hedefe
  düşmeye devam eder, ayrı bir doğrulama gerektirir).

## Test stratejisi

Mevcut desende devam edilir:
- `AdvancedSettingsSections`/`SmartContextCard` için birim testler (prop kontratları, kaynak
  etiketi render'ı) — `BirimMaliyetField` testleri şablon.
- `pageStyles.scope.test.ts`: kaynak metin okuyan guard'lar — "Risk Payı" grid'inin
  page.tsx'te artık YOK olduğunu, `settingsDrawer`/⚙'in YOK olduğunu doğrulayan yeni
  assertion'lar (önceki oturumda benzer guard'lar `piyasaFiyatiGirildi` için yazılmıştı).
- `GelismisAyarlarSheet.test.tsx`: risk pilleri/arsa alanının sheet'te artık render
  EDİLMEDİĞİNİ doğrulayan negatif testler (önceki oturumda "Konum ve resmi risk" bölümü için
  yapılan temizliğin aynısı).
- Regresyon testi: parsel hiç seçilmeden risk pili tıklanabiliyor ve arsa alanı elle
  girilebiliyor mu (bölüm 2'deki kritik davranış).

## Kapsam dışı / sonraki adımlar

- Görsel yeniden tasarım (renk, cam yüzey, tipografi, spacing) — bu spec onaylandıktan sonra
  `frontend-design`/`ui-ux-pro-max` ile ayrı bir uygulama turu.
- Parsel sorgu ekranı, masaüstü genel yerleşim, senaryo karşılaştırma — ayrı spec'ler
  (`project_arsabil.md` içinde zaten not düşülü).
- `AyarBolumu`'ndaki `'risk'` hedefinin anlamının netleştirilmesi — implementasyon planında
  bir task olarak ele alınacak.
