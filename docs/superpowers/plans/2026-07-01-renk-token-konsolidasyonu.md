# Renk Token Konsolidasyonu + Framer Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kod tabanındaki ~50 dağınık renk hex değerini mevcut `globals.css` semantik token sistemine (`--green`/`--orange`/`--red`/yeni `--info`/`--accent-violet-stat`) bağlamak, ve landing page'in reveal animasyonlarını Framer Motion'a taşımak.

**Architecture:** Token foundation önce (`globals.css`), sonra dosya-alanı bazında mekanik migrasyon (DOM/CSS bağlamında `var(--token)`, Chart.js canvas bağlamında token'ın çözümlenmiş hex literal'i — canvas CSS değişkeni anlamaz). Framer Motion sadece landing page reveal + CTA hover/tap ile sınırlı pilot.

**Tech Stack:** Next.js 16, React 19, CSS Modules, Chart.js (react-chartjs-2), framer-motion (yeni bağımlılık).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-01-renk-token-konsolidasyonu-design.md`
- `--green` yeni değeri: `#10b981` (eski: `#2fbf71`)
- `--orange` yeni değeri: `#f59e0b` (eski: `#ff9f2f`)
- `--red` değişmiyor: `#ff5a5f` (restore edilen orijinal marka rengi; `#ef4444`/`#dc2626` buna eşlenir)
- **İSTİSNA — dokunulmayacak dosyalar/bloklar:** `src/app/page.module.css` içindeki `.accentBlue`/`.accentGreen`/`.accentPurple`/`.accentTeal` 3-stop gradient tanımları (satır ~404-440) — kasıtlı dekoratif çok renklilik, "kontrollü çeşitlilik" kararı gereği KORUNUYOR, token'a bağlanmıyor. `wizard.module.css`'teki `var(--red, #dc2626)` zaten doğru, dokunulmuyor.
- **Canvas/Chart.js istisnası:** `src/components/charts/RiskGaugeChart.tsx` ve `CostBreakdownChart.tsx` canvas üzerine çizim yapan Chart.js bileşenleridir — CSS `var()` değerlerini ÇÖZEMEZ. Bu iki dosyada token yerine token'ın **çözümlenmiş hex literal değeri** kullanılır (örn. `var(--red)` değil, doğrudan `#ff5a5f`). `PriceEvaluationChart.tsx` canvas DEĞİL, düz `<div>` tabanlıdır — `var()` kullanılabilir.
- Her task sonunda: `npx tsc --noEmit` ve `npx eslint <değişen dosyalar>` temiz olmalı.

---

### Task 1: Token Foundasyonu (`globals.css`)

**Files:**
- Modify: `src/app/globals.css:13-15` (root token değerleri), `src/app/globals.css:55` (redundant dark-theme override)

