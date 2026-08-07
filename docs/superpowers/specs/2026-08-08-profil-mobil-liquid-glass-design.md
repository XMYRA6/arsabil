# Profil Sayfası (Mobil) — Premium Liquid Glass Sistemine Taşıma

**Tarih:** 2026-08-08
**Durum:** Onaylandı (mockup üzerinden), plan aşamasına geçiliyor.

## Bağlam

Kullanıcı geri bildirimi: `/dashboard/profile` mobilde "çok kötü, baya junior designer
işi gibi duruyor". Kod incelemesiyle kök neden bulundu: sayfa 2026-07-09'da bir
"Airbnb tarzı" mobil düzene geçmişti (drill-down menü + `AppBar`) ama hiçbir zaman
projenin 2026-07-28'de kurduğu asıl mobil kimliğine — **"Premium Liquid Glass"**
(`globals.css` §`@media (max-width:768px)`, `--m-*` token seti) — taşınmadı.
`HomeMobile` (`src/app/mobile/mobile.module.css`) bu sistemi kullanıyor; profil
hâlâ eski, düz `--panel`/`--border`/`--bg-body` masaüstü token'larıyla render
oluyor. Görsel mockup (iki telefon çerçevesi, Önce/Sonra) kullanıcıya sunuldu ve
onaylandı: https://claude.ai/code/artifact/32728664-e0bb-4efb-a3cd-3f5be0692289

**Bu bir yeniden-tasarım değil, mevcut sistemin eksik uygulanan kısmının
tamamlanmasıdır.** Bilgi mimarisi (4 menü maddesi, drill-down davranışı) aynen
korunur; yalnızca görsel yüzey (cam, gölge, gradyan, tipografi) değişir.

## Kapsam

Yalnızca mobil ana ekran (`data-mobile-section="false"` durumu): hero kartı
(avatar + isim + doğrulanmış rozeti + tamamlanma çubuğu) ve gruplu menü listesi
(4 satır: Portfolyo/İlanlarım/Favorilerim/Tema&Ayarlar). Masaüstü **hiç
dokunulmuyor** (tüm değişiklikler `@media (max-width:768px)` içinde, self-gating).

Dosyalar: `src/app/dashboard/profile/page.tsx`, `src/app/dashboard/profile/profile.module.css`.

## Mimari karar: `MobileScreen` KULLANILMIYOR

`HomeMobile` ve `HesaplaMobile` gibi tam mobil-ayrı ağaçlar, arka plan meşini
(`--m-mesh`/`--m-bg`) almak için paylaşılan `<MobileScreen>` sarmalayıcısını
kullanıyor. Bu sarmalayıcının `.screen > *` kuralı (her doğrudan çocuğa
`position:relative;z-index:1` uygular) **iki ayrı oturumda** `AppBar`'ın kendi
`position:sticky`'siyle çakışıp gerçek bir regresyona yol açtı (`HesaplaMobile`,
`HomeMobile` — ikisi de tek-kök `<div>` sarmalayıcısıyla düzeltildi, bkz.
`project_arsabil.md` hafıza notları).

`/dashboard/profile` şu an `<><AppBar/><div className={styles.container}>...</div></>`
şeklinde İKİ doğrudan kardeş render ediyor — tam olarak bu tuzağın oluştuğu yapı.
`MobileScreen` eklemek JSX'i yeniden yapılandırmayı (tek-kök wrapper) ve bu bilinen
riski yeniden test etmeyi gerektirir. **Karar: `MobileScreen` bu turda
kullanılmıyor.** Bunun yerine `--m-mesh` arka planı doğrudan `.container`'ın kendi
mobil media query'sinde (JSX değişikliği olmadan, salt CSS) uygulanır. Sonuç
görsel olarak birebir aynı; mimari risk sıfıra iner.

## Değişiklikler

### 1. Sayfa arka planı (mobil)

`.container`'ın `@media (max-width:768px)` bloğuna eklenir:

```css
.container {
  background:
    radial-gradient(680px 420px at 12% -6%, rgba(43,124,255,.55), transparent 62%),
    radial-gradient(560px 420px at 96% 8%,  rgba(34,211,238,.5), transparent 60%),
    radial-gradient(620px 520px at 78% 96%, rgba(124,58,237,.34), transparent 62%),
    radial-gradient(520px 380px at 4% 86%,  rgba(16,185,129,.16), transparent 60%),
    var(--m-bg);
  min-height: 100dvh;
}
```

