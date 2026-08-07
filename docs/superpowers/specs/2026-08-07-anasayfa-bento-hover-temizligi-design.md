# Anasayfa Bento Kartları — Ölü Mouse-Tracking Kodunun Kaldırılması

**Tarih:** 2026-08-07
**Durum:** Onaylandı, plan aşamasına geçiliyor.

## Bağlam

`/hesapla` ölü kod temizliği sırasında not edilen bir bulgu ayrı bırakılmıştı
(bkz. [2026-08-07-hesapla-olu-kod-temizligi-design.md](2026-08-07-hesapla-olu-kod-temizligi-design.md)
"Kapsam dışı" bölümü): anasayfadaki (`MarketingHomePage`, `src/app/page.tsx`)
bento kartlarında imleç takibiyle çalışan bir 3D tilt + spotlight efekti,
dokunmatik cihazlarda hiçbir zaman tetiklenmiyor.

## Mevcut davranış

`FeaturesGrid` içindeki 4 bento kartı (`page.tsx:134-381`) `onMouseMove`/
`onMouseLeave` (satır 29-48) ile CSS custom property'lerini set ediyor:

- `--mx`/`--my`: imleç pozisyonu → `.spotlight`'ın (satır 296-309) radial-gradient
  merkezini imleci takip ettiriyor.
- `--rx`/`--ry`: imlecin kart merkezine göre uzaklığından hesaplanan açı →
  `.bentoCard`'ın (satır 246) `perspective(1000px) rotateX() rotateY()` ile
  3D tilt efekti.

Bu efekt **yalnızca gerçek mouse olan cihazlarda çalışıyor** — dokunmatikte
`onMouseMove` hiç tetiklenmediği için kartlar CSS varsayılanlarında
(`--rx:0deg`, `--mx/--my:50%`) sabit kalıyor. `:hover` pseudo-class'ına bağlı
diğer efektler (arka plan görsel scale'i, kutu gölgesi, spotlight'ın
*görünür olması*, `.bigDeco` scale'i) JS'ten bağımsız, saf CSS — bunlar
etkilenmiyor.

`page.module.css` yalnızca `page.tsx` tarafından import ediliyor,
`.bentoCard`/`.spotlight` class'ları başka hiçbir dosyada kullanılmıyor
(grep ile doğrulandı) — cross-import riski yok, `/hesapla`'daki gibi başka
bir ağaca sızma ihtimali bu dosya için geçerli değil.

## Karar

İmleç-takipli tilt/spotlight efekti **tüm cihazlarda kaldırılır** (yalnızca
dokunmatik için atlanmaz — masaüstünde de kalkacağı kullanıcıya açıkça
soruldu ve onaylandı). Gerekçe: kod karmaşıklığı kazandırdığı görsel
zenginlik için orantısız, tüm cihazlarda tutarlı/sade bir `:hover` davranışı
tercih edildi.

## Değişiklikler

**`src/app/page.tsx`:**
- `onMouseMove`/`onMouseLeave` fonksiyon tanımları (satır 29-48) silinir.
- 4 bento kartındaki `onMouseMove={onMouseMove}` / `onMouseLeave={onMouseLeave}`
  prop çiftleri kaldırılır.

**`src/app/page.module.css`:**
- `.bentoCard`'daki `transform: perspective(1000px) rotateX(var(--rx, 0deg))
  rotateY(var(--ry, 0deg));` ve `transform-style: preserve-3d;` satırları silinir.
- `.bentoCard`'ın `transition` listesinden `transform 0.15s ease-out,` çıkarılır
  (`box-shadow 0.3s ease, border-color 0.3s ease` kalır — `:hover`'da hâlâ kullanılıyorlar).
- `.spotlight`'taki `radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), ...)`
  → `radial-gradient(400px circle at 50% 50%, ...)` (değer zaten hep bu
  varsayılana düşüyordu, literal değere sadeleştiriliyor).

## Davranış değişikliği (onaylandı)

Masaüstünde imleç-takipli 3D tilt ve spotlight-takip efekti kalkar; tüm
cihazlarda kartlar artık aynı sade `:hover` davranışını gösterir (arka plan
görseli scale + kutu gölgesi + kart merkezinde sabit spotlight fade-in +
`.bigDeco` scale). Dokunmatikte zaten görünür bir fark yoktu, değişmiyor.

## Test güncellemeleri

`pageStyles.scope.test.ts` bu class'lara/property'lere dokunmuyor — mevcut
suite'i kırmıyor. Silinen kodun geri gelmediğini kilitleyen 1-2 negatif
assertion eklenir (proje zaten bu deseni kullanıyor, bkz. aynı dosyadaki
"ölü kod geri gelmesin" testleri):
- `page.tsx`'te `onMouseMove`/`onMouseLeave` fonksiyon tanımlarının/prop
  kullanımlarının artık geçmediğini doğrulayan test.
- `page.module.css`'te `var(--rx`/`var(--mx` referanslarının artık
  geçmediğini doğrulayan test.

## Kapsam dışı

- Dokunmatik cihazlar için alternatif bir etkileşim tasarımı (tap-reveal vb.)
  — kullanıcı bu turda istemedi, ayrı bir bulgu olarak kalabilir.
- `page.module.css`'teki başka hiçbir kural/section.

## Doğrulama planı

- `tsc --noEmit` → 0 hata.
- `npx jest --no-coverage --roots "src"` → tüm suite yeşil.
- Gerçek dev/prod server'da `/`: masaüstünde bento kartlarının `:hover`'da
  görsel scale + gölge + spotlight fade-in ile tepki verdiği (tilt/imleç-takibi
  OLMADAN), dokunmatik/mobil genişlikte hiçbir görsel değişiklik olmadığı
  doğrulanır.
