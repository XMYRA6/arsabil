# Hesapla Sayfası UX/UI Yeniden Tasarımı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ArsaBil'in `/hesapla` sayfasındaki 3 doğrulanmış bug'ı (ölü "kaç daire" state'i, yanlış/görünmez piyasa fiyatı varsayılanı, tutarsız grafik girdisi) düzeltmek ve aynı işin içinde, kullanıcının onayladığı A(Fiş)+C(Sabit Özet Şeridi) bilgi mimarisini uygulamak.

**Architecture:** Motor katmanı (`engine_v2.ts`) hiç değişmiyor. Değişiklikler tamamen `src/app/hesapla/` altında: state modeli sadeleştirmesi (yeni saf fonksiyon modülü + `page.tsx` entegrasyonu), iki yeni bileşen (`HesapOzetiSeridi`, `HesapFisi`), ve CSS token kapsamının masaüstüne genişletilmesi.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Jest + React Testing Library, Playwright (canlı doğrulama).

## Global Constraints

- `engine_v2.ts`, `SPEC.md`, `engine_v2.test.ts` DEĞİŞMİYOR — motor doğru ve test edilmiş (16/16).
- Spec: `docs/superpowers/specs/2026-07-24-hesapla-uxui-yeniden-tasarim-design.md` — her task bu dosyadaki kararlara referans verir.
- Test komutu: `npx jest --no-coverage <dosya-yolu>` (proje kökünden, `C:\Users\emre\Desktop\arsabil-main`).
- Her task sonunda `npx jest --no-coverage src/app/hesapla` ile o ana kadarki tüm hesapla testleri tekrar çalıştırılır (regresyon kontrolü).
- Yeni bileşen dosyaları mevcut konvansiyonu izler: `"use client"`, `styles from './page.module.css'` (SealBadge.tsx deseni).
- Commit mesajları Türkçe, mevcut proje geleneğine uygun.

---

## Task 1: Piyasa fiyatı varsayılanını ve grafik P tutarsızlığını düzelt

Spec'teki 2. ve 3. bug: yanlış/görünmez varsayılan piyasa fiyatı ve `SensitivityChart`/`BreakEvenChart`'ın sabit `P: 10000` kullanması.

**Files:**
- Modify: `src/app/hesapla/page.tsx:84` (varsayılan `manualMarketPrice`)
- Modify: `src/app/hesapla/page.tsx:829` (SensitivityChart `baseInput.P`)
- Modify: `src/app/hesapla/page.tsx:847` (BreakEvenChart `baseInput.P`)
- Test: `src/app/hesapla/page.tsx` düzeyinde ayrı bir test dosyası GEREKMİYOR — bu satırlar zaten `pageStyles.scope.test.ts`'in okuduğu ham dosya metninden regex ile doğrulanabilir (aynı dosyanın kullandığı desen).
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (yeni 2 test eklenir, dosyanın sonuna)

**Interfaces:**
- Consumes: yok (mevcut state/prop isimleri değişmiyor bu task'ta).
- Produces: `manualMarketPrice` başlangıç değeri `""`; `SensitivityChart`/`BreakEvenChart` artık `globalUnitPrice`'ı okuyor — sonraki task'lar bu değişikliğe bağımlı değil.

- [ ] **Step 1: Başarısız testleri yaz**

`src/app/hesapla/pageStyles.scope.test.ts` dosyasının sonuna (mevcut son `describe` bloğundan sonra) ekle:

```ts
describe('piyasa fiyatı ve grafik P tutarlılığı (2026-07-24 UX/UI redesign)', () => {
  it('manualMarketPrice varsayılanı boş olmalı (yanlış 7.500.000 sabiti kaldırıldı)', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/useState<string>\(""\)/);
    expect(pageTsx).not.toMatch(/useState<string>\("7\.500\.000"\)/);
  });

  it('SensitivityChart ve BreakEvenChart artık P: globalUnitPrice kullanmalı, sabit 10000 değil', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    const hardcodedMatches = pageTsx.match(/P:\s*10000,/g) ?? [];
    expect(hardcodedMatches.length).toBe(0);
    const dynamicMatches = pageTsx.match(/P:\s*globalUnitPrice,/g) ?? [];
    expect(dynamicMatches.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npx jest --no-coverage src/app/hesapla/pageStyles.scope.test.ts`
Expected: FAIL — "manualMarketPrice varsayılanı boş olmalı" ve "SensitivityChart ve BreakEvenChart artık P: globalUnitPrice" testleri kırmızı.

- [ ] **Step 3: `page.tsx:84`'ü düzelt**

Eski:
```tsx
  const [manualMarketPrice, setManualMarketPrice] = useState<string>("7.500.000");
```

Yeni:
```tsx
  const [manualMarketPrice, setManualMarketPrice] = useState<string>("");
```

- [ ] **Step 4: `page.tsx:829`'u düzelt** (SensitivityChart baseInput)

Eski:
```tsx
                    <SensitivityChart baseInput={{
                      x: landShareRatio / 100,
                      L: luxLevel,
                      Ad: apartmentSize,
                      P: 10000,
                      K: builderProfit,
```

Yeni:
```tsx
                    <SensitivityChart baseInput={{
                      x: landShareRatio / 100,
                      L: luxLevel,
                      Ad: apartmentSize,
                      P: globalUnitPrice,
                      K: builderProfit,
```

- [ ] **Step 5: `page.tsx:847`'yi düzelt** (BreakEvenChart baseInput)

Eski:
```tsx
                      baseInput={{
                        x: landShareRatio / 100,
                        L: luxLevel,
                        Ad: apartmentSize,
                        P: 10000,
                        K: builderProfit,
```

Yeni:
```tsx
                      baseInput={{
                        x: landShareRatio / 100,
                        L: luxLevel,
                        Ad: apartmentSize,
                        P: globalUnitPrice,
                        K: builderProfit,
```

(Not: `landShareRatio / 100` ifadesi bu iki grafik çağrısında Task 2'de `effectiveLandShareRatio / 100` olarak güncellenecek — bu task'ta dokunulmuyor.)

- [ ] **Step 6: Testleri çalıştır, geçtiğini doğrula**

Run: `npx jest --no-coverage src/app/hesapla/pageStyles.scope.test.ts`
Expected: PASS (tüm testler).

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/pageStyles.scope.test.ts
git commit -m "fix: hesapla piyasa fiyatı varsayılanını ve grafik P tutarsızlığını düzelt"
```

---

## Task 2: `ownerApartmentCount` ölü state'ini kaldır, `ownerApartmentShare` ile değiştir

Spec'teki 1. bug (asıl "tamamen bozuk" şikayetinin kaynağı). Önce saf, test edilebilir bir yardımcı modül yazılıyor (ağır `next-auth`/Chart.js/PDF bağımlılıklarını mock'lamadan asıl mantığı test etmek için), sonra `page.tsx`'e entegre ediliyor.

**Files:**
- Create: `src/app/hesapla/calculatorUiHelpers.ts`
- Test: `src/app/hesapla/calculatorUiHelpers.test.ts`
- Modify: `src/app/hesapla/page.tsx` (state, effect, JSX — detaylar aşağıda)
- Modify: `src/app/hesapla/AdvancedSettingsSections.tsx` (`FormulParamsFields`'e yeni slider)

**Interfaces:**
- Consumes: yok yeni (mevcut `CalculationInput` tipi `@/lib/calculator/engine_v2`'den değişmeden kullanılıyor).
- Produces:
  - `computeEffectiveLandShareX(input: EffectiveLandShareInput): number` — 0..1 arası `x`.
  - `clampOwnerApartmentShare(ownerApartmentShare: number, totalApartments: number): number`.
  - `parseMarketPrice(raw: string): number`.
  - Bu üç fonksiyon Task 4'te `HesapOzetiSeridi`'nin prop'larını türetmek için de kullanılacak.

- [ ] **Step 1: Başarısız testleri yaz**

`src/app/hesapla/calculatorUiHelpers.test.ts`:

```ts
import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice } from './calculatorUiHelpers';

