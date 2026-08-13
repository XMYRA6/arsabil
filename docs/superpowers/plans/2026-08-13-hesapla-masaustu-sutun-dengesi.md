# Hesapla Masaüstü Sütun Dengesizliği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/hesapla` masaüstü düzeninde sol sütunun ("Proje Bilgileri") aşağı
doğru çok uzaması ve sağ tarafın (`Hesap Sonuçları`/`Hesap Özeti`) altında
büyük bir boşluk kalması sorununu, Piyasa Karşılaştırması + İksa Masrafı +
Müteahhit Kazancı alanlarını zaten var olan ama boş bir grid satırına
yerleşen yeni bir "Gelişmiş Ayarlar" paneline taşıyarak çözer.

**Architecture:** `src/app/hesapla/page.tsx`'in masaüstü dalında (`aside
className={styles.leftSidebar}`) 3 ayar grubu kaldırılır, kalan grup
(`BirimMaliyetField`) sadeleşir. Aynı 3 alan, `AdvancedSettingsSections.tsx`'in
paylaşılan `RiskCostFields`/`MarketField` bileşenleri üzerinden, `rightGrid`
grid container'ının zaten tanımlı (`grid-template-rows: max-content 1fr`)
ama kullanılmayan 2. satırına, yeni bir tam-genişlik panel olarak eklenir.
`page.module.css`'e üç yeni class eklenir; `.rightGrid`'in `1fr` satırı
`max-content`'e çevrilir (panel içeriği kadar yer kaplasın, yapay gerilmesin).

**Tech Stack:** Next.js 16 (App Router), React 19, CSS Modules, Jest +
React Testing Library, TypeScript, Playwright (doğrulama için).

## Global Constraints

- Motor/hesaplama mantığı, state, davranış DEĞİŞMEZ — yalnızca hangi JSX'in
  nerede render edildiği değişir (spec: "Kapsam").
- Mobil `/hesapla` (`GirdiKarti`/`HesaplaMobile`) bu planda HİÇ değişmez.
- `mainPanel`/`summaryPanel`'in kendi iç içeriği/sırası değişmez.
- Yeni panel `mainPanel`/`summaryPanel` ile AYNI kart dilini kullanır
  (`--border`, `--radius`, `--card-bg`) — yeni bir görsel dil icat edilmez.
- Pixel-perfect sol/sağ yükseklik eşitliği GARANTİ EDİLMİYOR (spec: "Açık
  risk") — amaç gözle büyük boşluk kalmaması.

---

## Dosya Yapısı

- **Modify:** `src/app/hesapla/page.tsx` — import satırı, sol sidebar'dan 3
  grup çıkarılır, `rightGrid` içine yeni panel eklenir.
- **Modify:** `src/app/hesapla/page.module.css` — `.advancedPanel`/
  `.advancedPanelTitle`/`.advancedPanelCols` class'ları eklenir, `.rightGrid`
  satır tanımı değişir, `.leftSidebar,.mainPanel,.summaryPanel` ve
  `.sidebarTitle,.mainPanelTitle,.summaryPanelTitle` selector grupları
  genişletilir.
- **Modify:** `src/app/hesapla/page.test.tsx` — yeni davranış testleri.
- Yeni dosya YOK — `RiskCostFields`/`MarketField`/`BirimMaliyetField` zaten
  `AdvancedSettingsSections.tsx`'te var, yalnızca çağrıldıkları yer değişiyor.

---

### Task 1: Gelişmiş Ayarlar alanlarını yeni panele taşı

**Files:**
- Modify: `src/app/hesapla/page.tsx:22` (import), `:708-761` (sol sidebar
  grupları), `:943-945` (yeni panelin ekleneceği yer, `</aside>` ile
  `</section>` arası)
- Modify: `src/app/hesapla/page.module.css:85-96` (kart-base selector),
  `:99-108` (title selector), `:816-822` (`.rightGrid`), yeni class'lar
  dosyanın sonuna eklenir
- Test: `src/app/hesapla/page.test.tsx`

**Interfaces:**
- Consumes: `RiskCostFields`/`MarketField`/`BirimMaliyetField` bileşenleri
  ve prop tipleri (`RiskCostProps`/`MarketFieldProps`/`BirimMaliyetFieldProps`),
  `src/app/hesapla/AdvancedSettingsSections.tsx`'te TANIMLI, DEĞİŞTİRİLMİYOR.
  `page.tsx`'in kendi state'i (`iksaMode`, `setIksaMode`, `iksaPercentage`,
  `setIksaPercentage`, `iksaManualTL`, `setIksaManualTL`, `builderProfit`,
  `setBuilderProfit`, `profitLevels`, `manualMarketPrice`,
  `setManualMarketPrice`, `globalUnitPrice`, `birimMaliyetKaynagi`,
  `handleGlobalUnitPriceChange`) zaten var, hiçbiri değişmiyor.
- Produces: `page.module.css`'te `.advancedPanel`/`.advancedPanelTitle`/
  `.advancedPanelCols` class'ları — bu plan dışında başka bir tüketicisi yok.

- [ ] **Step 1: Başarısız testleri yaz**

`src/app/hesapla/page.test.tsx`'in sonuna, mevcut `describe` bloklarının
ALTINA yeni bir blok ekle (dosyanın üstündeki `jest.mock`/`viewportKur`/
`beforeEach` zaten mevcut, tekrar yazma):

```tsx
describe('/hesapla — masaüstü Gelişmiş Ayarlar paneli (sütun dengesi)', () => {
    it('İksa Masrafı ve Müteahhit Kazancı artık sol "Proje Bilgileri" sidebar\'ında DEĞİL', () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const sidebar = screen.getByText('Proje Bilgileri').closest('aside')!
        expect(within(sidebar).queryByText('İksa Masrafı')).toBeNull()
        expect(within(sidebar).queryByText('Müteahhit Kazancı')).toBeNull()
        expect(within(sidebar).queryByText('Piyasa Analizi')).toBeNull()
    })

    it('Birim İnşaat Maliyeti sol sidebar\'da KALIR', () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const sidebar = screen.getByText('Proje Bilgileri').closest('aside')!
        expect(within(sidebar).getByText('Birim inşaat maliyeti')).toBeInTheDocument()
    })

    it('"Gelişmiş Ayarlar" paneli İksa Masrafı + Müteahhit Kazancı + Piyasa Karşılaştırması içerir', () => {
        viewportKur(true)
        render(<HesaplaPage />)
        // `getByText('Gelişmiş Ayarlar')` başlık div'inin KENDİSİNİ döner
        // (`.advancedPanelTitle` de bir div) — `.closest('div')` bu durumda
        // kendisini döner, kardeş `.advancedPanelCols`'u KAPSAMAZ. CSS
        // module'ler jest'te `identity-obj-proxy` ile literal class adına
        // eşleniyor (`jest.config.js:7`), bu yüzden `.advancedPanel`
        // gerçek bir CSS selector olarak çalışır.
        const panel = screen.getByText('Gelişmiş Ayarlar').closest('.advancedPanel')!
        expect(within(panel).getByText('İksa Masrafı')).toBeInTheDocument()
        expect(within(panel).getByText('Müteahhit Kazancı')).toBeInTheDocument()
        expect(within(panel).getByText('Yaklaşık Piyasa Fiyatı')).toBeInTheDocument()
    })

    it('yeni konumda İksa Masrafı "Yüzde" seçilince yüzde input\'u açılır (kablolama sağlam)', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        const panel = screen.getByText('Gelişmiş Ayarlar').closest('.advancedPanel')!
        await user.click(within(panel).getByText('Yüzde'))
        expect(within(panel).getByRole('spinbutton')).toBeInTheDocument()
    })
})
```

`within` import'u dosyanın üstündeki `@testing-library/react` import'una
eklenmeli: `import { act, render, screen, within } from '@testing-library/react'`.

- [ ] **Step 2: Testleri çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/hesapla/page.test.tsx -t "Gelişmiş Ayarlar paneli"`
Expected: 4 test de FAIL — ya "Gelişmiş Ayarlar" metni hiç bulunamaz (henüz
yok) ya da alanlar hâlâ eski sidebar konumunda bulunur.