(`background: var(--m-mesh), var(--m-bg);` geçerli CSS'tir — `--m-mesh` zaten
virgülle ayrılmış 4 `radial-gradient` katmanı, son katman olarak düz bir renk
[`--m-bg`] eklemek CSS `background` shorthand'ında desteklenen bir kalıptır.
**Not — `MobileScreen`'den kasıtlı farkı:** `MobileScreen`, meşi `position:fixed`
bir `::before` katmanıyla (+ içeriği `z-index:1`'e iten `.screen > *` kuralıyla)
uygular, böylece meş viewport'a sabit kalır. Burada mesh doğrudan
`.container`'ın kendi `background`'ı olduğu için içerikle birlikte KAYAR
(fixed değil) — görsel sonuç neredeyse aynıdır (gradyanlar zaten container'ın
kendi kutusuna göre konumlanıyor) ama birebir aynı mekanizma değildir. Bu,
`MobileScreen`'in JSX yeniden yapılandırması gerektirmemesi için bilinçli bir
basitleştirmedir.)

### 2. Hero kartı → cam yüzey

`.profileCard`'ın masaüstü tanımı (`background:var(--panel); border:1px solid
var(--border); border-radius:20px;`) korunur (dokunulmuyor); mobil override
eklenir:

```css
@media (max-width: 768px) {
  .profileCard {
    background: var(--m-glass-bg);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-card);
    backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
    box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
  }
}
```

### 3. Avatar → gradyan halka

Yeni bir sarmalayıcı class eklenir (`avatarRing`), yalnızca mobilde stillenir
(masaüstünde tanımsız/no-op — `avatarWrapper`'ın kendi koordinat sistemini
bozmaz, `avatarEditBadge`'in `bottom:-10px;right:-10px` konumlaması etkilenmez):

`page.tsx`'te avatar bloğu:
```tsx
<div className={styles.avatarRing}>
  <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
    {/* ...mevcut içerik değişmeden... */}
  </div>
