# Hesapla Mobil UX Akışı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil hesapla sayfasında sonuç bölümünü ("Minimum Daire Fiyatı", Hesap Özeti, aksiyon butonları) kullanıcı en az bir "Sonuçları Göster" eylemi yapana kadar gizle; tekrarlayan sonuç/slider gösterimlerini kaldır; Hesap Özeti'ni aksiyon butonlarından önceye taşı; fiyat karşılaştırma rozetini çift yönlü (ucuz=yeşil, pahalı=kırmızı) yap.

**Architecture:** Tek sayfa, tek scroll akışı (wizard/ekran geçişi yok). Görünürlük tek bir `isResultsRevealed` boolean state ile kontrol edilir. Mobil-exclusive JSX'te (zaten `.mobileSidebar` altında, masaüstünde hiç render edilmeyen) düz `{isResultsRevealed && (...)}` koşulu kullanılır. Masaüstüyle **paylaşılan** JSX'te (mainPanel/summaryPanel içeriği) ise state'e bağlı JSX koşulu KULLANILMAZ (masaüstünü de etkiler) — bunun yerine `.container`'a eklenen `data-revealed={isResultsRevealed}` attribute'una bağlı, yalnızca mobil `@media (max-width: 768px)` bloğu içinde tanımlı CSS `display:none` kuralları kullanılır. Bu, Mühür Lacivert planında zaten kanıtlanmış "mobil-only = media query içinde" prensibinin bir uzantısıdır.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, framer-motion (SealBadge zaten mevcut).

## Global Constraints

