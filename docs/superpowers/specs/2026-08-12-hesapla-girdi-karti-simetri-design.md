# Hesapla Mobil Girdi Kartı — Simetri + Daire Büyüklüğü Elle Giriş

**Tarih:** 2026-08-12
**Durum:** Onaylandı (mockup üzerinden), plan aşamasına geçiliyor.

## Bağlam

Kullanıcı bulgusu: mobil `/hesapla`'da "Arsa Alanı" bölümü ve toggle'ı simetrik
durmuyor, toggle açılınca daha da bozuk görünüyor; "Daire Büyüklüğü" yalnızca
±5 stepper ile değiştirilebiliyor, elle yazılamıyor.

Kod taraması kök nedeni netleştirdi: `GirdiKarti`'nin (`src/app/hesapla/mobile/GirdiKarti.tsx`)
alt yarısı (`Yapı standardı`, `Daire büyüklüğü`, `Daire sayısıyla gir` mod anahtarı)
2026-07-28'de mobil "Premium Liquid Glass" (`--m-*` token) sistemine taşınmıştı.
Üst yarısı — konum çipi, `Deprem Riski`, `Arsa Alanı` — ayrı bir bileşen olan
`SmartContextCard` (`src/app/hesapla/SmartContextCard.tsx` + `SmartContextCard.module.css`)
tarafından render ediliyor ve bu bileşen **hiç göç etmemiş**, hâlâ masaüstü
token'larını (`var(--card-bg)`, düz `#3b82f6`, standart `Toggle` bileşeni)
kullanıyor. `SmartContextCard` hem masaüstünde hem mobilde render olduğu için
(paylaşılan bileşen — spec: risk ve alan parselden bağımsız kullanılabilmeli),
iki farklı görsel dil aynı ekranda art arda duruyor. Bu, [[feedback_dead_css_check_all_importers]]
ile aynı sınıf bir keşif: "alt yarısı taşındı" notu üst yarısı hakkında hiçbir
şey söylemiyordu, kod okuması + canlı ekran görüntüsüyle doğrulandı.

Somut belirtiler (canlı `https://www.arsabil.com/hesapla`, 390×844, gerçek
Playwright ekran görüntüsüyle doğrulandı):
- "Arsa Alanı" bölümü "Deprem Riski"nin aksine hiçbir panel/arka plan almıyor.
- Toggle AÇILINCA beliren "Elle girilmesi gerekiyor" turuncu metni toggle'ın
  soluna sıkışıp iki satıra bölünüyor.
- Toggle'ın kendisi (`@/components/ui/Toggle`, KAPALI durumda soluk/az
  kontrastlı) kartın altındaki "Daire sayısıyla gir" anahtarından (`.anahtar`/
  `.anahtarTopu`, canlı gradyan mavi) görsel olarak tamamen farklı.
- `Deprem Riski` pilleri düz outline butonlar; `Yapı Standardı` altındaki
  segment kontrolü dolgulu/aktifken gradyan — aynı kartta iki farklı "seçim
  grubu" görseli.

Mockup (onaylandı — "B yani önerilen gayet iyi"):
https://claude.ai/code/artifact/f4dbd4ce-cf59-48d3-bbfd-cccd8bbc1d9e

**Bu bir yeniden-tasarım değil, 2026-07-28'in ertelediği göçün tamamlanmasıdır.**
Bilgi mimarisi, veri akışı, `onIsAaEnabled`/`onArsaAlani`/`onRiskLevel` gibi
handler'lar, motora giden değerler — hiçbiri değişmiyor; yalnızca görsel yüzey
ve (Daire Büyüklüğü için) tek bir davranış eklemesi: elle giriş.

## Kapsam