describe('computeEffectiveLandShareX', () => {
  it('Sd kapalıyken landShareRatio/100 döner', () => {
    expect(computeEffectiveLandShareX({
      isApartmentCountEnabled: false,
      ownerApartmentShare: 999,
      totalApartments: 20,
      landShareRatio: 30,
    })).toBeCloseTo(0.30);
  });

  it('Sd açıkken ownerApartmentShare/totalApartments döner (asıl bug regresyonu)', () => {
    expect(computeEffectiveLandShareX({
      isApartmentCountEnabled: true,
      ownerApartmentShare: 6,
      totalApartments: 20,
      landShareRatio: 999,
    })).toBeCloseTo(0.30);
  });

  it('Sd açık ama totalApartments 0 ise 0 döner (sıfıra bölme değil)', () => {
    expect(computeEffectiveLandShareX({
      isApartmentCountEnabled: true,
      ownerApartmentShare: 6,
      totalApartments: 0,
      landShareRatio: 50,
    })).toBe(0);
  });
});

describe('clampOwnerApartmentShare', () => {
  it('totalApartments azaltılınca ownerApartmentShare üst sınıra çekilir', () => {
    expect(clampOwnerApartmentShare(15, 10)).toBe(10);
  });

  it('negatif değer 0a çekilir', () => {
    expect(clampOwnerApartmentShare(-3, 10)).toBe(0);
  });

  it('aralıktaki değer değişmeden döner', () => {
    expect(clampOwnerApartmentShare(6, 20)).toBe(6);
  });

  it('totalApartments 0 ise 0 döner', () => {
    expect(clampOwnerApartmentShare(5, 0)).toBe(0);
  });
});

