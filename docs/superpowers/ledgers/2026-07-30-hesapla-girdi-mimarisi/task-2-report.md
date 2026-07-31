# Task 2 Report — KonumBlogu

## Ozet

`KonumBlogu` bileseni olusturuldu: il/ilce secimi (LocationSelector sarmalayici) +
gorunur/ezilebilir birim maliyet satiri + parsel kademesi (yalnizca resmi risk
verisi tetikler, fiyatlara dokunmaz). Brief'in adim adim TDD akisi aynen izlendi;
kod ve CSS brief'ten karakter-karakter kopyalandi, hicbir sapma yapilmadi.

## Uygulanan dosyalar

- Create: `src/app/hesapla/mobile/KonumBlogu.tsx`
- Test: `src/app/hesapla/mobile/KonumBlogu.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css` (yeni kurallar `.girdiEtiket`
  bloğundan hemen sonra, `@media (max-width: 768px)` icinde eklendi)

## On kontroller (implementasyondan once)

- `src/app/hesapla/mobile/unitPriceSource.ts` okundu: `kaynakEtiketi` imzasi ve
  cikti formatlari brief'teki ile birebir eslesiyor.
- `src/components/LocationSelector.tsx` okundu: `DistrictPriceEntry` ve
  `LocationSelectorProps` brief'teki imzayla birebir ayni (districtPrices,
  selectedIl, selectedIlce, onIlChange, onIlceChange, onClear). Dosyaya
  DOKUNULMADI.
- `src/components/icons/index.tsx` okundu: `IconPin`, `IconChevronRight`,
  `IconCheckCircle` mevcut, `{ size?, className?, strokeWidth? }` imzasiyla.
- `src/app/globals.css` icinde `--m-r-input: 16px` (satir 225) ve `.mNum`
  (satir 256) tanimlari dogrulandi — CSS'te kullanilan degiskenler gercek.
- Mevcut `mobile.module.css` ve `mobileStyles.scope.test.ts` okunarak medya
  sorgusu siniri ve guard mantigi anlasildi.

## TDD Kaniti

### RED

Komut: `npx jest src/app/hesapla/mobile/KonumBlogu --no-coverage`

```
FAIL src/app/hesapla/mobile/KonumBlogu.test.tsx
  ● Test suite failed to run
    Cannot find module './KonumBlogu' from 'src/app/hesapla/mobile/KonumBlogu.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```

Beklenen tam olarak buydu: bilesen dosyasi henuz yoktu, brief'in Adim 2'sinde
belirtilen "Cannot find module './KonumBlogu'" hatasiyla birebir eslesti.

### GREEN

Bilesen (`KonumBlogu.tsx`) ve CSS (`mobile.module.css`) brief'teki kod
karakter-karakter kopyalanarak yazildi.

Komut: `npx jest src/app/hesapla/mobile/KonumBlogu --no-coverage`

```
PASS src/app/hesapla/mobile/KonumBlogu.test.tsx
  KonumBlogu
    √ birim maliyeti ve KAYNAGINI gosterir (60 ms)
    √ elle girilen deger kaynak etiketinde belirtilir (11 ms)
    √ degistir butonu birim maliyet girisini acar (150 ms)
    √ girilen deger onBirimMaliyet ile bildirilir (290 ms)
    √ gecersiz giris bildirilmez (139 ms)
    √ parsel kademesi ISTEGE BAGLI oldugunu soyler ve tetikler (31 ms)
    √ parsel isaretliyse durumu bildirir (8 ms)
    √ ilce fiyat verisi yoksa secici yerine aciklama gosterir (5 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

Cikti temizdi — `act()` uyarisi yok.

## Kapsam guard

Komut: `npx jest src/app/hesapla/mobile/mobileStyles --no-coverage`

```
PASS src/app/hesapla/mobile/mobileStyles.scope.test.ts
  mobile.module.css kapsam guard
    √ mobil medya sorgusunun DISINDA hicbir kural yok (3 ms)
    √ TUM min-height tanimlari mobil medya sorgusu icinde
    √ guard sizinti yakalar (kendini dogrulayan test degil)
    √ temiz fikstur bos doner (1 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

Yeni eklenen CSS kurallari (dahil `.birimMaliyetSatiri`, `.birimMaliyetGiris`,
`.parselKademe` icindeki `min-height: 44px` kullanimlari) media query icinde
kaldigi icin guard yesil.

## tsc

Komut: `npx tsc --noEmit`

Cikti: bos (0 hata).

## Tum test suite (regresyon)

Komut: `npx jest --no-coverage`

```
Test Suites: 95 passed, 95 total
Tests:       679 passed, 679 total
```

Baseline 671 + yeni 8 = 679. Regresyon yok.

## Commit

```
git add src/app/hesapla/mobile/KonumBlogu.tsx src/app/hesapla/mobile/KonumBlogu.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(hesapla): konum blogu - il/ilce, gorunur birim maliyet, parsel kademesi"
```

Sonuc: `4fdda5b` — "feat(hesapla): konum blogu - il/ilce, gorunur birim maliyet, parsel kademesi"
(3 dosya degisti, 300 satir eklendi, hicbir dosya silinmedi/degistirilmedi).
`git add -A` KULLANILMADI; yalnizca brief'in adlandirdigi 3 dosya stage edildi.
Commit sonrasi `git status --short` bos donuyor (baska hicbir dosya
staged/degistirilmemis).

## Self-review bulgulari

1. **Completeness** — Brief'teki 8 test de birebir kopyalandi ve gecti.
   `KonumBloguProps`'taki her alan (districtPrices, selectedIl, selectedIlce,
   onIlChange, onIlceChange, onClear, birimMaliyet, birimMaliyetKaynagi,
   onBirimMaliyet, parselIsaretli, onParselAc) bilesende kullanildi.