- Scope yalnızca `src/app/hesapla/page.tsx` ve `src/app/hesapla/page.module.css` (+ `SealBadge.tsx`/`SealBadge.test.tsx`). Masaüstü (`.desktopSidebar`, masaüstü `mainPanel`/`summaryPanel` düzeni) **hiçbir görevde değişmemeli**.
- Yeni state/CSS **yalnızca mobil** (`@media (max-width: 768px)`) etkili olmalı. Paylaşılan (mainPanel/summaryPanel) elemanları gizlemek için JSX koşulu değil, `.container[data-revealed="..."]` CSS selektörü kullanılır — bu selektör her zaman mevcut mobil media query'nin İÇİNDE tanımlanır.
- "Sonuçları Göster" butonu her zaman tıklanabilir, alan zorunluluğu/validasyon yok.
- Faz 2 bir kez açıldıktan sonra kapanmaz (geri "gizle" yok, `isResultsRevealed` tek yönlü `false→true`).
- Hesaplama motoru (`useEffect` + `CalculatorEngineV2.calculate`) davranışına dokunulmaz — her zaman arka planda çalışmaya devam eder, yalnızca görünürlük kontrol edilir.
- `--red` (#ff5a5f) ve `--red-rgb` (255, 90, 95) mevcut semantik token'lar — yeni tanımlanmaz, olduğu gibi kullanılır.
- Yeni npm bağımlılığı yok. Yeni giriş/çıkış animasyonu bu planın kapsamı dışıdır (YAGNI — basit `display` toggle yeterli; kullanıcı animasyon detayını ayrıca onaylamadı, sadece 2 fazlı görünürlük mantığını onayladı).
- Her görevden sonra: `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npx jest --no-coverage` (mevcut baseline: 116/116 — Mühür Lacivert planı sonunda ulaşılan sayı; her görev bu sayıyı kendi eklediği test kadar artırır, tam sayı için o görevin kendi Step'ine bak).

---

## File Structure

- **Modify** `src/app/hesapla/page.tsx` — `isResultsRevealed` state, `data-revealed` attribute, "Sonuçları Göster" butonu, `topResultCard`'ın taşınması, `mainPanelResults` sarmalayıcısı, aksiyon butonlarının dual-slot taşınması, bipolar `SealBadge` çağrıları.
- **Modify** `src/app/hesapla/page.module.css` — gate CSS kuralları (hepsi mobil media query içinde), `.blueBox`/`.sliderArea` gizleme, `.mainPanelResults`, `.desktopActionsSlot`/`.mobileActionsSlot`, `.topResultBadgePricier`.
- **Modify** `src/app/hesapla/SealBadge.tsx` — `variant: 'cheaper' | 'pricier'` prop.
- **Modify** `src/app/hesapla/SealBadge.test.tsx` — yeni varyant testleri.
- **Modify** `src/app/hesapla/pageStyles.scope.test.ts` — yeni scope-guard testleri (her görevde ilgili olanlar eklenir).

**Interfaces:**
- `SealBadge` (değişecek): `interface SealBadgeProps { show: boolean; percentage: number; variant: 'cheaper' | 'pricier' }` — `variant` yeni, zorunlu. Task 6 bu değişikliği yapar ve tüm çağrı yerlerini günceller.
- Yeni state: `isResultsRevealed: boolean` (Task 1'de tanımlanır), sonraki tüm task'lar bu state'i veya ondan türeyen `data-revealed` attribute'unu okur.

---

### Task 1: Faz gate mekanizması — state, buton, sonuç kartının taşınması

**Files:**
- Modify: `src/app/hesapla/page.tsx:109` (state ekleme), `:317` (`data-revealed` attribute), `:443-506` (mobileSidebar içeriği yeniden sıralama)

**Interfaces:**
- Produces: `isResultsRevealed` state ve `data-revealed={isResultsRevealed}` attribute'u `.container` üzerinde — Task 2-5 bu attribute'u CSS selektörlerinde kullanacak.

- [ ] **Step 1: State ekle**

`src/app/hesapla/page.tsx` içinde, `isSettingsSidebarOpen` state'inin hemen altına (satır 109 civarı) ekle:

```tsx
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
  const [isResultsRevealed, setIsResultsRevealed] = useState(false);
```

- [ ] **Step 2: `.container`'a `data-revealed` attribute'u ekle**

Bul (satır 317):

```tsx
    <div className={styles.container}>
```

Şununla değiştir:

```tsx
    <div className={styles.container} data-revealed={isResultsRevealed}>
```

- [ ] **Step 3: `.mobileSidebar` içeriğini yeniden sırala**

Bul (satır 443-556 civarı, tam blok — mevcut dosyada `topResultCard`'ın `unifiedGlassPanel`'den ÖNCE, accordion'ların da `mobileAccordions` kapanışından hemen sonra `</aside>` geldiği hâli):

```tsx
          {/* ===== MOBILE SIDEBAR: Simplified card layout (visible on mobile only) ===== */}
          <div className={styles.mobileSidebar}>
            <div className={`${styles.swipeCard} ${styles.swipeCardPadded}`}>

            {/* Top Result Card */}
            <div className={styles.topResultCard}>
              <div className={styles.topResultLabel}>MİNİMUM DAİRE FİYATI</div>
              <div className={styles.topResultValue}>
                {result?.FD_total ? `${Math.round(result.FD_total).toLocaleString('tr-TR')} TL` : '---'}
              </div>
              <SealBadge
                show={marketPriceNum > 0 && !!result?.FD_total && marketPriceNum > result.FD_total}
                percentage={result?.FD_total ? Math.round(((marketPriceNum - result.FD_total) / marketPriceNum) * 100) : 0}
              />
            </div>

            <div className={styles.unifiedGlassPanel}>
              <div className={styles.settingsGroup}>
                <h4>Yapı Standardı</h4>
                <div className={styles.luxGrid}>
                  {[
                    { label: 'Standart', value: 1.0, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.84L17.5 12h-11L12 5.84z" /></svg> },
                    { label: 'Orta', value: 1.2, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h6V5H9v12zm8 0h6v-8h-6v8zm-16 0h6v-6H1v6z" /></svg> },
                    { label: 'Lüks', value: 1.4, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21h14V3H5v18zm2-14h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" /><circle cx="17.5" cy="5.5" r="3.5" fill="#4ade80" /><path d="M16 6l1 1 2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
                  ].map(opt => (
                    <div key={opt.label} className={`${styles.luxBox} ${luxLevel === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setLuxLevel(opt.value)}>
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.settingsGroup}>
                <h4>Daire Metrekaresi</h4>
                <div className={styles.stepperInput}>
                  <input type="number" value={apartmentSize} onChange={(e) => setApartmentSize(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>m²</span>
                    <button onClick={() => setApartmentSize(p => Math.max(50, p - 5))}>−</button>
                    <button onClick={() => setApartmentSize(p => p + 5)}>+</button>
                  </div>
                </div>
              </div>

              <div className={styles.settingsGroup}>
                <div className={`${styles.toggleRow} ${styles.toggleRowFlat}`}>
                  <h4>Arsa Payı</h4>
                  <span className={styles.sharePct}>%{landShareRatio}</span>
                </div>
                <RangeSlider
                  min={1}
                  max={100}
                  step={1}
                  value={landShareRatio}
                  onChange={(e) => {
                    setLandShareRatio(Number(e.target.value));
                    setIsApartmentCountEnabled(false);
                  }}
                  className={styles.sealRangeSlider}
                />
              </div>
            </div>

            </div>

            {/* ── Gelişmiş ayarlar: mobilde accordion (drawer ile aynı bileşenler) ── */}
            <div className={styles.mobileAccordions}>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Formül Parametreleri</summary>
                <div className={styles.accordionBody}>
                  <FormulParamsFields
                    isApartmentCountEnabled={isApartmentCountEnabled}
                    setIsApartmentCountEnabled={setIsApartmentCountEnabled}
                    totalApartments={totalApartments}
                    setTotalApartments={setTotalApartments}
                    isAaEnabled={isAaEnabled}
                    setIsAaEnabled={setIsAaEnabled}
                    arsaAlani={arsaAlani}
                    setArsaAlani={setArsaAlani}
                  />
                </div>
              </details>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Proje Maliyet ve Riskleri</summary>
                <div className={styles.accordionBody}>
                  <RiskCostFields
                    iksaMode={iksaMode}
                    setIksaMode={setIksaMode}
                    iksaPercentage={iksaPercentage}
                    setIksaPercentage={setIksaPercentage}
                    iksaManualTL={iksaManualTL}
                    setIksaManualTL={setIksaManualTL}
                    riskLevel={riskLevel}
                    setRiskLevel={setRiskLevel}
                    riskLevels={riskLevels}
                    builderProfit={builderProfit}
                    setBuilderProfit={setBuilderProfit}
                    profitLevels={profitLevels}
                  />
                </div>
              </details>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Piyasa Analizi</summary>
                <div className={styles.accordionBody}>
                  <MarketField
                    manualMarketPrice={manualMarketPrice}
                    setManualMarketPrice={setManualMarketPrice}
                  />
                </div>
              </details>
            </div>
          </div>

        </aside>
```

Bu tüm bloğu şu yeni sırayla değiştir (topResultCard taşındı ve `isResultsRevealed &&` ile gate'lendi, accordion'lardan sonra yeni buton eklendi):

```tsx
          {/* ===== MOBILE SIDEBAR: Simplified card layout (visible on mobile only) ===== */}
          <div className={styles.mobileSidebar}>
            <div className={`${styles.swipeCard} ${styles.swipeCardPadded}`}>

            <div className={styles.unifiedGlassPanel}>
              <div className={styles.settingsGroup}>
                <h4>Yapı Standardı</h4>
                <div className={styles.luxGrid}>
                  {[
                    { label: 'Standart', value: 1.0, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.84L17.5 12h-11L12 5.84z" /></svg> },
                    { label: 'Orta', value: 1.2, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h6V5H9v12zm8 0h6v-8h-6v8zm-16 0h6v-6H1v6z" /></svg> },
                    { label: 'Lüks', value: 1.4, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21h14V3H5v18zm2-14h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" /><circle cx="17.5" cy="5.5" r="3.5" fill="#4ade80" /><path d="M16 6l1 1 2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
                  ].map(opt => (
                    <div key={opt.label} className={`${styles.luxBox} ${luxLevel === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setLuxLevel(opt.value)}>
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.settingsGroup}>
                <h4>Daire Metrekaresi</h4>
                <div className={styles.stepperInput}>
                  <input type="number" value={apartmentSize} onChange={(e) => setApartmentSize(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>m²</span>
                    <button onClick={() => setApartmentSize(p => Math.max(50, p - 5))}>−</button>
                    <button onClick={() => setApartmentSize(p => p + 5)}>+</button>
                  </div>
                </div>
              </div>

              <div className={styles.settingsGroup}>
                <div className={`${styles.toggleRow} ${styles.toggleRowFlat}`}>
                  <h4>Arsa Payı</h4>
                  <span className={styles.sharePct}>%{landShareRatio}</span>
                </div>
                <RangeSlider
                  min={1}
                  max={100}
                  step={1}
                  value={landShareRatio}
                  onChange={(e) => {
                    setLandShareRatio(Number(e.target.value));
                    setIsApartmentCountEnabled(false);
                  }}
                  className={styles.sealRangeSlider}
                />
              </div>
            </div>

            </div>

            {/* ── Gelişmiş ayarlar: mobilde accordion (drawer ile aynı bileşenler) ── */}
            <div className={styles.mobileAccordions}>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Formül Parametreleri</summary>
                <div className={styles.accordionBody}>
                  <FormulParamsFields
                    isApartmentCountEnabled={isApartmentCountEnabled}
                    setIsApartmentCountEnabled={setIsApartmentCountEnabled}
                    totalApartments={totalApartments}
                    setTotalApartments={setTotalApartments}
                    isAaEnabled={isAaEnabled}
                    setIsAaEnabled={setIsAaEnabled}
                    arsaAlani={arsaAlani}
                    setArsaAlani={setArsaAlani}
                  />
                </div>
              </details>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Proje Maliyet ve Riskleri</summary>
                <div className={styles.accordionBody}>
                  <RiskCostFields
                    iksaMode={iksaMode}
                    setIksaMode={setIksaMode}
                    iksaPercentage={iksaPercentage}
                    setIksaPercentage={setIksaPercentage}
                    iksaManualTL={iksaManualTL}
                    setIksaManualTL={setIksaManualTL}
                    riskLevel={riskLevel}
                    setRiskLevel={setRiskLevel}
                    riskLevels={riskLevels}
                    builderProfit={builderProfit}
                    setBuilderProfit={setBuilderProfit}
                    profitLevels={profitLevels}
                  />
                </div>
              </details>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Piyasa Analizi</summary>
                <div className={styles.accordionBody}>
                  <MarketField
                    manualMarketPrice={manualMarketPrice}
                    setManualMarketPrice={setManualMarketPrice}
                  />
                </div>
              </details>
            </div>

            {!isResultsRevealed && (
              <div className={styles.revealButtonWrap}>
                <Button variant="primary" className={styles.sealPrimaryBtn} onClick={() => setIsResultsRevealed(true)}>
                  Sonuçları Göster
                </Button>
              </div>
            )}

            {isResultsRevealed && (
              <div className={styles.topResultCard}>
                <div className={styles.topResultLabel}>MİNİMUM DAİRE FİYATI</div>
                <div className={styles.topResultValue}>
                  {result?.FD_total ? `${Math.round(result.FD_total).toLocaleString('tr-TR')} TL` : '---'}
                </div>
                <SealBadge
                  show={marketPriceNum > 0 && !!result?.FD_total && marketPriceNum > result.FD_total}
                  percentage={result?.FD_total ? Math.round(((marketPriceNum - result.FD_total) / marketPriceNum) * 100) : 0}
                />
              </div>
            )}
          </div>

        </aside>
```

(`!isResultsRevealed &&` ile butonu sarmaladık ki sonuç açıldıktan sonra buton kaybolsun — tekrar tıklanabilir bir "yeniden hesapla" butonu istenmedi, YAGNI.)

- [ ] **Step 4: Buton sarmalayıcısının CSS'ini ekle**

`src/app/hesapla/page.module.css` içinde, mobil `@media (max-width: 768px)` bloğunun içine (Task 1-6'nın önceki plandan kalan token/palet kurallarının yanına, blok içinde herhangi bir yere) ekle:

```css
    .revealButtonWrap {
        padding: 4px 12px 0;
    }
```

- [ ] **Step 5: Full check suite çalıştır**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green, jest sayısı önceki plan sonundaki baseline ile aynı (bu görev yeni test eklemiyor — saf JSX reorder + yeni state).

- [ ] **Step 6: Manuel görsel kontrol**

Dev server + mobil görünüm: sayfa açılışında SADECE girdi alanları + 3 accordion + "Sonuçları Göster" butonu görünmeli, sonuç kartı hiç görünmemeli. Butona basınca sonuç kartı (Canlı Mühür rozetiyle) görünmeli ve buton kaybolmalı. Girdi değiştirdikçe sonuç kartı canlı güncellenmeye devam etmeli.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css
git commit -m "feat(hesapla): Faz gate mekanizması - Sonuçları Göster butonu + sonuç kartı taşındı"
```

---

### Task 2: Tekrarlayan sonuç/slider gösterimini kaldır (mobil-only CSS gizleme)

**Files:**
- Modify: `src/app/hesapla/page.module.css` (mobil media query içine 2 yeni kural)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (2 yeni guard testi)

**Interfaces:**
- Consumes: hiçbiri (saf CSS, Task 1'e bağımlı değil).

`.blueBox` (mainPanel'in başındaki fiyat hero'su, `page.module.css:402`) ve `.sliderArea` (mainPanel içindeki ikinci "Arsa Payı" native slider'ı, `page.module.css` içinde `.sliderArea` selector'ı) masaüstüyle paylaşılan JSX — kaldırmak için JSX'e dokunulmaz, sadece mobilde CSS ile gizlenir.

- [ ] **Step 1: Failing guard testlerini yaz**

`src/app/hesapla/pageStyles.scope.test.ts` içine yeni bir `describe` bloğu ekle:

```ts
describe('tekrarlayan sonuç/slider gizleme kapsamı', () => {
  it('.blueBox mobilde gizlenmeli, kural mobil media query içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const blueBoxHideMatch = pageCss.match(/\.blueBox\s*\{[^}]*display:\s*none/);
    expect(blueBoxHideMatch).not.toBeNull();
    expect(blueBoxHideMatch!.index).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('.sliderArea mobilde gizlenmeli, kural mobil media query içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sliderAreaHideMatch = pageCss.match(/\.sliderArea\s*\{[^}]*display:\s*none/);
    expect(sliderAreaHideMatch).not.toBeNull();
    expect(sliderAreaHideMatch!.index).toBeGreaterThan(lastMobileMediaIndex);
  });
});
```

- [ ] **Step 2: Testleri çalıştır, fail ettiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL — her iki `display:none` kuralı da henüz yok.

- [ ] **Step 3: CSS kurallarını ekle**

`src/app/hesapla/page.module.css` içinde, mobil `@media (max-width: 768px)` bloğunun içine ekle:

```css
    .blueBox {
        display: none;
    }

    .sliderArea {
        display: none;
    }
```

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS (tüm testler)

- [ ] **Step 5: Full check suite çalıştır**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green.

- [ ] **Step 6: Manuel görsel kontrol**

Mobil görünüm: "Sonuçları Göster"a bastıktan sonra, mainPanel'in başında ARTIK `blueBox` (fiyat tekrarı) görünmemeli, ikinci "Arsa Payı" slider'ı da görünmemeli — sadece Arsa Fiyatı stat kartı + Piyasa Değerine Göre grafiği + konum seçici kalmalı. Masaüstünde (≥1100px) her ikisi de hâlâ görünmeli, hiçbir değişiklik olmamalı.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "fix(hesapla): mobilde tekrarlayan sonuç kutusu ve ikinci Arsa Payı slider'ı gizlendi"
```

---

### Task 3: mainPanel'in stat/konum içeriğinin gate'lenmesi

**Files:**
- Modify: `src/app/hesapla/page.tsx:633-701` (statsRow + LocationSelector'ı `.mainPanelResults` ile sarmala)
- Modify: `src/app/hesapla/page.module.css` (gating kuralı)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (1 yeni guard testi)

**Interfaces:**
- Consumes: `isResultsRevealed`'dan türeyen `data-revealed` attribute'u (Task 1).

- [ ] **Step 1: Failing guard testini yaz**

`src/app/hesapla/pageStyles.scope.test.ts` içine ekle:

```ts
describe('mainPanelResults gate kapsamı', () => {
  it('.mainPanelResults yalnızca data-revealed="false" iken mobilde gizlenmeli', () => {
    expect(pageCss).toMatch(/\.container\[data-revealed="false"\]\s+\.mainPanelResults\s*\{[^}]*display:\s*none/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: `page.tsx`'te statsRow + LocationSelector'ı sarmala**

Bul (satır 633-701):

```tsx
            <div className={styles.statsRow}>
              {/* Arsa Fiyatı — sadece Sd açıkken görünür */}
              {isApartmentCountEnabled && (
                <div className={styles.statCard}>
                  <h5>Arsa Fiyatı (Arsa Sahibine)</h5>
                  <div className={styles.statCardValue}>
                    {result?.FA ? result.FA.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '—'}
                    <span>TL</span>
                  </div>
                  <div className={styles.statCardSub}>
                    <span>Daire Payı:</span>
                    <span><strong>{result?.Sdx != null ? Number(result.Sdx).toFixed(1) : '—'}</strong> daire</span>
                  </div>
                  {isAaEnabled && result?.FAbirim != null && (
                    <div className={`${styles.statCardSub} ${styles.statCardSubSpaced}`}>
                      <span>Arsa Birim:</span>
                      <span><strong>{result.FAbirim.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong> TL/m²</span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.statCard}>
                <h5>Piyasa Değerine Göre</h5>
                <div className={styles.chartCenter}>
                  <PriceEvaluationChart
                    minPrice={result ? result.FD_total : 0}
                    marketPrice={parseInt(manualMarketPrice.replace(/\D/g, '') || "0")}
                  />
                </div>
              </div>
            </div>

            <div className={styles.sliderArea}>
```

Şununla değiştir (statsRow açılış etiketinden önce `<div className={styles.mainPanelResults}>` ekle, `.sliderArea` div'i AYNI kalır — bu görevde ona dokunulmuyor, kapatma iç içeliği bozmamak için sınırı statsRow'un hemen sonrasına, LocationSelector'dan sonrasına koyacağız — bkz. Step 3 devamı):

```tsx
            <div className={styles.mainPanelResults}>
            <div className={styles.statsRow}>
              {/* Arsa Fiyatı — sadece Sd açıkken görünür */}
              {isApartmentCountEnabled && (
                <div className={styles.statCard}>
                  <h5>Arsa Fiyatı (Arsa Sahibine)</h5>
                  <div className={styles.statCardValue}>
                    {result?.FA ? result.FA.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '—'}
                    <span>TL</span>
                  </div>
                  <div className={styles.statCardSub}>
                    <span>Daire Payı:</span>
                    <span><strong>{result?.Sdx != null ? Number(result.Sdx).toFixed(1) : '—'}</strong> daire</span>
                  </div>
                  {isAaEnabled && result?.FAbirim != null && (
                    <div className={`${styles.statCardSub} ${styles.statCardSubSpaced}`}>
                      <span>Arsa Birim:</span>
                      <span><strong>{result.FAbirim.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong> TL/m²</span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.statCard}>
                <h5>Piyasa Değerine Göre</h5>
                <div className={styles.chartCenter}>
                  <PriceEvaluationChart
                    minPrice={result ? result.FD_total : 0}
                    marketPrice={parseInt(manualMarketPrice.replace(/\D/g, '') || "0")}
                  />
                </div>
              </div>
            </div>
            </div>

            <div className={styles.sliderArea}>
```

Şimdi `LocationSelector`'ı da aynı sarmalayıcının içine almak için, bul (satır 692-701):

```tsx
            {districtPrices.length > 0 && (
              <LocationSelector
                districtPrices={districtPrices}
                selectedIl={selectedIl}
                selectedIlce={selectedIlce}
                onIlChange={handleIlChange}
                onIlceChange={handleIlceChange}
                onClear={handleClearLocation}
              />
            )}
            <div className={styles.actionBottomRow}>
```

Şununla değiştir (LocationSelector'ı `.mainPanelResults` sarmalayıcısına taşı — `.sliderArea` div'i araya girdiği için ikinci bir `.mainPanelResults` açılışı gerekiyor, kapanışı `actionBottomRow`'dan hemen önce):

```tsx
            <div className={styles.mainPanelResults}>
            {districtPrices.length > 0 && (
              <LocationSelector
                districtPrices={districtPrices}
                selectedIl={selectedIl}
                selectedIlce={selectedIlce}
                onIlChange={handleIlChange}
                onIlceChange={handleIlceChange}
                onClear={handleClearLocation}
              />
            )}
            </div>
            <div className={styles.actionBottomRow}>
```

(İki ayrı `.mainPanelResults` sarmalayıcısı olması kasıtlı — `.sliderArea` zaten Task 2'de mobilde `display:none` yapıldı, aralarında görsel bir boşluk yaratmıyor, sadece CSS gating'in her iki bloğa da uygulanmasını garantiliyor.)

- [ ] **Step 4: CSS gating kuralını ekle**

`src/app/hesapla/page.module.css` içinde, mobil `@media (max-width: 768px)` bloğunun içine ekle:

```css
    .container[data-revealed="false"] .mainPanelResults {
        display: none;
    }
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Full check suite çalıştır**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green.

- [ ] **Step 7: Manuel görsel kontrol**

Mobil görünüm, "Sonuçları Göster"a basmadan önce: Arsa Fiyatı stat kartı, Piyasa grafiği, konum seçici hiç görünmemeli. Bastıktan sonra hepsi görünmeli. Masaüstünde her zaman görünür kalmalı (gate yok).

- [ ] **Step 8: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): mainPanel stat/konum içeriği Faz 2 gate'ine alındı"
```

---

### Task 4: Hesap Özeti'nin (summaryPanel) gate'lenmesi

**Files:**
- Modify: `src/app/hesapla/page.module.css` (gating kuralı)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (1 yeni guard testi)

**Interfaces:**
- Consumes: `data-revealed` attribute (Task 1).

`summaryPanel` (`page.module.css:585` civarı) zaten kendi class'ıyla var, JSX'e dokunmaya gerek yok — sadece CSS gating.

- [ ] **Step 1: Failing guard testini yaz**

```ts
describe('summaryPanel gate kapsamı', () => {
  it('.summaryPanel yalnızca data-revealed="false" iken mobilde gizlenmeli', () => {
    expect(pageCss).toMatch(/\.container\[data-revealed="false"\]\s+\.summaryPanel\s*\{[^}]*display:\s*none/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: CSS kuralını ekle**

`src/app/hesapla/page.module.css` içinde, mobil `@media (max-width: 768px)` bloğunun içine ekle:

```css
    .container[data-revealed="false"] .summaryPanel {
        display: none;
    }
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Full check suite çalıştır**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green.

- [ ] **Step 6: Manuel görsel kontrol**

Mobil görünüm: "Sonuçları Göster"a basmadan önce Hesap Özeti (3 grafik) hiç görünmemeli. Bastıktan sonra görünmeli, sayfa dolaşımı (Dağılım/Analiz/Finans dot'ları) normal çalışmalı. Masaüstünde her zaman görünür.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): Hesap Özeti Faz 2 gate'ine alındı"
```

---

### Task 5: Aksiyon butonlarının Hesap Özeti'nden sonraya taşınması (dual-slot)

**Files:**
- Modify: `src/app/hesapla/page.tsx:314-315` (yeni `actionsSection` değişkeni), `:702-758` (orijinal yeri sarmalama), `:854-855` (yeni ikinci render)
- Modify: `src/app/hesapla/page.module.css` (dual-slot CSS)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (2 yeni guard testi)

**Interfaces:**
- Consumes: `data-revealed` attribute (Task 1), mevcut `handleSaveReport`/`handlePdfDownload`/`handleAddScenario`/`handleRemoveScenario` handler'ları (değişmiyor).

`actionBottomRow` + `scenarioPills` + `compareSection` şu an `mainPanel` içinde, `summaryPanel`'den ÖNCE render ediliyor (JSX sırası: mainPanel tüm içeriği → summaryPanel). Masaüstünde bu ikisi yan yana 2 kolon olduğu için sıra sorun değil; mobilde ise tek kolon aşağı akış olduğu için bu, "aksiyon butonları özet'ten önce" mantık hatasına yol açıyor. Çözüm: aynı JSX'i BİR KEZ bir değişkende tanımla, iki farklı konumda (mainPanel'in orijinal yeri = masaüstü konumu, summaryPanel'den sonra = mobil konumu) iki ayrı sarmalayıcı ile render et, CSS ile hangi sarmalayıcının hangi ekran genişliğinde göründüğünü kontrol et.

- [ ] **Step 1: Failing guard testlerini yaz**

```ts
describe('aksiyon butonları dual-slot kapsamı', () => {
  it('.desktopActionsSlot mobilde gizlenmeli', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const match = pageCss.match(/\.desktopActionsSlot\s*\{[^}]*display:\s*none/);
    expect(match).not.toBeNull();
    expect(match!.index).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('.mobileActionsSlot yalnızca data-revealed="true" iken mobilde görünmeli', () => {
    expect(pageCss).toMatch(/\.container\[data-revealed="true"\]\s+\.mobileActionsSlot\s*\{[^}]*display:\s*contents/);
  });
});
```

- [ ] **Step 2: Testleri çalıştır, fail ettiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: `page.tsx`'te `actionsSection` değişkenini tanımla**

Bul (satır 314):

```tsx
  const marketPriceNum = parseInt(manualMarketPrice.replace(/\D/g, '') || '0');

  return (
```

Şununla değiştir (aksiyon JSX'ini `return` öncesinde bir değişkene taşı — bu blok, mevcut `actionBottomRow` div'inden `compareSection` koşulunun kapanışına kadar olan TÜM içeriktir, satır 702-758'den birebir taşınıyor):

```tsx
  const marketPriceNum = parseInt(manualMarketPrice.replace(/\D/g, '') || '0');

  const actionsSection = (
    <>
      <div className={styles.actionBottomRow}>
        <Button variant="outline" onClick={handlePdfDownload} disabled={!result} className={styles.sealOutlineBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          PDF İndir
        </Button>
        <Button variant="primary" onClick={handleSaveReport} disabled={isSaving} className={styles.sealPrimaryBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          {isSaving ? 'Kaydediliyor...' : 'Rapor Kaydet'}
        </Button>
        <Button
          variant="outline"
          onClick={handleAddScenario}
          disabled={!result || savedScenarios.length >= 3}
          title={savedScenarios.length >= 3 ? 'Maksimum 3 senaryo' : undefined}
          className={styles.compareBtn}
        >
          + Karşılaştır
        </Button>
      </div>
      {savedScenarios.length > 0 && (
        <div className={styles.scenarioPills}>
          {savedScenarios.map((s, i) => {
            const pillClass = [styles.pillBlue, styles.pillGreen, styles.pillOrange][i % 3];
            return (
              <span key={s.id} className={`${styles.scenarioPill} ${pillClass}`}>
                {s.name}
                <button
                  onClick={() => handleRemoveScenario(s.id)}
                  aria-label={`${s.name}'i kaldır`}
                  className={styles.scenarioPillRemove}
                  title={`${s.name}'i kaldır`}
                >×</button>
              </span>
            );
          })}
        </div>
      )}
      {savedScenarios.length >= 2 && (
        <div className={styles.compareSection}>
          <h3 className={styles.compareTitle}>
            Senaryo Karşılaştırması
          </h3>
          <ScenarioCompare
            scenarios={savedScenarios}
            onShareRequest={async (ids) => {
              const res = await fetch('/api/compare/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenarioIds: ids }),
              });
              if (!res.ok) return null;
              const { token } = await res.json();
              return `${window.location.origin}/compare/${token}`;
            }}
          />
        </div>
      )}
    </>
  );

  return (
```

- [ ] **Step 4: Orijinal konumu `.desktopActionsSlot` ile sarmala**

Bul (satır 702-758, `return` içindeki orijinal blok — Step 3'te değişkene taşınan içerikle AYNI JSX):

```tsx
            <div className={styles.actionBottomRow}>
              <Button variant="outline" onClick={handlePdfDownload} disabled={!result} className={styles.sealOutlineBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                PDF İndir
              </Button>
              <Button variant="primary" onClick={handleSaveReport} disabled={isSaving} className={styles.sealPrimaryBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                {isSaving ? 'Kaydediliyor...' : 'Rapor Kaydet'}
              </Button>
              <Button
                variant="outline"
                onClick={handleAddScenario}
                disabled={!result || savedScenarios.length >= 3}
                title={savedScenarios.length >= 3 ? 'Maksimum 3 senaryo' : undefined}
                className={styles.compareBtn}
              >
                + Karşılaştır
              </Button>
            </div>
            {savedScenarios.length > 0 && (
              <div className={styles.scenarioPills}>
                {savedScenarios.map((s, i) => {
                  const pillClass = [styles.pillBlue, styles.pillGreen, styles.pillOrange][i % 3];
                  return (
                    <span key={s.id} className={`${styles.scenarioPill} ${pillClass}`}>
                      {s.name}
                      <button
                        onClick={() => handleRemoveScenario(s.id)}
                        aria-label={`${s.name}'i kaldır`}
                        className={styles.scenarioPillRemove}
                        title={`${s.name}'i kaldır`}
                      >×</button>
                    </span>
                  );
                })}
              </div>
            )}
            {savedScenarios.length >= 2 && (
              <div className={styles.compareSection}>
                <h3 className={styles.compareTitle}>
                  Senaryo Karşılaştırması
                </h3>
                <ScenarioCompare
                  scenarios={savedScenarios}
                  onShareRequest={async (ids) => {
                    const res = await fetch('/api/compare/share', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scenarioIds: ids }),
                    });
                    if (!res.ok) return null;
                    const { token } = await res.json();
                    return `${window.location.origin}/compare/${token}`;
                  }}
                />
              </div>
            )}
```

Şununla değiştir:

```tsx
            <div className={styles.desktopActionsSlot}>
              {actionsSection}
            </div>
```

- [ ] **Step 5: `summaryPanel`'den sonra ikinci render'ı ekle**

Bul (satır 854-855, `</aside>` [summaryPanel kapanışı] ile `</section>` [rightGrid kapanışı] arası):

```tsx
          </aside>
        </section>
```

Şununla değiştir:

```tsx
          </aside>

          <div className={styles.mobileActionsSlot}>
            {actionsSection}
          </div>
        </section>
```

- [ ] **Step 6: CSS dual-slot kurallarını ekle**

`src/app/hesapla/page.module.css` içine, mobil `@media (max-width: 768px)` bloğunun içine ekle:

```css
    .desktopActionsSlot {
        display: none;
    }

    .mobileActionsSlot {
        display: none;
    }

    .container[data-revealed="true"] .mobileActionsSlot {
        display: contents;
    }
```

Ve masaüstü (media query DIŞINDA, dosyanın herhangi bir uygun yerinde, ör. `.actionBottomRow` kuralının hemen üstüne) ekle:

```css
.desktopActionsSlot {
    display: contents;
}

.mobileActionsSlot {
    display: none;
}
```

(Masaüstünde `.desktopActionsSlot` `display:contents` ile mainPanel'in flex akışına şeffafça karışır — mevcut düzen hiç değişmez. `.mobileActionsSlot` masaüstünde her zaman `display:none`, `rightGrid`'in 2 kolonlu grid'ine üçüncü bir kutu olarak sızmaz.)

- [ ] **Step 7: Testleri çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 8: Full check suite çalıştır**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green.

- [ ] **Step 9: Manuel görsel kontrol**

Mobil görünüm, "Sonuçları Göster"a bastıktan sonra: Hesap Özeti grafiklerinden SONRA aksiyon butonları (PDF İndir/Rapor Kaydet/Karşılaştır) görünmeli. Butonlara basmak hâlâ çalışmalı (Rapor Kaydet toast'u, PDF indirme, senaryo ekleme/karşılaştırma). Masaüstünde (≥1100px) düzen TAMAMEN eskisi gibi kalmalı — aksiyon butonları mainPanel'in içinde, summaryPanel'in solunda, eskisi gibi konumda.

- [ ] **Step 10: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): mobilde aksiyon butonları Hesap Özeti'nden sonraya taşındı (dual-slot)"
```

---

### Task 6: Çift yönlü SealBadge (ucuz/pahalı varyantları)

**Files:**
- Modify: `src/app/hesapla/SealBadge.tsx` (`variant` prop)
- Modify: `src/app/hesapla/SealBadge.test.tsx` (yeni varyant testleri)
- Modify: `src/app/hesapla/page.tsx:452-455` (iki `SealBadge` çağrısı)
- Modify: `src/app/hesapla/page.module.css` (`.topResultBadgePricier`)

**Interfaces:**
- Değişen: `SealBadgeProps` artık `{ show: boolean; percentage: number; variant: 'cheaper' | 'pricier' }` (variant zorunlu, yeni).
- Consumes: `--red` / `--red-rgb` (globals.css'te zaten mevcut, dokunulmuyor), `--seal-accent-rgb` (mevcut).

- [ ] **Step 1: Failing testleri yaz**

`src/app/hesapla/SealBadge.test.tsx` içine ekle (mevcut testlerin YANINA, mevcutları SİLME — ama mevcut 2 çağrı `variant` prop'u eksik olduğu için TypeScript hatası verecek, o yüzden mevcut testleri de `variant="cheaper"` ekleyerek güncelle):

Mevcut dosyanın başındaki iki temel test:

```tsx
  it('show=false iken hiçbir şey render etmez', () => {
    render(<SealBadge show={false} percentage={0} />);
    expect(screen.queryByText(/DAHA UCUZ/)).not.toBeInTheDocument();
  });

  it('show=true iken yüzdeyi doğru gösterir', () => {
    render(<SealBadge show={true} percentage={33} />);
    expect(screen.getByText(/Piyasaya Göre: %33 DAHA UCUZ/)).toBeInTheDocument();
  });
```

Şununla değiştir:

```tsx
  it('show=false iken hiçbir şey render etmez', () => {
    render(<SealBadge show={false} percentage={0} variant="cheaper" />);
    expect(screen.queryByText(/DAHA UCUZ/)).not.toBeInTheDocument();
  });

  it('show=true ve variant=cheaper iken yüzdeyi ve UCUZ metnini gösterir', () => {
    render(<SealBadge show={true} percentage={33} variant="cheaper" />);
    expect(screen.getByText(/Piyasaya Göre: %33 DAHA UCUZ/)).toBeInTheDocument();
  });

  it('show=true ve variant=pricier iken yüzdeyi ve PAHALI metnini gösterir', () => {
    render(<SealBadge show={true} percentage={12} variant="pricier" />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA PAHALI/)).toBeInTheDocument();
  });

  it('variant=cheaper rozeti mevcut topResultBadge class\'ını, variant=pricier ek olarak topResultBadgePricier class\'ını almalı', () => {
    const { container: cheaperContainer } = render(<SealBadge show={true} percentage={10} variant="cheaper" />);
    const { container: pricierContainer } = render(<SealBadge show={true} percentage={10} variant="pricier" />);
    expect(cheaperContainer.querySelector('[class*="topResultBadgePricier"]')).toBeNull();
    expect(pricierContainer.querySelector('[class*="topResultBadgePricier"]')).not.toBeNull();
  });
```

Ayrıca dosyanın alt kısmındaki `prefers-reduced-motion` testlerini de güncelle. Bul:

```tsx
  it('prefers-reduced-motion: reduce iken de rozet metni görünür olmalı (animasyonsuz render)', () => {
    setMatchMedia(true);
    render(<SealBadge show={true} percentage={12} />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });

  it('reduced motion kapalıyken de rozet metni görünür olmalı (animasyonlu render)', () => {
    setMatchMedia(false);
    render(<SealBadge show={true} percentage={12} />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });
```

Şununla değiştir:

```tsx
  it('prefers-reduced-motion: reduce iken de rozet metni görünür olmalı (animasyonsuz render)', () => {
    setMatchMedia(true);
    render(<SealBadge show={true} percentage={12} variant="cheaper" />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });

  it('reduced motion kapalıyken de rozet metni görünür olmalı (animasyonlu render)', () => {
    setMatchMedia(false);
    render(<SealBadge show={true} percentage={12} variant="cheaper" />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Testleri çalıştır, fail ettiğini doğrula**

Run: `npx jest src/app/hesapla/SealBadge.test.tsx --no-coverage`
Expected: FAIL — TypeScript derleme hatası (eksik `variant` prop) veya "PAHALI" metni bulunamıyor.

- [ ] **Step 3: `SealBadge.tsx`'i güncelle**

`src/app/hesapla/SealBadge.tsx` tam içeriğini şununla değiştir:

```tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import styles from './page.module.css';

export interface SealBadgeProps {
  show: boolean;
  percentage: number;
  variant: 'cheaper' | 'pricier';
}

/** "Canlı Mühür" — piyasa karşılaştırması eşiği geçildiği andaki tek seferlik damga animasyonu. */
export function SealBadge({ show, percentage, variant }: SealBadgeProps) {
  const shouldReduceMotion = useReducedMotion();
  const badgeClassName = variant === 'pricier'
    ? `${styles.topResultBadge} ${styles.topResultBadgePricier}`
    : styles.topResultBadge;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={badgeClassName}
          initial={shouldReduceMotion ? false : { scale: 1.4, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.18 }}
        >
          {variant === 'cheaper' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          Piyasaya Göre: %{percentage} {variant === 'cheaper' ? 'DAHA UCUZ' : 'DAHA PAHALI'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/hesapla/SealBadge.test.tsx --no-coverage`
Expected: PASS (7 test)

- [ ] **Step 5: `page.tsx`'te iki `SealBadge` çağrısına geç**

Bul (Task 1'de taşınan `topResultCard` bloğu içinde):

```tsx
                <SealBadge
                  show={marketPriceNum > 0 && !!result?.FD_total && marketPriceNum > result.FD_total}
                  percentage={result?.FD_total ? Math.round(((marketPriceNum - result.FD_total) / marketPriceNum) * 100) : 0}
                />
```

Şununla değiştir:

```tsx
                <SealBadge
                  show={marketPriceNum > 0 && !!result?.FD_total && marketPriceNum > result.FD_total}
                  percentage={result?.FD_total ? Math.round(((marketPriceNum - result.FD_total) / marketPriceNum) * 100) : 0}
                  variant="cheaper"
                />
                <SealBadge
                  show={marketPriceNum > 0 && !!result?.FD_total && marketPriceNum < result.FD_total}
                  percentage={result?.FD_total ? Math.round(((result.FD_total - marketPriceNum) / marketPriceNum) * 100) : 0}
                  variant="pricier"
                />
```

(İki rozet karşılıklı dışlayıcı — `marketPriceNum > result.FD_total` ve `marketPriceNum < result.FD_total` aynı anda asla `true` olamaz, eşitlikte ikisi de `false`.)

- [ ] **Step 6: `.topResultBadgePricier` CSS'ini ekle**

`src/app/hesapla/page.module.css` içinde, mobil `@media (max-width: 768px)` bloğu içindeki mevcut `.topResultBadge` kuralının (Task 2'den, Mühür Lacivert planı) hemen altına ekle:

```css
    .topResultBadgePricier {
        background: rgba(var(--red-rgb), 0.16);
        border-color: rgba(var(--red-rgb), 0.4);
    }
```

- [ ] **Step 7: Full check suite çalıştır**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green.

- [ ] **Step 8: Manuel görsel kontrol**

Mobil görünüm: piyasa fiyatını hesaplanan minimumun ALTINA girince yeşil "DAHA UCUZ" rozeti, ÜSTÜNE girince kırmızı "DAHA PAHALI" rozeti görünmeli. Arsa Payı slider'ını yükselttikçe fiyatın arttığını ve bir noktada yeşilden kırmızıya geçtiğini gözlemle.

- [ ] **Step 9: Commit**

```bash
git add src/app/hesapla/SealBadge.tsx src/app/hesapla/SealBadge.test.tsx src/app/hesapla/page.tsx src/app/hesapla/page.module.css
git commit -m "feat(hesapla): çift yönlü fiyat rozeti - ucuz (yeşil) / pahalı (kırmızı)"
```

---

### Task 7: Final doğrulama

**Files:** yok (yalnızca doğrulama + spec durum notu)

- [ ] **Step 1: Tam komut paketini çalıştır**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage && npm run build`
Expected: tümü temiz/yeşil.

- [ ] **Step 2: Mobil Playwright smoke'u yeniden çalıştır**

`e2e/mobil-smoke.spec.ts`'i `/hesapla` için çalıştır, yatay taşma olmadığını doğrula (yeni gate mantığı + dual-slot aksiyon butonları nedeniyle).

- [ ] **Step 3: Uçtan uca manuel akış testi**

390×844 mobil görünümde, sıfırdan: sayfa açılışında sonuç/özet/aksiyon YOK, sadece girdi+accordion+buton var → "Sonuçları Göster"a bas → sonuç kartı+stat+özet+aksiyon sırayla doğru konumda görünüyor → girdi değiştir (özellikle Arsa Payı'nı düşükten yükseğe çek) → fiyatın arttığını ve rozetin yeşilden kırmızıya döndüğünü gözle → Rapor Kaydet/PDF İndir/Karşılaştır çalışıyor. Masaüstünde (≥1100px) hiçbir gate/reorder görünmemeli, her şey her zaman görünür, Faz 1'in sonundaki (Mühür Lacivert planı) haliyle piksel-özdeş olmalı.

- [ ] **Step 4: Spec'e durum notu ekle**

`docs/superpowers/specs/2026-07-06-hesapla-mobil-ux-akis-design.md`'nin başına, "Durum" bölümündeki "Aktif — henüz uygulanmadı" satırını, uygulanan commit aralığını belirten bir "Tamamlandı" notuyla değiştir.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-07-06-hesapla-mobil-ux-akis-design.md
git commit -m "docs(hesapla): UX akışı speci tamamlandı olarak işaretle"
```