describe('parseMarketPrice', () => {
  it('boş string 0 döner (piyasa karşılaştırması hiç gösterilmemeli)', () => {
    expect(parseMarketPrice('')).toBe(0);
  });

  it('binlik ayraçlı TL string sayıya çevrilir', () => {
    expect(parseMarketPrice('7.500.000')).toBe(7500000);
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npx jest --no-coverage src/app/hesapla/calculatorUiHelpers.test.ts`
Expected: FAIL — "Cannot find module './calculatorUiHelpers'".

- [ ] **Step 3: `calculatorUiHelpers.ts`'i yaz**

```ts
export interface EffectiveLandShareInput {
  isApartmentCountEnabled: boolean;
  ownerApartmentShare: number;
  totalApartments: number;
  landShareRatio: number;
}

/** Sd açıkken tek gerçek kaynak ownerApartmentShare/totalApartments'tır; landShareRatio sadece Sd kapalıyken kullanılır. */
export function computeEffectiveLandShareX({
  isApartmentCountEnabled,
  ownerApartmentShare,
  totalApartments,
  landShareRatio,
}: EffectiveLandShareInput): number {
  if (isApartmentCountEnabled) {
    return totalApartments > 0 ? ownerApartmentShare / totalApartments : 0;
  }
  return landShareRatio / 100;
}

export function clampOwnerApartmentShare(ownerApartmentShare: number, totalApartments: number): number {
  if (totalApartments <= 0) return 0;
  return Math.min(Math.max(ownerApartmentShare, 0), totalApartments);
}

export function parseMarketPrice(raw: string): number {
  return parseInt(raw.replace(/\D/g, '') || '0', 10);
}
```

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npx jest --no-coverage src/app/hesapla/calculatorUiHelpers.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Commit (saf fonksiyonlar)**

```bash
git add src/app/hesapla/calculatorUiHelpers.ts src/app/hesapla/calculatorUiHelpers.test.ts
git commit -m "test: hesapla arsa payı/piyasa fiyatı saf fonksiyonlarını ekle (TDD)"
```

- [ ] **Step 6: `page.tsx` state'ini değiştir — `ownerApartmentCount` kaldır, `ownerApartmentShare` ekle**

Eski (`page.tsx:67`):
```tsx
  const [ownerApartmentCount, setOwnerApartmentCount] = useState<number>(8);
```

Yeni:
```tsx
  const [ownerApartmentShare, setOwnerApartmentShare] = useState<number>(0);
```

(Varsayılan `0` — Task 3'te Sd modu zaten varsayılan kapalı olacağı için bu değerin anlamı yok, ama tanımsız/negatif bir görünüm vermemesi için `0`.)

- [ ] **Step 7: Import ekle**

`page.tsx` en üstteki import bloğuna (mevcut `import { CalculatorEngineV2, ...} from '@/lib/calculator/engine_v2';` satırının hemen altına) ekle:

```tsx
import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice } from './calculatorUiHelpers';
```

- [ ] **Step 8: Türetilmiş `effectiveLandShareRatio` değerini ekle**

State bildirimlerinin hemen altına (`ownerApartmentShare` satırından sonra, `useEffect`'lerden önce) ekle:

```tsx
  const effectiveLandShareRatio = computeEffectiveLandShareX({
    isApartmentCountEnabled,
    ownerApartmentShare,
    totalApartments,
    landShareRatio,
  }) * 100;
```

- [ ] **Step 9: Ana hesaplama `useEffect`'ini sadeleştir**

Eski (`page.tsx:155-188`):
```tsx
  useEffect(() => {
    const activeLandShare = isApartmentCountEnabled
      ? (totalApartments > 0 ? ownerApartmentCount / totalApartments : landShareRatio / 100)
      : landShareRatio / 100;

    if (isApartmentCountEnabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- arsa payı/daire sayısı türev durumu senkronizasyonu
      setLandShareRatio(Math.round(activeLandShare * 100));
    } else {
      setOwnerApartmentCount(Math.round(totalApartments * activeLandShare));
    }

    const input: CalculationInput = {
      x: activeLandShare,
      L: luxLevel,
      Ad: apartmentSize,
      P: globalUnitPrice,
      K: builderProfit,

      Sd: isApartmentCountEnabled ? totalApartments : undefined,
      Aa: isAaEnabled ? arsaAlani : undefined,

      isRiskEnabled: riskLevel > 0,
      R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,

      isExcavationEnabled: iksaMode !== 'off',
      excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
      Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
      MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,
    };

    const res = CalculatorEngineV2.calculate(input);
    setResult(res);
  }, [luxLevel, apartmentSize, totalApartments, ownerApartmentCount, landShareRatio, builderProfit, riskLevel, isApartmentCountEnabled, iksaMode, iksaPercentage, iksaManualTL, isAaEnabled, arsaAlani, globalUnitPrice]);
```

Yeni:
```tsx
  useEffect(() => {
    if (isApartmentCountEnabled) {
      const clamped = clampOwnerApartmentShare(ownerApartmentShare, totalApartments);
      if (clamped !== ownerApartmentShare) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- totalApartments azaltılınca ownerApartmentShare'i sınırlar
        setOwnerApartmentShare(clamped);
        return;
      }
    }

    const activeLandShare = computeEffectiveLandShareX({
      isApartmentCountEnabled,
      ownerApartmentShare,
      totalApartments,
      landShareRatio,
    });

    const input: CalculationInput = {
      x: activeLandShare,
      L: luxLevel,
      Ad: apartmentSize,
      P: globalUnitPrice,
      K: builderProfit,

      Sd: isApartmentCountEnabled ? totalApartments : undefined,
      Aa: isAaEnabled ? arsaAlani : undefined,

      isRiskEnabled: riskLevel > 0,
      R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,

      isExcavationEnabled: iksaMode !== 'off',
      excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
      Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
      MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,
    };

    const res = CalculatorEngineV2.calculate(input);
    setResult(res);
  }, [luxLevel, apartmentSize, totalApartments, ownerApartmentShare, landShareRatio, builderProfit, riskLevel, isApartmentCountEnabled, iksaMode, iksaPercentage, iksaManualTL, isAaEnabled, arsaAlani, globalUnitPrice]);
```

- [ ] **Step 10: `handleSaveReport`, `handlePdfDownload`, `handleAddScenario` çağrılarını `effectiveLandShareRatio`'ya taşı**

`page.tsx:219`, eski:
```tsx
          landShareRatio: landShareRatio / 100,
```
Yeni:
```tsx
          landShareRatio: effectiveLandShareRatio / 100,
```

`page.tsx:246`, eski:
```tsx
      landShareRatio,
```
Yeni:
```tsx
      landShareRatio: effectiveLandShareRatio,
```

`page.tsx:268`, eski:
```tsx
        landShareRatio: landShareRatio / 100,
```
Yeni:
```tsx
        landShareRatio: effectiveLandShareRatio / 100,
```

`page.tsx:826` (SensitivityChart) ve `page.tsx:844` (BreakEvenChart), eski (ikisinde de aynı satır):
```tsx
                      x: landShareRatio / 100,
```
Yeni (ikisinde de):
```tsx
                      x: effectiveLandShareRatio / 100,
```

- [ ] **Step 11: `parseMarketPrice`'ı kullan (3 tekrarlayan regex yerine)**

`page.tsx:315`, eski:
```tsx
  const marketPriceNum = parseInt(manualMarketPrice.replace(/\D/g, '') || '0');
```
Yeni:
```tsx
  const marketPriceNum = parseMarketPrice(manualMarketPrice);
```

`page.tsx:254` (`handlePdfDownload` içinde), eski:
```tsx
      marketPrice: parseInt(manualMarketPrice.replace(/\D/g, '') || '0'),
```
Yeni:
```tsx
      marketPrice: parseMarketPrice(manualMarketPrice),
```

`page.tsx:739` (`PriceEvaluationChart` prop'u), eski:
```tsx
                    marketPrice={parseInt(manualMarketPrice.replace(/\D/g, '') || "0")}
```
Yeni:
```tsx
                    marketPrice={marketPriceNum}
```

`page.tsx:858` (`BreakEvenChart` `marketPrice` prop'u), eski:
```tsx
                      marketPrice={parseInt(manualMarketPrice.replace(/\D/g, '') || '0')}
```
Yeni:
```tsx
                      marketPrice={marketPriceNum}
```

- [ ] **Step 12: Mobil "Arsa Payı" hızlı kontrolünü Sd'ye göre koşullu yap**

Eski (`page.tsx:538-554`):
```tsx
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
```

Yeni:
```tsx
              <div className={styles.settingsGroup}>
                <div className={`${styles.toggleRow} ${styles.toggleRowFlat}`}>
                  <h4>Arsa Payı</h4>
                  <span className={styles.sharePct}>
                    %{Math.round(effectiveLandShareRatio)}
                    {isApartmentCountEnabled && ` (${ownerApartmentShare}/${totalApartments} daire)`}
                  </span>
                </div>
                {!isApartmentCountEnabled && (
                  <RangeSlider
                    min={1}
                    max={100}
                    step={1}
                    value={landShareRatio}
                    onChange={(e) => setLandShareRatio(Number(e.target.value))}
                    className={styles.sealRangeSlider}
                  />
                )}
              </div>
```

- [ ] **Step 13: Masaüstü `.sliderArea` bloğunu Sd'ye göre koşullu yap**

Eski (`page.tsx:746-770`):
```tsx
            <div className={styles.sliderArea}>
              <h4 className={styles.sliderHeader}>Arsa Payı</h4>
              <div className={styles.sliderContainer}>
                <div className={styles.sliderTrackWrapper}>
                  <div className={styles.sliderTrack} style={{ '--share-pct': `${((landShareRatio - 10) / 90) * 100}%` } as React.CSSProperties}>
                    <div className={`${styles.sliderFill} ${styles.sliderFillDynamic}`}></div>
                    <div className={`${styles.sliderThumb} ${styles.sliderThumbDynamic}`}></div>
                    <input
                      type="range" min="10" max="100"
                      value={landShareRatio}
                      onChange={(e) => {
                        setLandShareRatio(Number(e.target.value));
                        setIsApartmentCountEnabled(false);
                      }}
                      className={styles.sliderInput}
                    />
                    <div className={styles.sliderTicks}>
                      <span>10%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
                <div className={styles.sliderValueBox}>{landShareRatio}%</div>
              </div>
            </div>
```

Yeni:
```tsx
            <div className={styles.sliderArea}>
              <h4 className={styles.sliderHeader}>Arsa Payı</h4>
              {isApartmentCountEnabled ? (
                <div className={styles.sliderValueBox}>
                  %{Math.round(effectiveLandShareRatio)} ({ownerApartmentShare}/{totalApartments} daire)
                </div>
              ) : (
                <div className={styles.sliderContainer}>
                  <div className={styles.sliderTrackWrapper}>
                    <div className={styles.sliderTrack} style={{ '--share-pct': `${((landShareRatio - 10) / 90) * 100}%` } as React.CSSProperties}>
                      <div className={`${styles.sliderFill} ${styles.sliderFillDynamic}`}></div>
                      <div className={`${styles.sliderThumb} ${styles.sliderThumbDynamic}`}></div>
                      <input
                        type="range" min="10" max="100"
                        value={landShareRatio}
                        onChange={(e) => setLandShareRatio(Number(e.target.value))}
                        className={styles.sliderInput}
                      />
                      <div className={styles.sliderTicks}>
                        <span>10%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.sliderValueBox}>{landShareRatio}%</div>
                </div>
              )}
            </div>
```

- [ ] **Step 14: `AdvancedSettingsSections.tsx`'e `ownerApartmentShare` slider'ı ekle**

`FormulParamsProps` interface'ine ekle (mevcut `totalApartments`/`setTotalApartments` satırlarının hemen altına):

```ts
  ownerApartmentShare: number;
  setOwnerApartmentShare: React.Dispatch<React.SetStateAction<number>>;
```

`FormulParamsFields` fonksiyon parametrelerine ekle (mevcut `totalApartments, setTotalApartments,` satırının hemen altına):

```tsx
  ownerApartmentShare, setOwnerApartmentShare,
```

En üste import ekle:
```tsx
import { RangeSlider } from '@/components/ui/RangeSlider';
```

"Toplam Daire Sayısı" bloğundaki stepper'ın hemen altına (mevcut kapanış `</div>` satırından önce, yani `{isApartmentCountEnabled && (...)}` bloğunun İÇİNE, stepper'dan sonra) ekle:

```tsx
            <RangeSlider
              label="Arsa Sahibine Düşen Daire"
              min={0}
              max={totalApartments}
              step={1}
              value={ownerApartmentShare}
              unit="daire"
              onChange={(e) => setOwnerApartmentShare(Number(e.target.value))}
            />
```

- [ ] **Step 15: `page.tsx`'teki 3 `<FormulParamsFields .../>` çağrısına yeni prop'ları ekle**

Bu bileşen `page.tsx` içinde 2 yerde kullanılıyor (mobil akordeon `page.tsx:564-573`, masaüstü çekmece `page.tsx:650-659`). Her iki çağrıya da (mevcut `isAaEnabled`/`setIsAaEnabled` satırlarının hemen altına) ekle:

```tsx
                    ownerApartmentShare={ownerApartmentShare}
                    setOwnerApartmentShare={setOwnerApartmentShare}
```

- [ ] **Step 16: Masaüstü inline "Toplam Daire Sayısı" bloğuna da aynı slider'ı ekle**

Eski (`page.tsx:417-432`):
```tsx
            <div className={styles.settingsGroup}>
              <div className={styles.toggleRow}>
                <h4>Toplam Daire Sayısı</h4>
                <Toggle checked={isApartmentCountEnabled} onChange={(e) => setIsApartmentCountEnabled(e.target.checked)} />
              </div>
              {isApartmentCountEnabled && (
                <div className={styles.stepperInput}>
                  <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>daire</span>
                    <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
                    <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
                  </div>
                </div>
              )}
            </div>
```

Yeni:
```tsx
            <div className={styles.settingsGroup}>
              <div className={styles.toggleRow}>
                <h4>Toplam Daire Sayısı</h4>
                <Toggle checked={isApartmentCountEnabled} onChange={(e) => setIsApartmentCountEnabled(e.target.checked)} />
              </div>
              {isApartmentCountEnabled && (
                <>
                  <div className={styles.stepperInput}>
                    <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
                    <div className={styles.stepperRight}>
                      <span>daire</span>
                      <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
                      <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
                    </div>
                  </div>
                  <RangeSlider
                    label="Arsa Sahibine Düşen Daire"
                    min={0}
                    max={totalApartments}
                    step={1}
                    value={ownerApartmentShare}
                    unit="daire"
                    onChange={(e) => setOwnerApartmentShare(Number(e.target.value))}
                  />
                </>
              )}
            </div>
```

- [ ] **Step 17: Sd modu varsayılanını kapalıya çevir**

Eski (`page.tsx:65`):
```tsx
  const [isApartmentCountEnabled, setIsApartmentCountEnabled] = useState<boolean>(true);
```

Yeni:
```tsx
  const [isApartmentCountEnabled, setIsApartmentCountEnabled] = useState<boolean>(false);
```

- [ ] **Step 18: `pageStyles.scope.test.ts`'e Sd varsayılan-kapalı regresyon testini ekle**

Task 1'de eklenen `describe` bloğunun içine yeni bir `it` ekle:

```ts
  it('Sd modu (Toplam Daire Sayısı) sayfa açılışında varsayılan kapalı olmalı', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/isApartmentCountEnabled\] = useState<boolean>\(false\)/);
  });

  it('ownerApartmentCount ölü state\'i tamamen kaldırılmış olmalı', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/ownerApartmentCount/);
  });
