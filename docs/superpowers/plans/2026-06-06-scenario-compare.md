# ScenarioCompare Aktivasyonu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/hesapla` sayfasında oturum bazlı senaryo karşılaştırma özelliğini etkinleştir — mevcut `ScenarioCompare.tsx` bileşenini state ve UI ile bağla.

**Architecture:** `hesapla/page.tsx` dosyasına `ScenarioItem[]` state ve iki handler (`handleAddScenario`, `handleRemoveScenario`) eklenir. Kullanıcı sonuç panelindeki "+ Karşılaştır" butonuna basınca mevcut hesap anlık olarak yakalanır; 2+ senaryo eklenince `ScenarioCompare` tablosu açılır. Hiç DB yazımı yoktur — `useState` ile oturum bazlı çalışır.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules (`page.module.css`), `src/components/ScenarioCompare.tsx` (mevcut)

---

## File Map

| Dosya | Değişiklik |
|-------|-----------|
| `src/components/ScenarioCompare.tsx` | Bug fix: `luxLabels` satır 37 → `1.5` yerine `1.4` |
| `src/app/hesapla/page.tsx` | `ScenarioItem` interface, import, state, handler'lar, UI (buton + pill'ler + tablo render) |

---

### Task 1: luxLabels bug fix

**Files:**
- Modify: `src/components/ScenarioCompare.tsx:37`

`ScenarioCompare.tsx` satır 37'de `luxLabels` map'i `1.5` değerini Lüks olarak arıyor. Ama `hesapla/page.tsx`'te Lüks seçeneğinin değeri `1.4` (`luxLevel` state başlangıcı: `useState<number>(1.4)`). Bu yüzden Lüks senaryo eklenince "Kalite" sütunu boş kalır.

- [ ] **Step 1: Fix luxLabels key**

`src/components/ScenarioCompare.tsx` satır 37'yi değiştir:

```tsx
// ÖNCE (hatalı):
const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.5: 'Lüks' };

// SONRA (doğru):
const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.4: 'Lüks' };
```

- [ ] **Step 2: TypeScript kontrolü**

```powershell
cd C:\Users\emre\Desktop\arsabil-main
npx tsc --noEmit
```

Beklenen: Hata çıkmamalı (ya da halihazırda mevcut hataların sayısı artmamalı).

- [ ] **Step 3: Commit**

```bash
git add src/components/ScenarioCompare.tsx
git commit -m "fix: luxLabels Lüks key 1.5→1.4 in ScenarioCompare"
```

---

### Task 2: ScenarioItem state ve handler'lar

**Files:**
- Modify: `src/app/hesapla/page.tsx`

`hesapla/page.tsx`'e `ScenarioItem` interface'i, `ScenarioCompare` import'u, `savedScenarios` state'i ve iki handler ekle.

- [ ] **Step 1: ScenarioCompare import ekle**