**Interfaces:**
- Produces: `--green` (#10b981), `--green-rgb` (16, 185, 129), `--orange` (#f59e0b), `--orange-rgb` (245, 158, 11), `--red-rgb` (255, 90, 95), `--info` (#3b82f6), `--info-rgb` (59, 130, 246), `--accent-violet-stat` (#8b5cf6) — sonraki tüm task'lar bu token isimlerini kullanır.

- [ ] **Step 1: `:root` bloğundaki token değerlerini güncelle ve yenilerini ekle**

`src/app/globals.css` satır 13-15'i bul:
```css
  --green: #2fbf71;
  --orange: #ff9f2f;
  --red: #ff5a5f;
```
Şununla değiştir:
```css
  --green: #10b981;
  --green-rgb: 16, 185, 129;
  --orange: #f59e0b;
  --orange-rgb: 245, 158, 11;
  --red: #ff5a5f;
  --red-rgb: 255, 90, 95;
  --info: #3b82f6;
  --info-rgb: 59, 130, 246;
  --accent-violet-stat: #8b5cf6;
```

- [ ] **Step 2: Dark tema bloğundaki redundant `--green` override'ını sil**

Satır 55'i bul (`[data-theme="dark"]` bloğu içinde):
```css
  --accent-cyan: #2b7cff;
  --green: #2fbf71;

  --input-bg:
```
Şununla değiştir (sadece `--green: #2fbf71;` satırı silinir, `--green` artık `:root`'tan miras alınır):
```css
  --accent-cyan: #2b7cff;

  --input-bg:
```

- [ ] **Step 3: Derleme doğrulaması**

```bash
npx tsc --noEmit
```
Beklenen: hata yok (sadece CSS değişti, TS etkilenmez — bu adım sadece dev server'ın CSS'i hatasız parse ettiğini görsel olarak teyit etmek için, asıl doğrulama tarayıcıda).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): renk token foundasyonu - green/orange guncellendi, info ve accent-violet-stat eklendi"
```

---

### Task 2: Marketplace Bileşenleri Migrasyonu

**Files:**
- Modify: `src/components/marketplace/ListingCard.tsx`, `src/components/marketplace/MapView.tsx`, `src/components/marketplace/FizibiliteScoreBadge.tsx`

**Interfaces:**
- Consumes: `--green`, `--orange`, `--red`, `--info` (Task 1)

- [ ] **Step 1: `FizibiliteScoreBadge.tsx` skor renk üçlüsünü token'a bağla**

`src/components/marketplace/FizibiliteScoreBadge.tsx:10`:
```ts
const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff5a5f';
```
Şununla değiştir:
```ts
const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';
```

- [ ] **Step 2: `ListingCard.tsx` skor/tip renklerini token'a bağla**

Aynı dosyada (`src/components/marketplace/ListingCard.tsx`) şu satırları bul ve değiştir:

Satır 63: `const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff5a5f';`
→ `const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';`

Satır 64: `const typeColor = listing.type === 'SALE' ? '#3b82f6' : '#10b981';`
→ `const typeColor = listing.type === 'SALE' ? 'var(--info)' : 'var(--green)';`

Satır 108 ve 244 (iki kez, "Yeni" rozeti — `replace_all` ile ikisi de değişir): `background: '#ff5a5f', color: 'white',`
→ `background: 'var(--red)', color: 'white',`

Satır 152 ve 270 (iki kez, değişim yüzdesi rengi — `replace_all`): `color: change >= 0 ? '#10b981' : '#ff5a5f',`
→ `color: change >= 0 ? 'var(--green)' : 'var(--red)',`

Satır 176: `background: 'rgba(16,185,129,.10)', color: '#10b981', border: '1.5px solid rgba(16,185,129,.25)',`
→ `background: 'rgba(var(--green-rgb),.10)', color: 'var(--green)', border: '1.5px solid rgba(var(--green-rgb),.25)',`

Bu değişiklikleri Edit tool ile (her biri benzersiz bağlamla) ya da aşağıdaki sed komutlarıyla uygula:

```bash
cd src/components/marketplace
sed -i "s/score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff5a5f'/score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)'/g" ListingCard.tsx
sed -i "s/listing.type === 'SALE' ? '#3b82f6' : '#10b981'/listing.type === 'SALE' ? 'var(--info)' : 'var(--green)'/" ListingCard.tsx
sed -i "s/background: '#ff5a5f', color: 'white',/background: 'var(--red)', color: 'white',/g" ListingCard.tsx
sed -i "s/color: change >= 0 ? '#10b981' : '#ff5a5f',/color: change >= 0 ? 'var(--green)' : 'var(--red)',/g" ListingCard.tsx
sed -i "s/background: 'rgba(16,185,129,.10)', color: '#10b981', border: '1.5px solid rgba(16,185,129,.25)',/background: 'rgba(var(--green-rgb),.10)', color: 'var(--green)', border: '1.5px solid rgba(var(--green-rgb),.25)',/" ListingCard.tsx
```

- [ ] **Step 3: Sonucu doğrula**

```bash
grep -n "#10b981\|#f59e0b\|#ff5a5f\|#3b82f6" src/components/marketplace/ListingCard.tsx src/components/marketplace/FizibiliteScoreBadge.tsx
```
Beklenen: hiç sonuç dönmemeli (boş çıktı).

- [ ] **Step 4: `MapView.tsx` — DOM kısımları token'a, Leaflet/SVG-string kısımları literal kalır**

`MapView.tsx` Leaflet harita kütüphanesini kullanır; `iconCreateFunction`, `L.divIcon`, `L.circleMarker`, `L.polyline`, `L.polygon` ve `onclick` içindeki **inline HTML string'leri** (template literal içinde yazılan `style="..."` metinleri) tarayıcı DOM'una Leaflet tarafından enjekte edilir ve gerçek CSS custom property çözümlemesi çalışır (bunlar gerçek DOM elemanlarıdır, canvas değildir) — bu yüzden `var(--green)` burada da güvenle kullanılabilir.

Şu satırları değiştir:

Satır 223: `const color = avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ff5a5f';`
Satır 248: `const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff5a5f';`
→ ikisi de: `const color = avgScore >= 80 ? 'var(--green)' : avgScore >= 60 ? 'var(--orange)' : 'var(--red)';` (ve `score` değişkenli karşılığı)

Satır 120: `fontSize: '0.5rem', background: '#f59e0b', color: 'white',`
→ `fontSize: '0.5rem', background: 'var(--orange)', color: 'white',`

Satır 296: `style="flex:1;padding:6px 8px;background:#10b98122;color:#10b981;border:1.5px solid #10b981;...`
→ `style="flex:1;padding:6px 8px;background:rgba(var(--green-rgb),.13);color:var(--green);border:1.5px solid var(--green);...` (geri kalan stil aynı kalır)

Satır 350: `gradient: { 0.2: '#ff5a5f', 0.5: '#f59e0b', 0.8: '#10b981', 1: '#059669' },`
Bu satır **Leaflet.heat kütüphanesinin `gradient` opsiyonudur** — bu obje doğrudan canvas pixel rengi hesaplamasında kullanılır (Leaflet.heat dahili olarak canvas ImageData üretir), `var()` ÇÖZÜLEMEZ. Literal hex kalır, sadece `#059669` (4. stop, koyu yeşil) `#10b981`'in bir tonu olduğu için dokunulmuyor (zaten tutarlı).

Satır 497, 501, 514: `radius: 4, fillColor: '#f59e0b', ...` / `L.polyline(pts, { color: '#f59e0b', ... })` / `color: '#f59e0b', fillColor: '#f59e0b', ...`
Bunlar **Leaflet vektör çizim API'sine (`L.circleMarker`, `L.polyline`, `L.polygon`) geçirilen `color`/`fillColor` opsiyonlarıdır** — Leaflet bunları SVG/Canvas renderer'ına iletir, `var()` ÇÖZÜLEMEZ (DOM elemanı değil, Leaflet'in kendi render katmanı). Literal `#f59e0b` kalır (zaten doğru/kanonik değer).

```bash
cd src/components/marketplace
sed -i "s/avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ff5a5f'/avgScore >= 80 ? 'var(--green)' : avgScore >= 60 ? 'var(--orange)' : 'var(--red)'/" MapView.tsx
sed -i "s/score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff5a5f'/score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)'/" MapView.tsx
sed -i "s/fontSize: '0.5rem', background: '#f59e0b', color: 'white',/fontSize: '0.5rem', background: 'var(--orange)', color: 'white',/" MapView.tsx
sed -i "s/background:#10b98122;color:#10b981;border:1.5px solid #10b981;/background:rgba(var(--green-rgb),.13);color:var(--green);border:1.5px solid var(--green);/" MapView.tsx
```

- [ ] **Step 5: Sonucu doğrula**

```bash
grep -n "#10b981\|#f59e0b\|#ff5a5f" src/components/marketplace/MapView.tsx
```
Beklenen: yalnızca satır 350 (`gradient:` — Leaflet.heat), 497/501/514 (Leaflet vektör API'leri) görünmeli — bunlar bilinçli olarak literal bırakıldı.

- [ ] **Step 6: tsc + eslint**

```bash
npx tsc --noEmit
npx eslint src/components/marketplace/ListingCard.tsx src/components/marketplace/MapView.tsx src/components/marketplace/FizibiliteScoreBadge.tsx
```
Beklenen: temiz.

- [ ] **Step 7: Commit**

```bash
git add src/components/marketplace/ListingCard.tsx src/components/marketplace/MapView.tsx src/components/marketplace/FizibiliteScoreBadge.tsx
git commit -m "fix(marketplace): skor/durum renkleri --green/--orange/--red/--info token'larina baglandi"
```

---

### Task 3: Admin Panel Migrasyonu

**Files:**
- Modify: `src/app/admin/listings/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/offers/page.tsx`, `src/app/admin/analytics/page.tsx`

**Interfaces:**
- Consumes: `--green`, `--green-rgb`, `--orange`, `--orange-rgb`, `--red`, `--info` (Task 1)

- [ ] **Step 1: `admin/listings/page.tsx`**

```bash
cd src/app/admin/listings
sed -i "s/background: 'rgba(245,158,11,.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.25)'/background: 'rgba(var(--orange-rgb),.12)', color: 'var(--orange)', border: '1px solid rgba(var(--orange-rgb),.25)'/" page.tsx
sed -i "s/background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.25)'/background: 'rgba(var(--green-rgb),.12)', color: 'var(--green)', border: '1px solid rgba(var(--green-rgb),.25)'/" page.tsx
sed -i "s/style={{ color: '#10b981', fontSize: '0.75rem', padding: '2px 8px' }}/style={{ color: 'var(--green)', fontSize: '0.75rem', padding: '2px 8px' }}/" page.tsx
sed -i "s/style={{ color: listing.isActive ? '#f59e0b' : '#10b981' }}/style={{ color: listing.isActive ? 'var(--orange)' : 'var(--green)' }}/" page.tsx
```

- [ ] **Step 2: `admin/users/page.tsx`**

```bash
cd ../users
sed -i "s/{ value: 'USER', label: 'Kullanıcı', color: '#10b981' }/{ value: 'USER', label: 'Kullanıcı', color: 'var(--green)' }/" page.tsx
sed -i "s/{ value: 'ARSA_SAHIBI', label: 'Arsa Sahibi', color: '#f59e0b' }/{ value: 'ARSA_SAHIBI', label: 'Arsa Sahibi', color: 'var(--orange)' }/" page.tsx
sed -i "s/{ value: 'MUTEAHHIT', label: 'Müteahhit', color: '#3b82f6' }/{ value: 'MUTEAHHIT', label: 'Müteahhit', color: 'var(--info)' }/" page.tsx
sed -i "s/{ value: 'ADMIN', label: 'Admin', color: '#ef4444' }/{ value: 'ADMIN', label: 'Admin', color: 'var(--red)' }/" page.tsx
sed -i "s/: { background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.25)' }/: { background: 'rgba(var(--green-rgb),.12)', color: 'var(--green)', border: '1px solid rgba(var(--green-rgb),.25)' }/" page.tsx
sed -i "s/background: user.isVerified ? '#10b981' : '#30363d',/background: user.isVerified ? 'var(--green)' : '#30363d',/" page.tsx
sed -i "s/color: user.plan === 'PRO' ? '#f59e0b' : 'var(--muted)',/color: user.plan === 'PRO' ? 'var(--orange)' : 'var(--muted)',/" page.tsx
sed -i "s/color: user.isBanned ? '#10b981' : '#ef4444',/color: user.isBanned ? 'var(--green)' : 'var(--red)',/" page.tsx
sed -i "s/? { background: 'rgba(239,68,68,.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)' }/? { background: 'rgba(var(--red-rgb),.12)', color: 'var(--red)', border: '1px solid rgba(var(--red-rgb),.25)' }/" page.tsx
```

- [ ] **Step 3: `admin/offers/page.tsx`**

```bash
cd ../offers
sed -i "s/if (s === 'ACCEPTED') return { background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.25)' };/if (s === 'ACCEPTED') return { background: 'rgba(var(--green-rgb),.12)', color: 'var(--green)', border: '1px solid rgba(var(--green-rgb),.25)' };/" page.tsx
sed -i "s/return { background: 'rgba(245,158,11,.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.25)' };/return { background: 'rgba(var(--orange-rgb),.12)', color: 'var(--orange)', border: '1px solid rgba(var(--orange-rgb),.25)' };/" page.tsx
```

- [ ] **Step 4: `admin/analytics/page.tsx`**

```bash
cd ../analytics
sed -i "s/USER: '#10b981',/USER: 'var(--green)',/" page.tsx
sed -i "s/ARSA_SAHIBI: '#f59e0b',/ARSA_SAHIBI: 'var(--orange)',/" page.tsx
sed -i "s/MUTEAHHIT: '#3b82f6',/MUTEAHHIT: 'var(--info)',/" page.tsx
sed -i "s/value: \`%\${offerRate}\`, color: '#10b981',/value: \`%\${offerRate}\`, color: 'var(--green)',/" page.tsx
sed -i "s/color: '#f59e0b', width: String/color: 'var(--orange)', width: String/" page.tsx
sed -i "s/color: '#3b82f6', width: conversionRate/color: 'var(--info)', width: conversionRate/" page.tsx
```

- [ ] **Step 5: Sonucu doğrula (4 dosyada da stray hex kalmamalı)**

```bash
cd "C:\Users\emre\Desktop\arsabil-main"
grep -n "#10b981\|#f59e0b\|#ef4444\|#3b82f6" src/app/admin/listings/page.tsx src/app/admin/users/page.tsx src/app/admin/offers/page.tsx src/app/admin/analytics/page.tsx
```
Beklenen: boş çıktı.

- [ ] **Step 6: tsc + eslint**

```bash
npx tsc --noEmit
npx eslint src/app/admin/listings/page.tsx src/app/admin/users/page.tsx src/app/admin/offers/page.tsx src/app/admin/analytics/page.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/
git commit -m "fix(admin): durum/rol rozetleri renk token'larina baglandi"
```

---

### Task 4: Dashboard ve Profil Sayfaları Migrasyonu

**Files:**
- Modify: `src/app/dashboard/page.tsx`, `src/app/dashboard/page.module.css`, `src/app/dashboard/profile/page.tsx`, `src/app/dashboard/profile/profile.module.css`, `src/app/profile/[userId]/page.module.css`

**Interfaces:**
- Consumes: `--green`, `--orange`, `--info`, `--accent-violet-stat` (Task 1)

- [ ] **Step 1: `dashboard/page.tsx` — `STAT_CONFIG`'i rgb-tuple'a taşı (hexToRgb `#rrggbb` bekliyor, `var()` veremez)**

`hexToRgb(hex)` fonksiyonu (`src/app/dashboard/page.tsx:185-190`) `hex.slice(1,3)` ile literal `#rrggbb` parse ediyor — `'var(--info)'` geçirilirse `NaN` üretir. Bu yüzden `color` alanı `var()` olamaz; bunun yerine `STAT_CONFIG`'e doğrudan rgb-tuple ekleyip `hexToRgb` çağrısını kaldırıyoruz.

`src/app/dashboard/page.tsx:39-44`:
```ts
const STAT_CONFIG = [
  { key: 'reportCount',        label: 'Hesaplama',       color: '#3b82f6' },
  { key: 'activeListingCount', label: 'Aktif İlan',       color: '#10a34a' },
  { key: 'offerCount',         label: 'Teklif',          color: '#f59e0b' },
  { key: 'unreadMessageCount', label: 'Okunmamış Mesaj', color: '#8b5cf6' },
] as const
```
Şununla değiştir:
```ts
const STAT_CONFIG = [
  { key: 'reportCount',        label: 'Hesaplama',       rgb: '59, 130, 246' },   // --info
  { key: 'activeListingCount', label: 'Aktif İlan',       rgb: '16, 185, 129' },  // --green
  { key: 'offerCount',         label: 'Teklif',          rgb: '245, 158, 11' },  // --orange
  { key: 'unreadMessageCount', label: 'Okunmamış Mesaj', rgb: '139, 92, 246' },  // --accent-violet-stat
] as const
```

`src/app/dashboard/page.tsx:90-91` (render bloğu):
```tsx
        {STAT_CONFIG.map(({ key, label, color }) => (
          <div key={key} className={styles.statCard} style={{ '--card-accent-rgb': hexToRgb(color) } as React.CSSProperties}>
```
Şununla değiştir:
```tsx
        {STAT_CONFIG.map(({ key, label, rgb }) => (
          <div key={key} className={styles.statCard} style={{ '--card-accent-rgb': rgb } as React.CSSProperties}>
```

`src/app/dashboard/page.tsx:185-190`'daki artık kullanılmayan `hexToRgb` fonksiyonunu sil:
```ts
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
```
Bu fonksiyon tamamen silinir (artık hiçbir çağrı yeri yok).

- [ ] **Step 2: `dashboard/page.module.css` durum renkleri**

```bash
cd src/app/dashboard
sed -i "s/.statusPending  { background: rgba(245,158,11,.12); color: #f59e0b; }/.statusPending  { background: rgba(var(--orange-rgb),.12); color: var(--orange); }/" page.module.css
sed -i "s/.statusAccepted { background: rgba(16,163,74,.12);  color: #10a34a; }/.statusAccepted { background: rgba(var(--green-rgb),.12);  color: var(--green); }/" page.module.css
```

- [ ] **Step 3: `dashboard/profile/page.tsx` ve `profile.module.css`**

```bash
cd profile
sed -i "s/background: savedPrefs ? '#10b981' : 'var(--primary)', color: 'white',/background: savedPrefs ? 'var(--green)' : 'var(--primary)', color: 'white',/" page.tsx
sed -i "s/color: #10a34a;/color: var(--green);/" profile.module.css
```

- [ ] **Step 4: `profile/[userId]/page.module.css`**

```bash
cd ../../profile/\[userId\]
sed -i "s/color: #10a34a;/color: var(--green);/" page.module.css
```

- [ ] **Step 5: Sonucu doğrula**

```bash
cd "C:\Users\emre\Desktop\arsabil-main"
grep -rn "#10a34a\|#3b82f6\|#8b5cf6" src/app/dashboard/ src/app/profile/
```
Beklenen: boş (ya da yalnızca Step 1'in `hexToRgb` dalı uygulandıysa, bilinçli literal `#`'ler — `STAT_CONFIG` içindeki `color`/`rgb` alanları).

- [ ] **Step 6: tsc + eslint**

```bash
npx tsc --noEmit
npx eslint src/app/dashboard/ src/app/profile/
```

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/ src/app/profile/
git commit -m "fix(dashboard): istatistik kart renkleri ve durum rozetleri token'lara baglandi"
```

---

### Task 5: Chart Bileşenleri Migrasyonu (Canvas İstisnası Uygulanır)

**Files:**
- Modify: `src/components/charts/PriceEvaluationChart.tsx` (DOM tabanlı, `var()` kullanılır), `src/components/charts/RiskGaugeChart.tsx` ve `src/components/charts/CostBreakdownChart.tsx` (Chart.js/canvas tabanlı, literal hex kalır ama kanonik değere hizalanır)

**Interfaces:**
- Consumes: `--green`, `--orange`, `--red` (Task 1, yalnızca PriceEvaluationChart için)

- [ ] **Step 1: `PriceEvaluationChart.tsx` — DOM tabanlı, token'a bağla**

```bash
cd src/components/charts
sed -i "s/let color = '#10b981';/let color = 'var(--green)';/" PriceEvaluationChart.tsx
sed -i "s/color = '#ef4444'; \/\/ Pahalı/color = 'var(--red)'; \/\/ Pahalı/" PriceEvaluationChart.tsx
sed -i "s/color = '#f59e0b'; \/\/ Adil/color = 'var(--orange)'; \/\/ Adil/" PriceEvaluationChart.tsx
sed -i "s/background: 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)'/background: 'linear-gradient(to right, var(--green), var(--orange), var(--red))'/" PriceEvaluationChart.tsx
```

- [ ] **Step 2: `RiskGaugeChart.tsx` — Chart.js canvas, literal kalır ama `#ef4444`→`#ff5a5f` hizalanır**

`src/components/charts/RiskGaugeChart.tsx:16` (Canvas'a `backgroundColor` olarak geçiyor, `var()` çözülmez — sadece kanonik kırmızıya hizalanır):
```ts
let color = '#ef4444'; // Red (Düşük)
```
→
```ts
let color = '#ff5a5f'; // Red (Düşük) — Chart.js canvas var() cozemez, --red'in literal degeri
```

- [ ] **Step 3: `CostBreakdownChart.tsx` — Chart.js canvas, literal kalır**

`src/components/charts/CostBreakdownChart.tsx:73`:
```ts
{ label: 'Risk', color: '#ef4444', value: risk },
```
→
```ts
{ label: 'Risk', color: '#ff5a5f', value: risk }, // --red'in literal degeri (canvas var() cozemez)
```

*Not: satır 36-37'deki `backgroundColor`/`borderColor` dizileri ve satır 70-72'deki diğer label'lar (`İnşaat`/`Arsa`/`Kâr`) zaten kanonik değerlerle (`#3b82f6`, `#10b981`, `#f59e0b`) eşleşiyor — dokunulmuyor.*

- [ ] **Step 4: Sonucu doğrula**

```bash
cd "C:\Users\emre\Desktop\arsabil-main"
grep -n "#10b981\|#f59e0b\|#ef4444" src/components/charts/PriceEvaluationChart.tsx
```
Beklenen: boş.

```bash
grep -n "#ef4444" src/components/charts/RiskGaugeChart.tsx src/components/charts/CostBreakdownChart.tsx
```
Beklenen: boş (her ikisi de `#ff5a5f`'e çevrildi).

- [ ] **Step 5: tsc + eslint**

```bash
npx tsc --noEmit
npx eslint src/components/charts/
```

- [ ] **Step 6: Commit**

```bash
git add src/components/charts/
git commit -m "fix(charts): risk/fiyat renkleri kanonik token degerlerine hizalandi (canvas istisnasiyla)"
```

---

### Task 6: Kalan Dosyalar (Navbar, Listing Detay, E-posta, PDF, Hesapla)

**Files:**
- Modify: `src/components/layout/Navbar.tsx`, `src/app/listing/[id]/page.tsx`, `src/lib/email.ts`, `src/lib/pdf/ReportDocument.tsx`, `src/app/hesapla/page.tsx`, `src/app/hesapla/page.module.css`, `src/app/page.module.css`

**Interfaces:**
- Consumes: `--green`, `--orange`, `--red`, `--info` (Task 1)

- [ ] **Step 1: `Navbar.tsx` — mock bildirim verisi renkleri**

```bash
cd src/components/layout
sed -i "s/color: '#10b981' },/color: 'var(--green)' },/" Navbar.tsx
sed -i "s/color: '#f59e0b' },/color: 'var(--orange)' },/" Navbar.tsx
sed -i "s/color: '#3b82f6' },/color: 'var(--info)' },/" Navbar.tsx
```

- [ ] **Step 2: `listing/[id]/page.tsx` — skor ve kâr renkleri**

```bash
cd "../../app/listing/[id]"
sed -i "s/score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff5a5f'/score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)'/" page.tsx
sed -i "s/'+%34 (▲+1.76M TL)', '#10b981'/'+%34 (▲+1.76M TL)', 'var(--green)'/" page.tsx
sed -i "s/\`+\${listing.changePercent}%\`, '#10b981'/\`+\${listing.changePercent}%\`, 'var(--green)'/" page.tsx
sed -i "s/marginTop: 10, padding: '10px 24px', background: '#10b981', color: 'white',/marginTop: 10, padding: '10px 24px', background: 'var(--green)', color: 'white',/" page.tsx
sed -i "s/<div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>/<div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--green)' }}>/" page.tsx
sed -i "s/padding: '11px', background: 'rgba(16,185,129,.15)', color: '#10b981',/padding: '11px', background: 'rgba(var(--green-rgb),.15)', color: 'var(--green)',/" page.tsx
```

- [ ] **Step 3: `lib/email.ts` — HTML e-posta şablonları (gerçek e-posta istemcileri CSS var() desteklemez!)**

E-posta HTML'i tarayıcıda değil, e-posta istemcilerinde (Gmail, Outlook vb.) render edilir — bunlar CSS custom property'leri **güvenilir biçimde desteklemez**. `src/lib/email.ts` içindeki `#10b981` literal kalır, değiştirilmez (zaten kanonik değer).

- [ ] **Step 4: `lib/pdf/ReportDocument.tsx` — PDF render motoru (react-pdf, DOM değil!)**

`@react-pdf/renderer` kendi render motorunu kullanır (DOM/CSS değil) — CSS custom property desteklemez. Bu dosyadaki `amber: '#f59e0b'` (satır 37) literal kalır, değiştirilmez (zaten kanonik değer).

- [ ] **Step 5: `hesapla/page.tsx` — iksa rengi**

`src/app/hesapla/page.tsx:25`:
```ts
{ bg: 'rgba(251,146,60,0.1)', border: '#fb923c', text: '#fb923c' },
```
→
```ts
{ bg: 'rgba(var(--orange-rgb),0.1)', border: 'var(--orange)', text: 'var(--orange)' },
```

*Not: satır 342/477'deki `#4ade80` (Lüks ikonunun küçük yeşil onay rozeti, SVG `fill` attribute'u içinde) dokunulmuyor — saf dekoratif bir SVG detayı, semantik bir durum/skor rengi değil.*

```bash
cd "C:\Users\emre\Desktop\arsabil-main\src\app\hesapla"
sed -i "s/{ bg: 'rgba(251,146,60,0.1)', border: '#fb923c', text: '#fb923c' },/{ bg: 'rgba(var(--orange-rgb),0.1)', border: 'var(--orange)', text: 'var(--orange)' },/" page.tsx
```

- [ ] **Step 6: `hesapla/page.module.css` — yeşil gradient**

`src/app/hesapla/page.module.css:863`:
```css
    background: linear-gradient(135deg, var(--green) 0%, #229954 100%);
```
→
```css
    background: linear-gradient(135deg, var(--green) 0%, #0d9668 100%);
```
*(`#229954`, eski `--green` (`#2fbf71`) ile uyumlu koyu tondu; yeni `--green` (`#10b981`) ile daha uyumlu koyu ton `#0d9668` — `#10b981`'in ~15% koyultulmuş hali.)*

- [ ] **Step 7: `page.module.css` — hero gradient kırmızı stop'u**

`src/app/page.module.css:75`:
```css
  background: linear-gradient(100deg, var(--primary) 0%, #ef4444 100%);
```
→
```css
  background: linear-gradient(100deg, var(--primary) 0%, var(--red) 100%);
```

- [ ] **Step 8: Sonucu doğrula**

```bash
cd "C:\Users\emre\Desktop\arsabil-main"
grep -n "#10b981\|#f59e0b\|#3b82f6" src/components/layout/Navbar.tsx "src/app/listing/[id]/page.tsx"
grep -n "#fb923c" src/app/hesapla/page.tsx
grep -n "#229954" src/app/hesapla/page.module.css
grep -n "#ef4444" src/app/page.module.css
```
Beklenen: tümü boş.

- [ ] **Step 9: tsc + eslint**

```bash
npx tsc --noEmit
npx eslint src/components/layout/Navbar.tsx "src/app/listing/[id]/page.tsx" src/app/hesapla/ src/app/page.module.css
```

- [ ] **Step 10: Commit**

```bash
git add src/components/layout/Navbar.tsx "src/app/listing/[id]/page.tsx" src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/page.module.css
git commit -m "fix: kalan renk strayleri (navbar/listing-detay/hesapla/hero gradient) token'lara baglandi"
```

---

### Task 7: Görsel Regresyon Doğrulaması (Tüm Migrasyon Sonrası)

**Files:** Yok (yalnızca doğrulama)

**Interfaces:**
- Consumes: Task 1-6'nın tüm değişiklikleri

- [ ] **Step 1: Dev server'ı temiz başlat**

```bash
rm -rf .next
npm run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```
Beklenen: `200`

- [ ] **Step 2: Playwright ile gerçek-scroll karşılaştırma (landing, marketplace, dashboard, admin)**

`/tmp/verify-colors.js` oluştur:
```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 300) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/landing-after-migration.png', fullPage: true });
  console.log('done');
  await browser.close();
})();
```
Çalıştır: `node /tmp/verify-colors.js`
Beklenen: ekran görüntüsünde skor rozetleri, bento kartları ve hero gradient'i önceki haliyle (renk tonu olarak) **bire bir aynı** görünmeli — bu refactor görsel olarak no-op olmalı (sadece kaynak kodda token kullanımı arttı).

- [ ] **Step 3: Mevcut test paketini çalıştır (regresyon yok mu?)**

```bash
npx jest --no-coverage
```
Beklenen: 65/65 geçmeye devam etmeli (bu task hiçbir `.ts` mantığına dokunmadı, yalnızca renk string'leri — ama yine de doğrulanmalı).

---

### Task 8: Framer Motion Kurulumu + Landing Page Reveal Animasyonları

**Files:**
- Modify: `package.json` (yeni bağımlılık), `src/app/page.tsx` (StatsStrip ve FeaturesGrid bileşenleri)

**Interfaces:**
- Produces: `motion.div` tabanlı `StatsStrip` ve `FeaturesGrid` — `IntersectionObserver`/`setTimeout` mantığı kaldırılır.

- [ ] **Step 1: Framer Motion'ı kur**

```bash
npm install framer-motion
```

- [ ] **Step 2: Kurulumu doğrula**

```bash
grep -n "framer-motion" package.json
```
Beklenen: `"framer-motion": "^..."` satırı görünmeli.

- [ ] **Step 3: `StatsStrip` bileşenini `motion` ile yeniden yaz**

`src/app/page.tsx` başına import ekle (satır 4 civarı, `import styles from './page.module.css';` altına):
```tsx
import { motion } from 'framer-motion';
```

`StatsStrip` fonksiyonunu (mevcut `useRef`/`useState`/`IntersectionObserver` bloğu, ~satır 38-60) bul ve şununla değiştir:
```tsx
/* ── Stats section ── */
function StatsStrip() {
  const c1 = useCounter(12400, 1600, true);
  const c2 = useCounter(3, 800, true);
  const c3 = useCounter(97, 1200, true);
  const c4 = useCounter(500, 1400, true);

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className={styles.statsStrip}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={containerVariants}
    >
      <motion.div className={styles.statItem} variants={itemVariants}>
        <span className={styles.statVal}>{c1.toLocaleString('tr-TR')}+</span>
        <span className={styles.statLabel}>Tamamlanan Analiz</span>
      </motion.div>
      <motion.div className={styles.statItem} variants={itemVariants}>
        <span className={styles.statVal}>~{c2}sn</span>
        <span className={styles.statLabel}>Ortalama Hesaplama</span>
      </motion.div>
      <motion.div className={styles.statItem} variants={itemVariants}>
        <span className={styles.statVal}>%{c3}</span>
        <span className={styles.statLabel}>Model Doğruluğu</span>
      </motion.div>
      <motion.div className={styles.statItem} variants={itemVariants}>
        <span className={styles.statVal}>{c4}+</span>
        <span className={styles.statLabel}>Kayıtlı Müteahhit</span>
      </motion.div>
    </motion.div>
  );
}
```

*Not: `useCounter(end, duration, active)` hook'u zaten `active` parametresiyle çalışıyor — `whileInView`'in `viewport.once: true` davranışı sayesinde bileşen yalnızca scroll'da göründüğünde mount edilir gibi davranmaz (React component her zaman mount'tur), bu yüzden `active=true` sabit geçilir ve sayaç animasyonu component mount olur olmaz başlar. `whileInView` yalnızca opacity/y geçişini tetikler. Bu, eski davranışla (IntersectionObserver `0.4` threshold'unda tetiklenme) görsel olarak eşdeğerdir çünkü `viewport.amount: 0.4` aynı eşiği kullanır.*

- [ ] **Step 4: `FeaturesGrid` bileşenini `motion` ile yeniden yaz**

`FeaturesGrid` fonksiyonunu (mevcut `useRef`/`IntersectionObserver`/`setTimeout` bloğu, ~satır 139-170) bul ve şununla değiştir:
```tsx
/* ── Features bento grid ── */
function FeaturesGrid() {
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className={styles.bentoGrid}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={containerVariants}
    >
      {FEATURES.map((f) => (
        <motion.div
          key={f.num}
          variants={cardVariants}
          className={`${styles.bentoCard} ${styles[`accent${f.accent.charAt(0).toUpperCase() + f.accent.slice(1)}`]}`}
          data-span={f.span}
          onMouseMove={onMouseMove}
        >
          <div className={styles.spotlight} />
          <span className={styles.bigDeco}>{f.big}</span>
          <div className={styles.bentoTop}>
            <span className={styles.bentoTag}>{f.tag}</span>
            <span className={styles.bentoNum}>{f.num}</span>
          </div>
          <div className={styles.bentoIcon}>{f.icon}</div>
          <h3 className={styles.bentoTitle}>{f.title}</h3>
          <p className={styles.bentoDesc}>{f.desc}</p>
          {'badge' in f && (
            <div className={styles.bentoBadge}>{f.badge}</div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

- [ ] **Step 5: Artık kullanılmayan `bentoVisible`/`statVisible` CSS sınıflarının referanslarını temizle (opsiyonel — CSS dosyasında tanımlı kalabilirler, ölü kod ama zararsız)**

```bash
grep -n "statVisible\|bentoVisible" src/app/page.tsx
```
Beklenen: boş (Step 3-4'te bu className referansları zaten kaldırıldı, `motion.div`'in `variants` prop'u görevi devraldı).

- [ ] **Step 6: tsc + eslint**

```bash
npx tsc --noEmit
npx eslint src/app/page.tsx
```

- [ ] **Step 7: Tarayıcıda manuel doğrulama**

```bash
rm -rf .next && npm run dev > /tmp/dev2.log 2>&1 &
sleep 6
```
Playwright ile gerçek scroll testi (Task 7 Step 2'deki script'i tekrar çalıştır) — Stats Strip ve Bento Grid'in hâlâ doğru render olduğunu, ayrıca artık fade+slide-up animasyonuyla belirdiğini doğrula.

- [ ] **Step 8: `prefers-reduced-motion` testi**

```js
// /tmp/verify-reduced-motion.js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const visible = await page.locator('text=Tamamlanan Analiz').first().isVisible();
  console.log('Stats visible with reduced motion (no scroll):', visible);
  await browser.close();
})();
```
Çalıştır: `node /tmp/verify-reduced-motion.js`
Beklenen: `true` — Framer Motion `prefers-reduced-motion` algıladığında içeriği animasyonsuz ama **görünür** render eder (built-in davranış), bu eski elle yazılmış IntersectionObserver koduna göre bir a11y iyileştirmesidir (eskisi reduced-motion'ı hiç desteklemiyordu).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/app/page.tsx
git commit -m "feat(landing): reveal animasyonlari framer-motion'a tasindi, prefers-reduced-motion destegi eklendi"
```

---

### Task 9: CTA Buton Mikro-Etkileşimleri

**Files:**
- Modify: `src/app/page.tsx` (hero CTA'ları, CTA section butonu)

**Interfaces:**
- Consumes: Task 8'deki `motion` import'u

- [ ] **Step 1: Hero CTA butonlarını `motion(Link)` ile sar**

`src/app/page.tsx` içindeki hero CTA bloğunu bul:
```tsx
          <div className={styles.heroCta}>
            <Link href="/hesapla" className={styles.primaryBtn}>
              Hemen Hesapla
            </Link>
            <Link href="/marketplace" className={styles.secondaryBtn}>
              Pazar Yerine Git
            </Link>
          </div>
```
Şununla değiştir:
```tsx
          <div className={styles.heroCta}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-block' }}>
              <Link href="/hesapla" className={styles.primaryBtn}>
                Hemen Hesapla
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-block' }}>
              <Link href="/marketplace" className={styles.secondaryBtn}>
                Pazar Yerine Git
              </Link>
            </motion.div>
          </div>
```

- [ ] **Step 2: CTA section butonunu (sayfa sonu, "Ücretsiz Hesapla") aynı şekilde sar**

```tsx
        <Link href="/hesapla" className={styles.ctaBtn}>
          Ücretsiz Hesapla
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
```
Şununla değiştir:
```tsx
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-block' }}>
          <Link href="/hesapla" className={styles.ctaBtn}>
            Ücretsiz Hesapla
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </motion.div>
```

- [ ] **Step 3: tsc + eslint**

```bash
npx tsc --noEmit
npx eslint src/app/page.tsx
```

- [ ] **Step 4: Manuel tarayıcı testi**

Dev server çalışır durumdayken `http://localhost:3000/` adresine git, hero butonlarının üzerine gelindiğinde hafif büyüme (scale 1.02) ve tıklanınca küçülme (scale 0.98) hissi verdiğini gözle doğrula.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): CTA butonlarina framer-motion ile spring-physics hover/tap geri bildirimi eklendi"
```

---

### Task 10: Final Doğrulama

**Files:** Yok (yalnızca doğrulama)

- [ ] **Step 1: Tam komut paketi**

```bash
npx tsc --noEmit
npx eslint .
npx jest --no-coverage
npm run build
```
Beklenen: hepsi temiz, jest 65/65.

- [ ] **Step 2: Görsel son kontrol — gerçek scroll ile tüm anahtar sayfalar**

Task 7 Step 2'deki Playwright script'ini marketplace, dashboard, admin/listings için de tekrarla (URL'leri değiştirerek), her birinde skor/durum renklerinin görsel olarak migrasyon öncesiyle aynı kaldığını, hero/bento'nun ise artık animasyonlu belirdiğini doğrula.

- [ ] **Step 3: Vaka çalışmasını güncelle**

`docs/case-study-tema-restorasyonu-2026-06-30.md` dosyasına kısa bir takip notu ekle (renk token konsolidasyonu ve Framer Motion pilotu tamamlandı, hangi commit'lerle).

- [ ] **Step 4: Commit**

```bash
git add docs/case-study-tema-restorasyonu-2026-06-30.md
git commit -m "docs: renk token konsolidasyonu + framer motion pilotu tamamlandi"
```