- [ ] **Step 3: `page.module.css`'e yeni class'ları ekle**

`.leftSidebar,\n.mainPanel,\n.summaryPanel {` (satır 85-87) bloğunu
`.advancedPanel`'i de kapsayacak şekilde genişlet:

```css
.leftSidebar,
.mainPanel,
.summaryPanel,
.advancedPanel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow2);
    overflow: hidden;
    color: var(--text);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
}
```

Hemen altındaki title selector'ı (satır 99-101) da genişlet:

```css
.sidebarTitle,
.mainPanelTitle,
.summaryPanelTitle,
.advancedPanelTitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 10px;
    font-weight: 800;
    color: var(--card-title);
}
```

`.rightGrid` (satır 816-822) — `1fr` satırı `max-content`'e çevrilir:

```css
.rightGrid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
    grid-template-rows: max-content max-content;
    gap: 14px;
    align-items: stretch;
}
```

Dosyanın SONUNA (mevcut son kuraldan sonra) yeni class'ları ekle:

```css
/* =========================================================================
   ADVANCED PANEL — rightGrid'in eskiden bos olan 2. satirini doldurur
   ========================================================================= */
.advancedPanel {
    grid-column: 1 / -1;
    padding: 0 0 16px;
}

.advancedPanelCols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
    padding: 0 16px;
}

/* `.drawerRow` (AdvancedSettingsSections.tsx icinde RiskCostFields/
   MarketField'in kullandigi) dikey-yigin baglami icin tasarlandi
   (alt-cizgi + son-cocukta cizgisiz). Bu panelde YAN YANA 3 sutun
   olarak render oluyorlar — alt cizgi hepsinde stray bir cizgi gibi
   kalirdi, hicbirinde "son cocuk" olmadigi icin de kaybolmaz. */
.advancedPanelCols .drawerRow {
    padding: 0;
    border-bottom: none;
}
```