1. `SmartContextCard.tsx` + `SmartContextCard.module.css` — mobil override,
   `@media (max-width: 768px)` içinde, self-gating. Masaüstü **hiç dokunulmuyor**.
   - Konum çipi ("Haritadan parsel seç" / seçili adres + "Değiştir").
   - `Deprem Riski` paneli ve pilleri → segment görünümüne (Yapı Standardı ile
     aynı `.segmentKap`/`.segment`/`.segmentAktif` deseni).
   - `Arsa Alanı` paneli: kutulu arka plan, "Elle girilmesi gerekiyor" /
     "✓ TKGM Onaylı" durum metni ayrı satıra iniyor, input satırı cam input
     stiline geçiyor.
2. `@/components/ui/Toggle` (`Toggle.module.css`) — mobil override eklenir
   (`@media (max-width: 768px)`), `GirdiKarti`'nin `.anahtar`/`.anahtarTopu`
   ile BİREBİR aynı boyut/renk. `Toggle` yalnızca iki yerde kullanılıyor
   (`src/app/hesapla/page.tsx` masaüstü, `SmartContextCard.tsx`) — masaüstü
   kullanım base kurallardan etkilenmez.
3. `GirdiKarti.tsx` — "Daire büyüklüğü" değeri artık statik `<span>` değil,
   gerçek bir `<input>`; ±5 stepper butonları aynen kalır.
4. Testler: `SmartContextCard`/`Toggle` için mobil↔masaüstü ayrım guard'ı,
   `GirdiKarti` için elle giriş + sınır davranışı testleri.

## Kapsam dışı (bu turda YAPILMIYOR)

- `Daire sayısıyla gir` mod anahtarının sabit alt CTA çubuğu tarafından
  kısmen kapatılması (canlı ekran görüntüsünde gözlemlendi, ayrı/küçük bir
  bulgu — kullanıcıya bildirildi, bu spec'e dahil edilmedi).
- `Yapı Standardı` segmentinin kendisi (zaten göçmüş, dokunulmuyor).
- Motor/hesaplama mantığı, `page.tsx`'teki state (`arsaAlani`, `apartmentSize`
  vb.) — birebir korunuyor, yalnızca render ve (Daire Büyüklüğü için) input
  `onChange`'in aynı `onApartmentSize` handler'ına bağlanması.
- Masaüstü görünüm (`page.tsx`'in masaüstü JSX ağacı, `SmartContextCard`'ın
  masaüstünde render edilen hali) — piksel-eşdeğer kalmalı.

## Token karşılığı (tek doğruluk kaynağı)

Mockup'ta gösterilen ve onaylanan eşleme; `mobile.module.css`'te zaten var
olan aynı token'lar kullanılıyor, yeni bir renk/değer icat edilmiyor:

| Kullanım | Şu an (mobilde de) | Liquid Glass (mobil override) |
|---|---|---|
| Konum çipi zemini | `rgba(59,130,246,.08)` + dashed `#3b82f6` | `rgba(21,96,208,.06)` + dashed `var(--m-link)`, `var(--m-r-btn)` |
| Risk/Arsa Alanı panel zemini | `var(--input-bg)` | `var(--m-fill)`, `var(--m-r-inner)` |
| Risk pilleri | outline buton, aktifken `rgba(59,130,246,.12)` + `#3b82f6` kenarlık | `.segment`/`.segmentAktif` deseni: dolgu şeffaf → aktifken `var(--m-grad-btn)` + `var(--m-sh-grad-btn)` |
| Bölüm başlığı/etiket | `var(--label-color)` | `var(--m-body)`, `.girdiEtiket` ile aynı 700/10.5px uppercase |
| Adres/başlık metni | `var(--fg)` | `var(--m-ink)` |
| Toggle (kapalı) | `var(--shell-bg)` (soluk) | `var(--m-fill)` |
| Toggle (açık) | `var(--brand-gradient)` | `var(--m-grad-btn)` + `var(--m-sh-grad-btn)`, boyut 46×27 / topuz 21×21 (GirdiKarti `.anahtar` ile birebir) |
| Durum metni (TKGM onaylı) | `#10b981` | `var(--m-success)`, kendi satırında (satır kırılması yok) |
| Durum metni (elle giriş) | `#f59e0b` | `#b45309` (mockup'ta onaylanan), kendi satırında |
| Alan input'u | `var(--card-bg)` + `var(--border)` | beyaz zemin + `var(--m-glass-border)`, `var(--m-r-input)`, `font-size:16px` (iOS zoom guard, projenin kendi deseni) |

**Kritik kısıt (önceki iki göçün final review'lerinde bulunan gerçek
regresyonlardan miras — bkz. [[project_arsabil]] 2026-08-08/2026-08-11
kayıtları):** `--m-*` sistemi tamamen ışık-temalı/koşulsuzdur. Mobil override
bloğundaki HİÇBİR kural `var(--fg)` / `var(--label-color)` / `var(--muted)`
KULLANMAMALI — hepsi `var(--m-ink)` / `var(--m-body)` kullanmalı. Masaüstü
(media query dışı, base) kurallar mevcut token'larıyla (`var(--fg)` vb.)
DEĞİŞMEDEN kalır.

## Değişiklikler

### 1. `SmartContextCard.module.css` — mobil override bloğu

```css
@media (max-width: 768px) {
  .unselectedBtn {
    background: rgba(21, 96, 208, .06);
    border-color: rgba(21, 96, 208, .4);
    color: var(--m-link);
    border-radius: var(--m-r-btn);
  }
  .address { color: var(--m-ink); }
  .editBtn { color: var(--m-link); }

  .riskSection, .areaSection {
    background: var(--m-fill);
    border-radius: var(--m-r-inner);
  }
  .riskHeader, .areaHeader { color: var(--m-body); }
  .riskKaynakEtiket { color: var(--m-body); }
  .riskNote { color: var(--m-body); }

  /* Risk pilleri -> segment görünümü (Yapı Standardı ile aynı desen) */
  .riskPills { gap: 5px; }
  .riskPill {
    background: transparent;
    border: none;
    border-radius: 12px;
    color: var(--m-on-glass);
    min-height: 40px;
  }
  .riskPillActive {
    background: var(--m-grad-btn);
    color: #fff;
    box-shadow: var(--m-sh-grad-btn);
    border: none;
  }

  /* Arsa Alanı satırı: baslik+toggle HER ZAMAN tek satırda kalır (bkz. JSX notu) */
  .areaStatusRow { color: #b45309; }
  .areaStatusRow.ok { color: var(--m-success); }

  .areaInputRow input {
    background: #fff;
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-input);
    color: var(--m-ink);
    font-size: 16px;
  }
}
```

**Küçük bir JSX değişikliği de gerekiyor** (yalnızca CSS'le tam çözülemiyor):
mockup'ta onaylanan davranışta durum metni ("Elle girilmesi gerekiyor"/
"✓ TKGM Onaylı") toggle'ın YANINDAN çıkıp `areaHeader`'ın ALTINA, kendi ayrı
satırına iniyor — ama TOGGLE KAPALIYKEN başlık+toggle satırı hiç kırılmadan
tek satırda kalmalı (mockup'ta OFF durumunda görülüyor). Şu an durum metni
`areaHeaderRight` span'inin İÇİNDE, toggle'ın kardeşi olarak render oluyor
(`SmartContextCard.tsx:100-112`); saf CSS (`flex-wrap`/`order`) bunu toggle
kapalıyken de aynı satırda tutup açıkken alt satıra indiremez — ikisi aynı
konteynerin içinde olduğu sürece kırılma kuralı her iki durumda da aynı
uygulanır. Bu yüzden durum metni JSX'te `areaHeaderRight`'ın DIŞINA, `areaHeader`
ile aynı seviyede yeni bir kardeş elemana taşınıyor:

```tsx
<div className={styles.areaSection}>
    <div className={styles.areaHeader}>
        <span>Arsa Alanı</span>
        <Toggle className={styles.aaToggle} checked={isAaEnabled} ... />
    </div>
    {isAaEnabled && (
        <p className={`${styles.areaStatusRow} ${isAreaVerified ? styles.ok : ''}`}>
            {isAreaVerified ? '✓ TKGM Onaylı' : 'Elle girilmesi gerekiyor'}
        </p>
    )}
    {isAaEnabled && (
        <div className={styles.areaInputRow}>...</div>
    )}
</div>
```

Davranış/koşul (`isAaEnabled`, `isAreaVerified`) birebir aynı — yalnızca durum
metninin render edildiği yer değişiyor. `.areaHeaderRight` class'ı artık
gereksiz kalır ve kaldırılır (yalnızca `Toggle`'ı sarmalıyordu).

### 2. `Toggle.module.css` — mobil override

```css
@media (max-width: 768px) {
  .switch { width: 46px; height: 27px; }
  .slider { background: var(--m-fill); border: none; box-shadow: none; }
  .slider:before { width: 21px; height: 21px; box-shadow: 0 2px 6px rgba(11,32,54,.25); }
  input:checked + .slider {
    background: var(--m-grad-btn);
    border: none;
    box-shadow: var(--m-sh-grad-btn);
  }
  input:checked + .slider:before { transform: translateX(19px); }
}
```

Boyutlar `GirdiKarti.module.css`'teki `.anahtar`/`.anahtarTopu` ile birebir
(46×27 / 21×21 / translateX(19px)) — mockup'ta gösterilen "tek anahtar görseli"
tam olarak bu.

### 3. `GirdiKarti.tsx` — Daire büyüklüğü elle giriş

**Keşif — icat etmeye gerek yok:** masaüstü zaten aynı alan için elle giriş
kullanıyor (`page.tsx:650-654`, "Ortalama Daire Metrekaresi"):

```tsx
<input
  type="number"
  value={apartmentSize ?? ''}
  onChange={(e) => handleApartmentSizeChange(e.target.value === '' ? null : Number(e.target.value))}
/>
```

`handleApartmentSizeChange: (v: number | null) => void` (`page.tsx:255-258`) —
yani prop zaten `number | null` kabul ediyor, boş input `null`'a dönüyor, ve
masaüstünde manuel girişte HİÇBİR clamp/sınır uygulanmıyor (yalnızca ± butonları
`M2_MIN`'i zorluyor, `M2_MAX` üst sınırı masaüstü + butonunda bile yok). Mobil
için de AYNI davranış benimseniyor — yeni bir clamp-on-blur kuralı icat
etmiyoruz, iki platform tutarlı kalıyor.

**Tek gerçek boşluk:** `GirdiKartiProps.onApartmentSize` şu an `(v: number) => void`
olarak tiplenmiş (`GirdiKarti.tsx:25`) — `null` kabul etmiyor gibi görünüyor,
ama gerçek çağıran (`page.tsx:560`) `handleApartmentSizeChange`'i geçiyor, o da
`number | null` alıyor. Bu tip önce `(v: number | null) => void`'a genişletilmeli
(gerçek davranışla eşleşsin diye), sonra:

```tsx
<span className={styles.girdiEtiket}>Daire büyüklüğü</span>
<div className={styles.stepperSatir}>
    <input
        type="number"
        inputMode="numeric"
        className={`${styles.stepperInput} mNum`}
        value={apartmentSize ?? ''}
        placeholder="—"
        aria-label="Daire büyüklüğü, m²"
        onChange={(e) => onApartmentSize(e.target.value === '' ? null : Number(e.target.value))}
    />
    <span className={styles.stepperBirim}>m²</span>
    <button type="button" className={styles.stepperAzalt} aria-label="Metrekareyi azalt" onClick={...}>−</button>
    <button type="button" className={styles.stepperArtir} aria-label="Metrekareyi artır" onClick={...}>+</button>
</div>
```

±5 stepper butonlarının kendi `onClick` mantığı (M2_MIN/M2_MAX sınırları)
DEĞİŞMİYOR — yalnızca artık statik bir `<span>` yerine gerçek bir `<input>`'un
yanında duruyorlar.

`.stepperInput` CSS'i (`mobile.module.css`), mevcut `.stepperDeger` ile aynı
görsel (font 19px/800, `var(--m-ink)`, `flex:1`, `padding-left:13px`) +
`background:transparent; border:none; outline:none; -webkit-appearance:textfield; font-size:16px`
(iOS zoom guard, projenin kendi deseni, bkz. `konumAramaGiris`) — görsel olarak
sıfır fark, yalnızca artık odaklanılıp yazılabilir.

## Test güncellemeleri

- `SmartContextCard`/mobil için yeni bir `*.scope.test.ts` (`hesapla`
  dizinindeki `pageStyles.scope.test.ts` deseniyle aynı biçimde): mobil
  bloktaki `.address`, `.riskHeader`, `.areaHeader`, `.areaStatusRow`
  kurallarının HİÇBİRİNİN `var(--fg)`/`var(--label-color)`/`var(--muted)`
  içermediği, hepsinin `var(--m-ink)`/`var(--m-body)`/`var(--m-success)`
  kullandığı (kritik regresyon guard'ı — [[project_arsabil]] 2026-08-08
  kaydındaki aynı hata sınıfı).
- `isAaEnabled` açıkken `.areaHeader`'ın (başlık+toggle) `.areaStatusRow`'dan
  (durum metni) ayrı bir JSX satırı olarak kaldığı — toggle KAPALIYKEN
  başlık+toggle satırının kırılmadığı bir RTL testiyle doğrulanır.
- Masaüstü (media query dışı) `.riskPill`/`.areaSection`/`.unselectedBtn`
  tanımlarının DEĞİŞMEDİĞİ (mevcut değerlerin birebir korunduğu).
- `Toggle.module.css` için aynı guard: mobil bloktaki `input:checked + .slider`
  kuralının `var(--m-grad-btn)` kullandığı, masaüstü (media query dışı)
  kuralın `var(--brand-gradient)` ile DEĞİŞMEDEN kaldığı.
- `GirdiKarti.test.tsx`'e yeni testler: (1) elle yazılan değerin
  `onApartmentSize`'a doğru sayıyla (clamp'siz — masaüstüyle tutarlı) ulaştığı,
  (2) input boşaltılınca `onApartmentSize(null)` çağrıldığı, (3) ±5 stepper
  butonlarının kendi `M2_MIN`/`M2_MAX` sınırlarının REGRESYONA UĞRAMADIĞI
  (mevcut testler zaten kapsıyor, yeni input'un bunları kırmadığı doğrulanır).

## Doğrulama planı

- `tsc --noEmit` → 0 hata.
- `npx jest --no-coverage --roots "src"` → tüm suite yeşil.
- Canlı/dev sunucuda gerçek Playwright doğrulaması (390×844, gerçek mobil UA):
  - `Arsa Alanı` toggle AÇILINCA durum metninin artık taşmadığı/sıkışmadığı,
    `getComputedStyle` ile panel arka planının `Deprem Riski` ile eşleştiği.
  - `Daire Büyüklüğü` alanına gerçek bir sayı elle yazılıp değerin doğru
    yansıdığı, ±5 butonlarının hâlâ (kendi `M2_MIN`/`M2_MAX` sınırlarıyla)
    çalıştığı.
  - **Masaüstü genişlikte (`SmartContextCard`, `Toggle`, `page.tsx`'in
    masaüstü ağacı) sayfanın BİREBİR ÖNCEKİ GİBİ kaldığı** — bu spec'in en
    kritik regresyon riski, önceki iki göç spec'iyle aynı desen.