```

- [ ] **Step 19: Tüm testleri çalıştır**

Run: `npx jest --no-coverage src/app/hesapla`
Expected: PASS (tüm dosyalar — `calculatorUiHelpers.test.ts`, `pageStyles.scope.test.ts`, `SealBadge.test.tsx`).

- [ ] **Step 20: TypeScript ve lint kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx eslint src/app/hesapla`
Expected: 0 ihlal.

- [ ] **Step 21: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/AdvancedSettingsSections.tsx src/app/hesapla/pageStyles.scope.test.ts
git commit -m "fix: ölü ownerApartmentCount state'ini kaldır, ownerApartmentShare slider'ı ekle (asıl 'tamamen bozuk' bug'ı)"
```

---

## Task 3: `--seal-*` token'larını sayfa geneline (masaüstü dahil) genişlet

Spec: "bu token'lar şu ana kadar SADECE mobilde tanımlıydı; bu çalışma aynı paleti masaüstüne de genişletir." Task 4/5'teki yeni masaüstü bileşenleri bu token'ları kullanacak.

**Files:**
- Modify: `src/app/hesapla/page.module.css` (token bloklarını taşı)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (artık geçersiz olan konum kısıtını güncelle)

**Interfaces:**
- Consumes: yok.
- Produces: `--seal-ink`, `--seal-accent`, `--seal-accent-rgb`, `--seal-surface`, `--seal-border`, `--seal-border-soft`, `--seal-text`, `--seal-text-muted`, `--seal-text-faint` artık TÜM ekran genişliklerinde tanımlı — Task 4/5 bunlara güvenebilir.

- [ ] **Step 1: Mevcut "artık geçersiz" pozisyon testini güncelle**

`pageStyles.scope.test.ts:24-29`, eski:
```ts
  it('--seal-accent tanımı, mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sealAccentIndex = pageCss.indexOf('--seal-accent:');
    expect(lastMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeGreaterThan(lastMobileMediaIndex);
  });
```

Yeni (2026-07-24 kararı: seal token'ları artık sayfa geneli, mobile-only kısıtı kaldırıldı):
```ts
  it('--seal-accent tanımı artık sayfa geneli (masaüstü dahil) olmalı — mobil media query\'nin İÇİNDE OLMAMALI (2026-07-24 hesapla redesign kararı)', () => {
    const firstMobileMediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const sealAccentIndex = pageCss.indexOf('--seal-accent:');
    expect(firstMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeLessThan(firstMobileMediaIndex);
  });
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest --no-coverage src/app/hesapla/pageStyles.scope.test.ts`
Expected: FAIL — yeni test kırmızı (token hâlâ eski konumda).

- [ ] **Step 3: Token bloklarını taşı — mobil `@media` içinden kaldır**

`page.module.css:1378-1400`'den (mobil blok içindeki üç tanım) şu kısmı SİL:
```css
        /* Faz 1.5 revizyonu — Cam Kart + Aurora Mavi Vurgu (bkz. docs/superpowers/specs/2026-07-06-hesapla-mobil-cam-aurora-vurgu-design.md) */
        --seal-ink: #0F2A43;
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
    }

    [data-theme="dark"] .container {
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border: rgba(76, 141, 255, 0.25);
        --seal-border-soft: rgba(76, 141, 255, 0.18);
        --seal-text: #F4F0E6;
        --seal-text-muted: rgba(244, 240, 230, 0.7);
        --seal-text-faint: rgba(244, 240, 230, 0.55);
    }

    [data-theme="light"] .container {
        --seal-surface: var(--shell-bg);
        --seal-border: var(--shell-border);
        --seal-border-soft: var(--shell-border);
        --seal-text: var(--card-title);
        --seal-text-muted: var(--muted);
        --seal-text-faint: var(--muted);
    }