- [ ] **Step 4: `page.tsx`'te import'u güncelle**

`page.tsx:22`:
```tsx
import { MarketField, BirimMaliyetField, RiskCostFields } from './AdvancedSettingsSections';
```

- [ ] **Step 5: Sol sidebar'daki 3 grubu kaldır, `BirimMaliyetField` grubunu sadeleştir**

`page.tsx:708-761` bloğunun TAMAMINI (üç `settingsGroup`: Piyasa Analizi,
Müteahhit Kazancı, İksa Masrafı) şununla DEĞİŞTİR:

```tsx
            <div className={styles.settingsGroup}>
              <BirimMaliyetField
                globalUnitPrice={globalUnitPrice}
                birimMaliyetKaynagi={birimMaliyetKaynagi}
                onBirimMaliyet={handleGlobalUnitPriceChange}
              />
            </div>
```

(Yalnızca `<h4>Piyasa Analizi</h4>` satırı ve `<MarketField .../>` çağrısı
düşer, `Müteahhit Kazancı`/`İksa Masrafı` `settingsGroup`'ları TAMAMEN
silinir.)

- [ ] **Step 6: Yeni "Gelişmiş Ayarlar" panelini `rightGrid`'e ekle**

`page.tsx:943` (`</aside>`, summaryPanel'in kapanışı) ile `:945`
(`</section>`, rightGrid'in kapanışı) ARASINA ekle:

```tsx
          <div className={styles.advancedPanel}>
            <div className={styles.advancedPanelTitle}>Gelişmiş Ayarlar</div>
            <div className={styles.advancedPanelCols}>
              <MarketField
                manualMarketPrice={manualMarketPrice}
                setManualMarketPrice={setManualMarketPrice}
              />
              <RiskCostFields
                iksaMode={iksaMode}
                setIksaMode={setIksaMode}
                iksaPercentage={iksaPercentage}
                setIksaPercentage={setIksaPercentage}
                iksaManualTL={iksaManualTL}
                setIksaManualTL={setIksaManualTL}
                builderProfit={builderProfit}
                setBuilderProfit={setBuilderProfit}
                profitLevels={profitLevels}
              />
            </div>
          </div>
```

- [ ] **Step 7: Testleri çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/app/hesapla/page.test.tsx`
Expected: TÜM testler (yeni 4 + mevcut olanlar) PASS.

- [ ] **Step 8: tsc çalıştır**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 9: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/page.test.tsx
git commit -m "feat(hesapla): Gelismis Ayarlar masaustunde ayri bir panele tasinir

Sol sidebar'daki Piyasa Analizi/Muteahhit Kazanci/Iksa Masrafi kaldirilir,
BirimMaliyetField tek basina kalir. Ayni ucler paylasilan RiskCostFields/
MarketField uzerinden rightGrid'in bos 2. satirina (max-content'e cevrilir)
yeni bir panel olarak eklenir."
```

---

### Task 2: Gerçek viewport ölçümü + tam regresyon doğrulaması

**Files:** Yok (yalnızca doğrulama; bulgu çıkarsa Task 1'in dosyalarında
küçük bir düzeltme + ayrı commit).

**Interfaces:** Yok — bu task kod üretmez, Task 1'in çıktısını doğrular.

- [ ] **Step 1: Dev server'ı başlat**

Run: `npx next dev --webpack -p 3010` (arka planda)
Bekle: `http://localhost:3010/hesapla` 200 dönene kadar.

- [ ] **Step 2: Playwright ile 1440×900'de gerçek ölçüm al**

`playwright-skill` ile (`/tmp/playwright-test-hesapla-desktop-after.js`):
- `page.setViewportSize({width:1440,height:900})`
- `/hesapla`'ya git, "Örnek Proje ile Dene" tıkla
- `aside.leftSidebar`, `.advancedPanel`, `section.rightGrid`'in
  `boundingBox()`'larını al, konsola yazdır
- Tam sayfa ekran görüntüsü al (`/tmp/hesapla-desktop-after.png`)

- [ ] **Step 3: Ölçümleri değerlendir**

Sol sütun yüksekliği ile (`rightGrid` toplam yüksekliği = mainPanel/
summaryPanel + advancedPanel + aralarındaki gap) arasındaki farkı hesapla.
Spec'in "Açık risk" bölümündeki beklenti (~950-1050px sol, ~250-350px yeni
panel) ile karşılaştır — büyük bir sapma (ör. hâlâ 400px+ fark) varsa, ya da
3 sütunlu `.advancedPanelCols`'ta herhangi bir input/pill metni kırpılmış/
taşmışsa (ekran görüntüsünden gözle kontrol), bir sonraki adımda düzelt.

- [ ] **Step 4: Gerekirse küçük bir CSS düzeltmesi yap**

Yalnızca Step 3'te somut bir sorun bulunduysa (ör. `.advancedPanelCols`
sütunları 1100-1440px arası dar viewport'ta metin taşırıyor): `page.module.css`
içinde `.advancedPanelCols`'a `@media (max-width: 1100px) { grid-template-columns: 1fr; }`
ekle (rightGrid'in kendi 1100px breakpoint'iyle tutarlı). Sorun yoksa bu adımı
atla.

- [ ] **Step 5: Tam test paketini çalıştır (mobil dahil, regresyon kontrolü)**

Run: `npx jest src/app/hesapla`
Expected: TÜM suite'ler (mobil `GirdiKarti`/`HesaplaMobile` dahil) yeşil —
bu plan mobili hiç değiştirmedi, bu adım yalnızca kanıtlıyor.

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 6: Dev server'ı kapat**

Run: (dev server process'ini sonlandır)

- [ ] **Step 7: Ölçüm sonucunu rapor et, gerekirse commit**

Kullanıcıya gerçek sol/sağ yükseklik farkını (px) ve ekran görüntüsünü
raporla. Step 4'te bir düzeltme yapıldıysa:

```bash
git add src/app/hesapla/page.module.css
git commit -m "fix(hesapla): advancedPanelCols dar viewport'ta tek sutuna doser"
```

Düzeltme gerekmediyse commit YOK — Task 1'in commit'i zaten yeterli.