2. **Kademe ayrimi (K2)** — Parsel butonunun `onClick` handler'i YALNIZCA
   `onParselAc()` cagiriyor; hicbir fiyat/birimMaliyet state'ine dokunmuyor.
   Kod incelemesiyle dogrulandi:
   ```tsx
   <button type="button" className={styles.parselKademe} onClick={onParselAc}>
   ```
   Baska hicbir yan etki yok.

3. **Masaustu guvenligi** — Tum yeni CSS kurallari `mobile.module.css`'in
   `@media (max-width: 768px)` blogu icinde; scope guard testi bunu dogruladi.
   `LocationSelector.tsx`'e HIC dokunulmadi (yalnizca okundu, git diff'te
   gorunmuyor).

4. **State sahipligi** — Bilesende TEK local state var: `duzenleniyor`
   (bool, input'un acik/kapali oldugunu tutuyor). Butun degerler (birimMaliyet,
   birimMaliyetKaynagi, districtPrices, secili il/ilce, parselIsaretli)
   props'tan geliyor.

5. **Test kalitesi** — RED (modul yok hatasi) → GREEN (8/8 pass) akisi
   dogrulandi, cikti act() uyarisi icermiyor.

6. **Bos districtPrices durumu** — `districtPrices.length > 0` kontrolu ile
   secici yerine aciklama metni gosteriliyor; birim maliyet satiri bu durumdan
   BAGIMSIZ olarak calisiyor (LocationSelector'a hic girilmiyor ama
   birimMaliyetSatiri her zaman render ediliyor) — kullanici degeri elle
   girebiliyor. Testte de dogrulandi ("ilce fiyat verisi yoksa..." testi).

7. **Uncontrolled input guard** — `onBlur` icindeki `Number.isFinite(v) && v > 0`
   kontrolu incelendi: bos string uzerinde `Number('')` -> `0` doner, `0 > 0`
   false oldugu icin `onBirimMaliyet` cagrilmiyor — "gecersiz giris bildirilmez"
   testiyle dogrulandi. `setDuzenleniyor(false)` her durumda (gecerli/gecersiz)
   cagrildigi icin alan kapanip son GECERLI deger (`birimMaliyet` prop'u
   degismedigi icin eski deger) ile goruntuye donuyor — "restore" davranisi
   props'un degismemesinden dogal olarak geliyor, ekstra kod gerekmedi.

## Brief kod/kural celiskisi taramasi

Brief'in kod ornekleri ile yazili kurallari (K2, dokunma hedefi kurali, mNum
kurali, LocationSelector'a dokunmama kurali) arasinda CELISKI BULUNMADI.
Butun degiskenler (`--m-r-inner`, `--m-fill`, `--m-on-glass`, `--m-link`,
`--m-glass-border`, `--m-r-input`, `--m-ink`, `--m-r-btn`, `--touch-target`,
`--m-body`) globals.css'te veya ayni dosyada onceden tanimliydi; brief'in CSS'i
hicbir yeni/hayali degisken uretmiyordu.

