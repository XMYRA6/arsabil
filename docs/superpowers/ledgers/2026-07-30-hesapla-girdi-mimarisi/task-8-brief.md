### Task 8: Masaüstü — birim maliyet görünür, piyasa fiyatı çekmeceden çıkar

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/pageStyles.scope.test.ts`

**KRİTİK:** Bu, spec K7'nin masaüstü tarafı. **Yerleşim yeniden tasarlanmaz** — yalnızca iki değer görünür kılınır.

- [ ] **Step 1: Başarısız testi yaz**

`pageStyles.scope.test.ts`'e ekle:

```ts
describe('birim maliyet ve piyasa fiyati gorunurlugu (spec 2026-07-29 K1/K7)', () => {
  it('masaustunde piyasa fiyati artik cekmece ICINDE DEGIL', () => {
    // K7: ayni sorun iki platformda da vardi; deger dislinin arkasinda
    // kalmamali.
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    const cekmeceBas = pageTsx.indexOf('isSettingsSidebarOpen &&');
    const marketField = pageTsx.indexOf('<MarketField');
    expect(marketField).toBeGreaterThan(-1);
    expect(cekmeceBas === -1 || marketField < cekmeceBas).toBe(true);
  });

  it('masaustunde birim maliyet kaynagi ekranda gosterilir', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/kaynakEtiketi\(birimMaliyetKaynagi, globalUnitPrice\)/);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/pageStyles --no-coverage`
Expected: FAIL — iki assertion da başarısız.

- [ ] **Step 3: `MarketField`i çekmeceden çıkar**

`page.tsx`: `<MarketField ... />` çağrısını ayarlar çekmecesinden alıp `LocationSelector`ın hemen altına, `.desktopSidebar` içine taşı. Çekmecede kalan "Piyasa Analizi" başlığını da birlikte taşı.

- [ ] **Step 4: Birim maliyet satırını masaüstüne ekle**

`LocationSelector`ın altına, `MarketField`ın üstüne:

```tsx
            <div className={styles.drawerRow}>
              <span className={styles.drawerRowLabel}>Birim inşaat maliyeti</span>
              <span>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
              <input
                type="number"
                min={0}
                step={100}
                value={globalUnitPrice}
                aria-label="Birim inşaat maliyeti (TL/m²)"
                onChange={e => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v > 0) {
                    setGlobalUnitPrice(v);
                    setBirimMaliyetKaynagi({ tur: 'elle' });
                  }
                }}
              />
            </div>
```

- [ ] **Step 5: Doğrula**

```bash
npx jest --no-coverage
npx tsc --noEmit
npx eslint src
```
Expected: PASS; tsc 0; eslint 12.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): masaustunde birim maliyet gorunur, piyasa fiyati cekmeceden cikti"
```

---

