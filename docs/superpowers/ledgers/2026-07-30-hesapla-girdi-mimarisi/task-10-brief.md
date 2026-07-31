### Task 10: Final doğrulama

**Files:** yok (bulgu çıkarsa düzeltme commit'i)

- [ ] **Step 1: Tam komut paketi**

```bash
npx tsc --noEmit
npx jest --no-coverage
npx eslint src
npm run build
```
Beklenen: tsc 0; tüm testler geçer; eslint **12 problem** (2 hata/10 uyarı — baseline, hiçbiri bu planın dosyalarında); build başarılı.

- [ ] **Step 2: Spec §8'in üç zorunlu doğrulaması (canlı, 390×844)**

Spec bu üçünü açıkça zorunlu kılıyor çünkü A1 turunda **ekran görüntüsü ve `getByRole` dört gerçek kusurun dördünü de kaçırdı**; yakalayanlar hesaplanmış stil okuması ve simüle edilmiş jest oldu.

1. **Yaprak kaydırma jesti:** `4f` açıkken içerik tekerlek/dokunmayla kaydırılıyor, `scrollTop` `maxScroll`a ulaşıyor, yaprak kapanmıyor, `Ayarları uygula ve kapat` görünür alana geliyor.
2. **Computed-style:** `HesapFişi` mobil ağaçta zemin ve ayraç alıyor — `backgroundColor` şeffaf DEĞİL, `borderTopWidth` 0 DEĞİL.
3. **Davranış:** ilçe seçilince birim maliyet **ve** piyasa fiyatı doluyor; elle ezme kaynak etiketini "Elle girildi"ye çeviriyor; ilçe değişince yeniden doluyor; konum temizlenince varsayılana dönüyor.

- [ ] **Step 3: Tek kapı ve sadeleşme kontrolü**

```bash
grep -rn "SekmeSecici\|sekmeKap\|MobilSekme" src/ || echo "sekme seridi kalintisi yok"
grep -rn "aria-label=\"Gelişmiş ayarlar\"" src/ || echo "baslikaki disli kalmadi"
```
Beklenen: ikisi de boş. Ekranda gelişmiş ayarlara **tek** giriş olmalı.

- [ ] **Step 4: Masaüstü regresyon**

1440×900'de `/hesapla`: düzen değişmemiş; `LocationSelector`, birim maliyet satırı ve `MarketField` sidebar'da görünür; `FormulParamsFields` çekmecede eskisi gibi çalışıyor (daire sayısı + arsa alanı birlikte).

- [ ] **Step 5: Erişilebilirlik**

Dokunma hedefleri ≥44px (kutu yüksekliği değil, `elementFromPoint` ile **gerçek vuruş alanı** — `NEXTJS-PORTAL` dev-only katmanını sayma); yeni girişlerin `aria-label`ı var; `prefers-reduced-motion` altında hareket kapalı.

- [ ] **Step 6: Bulgular varsa düzelt ve commit et**

```bash
git add -- src docs
git commit -m "fix(hesapla): final dogrulamada bulunan kusurlar giderildi"
```

**NOT:** `git add -A` KULLANMA — bu depoda takipsiz `hatalar/` ve ~12 MB kullanılamaz `public/images/**` PNG seti var, sessizce staging'e girer.

---

## Notlar

- **origin ölü** (`github.com/XMYRA6/arsabil.git` → "Repository not found"). Bu plan yalnızca lokal commit üretir; push denenmeyecek.
- **A1'in açık bıraktığı kalemler bu planla kapanır:** C2 (mobil özellik kaybı — Task 6/7/9) ve I4 (kontrol çoğaltması — Task 5).
- **Bu planda OLMAYAN, ayrı spec bekleyen işler:** aramalı parsel sorgu ekranı (Parça 1), masaüstü yerleşiminin yeniden tasarımı ve `HesapFişi` sunumu (Parça 3), senaryo karşılaştırma (Parça 4).
- Kalan düşük öncelikli A1 minor'ları: güvenli alan artığı, `.girdiEtiket` tipografisi, spec §7 basma geri bildirimi, memoization. `task-11-acik-kalemler.md`de kayıtlı.
