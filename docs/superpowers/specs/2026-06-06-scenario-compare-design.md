# ArsaBil — ScenarioCompare Aktivasyonu

**Tarih:** 2026-06-06  
**Kapsam:** `/hesapla` sayfasına oturum bazlı senaryo karşılaştırma özelliği eklenmesi  

---

## Hedef

Kullanıcı `/hesapla` sayfasında farklı parametrelerle hesap yaparken "bu sonucu karşılaştırmak istiyorum" diyebilmeli, en fazla 3 senaryoyu yan yana görebilmeli. Veritabanı veya giriş gerektirmez — oturum bazlıdır, sayfa yenilenince sıfırlanır.

---

## Kararlar

| Konu | Karar |
|------|-------|
| Konum | `/hesapla` sayfası — sonuç panelinin action butonları yanında |
| Senaryo adı | Otomatik: "Senaryo 1", "Senaryo 2", "Senaryo 3" |
| Maksimum | 3 senaryo |
| Kalıcılık | Oturum bazlı (`useState`) — DB yok |
| Mevcut bileşen | `ScenarioCompare.tsx` değiştirilmiyor, sadece bağlanıyor |

---

## Mimari

```
src/app/hesapla/page.tsx          ← Ana değişiklik
src/components/ScenarioCompare.tsx ← Bug fix (luxLabels 1.5→1.4)
```

### State Eklemesi (`hesapla/page.tsx`)

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

const [savedScenarios, setSavedScenarios] = useState<ScenarioItem[]>([]);
```

### Senaryo Ekleme Fonksiyonu

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

---

## UI Değişiklikleri

### 1. Action Butonu (`actionBottomRow`)

Mevcut PDF ve Kaydet butonlarının yanına yeşil "**+ Karşılaştır**" butonu eklenir:

- 3 senaryo dolunca `disabled` + tooltip: "Maksimum 3 senaryo"
- `result` yokken `disabled`
- Renk: yeşil (`--green` değişkeni)

### 2. Senaryo Etiket Satırı

`actionBottomRow`'un altında, `savedScenarios.length > 0` olunca görünür:

```
[Senaryo 1 ×]  [Senaryo 2 ×]  [Senaryo 3 ×]
```

- Her etiket pill şeklinde, `×` ile silinebilir
- Renkler: Senaryo 1 mavi, Senaryo 2 yeşil, Senaryo 3 turuncu

### 3. Karşılaştırma Tablosu

`savedScenarios.length >= 2` olunca `<ScenarioCompare>` bölümü açılır:

```tsx
{savedScenarios.length >= 2 && (
  <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
    <h3>Senaryo Karşılaştırması</h3>
    <ScenarioCompare scenarios={savedScenarios} />
  </div>
)}
```

---

## Bug Fix

`src/components/ScenarioCompare.tsx` satır 37:

```tsx
// Önce (hatalı — Lüks değeri 1.4 ama tablo 1.5 arıyor):
const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.5: 'Lüks' };

// Sonra (doğru):
const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.4: 'Lüks' };
```

---

## Kapsam Dışı

- Senaryo adı düzenleme (kullanıcı tıklayıp değiştiremez — YAGNI)
- Senaryoları kaydetme / DB'ye yazma
- Senaryolar arası parametre farkı vurgulama (renk kodlama)
- Sessionstorage kalıcılığı