`src/app/hesapla/page.tsx` dosyasının import bloğuna (satır ~22 civarı, `generatePdfReport` import'undan hemen sonra) şunu ekle:

```tsx
import { ScenarioCompare } from '@/components/ScenarioCompare';
```

- [ ] **Step 2: ScenarioItem interface ekle**

`src/app/hesapla/page.tsx`'te mevcut interface'lerin (satır ~37, `RiskLevel` interface kapanışından hemen sonra) altına ekle:

```tsx
interface ScenarioItem {
  id: string;
  name: string;
  luxLevel: number;
  apartmentSize: number;
  landShareRatio: number;
  totalApartments?: number;
  riskLevel: number;
  builderProfit: number;
  fdTotal: number;
  fdPerM2: number;
  mi: number;
  ma: number;
  totalCost: number;
  fa?: number;
  sdx?: number;
}
```

- [ ] **Step 3: savedScenarios state ekle**

`src/app/hesapla/page.tsx`'te `showAuthModal` state satırından (satır ~70: `const [showAuthModal, setShowAuthModal] = useState(false);`) hemen sonrasına ekle:

```tsx
const [savedScenarios, setSavedScenarios] = useState<ScenarioItem[]>([]);
```

- [ ] **Step 4: handleAddScenario ve handleRemoveScenario handler'larını ekle**

`src/app/hesapla/page.tsx`'te `handlePdfDownload` fonksiyonundan (satır ~205) hemen sonrasına ekle:

```tsx
const handleAddScenario = () => {
  if (!result || savedScenarios.length >= 3) return;
  setSavedScenarios(prev => [...prev, {
    id: Date.now().toString(),
    name: `Senaryo ${prev.length + 1}`,
    luxLevel,
    apartmentSize,
    landShareRatio: landShareRatio / 100,
    totalApartments: isApartmentCountEnabled ? totalApartments : undefined,
    riskLevel: riskLevel > 0 ? 1 + riskLevel / 100 : 1,
    builderProfit,
    fdTotal: result.FD_total,
    fdPerM2: result.FD_per_m2,
    mi: result.Mi,
    ma: result.Ma,
    totalCost: result.M,
    fa: result.FA ?? undefined,
    sdx: result.Sdx ?? undefined,
  }]);
};

const handleRemoveScenario = (id: string) => {
  setSavedScenarios(prev => prev.filter(s => s.id !== id));
};
```

- [ ] **Step 5: TypeScript kontrolü**

```powershell
cd C:\Users\emre\Desktop\arsabil-main
npx tsc --noEmit
```

Beklenen: Hata çıkmamalı.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/page.tsx
git commit -m "feat: add ScenarioItem state and handlers to hesapla page"
```

---

### Task 3: UI — buton, pill'ler ve karşılaştırma tablosu

**Files:**
- Modify: `src/app/hesapla/page.tsx:635-644`

Üç UI değişikliği yapılır: (a) `actionBottomRow`'a yeşil "+ Karşılaştır" butonu ekle, (b) pill etiket satırı ekle, (c) ScenarioCompare tablosunu render et.

- [ ] **Step 1: "+ Karşılaştır" butonunu actionBottomRow'a ekle**

`src/app/hesapla/page.tsx` satır 635-644'teki `actionBottomRow` div'ini bul:

```tsx
<div className={styles.actionBottomRow}>
  <Button variant="outline" onClick={handlePdfDownload} disabled={!result}>
    <svg ...></svg>
    PDF İndir
  </Button>
  <Button variant="primary" onClick={handleSaveReport} disabled={isSaving}>
    <svg ...></svg>
    {isSaving ? 'Kaydediliyor...' : 'Rapor Kaydet'}
  </Button>
</div>
```

`Rapor Kaydet` `Button`'ından hemen sonra (kapanış `</Button>` tag'inden sonra, `actionBottomRow` kapanışından önce) şunu ekle:

```tsx
<Button
  variant="outline"
  onClick={handleAddScenario}
  disabled={!result || savedScenarios.length >= 3}
  title={savedScenarios.length >= 3 ? 'Maksimum 3 senaryo' : undefined}
  style={{ color: 'var(--green)', borderColor: 'var(--green)', background: 'rgba(47, 191, 113, 0.08)' }}
>
  + Karşılaştır
</Button>
```

- [ ] **Step 2: Pill etiket satırını ekle**

`actionBottomRow` kapanış `</div>` tag'inden hemen sonra (satır ~644'ten hemen sonra, `</main>` tag'inden önce) şunu ekle:

```tsx
{savedScenarios.length > 0 && (
  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
    {savedScenarios.map((s, i) => {
      const colors = [
        { bg: 'rgba(31,111,235,0.1)', border: 'var(--primary)', text: 'var(--primary)' },
        { bg: 'rgba(47,191,113,0.1)', border: 'var(--green)', text: 'var(--green)' },
        { bg: 'rgba(251,146,60,0.1)', border: '#fb923c', text: '#fb923c' },
      ];
      const c = colors[i % 3];
      return (
        <span key={s.id} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '20px',
          background: c.bg, border: `1px solid ${c.border}`,
          fontSize: '0.8rem', fontWeight: 700, color: c.text,
        }}>
          {s.name}
          <button
            onClick={() => handleRemoveScenario(s.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: 0, lineHeight: 1, fontSize: '1rem' }}
            title={`${s.name}'i kaldır`}
          >×</button>
        </span>
      );
    })}
  </div>
)}
```

- [ ] **Step 3: ScenarioCompare tablosunu render et**

Pill satırından hemen sonra (yukarıdaki JSX bloğundan sonra, `</main>` tag'inden önce) şunu ekle:

```tsx
{savedScenarios.length >= 2 && (
  <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
    <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: 'var(--card-title)' }}>
      Senaryo Karşılaştırması
    </h3>
    <ScenarioCompare scenarios={savedScenarios} />
  </div>
)}
```

- [ ] **Step 4: TypeScript kontrolü**

```powershell
cd C:\Users\emre\Desktop\arsabil-main
npx tsc --noEmit
```

Beklenen: Hata çıkmamalı.

- [ ] **Step 5: Görsel kontrol**

Dev sunucusu çalışıyorsa `http://localhost:3000/hesapla` adresine git:
1. Hesap yap (herhangi bir parametre)
2. "+ Karşılaştır" butonuna tıkla → "Senaryo 1" pill'i görünmeli
3. Parametreleri değiştir, tekrar tıkla → "Senaryo 2" pill'i görünmeli + tablo açılmalı
4. Üçüncü senaryo ekle → "Senaryo 3" pill'i görünmeli, buton disabled olmalı
5. Pill'deki "×" ile bir senaryoyu sil → tablo 2 senaryo ile güncellenmeli
6. Son senaryoyu sil → tablo kapanmalı, buton tekrar aktif olmalı
7. Lüks kalite seçip senaryo ekle → tabloda "Kalite" satırı "Lüks" göstermeli (Task 1 fix doğrulaması)

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/page.tsx
git commit -m "feat: wire up ScenarioCompare with button, pills, and compare table"
```

---

## Self-Review Notları

**Spec coverage:**
- ✅ luxLabels bug fix → Task 1
- ✅ ScenarioItem interface → Task 2, Step 2
- ✅ savedScenarios state → Task 2, Step 3
- ✅ handleAddScenario → Task 2, Step 4
- ✅ handleRemoveScenario → Task 2, Step 4
- ✅ "+ Karşılaştır" button (disabled at 3, disabled when no result) → Task 3, Step 1
- ✅ Pill etiket satırı (renkli, ×) → Task 3, Step 2
- ✅ ScenarioCompare render (2+ senaryo) → Task 3, Step 3
- ✅ Otomatik isim (Senaryo 1/2/3) → handleAddScenario içinde `prev.length + 1`

**Type consistency:**
- `ScenarioItem.riskLevel` → `riskLevel > 0 ? 1 + riskLevel / 100 : 1` — `ScenarioCompare.tsx` bu değeri doğrudan render'da kullandığı için dönüşüm burada yapılıyor
- `ScenarioItem.landShareRatio` → `landShareRatio / 100` — `ScenarioCompare.tsx` satır 42: `(s.landShareRatio * 100).toFixed(0)` bekliyor, yani 0-1 arasında olmalı
- `ScenarioCompare` prop'u `scenarios: Scenario[]` bekliyor; `ScenarioItem` aynı shape'e sahip — TS assignment compatible