```

Bu silme sonrası `.container { ... }` mobil bloğunun kapanışı (yukarıdaki ilk `}`) korunur — sadece token satırları ve onları takip eden iki `[data-theme]` bloğu tamamen kaldırılıyor, mobil blok `.container {` açılışından hemen sonra `.topResultCard {` tanımına geçiyor.

- [ ] **Step 4: Aynı token bloklarını sayfa başına, her zaman geçerli olacak şekilde ekle**

`page.module.css:17` (`.container` kuralının kapanışı) ile satır 19 (`/* Inner Page Header */`) arasına ekle:

```css

/* Faz 1.5 revizyonu — Cam Kart + Aurora Mavi Vurgu, 2026-07-24'te sayfa geneline (masaüstü dahil) genişletildi */
.container {
    --seal-ink: #0F2A43;
    --seal-accent: var(--aurora-cyan);
    --seal-accent-rgb: 43, 124, 255;
}

[data-theme="dark"] .container {
    --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
    --seal-border: rgba(76, 141, 255, 0.25);
    --seal-border-soft: rgba(76, 141, 255, 0.18);
    --seal-text: #F4F0E6;
    --seal-text-muted: rgba(244, 240, 230, 0.7);
    --seal-text-faint: rgba(244, 240, 230, 0.55);
}

[data-theme="light"] .container {
    --seal-surface: var(--shell-bg);
    --seal-border: var(--shell-border);
    --seal-border-soft: var(--shell-border);
    --seal-text: var(--card-title);
    --seal-text-muted: var(--muted);
    --seal-text-faint: var(--muted);
}
```

(Not: `.container { ... }` seçicisi burada tekrar açılıyor — CSS'te aynı seçici birden fazla kez tanımlanabilir, kurallar birleşir. Bu, mevcut `.container` temel kuralını değiştirmez, sadece yeni custom property'ler ekler.)

- [ ] **Step 5: Testleri çalıştır, hepsinin geçtiğini doğrula**

Run: `npx jest --no-coverage src/app/hesapla/pageStyles.scope.test.ts`
Expected: PASS (tüm testler — diğer `--seal-surface`/`--seal-text` dark/light testleri pozisyona bakmadığı için otomatik geçer).

- [ ] **Step 6: Canlı kontrol — mobil görünüm bozulmamış mı**

Docker + dev server zaten bu oturumda ayakta (`http://localhost:3000`). Playwright ile `/hesapla` sayfasını 375px genişlikte aç, mevcut mobil "Mühür Lacivert" görünümünün (koyu lacivert kart, pirinç/mavi vurgu) DEĞİŞMEDİĞİNİ doğrula (ekran görüntüsü al, önceki oturumlardaki referans görünümle karşılaştır).

- [ ] **Step 7: TypeScript/lint/tam test paketi**

Run: `npx jest --no-coverage src/app/hesapla && npx tsc --noEmit && npx eslint src/app/hesapla`
Expected: hepsi PASS / 0 hata.

- [ ] **Step 8: Commit**

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "refactor: seal token paletini mobil-only kapsamdan sayfa geneline genişlet"
```

---

## Task 4: `HesapOzetiSeridi` sticky özet şeridi bileşeni

Spec'in "C" bölümü. Mobildeki mevcut `topResultCard` JSX'inin yerini alır (aynı davranış + piyasa fiyatı artık inline), masaüstünde YENİ olarak `rightGrid`'in üstüne eklenir (sticky).

**Files:**
- Create: `src/app/hesapla/HesapOzetiSeridi.tsx`
- Test: `src/app/hesapla/HesapOzetiSeridi.test.tsx`
- Modify: `src/app/hesapla/page.module.css` (yeni class'lar)
- Modify: `src/app/hesapla/page.tsx` (eski `topResultCard` JSX'ini değiştir, masaüstüne yeni kullanım ekle)

**Interfaces:**
- Consumes: `SealBadge` (`./SealBadge`, mevcut, değişmiyor), `computeEffectiveLandShareX`'in `page.tsx`'te zaten hesapladığı `effectiveLandShareRatio`.
- Produces: `HesapOzetiSeridiProps` — Task 5 bundan bağımsız, ama ikisi de aynı `result`/`marketPriceNum` verisini okuyor.

- [ ] **Step 1: Başarısız testleri yaz**

`src/app/hesapla/HesapOzetiSeridi.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { HesapOzetiSeridi } from './HesapOzetiSeridi';

describe('HesapOzetiSeridi', () => {
  it('Sd kapalıyken sadece % gösterir, daire detayı göstermez', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={23328000}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={30}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice=""
        onMarketPriceChange={() => {}}
        marketPriceNum={0}
      />
    );
    expect(screen.getByText('%30')).toBeInTheDocument();
    expect(screen.queryByText(/daire\)/)).not.toBeInTheDocument();
  });

  it('Sd açıkken daire detayını da gösterir', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={23328000}
        isApartmentCountEnabled={true}
        effectiveLandSharePercent={30}
        ownerApartmentShare={6}
        totalApartments={20}
        manualMarketPrice=""
        onMarketPriceChange={() => {}}
        marketPriceNum={0}
      />
    );
    expect(screen.getByText('(6/20 daire)')).toBeInTheDocument();
  });

  it('piyasa fiyatı boşken hiçbir SealBadge render edilmez', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={23328000}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={30}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice=""
        onMarketPriceChange={() => {}}
        marketPriceNum={0}
      />
    );
    expect(screen.queryByText(/DAHA UCUZ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/DAHA PAHALI/)).not.toBeInTheDocument();
  });

  it('piyasa fiyatı gerçek FD_total\'dan yüksekse UCUZ rozeti çıkar', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={20000000}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={30}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice="25.000.000"
        onMarketPriceChange={() => {}}
        marketPriceNum={25000000}
      />
    );
    expect(screen.getByText(/DAHA UCUZ/)).toBeInTheDocument();
  });

  it('input değişimi onMarketPriceChange\'i çağırır', () => {
    const handleChange = jest.fn();
    render(
      <HesapOzetiSeridi
        fdTotal={0}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={0}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice=""
        onMarketPriceChange={handleChange}
        marketPriceNum={0}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('gir (opsiyonel)'), { target: { value: '25000000' } });
    expect(handleChange).toHaveBeenCalledWith('25000000');
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npx jest --no-coverage src/app/hesapla/HesapOzetiSeridi.test.tsx`
Expected: FAIL — "Cannot find module './HesapOzetiSeridi'".

- [ ] **Step 3: `HesapOzetiSeridi.tsx`'i yaz**

```tsx
"use client";

import styles from './page.module.css';
import { SealBadge } from './SealBadge';

export interface HesapOzetiSeridiProps {
  fdTotal: number | undefined;
  isApartmentCountEnabled: boolean;
  effectiveLandSharePercent: number;
  ownerApartmentShare: number;
  totalApartments: number;
  manualMarketPrice: string;
  onMarketPriceChange: (value: string) => void;
  marketPriceNum: number;
}

/** Her zaman görünür özet şerit — masaüstünde sticky, mobilde normal blok (bkz. spec 2026-07-24). */
export function HesapOzetiSeridi({
  fdTotal,
  isApartmentCountEnabled,
  effectiveLandSharePercent,
  ownerApartmentShare,
  totalApartments,
  manualMarketPrice,
  onMarketPriceChange,
  marketPriceNum,
}: HesapOzetiSeridiProps) {
  const showCheaper = marketPriceNum > 0 && !!fdTotal && marketPriceNum > fdTotal;
  const showPricier = marketPriceNum > 0 && !!fdTotal && marketPriceNum < fdTotal;

  return (
    <div className={styles.hesapOzetiSeridi}>
      <div className={styles.hesapOzetiFiyat}>
        {fdTotal ? `${Math.round(fdTotal).toLocaleString('tr-TR')} TL` : '---'}
      </div>
      <div className={styles.hesapOzetiArsaPayi}>
        Arsa Payı: <strong>%{Math.round(effectiveLandSharePercent)}</strong>
        {isApartmentCountEnabled && (
          <span className={styles.hesapOzetiArsaPayiDetay}> ({ownerApartmentShare}/{totalApartments} daire)</span>
        )}
      </div>
      <div className={styles.hesapOzetiPiyasa}>
        <label htmlFor="hesapOzetiPiyasaInput">Piyasa Fiyatı:</label>
        <input
          id="hesapOzetiPiyasaInput"
          type="text"
          value={manualMarketPrice}
          onChange={(e) => onMarketPriceChange(e.target.value)}
          placeholder="gir (opsiyonel)"
          className={styles.hesapOzetiPiyasaInput}
        />
      </div>
      <SealBadge
        show={showCheaper}
        percentage={fdTotal ? Math.round(((marketPriceNum - fdTotal) / marketPriceNum) * 100) : 0}
        variant="cheaper"
      />
      <SealBadge
        show={showPricier}
        percentage={fdTotal ? Math.round(((fdTotal - marketPriceNum) / marketPriceNum) * 100) : 0}
        variant="pricier"
      />
    </div>
  );
}
```

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npx jest --no-coverage src/app/hesapla/HesapOzetiSeridi.test.tsx`
Expected: PASS (5 test).

- [ ] **Step 5: CSS class'larını `page.module.css`'e ekle**

`page.module.css:733` (`.rightGrid { ... }` kuralının hemen üstüne, "RESPONSIVE" başlığından önce) ekle:

```css
/* =========================================================================
   HESAP ÖZETİ ŞERİDİ — Her zaman görünür, masaüstünde sticky (2026-07-24)
   ========================================================================= */
.hesapOzetiSeridi {
    grid-column: 1 / -1;
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 16px;
    background: var(--seal-surface);
    border: 1px solid var(--seal-border);
    color: var(--seal-text);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    margin-bottom: 14px;
}

.hesapOzetiFiyat {
    font-size: 1.4rem;
    font-weight: 900;
    font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
}

.hesapOzetiArsaPayi {
    font-size: 0.9rem;
    color: var(--seal-text-muted);
}

.hesapOzetiArsaPayiDetay {
    opacity: 0.75;
}

.hesapOzetiPiyasa {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--seal-text-muted);
}

.hesapOzetiPiyasaInput {
    width: 130px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--seal-border-soft);
    background: transparent;
    color: var(--seal-text);
    font-size: 0.85rem;
}
```

Mobil `@media (max-width: 768px)` bloğunun İÇİNE (blok sonunda herhangi bir yere, örn. mevcut son kurallardan sonra) ekle:

```css
    .hesapOzetiSeridi {
        position: static;
        border-radius: 20px;
        margin: 8px 12px 12px;
    }
```

- [ ] **Step 6: `page.tsx`'te mobil `topResultCard` JSX'ini `HesapOzetiSeridi` ile değiştir**

Eski (`page.tsx:614-631`):
```tsx
            {isResultsRevealed && (
              <div className={styles.topResultCard}>
                <div className={styles.topResultLabel}>MİNİMUM DAİRE FİYATI</div>
                <div className={styles.topResultValue}>
                  {result?.FD_total ? `${Math.round(result.FD_total).toLocaleString('tr-TR')} TL` : '---'}
                </div>
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
              </div>
            )}
```

Yeni:
```tsx
            {isResultsRevealed && (
              <HesapOzetiSeridi
                fdTotal={result?.FD_total}
                isApartmentCountEnabled={isApartmentCountEnabled}
                effectiveLandSharePercent={effectiveLandShareRatio}
                ownerApartmentShare={ownerApartmentShare}
                totalApartments={totalApartments}
                manualMarketPrice={manualMarketPrice}
                onMarketPriceChange={setManualMarketPrice}
                marketPriceNum={marketPriceNum}
              />
            )}
```

`page.tsx` import bloğuna (`SealBadge` import satırının altına) ekle:
```tsx
import { HesapOzetiSeridi } from './HesapOzetiSeridi';
```

(Not: `SealBadge` importu artık `page.tsx` içinde doğrudan kullanılmıyor olabilir — Task 5'ten sonra `blueBox` da kaldırılınca kontrol edilecek, gerekirse import satırı silinecek. Şimdilik dokunma, TypeScript "unused import" hatası verirse Step 8'de yakalanır.)

- [ ] **Step 7: Masaüstüne yeni kullanım ekle**

`page.tsx:694` (`<section className={styles.rightGrid}>` açılışının hemen altına) ekle:

```tsx
        <section className={styles.rightGrid}>
          <HesapOzetiSeridi
            fdTotal={result?.FD_total}
            isApartmentCountEnabled={isApartmentCountEnabled}
            effectiveLandSharePercent={effectiveLandShareRatio}
            ownerApartmentShare={ownerApartmentShare}
            totalApartments={totalApartments}
            manualMarketPrice={manualMarketPrice}
            onMarketPriceChange={setManualMarketPrice}
            marketPriceNum={marketPriceNum}
          />

          {/* Main Panel */}
```

- [ ] **Step 8: TypeScript/lint kontrolü, unused import varsa temizle**

Run: `npx tsc --noEmit`
Expected: 0 hata. Eğer `SealBadge` importu artık kullanılmıyor hatası verirse, `page.tsx`'ten o import satırını sil.

Run: `npx eslint src/app/hesapla`
Expected: 0 ihlal.

- [ ] **Step 9: Tüm hesapla testlerini çalıştır**

Run: `npx jest --no-coverage src/app/hesapla`
Expected: PASS.

- [ ] **Step 10: Canlı kontrol — masaüstünde sticky davranış**

Playwright ile `/hesapla`'yı 1600px genişlikte aç, aşağı scroll et, yeni özet şeridin ekranın üstünde sabit kaldığını doğrula (ekran görüntüsü, scroll öncesi/sonrası).

- [ ] **Step 11: Commit**

```bash
git add src/app/hesapla/HesapOzetiSeridi.tsx src/app/hesapla/HesapOzetiSeridi.test.tsx src/app/hesapla/page.module.css src/app/hesapla/page.tsx
git commit -m "feat: HesapOzetiSeridi bileşenini ekle (masaüstünde sticky, mobilde normal blok)"
```

---

## Task 5: `HesapFisi` fiş bileşeni + ölü `.blueBox` kodunun temizliği

Spec'in "A" bölümü. Mevcut `blueBox` sayısal alanının yerini alır; her zaman açık, Mi→Ma→M→FD→FDbirim→(FA) satır satır.

**Files:**
- Create: `src/app/hesapla/HesapFisi.tsx`
- Test: `src/app/hesapla/HesapFisi.test.tsx`
- Modify: `src/app/hesapla/page.module.css` (yeni class'lar + ölü `.blueBox*`/`.blueCircle` kuralları silinir)
- Modify: `src/app/hesapla/page.tsx` (`blueBox` JSX'i değiştir)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (artık geçersiz `.blueBox` mobil-gizleme testini kaldır)

**Interfaces:**
- Consumes: `CalculationOutput` (`@/lib/calculator/engine_v2`, değişmiyor).
- Produces: `HesapFisiProps` — sadece `result: CalculationOutput | null` alır.

- [ ] **Step 1: Başarısız testleri yaz**

`src/app/hesapla/HesapFisi.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { HesapFisi } from './HesapFisi';
import { CalculationOutput } from '@/lib/calculator/engine_v2';

const baseResult: CalculationOutput = {
  Mi_base: 12000000,
  Mz: 0,
  Z: 0,
  Mi: 12000000,
  Ma: 5142857,
  M: 17142857,
  FD_total: 22285714,
  FD_per_m2: 159183,
  Sdx: null,
  FA: null,
  FAbirim: null,
};

describe('HesapFisi', () => {
  it('result null iken tüm satırlarda "—" gösterir', () => {
    render(<HesapFisi result={null} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('Mi, Ma, M, FD, FDbirim satırlarını gösterir', () => {
    render(<HesapFisi result={baseResult} />);
    expect(screen.getByText('12.000.000 TL')).toBeInTheDocument();
    expect(screen.getByText('5.142.857 TL')).toBeInTheDocument();
    expect(screen.getByText('17.142.857 TL')).toBeInTheDocument();
    expect(screen.getByText('22.285.714 TL')).toBeInTheDocument();
    expect(screen.getByText('159.183 TL/m²')).toBeInTheDocument();
  });

  it('FA null iken Arsa Fiyatı satırı hiç render edilmez', () => {
    render(<HesapFisi result={baseResult} />);
    expect(screen.queryByText(/Arsa Fiyatı \(FA\)/)).not.toBeInTheDocument();
  });

  it('FA doluyken Arsa Fiyatı satırı render edilir', () => {
    render(<HesapFisi result={{ ...baseResult, FA: 133714284, Sdx: 6 }} />);
    expect(screen.getByText(/Arsa Fiyatı \(FA\)/)).toBeInTheDocument();
    expect(screen.getByText('133.714.284 TL')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npx jest --no-coverage src/app/hesapla/HesapFisi.test.tsx`
Expected: FAIL — "Cannot find module './HesapFisi'".

- [ ] **Step 3: `HesapFisi.tsx`'i yaz**

```tsx
"use client";

import styles from './page.module.css';
import { CalculationOutput } from '@/lib/calculator/engine_v2';

export interface HesapFisiProps {
  result: CalculationOutput | null;
}

/** Her zaman açık hesap dökümü — izlenebilirlik = güven (bkz. spec 2026-07-24). */
export function HesapFisi({ result }: HesapFisiProps) {
  const fmt = (n: number) => Math.round(n).toLocaleString('tr-TR');

  return (
    <div className={styles.hesapFisi}>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>İnşaat Maliyeti (Mi)</span>
        <span>{result ? fmt(result.Mi) : '—'} TL</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Arsa Maliyeti (Ma)</span>
        <span>{result ? fmt(result.Ma) : '—'} TL</span>
      </div>
      <div className={`${styles.hesapFisiRow} ${styles.hesapFisiRowTotal}`}>
        <span className={styles.hesapFisiRowLabel}>Toplam Maliyet (M)</span>
        <span>{result ? fmt(result.M) : '—'} TL</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Daire Fiyatı (FD)</span>
        <span>{result ? fmt(result.FD_total) : '—'} TL</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Daire Birim (FDbirim)</span>
        <span>{result ? fmt(result.FD_per_m2) : '—'} TL/m²</span>
      </div>
      {result?.FA != null && (
        <div className={`${styles.hesapFisiRow} ${styles.hesapFisiRowTotal}`}>
          <span className={styles.hesapFisiRowLabel}>Arsa Fiyatı (FA)</span>
          <span>{fmt(result.FA)} TL</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npx jest --no-coverage src/app/hesapla/HesapFisi.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 5: CSS class'larını ekle**

`page.module.css:400` (`/* Blue Box (Price Hero) ... */` yorumundan hemen önce) ekle:

```css
/* Hesap Fişi — izlenebilir Mi→Ma→M→FD dökümü, her zaman açık */
.hesapFisi {
    margin: 0 16px;
    padding: 16px;
    border-radius: 20px;
    background: var(--seal-surface);
    border: 1px solid var(--seal-border-soft);
    color: var(--seal-text);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
}

.hesapFisiRow {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 0.9rem;
    font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    border-bottom: 1px solid var(--seal-border-soft);
}

.hesapFisiRow:last-child {
    border-bottom: none;
}

.hesapFisiRowLabel {
    color: var(--seal-text-muted);
    font-family: inherit;
}

.hesapFisiRowTotal {
    font-weight: 900;
    font-size: 1.05rem;
    border-top: 1px solid var(--seal-border);
    margin-top: 4px;
    padding-top: 10px;
}
```

- [ ] **Step 6: Ölü `.blueBox*`/`.blueCircle` CSS kurallarını sil**

`page.module.css`'ten şu blokları TAMAMEN sil (Task 3'ten sonraki güncel satır numaraları kaymış olabilir, `.blueBox` metnini arayarak bul):

1. `.blueBox { ... }`, `.blueBox:hover { ... }` (eski 402-427)
2. `.blueBox::after { ... }`, `.blueBox::before { ... }`, `@keyframes heroShimmer { ... }` (eski 429-466)
3. `.blueBoxTop { ... }`, `.blueBoxTop h2 { ... }`, `.blueBoxTop h2 span { ... }`, `.blueBoxTop>span { ... }` (eski 468-500)
4. `.blueBoxBottom { ... }` (eski 502-511)
5. `.blueCircle { ... }` (eski 513-519)
6. Mobil `@media` bloğu içindeki `.blueBoxTop h2 { ... }`, `.blueBoxBottom { ... }`, `.blueCircle { ... }` override'ları:
```css
    .blueBoxTop h2 {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
        font-size: 2rem; /* mevcut mobil override ile aynı deger, sadece font eklendi */
    }

    .blueBoxBottom {
        background: rgba(var(--seal-accent-rgb), 0.14);
    }

    .blueCircle {
        background: var(--brand-gradient);
    }
```
7. Mobil bloktaki `.blueBox { margin: 0 8px; }` kuralı
8. Mobil bloktaki `.blueBox { display: none; }` kuralı (bu kuralın HEMEN ALTINDAKİ `.sliderArea { display: none; }` kuralına DOKUNMA — o hâlâ geçerli):
```css
    .blueBox {
        display: none;
    }

    .sliderArea {
        display: none;
    }
```
Bu bloktan sadece `.blueBox { display: none; }` kısmını sil, `.sliderArea { display: none; }` AYNEN KALSIN.

- [ ] **Step 7: `page.tsx`'te `blueBox` JSX'ini `HesapFisi` ile değiştir**

Eski (`page.tsx:700-709`):
```tsx
            <div className={styles.blueBox}>
              <div className={styles.blueBoxTop}>
                <h2>{result ? result.FD_total.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '0'}<span>TL</span></h2>
                <span>📐 {result ? result.FD_per_m2.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '0'} TL / m²</span>
              </div>
              <div className={styles.blueBoxBottom}>
                <div className={styles.blueCircle}></div>
                <strong>{result ? result.FD_per_m2.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '0'} TL / m²</strong>
              </div>
            </div>
```

Yeni:
```tsx
            <HesapFisi result={result} />
```

`page.tsx` import bloğuna ekle:
```tsx
import { HesapFisi } from './HesapFisi';
```

- [ ] **Step 8: `pageStyles.scope.test.ts`'ten artık geçersiz `.blueBox` testini kaldır**

`describe('tekrarlayan sonuç/slider gizleme kapsamı', ...)` bloğu içindeki (Task 1 öncesi orijinal satır 78-84):
```ts
  it('.blueBox mobilde gizlenmeli, kural mobil media query içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const blueBoxHideMatch = pageCss.match(/\.blueBox\s*\{[^}]*display:\s*none/);
    expect(blueBoxHideMatch).not.toBeNull();
    expect(blueBoxHideMatch!.index).toBeGreaterThan(lastMobileMediaIndex);
  });
```
bu `it` bloğunu TAMAMEN SİL (aynı `describe` içindeki `.sliderArea` testi AYNEN KALSIN).

Aynı `describe` bloğunun içine, silinen testin yerine yeni bir regresyon testi ekle:
```ts
  it('.blueBox artık hiç kullanılmamalı — HesapFisi bileşeni onun yerini aldı (2026-07-24)', () => {
    expect(pageCss).not.toMatch(/\.blueBox\b/);
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/styles\.blueBox\b/);
    expect(pageTsx).toMatch(/<HesapFisi result={result} \/>/);
  });
```

- [ ] **Step 9: Tüm testleri çalıştır**

Run: `npx jest --no-coverage src/app/hesapla`
Expected: PASS.

- [ ] **Step 10: TypeScript/lint kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx eslint src/app/hesapla`
Expected: 0 ihlal.

- [ ] **Step 11: Commit**

```bash
git add src/app/hesapla/HesapFisi.tsx src/app/hesapla/HesapFisi.test.tsx src/app/hesapla/page.module.css src/app/hesapla/page.tsx src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat: HesapFisi bileşenini ekle, ölü blueBox kodunu temizle"
```

---

## Task 6: Final doğrulama — tam test paketi + canlı Playwright (masaüstü + mobil)

**Files:** yok (sadece doğrulama, kod değişikliği yok — bir bulgu çıkarsa küçük düzeltme committen).

- [ ] **Step 1: Tam otomatik test paketi**

Run: `npx jest --no-coverage`
Expected: tüm proje testleri PASS (önceki oturumdaki 194+ testin hepsi, artı bu plandaki ~25 yeni test).

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx eslint .`
Expected: 0 ihlal.

Run: `npm run build`
Expected: build başarıyla tamamlanır.

- [ ] **Step 2: Docker + dev server ayakta mı kontrol et**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/hesapla
```
Expected: `HTTP 200`. Değilse `npm run dev:db` + `npm run dev:next` ile yeniden başlat.

- [ ] **Step 3: Playwright — masaüstü (1600px), Sd kapalı (varsayılan) senaryo**

`/hesapla` sayfasını aç, "Toplam Daire Sayısı" toggle'ının KAPALI geldiğini doğrula, % slider'ı sürükle, üstteki `HesapOzetiSeridi`'nin ve `HesapFisi`'nin canlı güncellendiğini, aşağı scroll edince şeridin sabit kaldığını ekran görüntüsüyle doğrula.

- [ ] **Step 4: Playwright — masaüstü, Sd açık senaryo (asıl bug'ın regresyon kanıtı)**

"Toplam Daire Sayısı" toggle'ını aç, toplam daireyi 20 yap, "Arsa Sahibine Düşen Daire" slider'ını 6'ya çek. `HesapOzetiSeridi`'de "%30 (6/20 daire)" ve `HesapFisi`'de "Arsa Fiyatı (FA)" satırının göründüğünü doğrula. Toplam daireyi sonradan 5'e düşür, `ownerApartmentShare`'in 5'e clamp edildiğini (6 değil) doğrula.

- [ ] **Step 5: Playwright — piyasa fiyatı boş/dolu senaryosu**

Sayfa ilk açıldığında piyasa fiyatı alanının BOŞ olduğunu ve hiçbir "DAHA UCUZ/PAHALI" rozetinin görünmediğini doğrula. `HesapOzetiSeridi`'deki piyasa fiyatı input'una bir değer gir, rozetin doğru yönde (ucuz/pahalı) çıktığını doğrula.

- [ ] **Step 6: Playwright — mobil (375px)**

`/hesapla`'yı 375px'te aç, "Sonuçları Göster" butonuna basmadan önce özet şeridin/fişin GÖRÜNMEDİĞİNİ, basınca ikisinin de göründüğünü, mobil "Mühür Lacivert" görsel kimliğinin (koyu lacivert/cam kart) korunduğunu ekran görüntüsüyle doğrula.

- [ ] **Step 7: Grafik tutarlılığı doğrulaması**

Sayfada bir ilçe seç (LocationSelector, `globalUnitPrice` değişsin), "Hassasiyet & Kırılma" sekmesine geç (`summaryPage=1`), `SensitivityChart`/`BreakEvenChart`'ın artık ana sonuçla (aynı `P` değeriyle) tutarlı bir eğri gösterdiğini doğrula (görsel kontrol — çizgideki x=mevcut arsa payı noktasının `HesapFisi`'deki FD_total'a yakın olduğunu gözle kontrol et).

- [ ] **Step 8: Bulgu varsa düzelt, yoksa özet raporla**

Adım 3-7'de bir sorun bulunursa küçük bir düzeltme + `git commit` yap. Sorun yoksa hiçbir commit gerekmez — bu task sadece doğrulama.