## Endiseler

Yok. Brief'teki her adim eksiksiz uygulandi, testler ve tsc temiz, kapsam
guard yesil, tum suite (679/679) regresyonsuz.

---

## Fix raporu — Review Minor: `mNum` yanlis kapsam (plan defect'i)

Review sonucu: **Approved**, Critical/Important yok. Tek Minor: `KonumBlogu.tsx`
satir 88'de `mNum` sinifi `birimMaliyetKaynak` span'inin TAMAMINA
uygulanmisti. Bu span `kaynakEtiketi(...)`'nin tum cumlesini tutuyor (orn.
"Kadıköy ortalaması 12.000 TL/m²") — yani ilce adi (Turkce metin) da
JetBrains Mono ile render ediliyordu. Bu proje karari D1 ile celisiyordu:
mono + tabular-nums yalnizca RAKAM SUTUNLARININ hizalanmasi icin var
(metrik kutulari, makbuz satirlari); satir ici, hizalanacak komsu sutunu
olmayan bir etikette mono sadece "eski daktilo" hissi veriyor — insanin
UI'da acikca sikayet ettigi konu buydu. Bu benim (implementorun) hatam
degil, brief'in transkripsiyon hatasiydi; brief'i harfiyen takip ederken
tasindi.

### Degisiklik

`src/app/hesapla/mobile/KonumBlogu.tsx`:

```tsx
                        {/* mNum BILEREK yok: bu satir ic ice bir etiket
                            cumlesi (ilce adi + tutar), hizalanacagi bir
                            rakam sutunu yok. Mono, burada yalnizca eski
                            daktilo hissi verir (D1). */}
                        <span className={styles.birimMaliyetKaynak}>
                            {kaynakEtiketi(birimMaliyetKaynagi, birimMaliyet)}
                        </span>
```

`birimMaliyetGiris` (elle giris `<input>`) `mNum` sinifini KORUDU — o
ciplak bir sayisal alan, yazarken rakam hizalanmasi fayda sagliyor.

### Kapsayan test

`KonumBlogu.test.tsx`'teki mevcut testler (ozellikle "birim maliyeti ve
KAYNAGINI gosterir" ve "elle girilen deger kaynak etiketinde belirtilir")
zaten span'in metnini `getByText` ile dogruluyor; bu testler className'den
BAGIMSIZ oldugu icin degisiklik sonrasi da yesil kaldi — className hatasini
yakalayan ayri bir test yazilmadi (brief bunu istemedi, review de bunu talep
etmedi), ama regresyon olmadigini kanitlamak icin ayni 8 test yeniden
kosuldu.

### Komut ve cikti

`npx jest src/app/hesapla/mobile/KonumBlogu --no-coverage`

```
PASS src/app/hesapla/mobile/KonumBlogu.test.tsx
  KonumBlogu
    √ birim maliyeti ve KAYNAGINI gosterir (58 ms)
    √ elle girilen deger kaynak etiketinde belirtilir (10 ms)
    √ degistir butonu birim maliyet girisini acar (147 ms)
    √ girilen deger onBirimMaliyet ile bildirilir (259 ms)
    √ gecersiz giris bildirilmez (140 ms)
    √ parsel kademesi ISTEGE BAGLI oldugunu soyler ve tetikler (78 ms)
    √ parsel isaretliyse durumu bildirir (9 ms)
    √ ilce fiyat verisi yoksa secici yerine aciklama gosterir (5 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

`npx tsc --noEmit` → cikti bos (0 hata).

### Commit

```
git add src/app/hesapla/mobile/KonumBlogu.tsx
git commit -m "fix(hesapla): konum blogunda mNum'u birim maliyet etiketinden kaldir ..."
```

Sonuc: `66830e3` — "fix(hesapla): konum blogunda mNum'u birim maliyet
etiketinden kaldir" (1 dosya degisti, +5/-1 satir). `git add -A`
KULLANILMADI; yalnizca degisen tek dosya (`KonumBlogu.tsx`) stage edildi.

### Deferred (fix edilmedi, koordinatorun karari)

Reviewer'in ikinci Minor'u — basarili bir duzenlemeden sonra editoru
yeniden acma testinin eksikligi — koordinator tarafindan bilerek
ERTELENDI: remount davranisi incelemeyle saglam, Task 10'un canli davranis
turu bu yolu uctan uca kapsiyor. Bu implementasyonda ek islem yapilmadi.