</div>
```

`profile.module.css`, `@media (max-width:768px)` içine:
```css
.avatarRing {
  width: 102px;
  height: 102px;
  border-radius: 50%;
  padding: 3px;
  margin: 0 auto;
  background: var(--m-grad-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

(96px olan mevcut `.avatarWrapper`/`.avatarCircle` mobil boyutu aynen kalır —
102px = 96px + 2×3px padding, halka avatarı tam sarar.)

### 4. İsim tipografisi — serif kaldırılıyor

`.heroNameText`'teki `font-family: Georgia, "Iowan Old Style", "Palatino
Linotype", serif;` kaldırılır (satır kaldırılır, elemandan `font-family`
mirasla `body`'nin Inter yığınına düşer — dosyanın geri kalanıyla tutarlı).
`font-size`/`font-weight`/`color` aynen kalır, yalnızca `font-weight: 400` →
`700` (mockup'taki "800/bold" hissiyle uyumlu, cam kartın üzerinde daha güçlü
kontrast).

### 5. Doğrulanmış rozeti → hero'da görünür cam çip

Şu an `.verifiedBadge` her zaman DOM'da (`profile?.isVerified` true ise), ama
`@media (max-width:768px)` içinde koşulsuz `display:none` ile gizleniyor;
doğrulanmış durum yerine `.heroSubline` metninin sonuna " · ✓ Doğrulandı"
olarak ekleniyor (line 328-330). Bu, mockup'ta onaylanan "ayrı görünür rozet"
tasarımıyla uyuşmuyor — düzeltiliyor:

**`profile.module.css`:** `.verifiedBadge { display: none; }` satırı silinir,
yerine `.heroName`/`.completionCard` ile AYNI koşullu görünürlük deseni eklenir:
```css
.verifiedBadge {
  display: none; /* mobilde varsayılan: sadece section kapalıyken görünür */
}
.container[data-mobile-section="false"] .verifiedBadge {
  display: inline-flex;
  background: rgba(16, 185, 129, 0.14);
  color: #067a56;
  border: none;
  margin: 2px auto 0;
}
```
(Masaüstü tanımı zaten ayrı bir kural — `.verifiedBadge { display:flex; ...
background: rgba(var(--green-rgb),.1); color: var(--green); ... }`, bu satır
aynen kalır, mobil media query'nin dışında olduğu için etkilenmez.)

**`page.tsx`:** `.heroSubline` içindeki `{profile?.isVerified ? ' ·
✓ Doğrulandı' : ''}` eki kaldırılır (artık çip bunu ayrı gösteriyor, metinde
tekrar etmesin):
```tsx
<span className={styles.heroSubline}>
  {(session.user as { role?: string })?.role || 'USER'}
</span>
```

### 6. Tamamlanma çubuğu → cam yüzeyle uyumlu

`.completionCard`'ın mobil `display:block` tanımı korunur; arka planı
`--bg-body` yerine şeffaf/hafif çizgi ayırıcıya çevrilir (kartın kendisi artık
cam olduğu için iç içe iki kat cam istenmiyor — mockup'taki gibi üstte ince bir
`border-top` ile ayrılan düz bölüm):
```css
@media (max-width: 768px) {
  .completionCard {
    background: none;
    border: none;
    border-radius: 0;
    padding: 10px 0 0;
    border-top: 1px solid rgba(11, 32, 54, 0.08);
    margin-top: 4px;
  }
  .completionPct {
    font-family: var(--m-mono);
    font-variant-numeric: tabular-nums;
    color: #1560d0;
  }
  .completionFill {
    background: var(--m-grad-btn);
  }
}
```

### 7. Menü satırları → cam yüzey + gradyan ikon çipleri

```css
@media (max-width: 768px) {
  .menuRow {
    background: var(--m-glass-bg);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-card);
    backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
    box-shadow: var(--m-sh-card-sm), inset 0 1px 0 #fff;
  }

  .menuIconBoxBlue   { background: linear-gradient(135deg, #4f9bff, var(--primary)); }
  .menuIconBoxOrange { background: linear-gradient(135deg, #ffb648, var(--orange)); }
  .menuIconBoxRed    { background: linear-gradient(135deg, #ff8189, var(--red)); }
  .menuIconBoxGray   { background: linear-gradient(135deg, #8fa1ba, #64748b); }

  .menuCount {
    font-family: var(--m-mono);
    font-variant-numeric: tabular-nums;
  }

  .sectionLabel {
    color: #4c5d78;
  }
}
```

(`.menuLabel`/`.menuSubtitle`/`.menuChevron` renkleri `var(--text)`/`var(--muted)`
kullanıyor — bunlar zaten tema-bağımsız okunaklı değerler, dokunulmuyor; yalnızca
görsel testte kontrast doğrulanır.)

## Kapsam dışı (bu turda YAPILMIYOR)

- Drill-down alt ekranlar (Portfolyo/İlanlarım/Favorilerim/Tema & Ayarlar
  detay görünümleri) — `tabContent` içindeki liste satırları, favoriler
  sekmesindeki inline style'lar, ayarlar sekmesindeki e-posta tercihleri/hesap
  yönetimi blokları. Bunlar için ayrı mockup gösterilmedi, onay yok.
- Hesap silme modalı (şu an tam inline style, `position:fixed` özel modal).
  `BottomSheet` bileşenine geçiş DEĞERLENDİRİLEBİLİR ama bu davranış
  değişikliği (drag-to-dismiss vb.) demektir — kapsam dışı, ayrı bir karar.
- `AppBar` — zaten paylaşılan, tema-bağımlı (`--topbar-bg` vb.), doğru ve
  tutarlı çalışıyor; değişiklik gerekmiyor.
- Masaüstü görünüm — hiçbir kural masaüstünü etkilemiyor (tüm değişiklikler
  `@media (max-width:768px)` içinde).

## Test güncellemeleri

`src/app/dashboard/profile/profileStyles.scope.test.ts` mevcut deseni takip
eder (proje genelinde `pageStyles.scope.test.ts` dosyalarının kullandığı regex
tabanlı CSS/JSX metin doğrulama). Eklenecek testler:
- `.container`'ın mobil bloğunda `var(--m-mesh)` veya eşdeğer mesh
  katmanlarının kullanıldığı.
- `.profileCard`/`.menuRow`'un mobil bloğunda `var(--m-glass-bg)` +
  `var(--m-glass-blur)` kullandığı.
- `.heroNameText`'te artık `Georgia`/`serif` geçmediği.
- `.avatarRing` class'ının hem CSS'te tanımlı hem `page.tsx`'te kullanıldığı.
- `.verifiedBadge`'in mobil `@media` bloğunda artık koşulsuz `display: none;`
  olarak GEÇMEDİĞİ (regresyon guard — rozetin yeniden tamamen gizlenmediğini
  kilitler).
- `page.tsx`'te `heroSubline` içeriğinin artık `✓ Doğrulandı` metnini
  İÇERMEDİĞİ (çipe taşındığını kilitler).
- Masaüstü tanımlarının (media query DIŞINDAKİ `.profileCard`, `.menuRow`,
  `.verifiedBadge` kuralları) değişmediğini doğrulayan mevcut/var olan
  testler — varsa korunur, yoksa eklenmez (spec masaüstünü değiştirmiyor,
  negatif kanıt gerekmiyor).

## Doğrulama planı

- `tsc --noEmit` → 0 hata.
- `npx jest --no-coverage --roots "src"` → tüm suite yeşil.
- Gerçek dev/prod server'da (giriş yapılmış oturum gerekiyor — yerel DB/test
  kullanıcısı ile): `/dashboard/profile` mobil genişlikte (≤768px, gerçek
  resize) hero kartının cam yüzeyde, avatarın gradyan halkada, doğrulanmış
  rozetinin (varsa) hero'da göründüğü, menü satırlarının cam yüzeyde ve
  sayıların mono/tabular olduğu `getComputedStyle` ile doğrulanır. Masaüstü
  genişlikte (>768px) sayfanın BİREBİR ÖNCEKİ GİBİ (piksel-parite) kaldığı
  doğrulanır — bu spec'in en kritik regresyon riski budur.
