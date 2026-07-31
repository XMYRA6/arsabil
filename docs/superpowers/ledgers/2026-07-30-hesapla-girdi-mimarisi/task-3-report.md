# Task 3 Report — KarsilastirmaBlogu

## Ozet

`KarsilastirmaBlogu` bileseni olusturuldu: sonuc kartinin altinda piyasa
fiyati girisi + yesil/kirmizi karsilastirma rozeti (ya da bos-durum tesviki).
Brief'in TDD akisi izlendi. Bilesen ve CSS brief'ten karakter-karakter
kopyalandi; TEK istisna, "girilen deger bildirilir" testini gecirmek icin
zorunlu olan `value` -> `defaultValue` degisikligi (asagida "Brief kod/kural
celiskisi taramasi" bolumunde detayli aciklandi).

## Uygulanan dosyalar

- Create: `src/app/hesapla/mobile/KarsilastirmaBlogu.tsx`
- Test: `src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css` (yeni kurallar
  `.parselKademe > svg:last-child` blogundan hemen sonra, "── Segment (yapi
  standardi) ──" yorumundan once, `@media (max-width: 768px)` icinde eklendi)

## On kontroller (implementasyondan once)

- `src/app/hesapla/mobile/hesaplaMobileProps.ts` okundu: `piyasaFarkiYuzdesi`
  imzasi ve `null` donus kurallari (beraberlik + `-0` dahil yuvarlaninca
  sifira dusen farklar) brief'teki aciklamayla birebir eslesiyor.
- `src/components/icons/index.tsx` okundu: `IconCheckCircle` mevcut,
  `{ size?, className?, strokeWidth? }` imzasiyla (satir 85-87).
- `src/app/hesapla/mobile/mobile.module.css` icinde `--m-r-chip` (globals.css
  satir 223), `--m-success-text`, `--m-danger` degiskenleri dogrulandi —
  ayni degiskenler zaten `.sonucRozetUcuz` / `.sonucRozetPahali` icin
  kullaniliyordu (satir 165-171), yani "gradyan uzerinde beyaz" renk seti
  dogru sette oldugumu kanitliyor.
- Mevcut `mobileStyles.scope.test.ts` okunarak medya sorgusu siniri ve guard
  mantigi anlasildi.
- `KonumBlogu.tsx` incelendi: `birimMaliyetGiris` alani `value` DEGIL
  `defaultValue` kullaniyor — bu detay, asagidaki celiski taramasinda
  belirleyici oldu.

## TDD Kaniti

### RED

Komut: `npx jest src/app/hesapla/mobile/KarsilastirmaBlogu --no-coverage`

```
FAIL src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx
  ● Test suite failed to run
    Cannot find module './KarsilastirmaBlogu' from 'src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx'
Test Suites: 1 failed, 1 total
Tests:       0 total
```

Beklenen tam olarak buydu: bilesen dosyasi henuz yoktu, brief'in Adim 2'sinde
belirtilen "Cannot find module './KarsilastirmaBlogu'" hatasiyla birebir
eslesti.

### GREEN (ilk deneme — brief'in kodu birebir, `value={piyasaFiyati}` ile)

Bilesen brief'teki kod karakter-karakter kopyalanarak yazildi (`value=`
ile, tam kontrollu input). Sonuc: 6/7 PASS, 1 FAIL:

```
× girilen deger bildirilir (235 ms)
  ● KarsilastirmaBlogu › girilen deger bildirilir
    expect(jest.fn()).toHaveBeenLastCalledWith(...expected)
    Expected: "6000000"
    Received: "5.740.0000"
    Number of calls: 8
```

**Kok neden**: `piyasaFiyati` prop test boyunca sabit ("5.740.000") cunku
`onPiyasaFiyati` bos bir `jest.fn()`; hicbir state guncellemesi olmadigi
icin bilesen yeniden render edilmiyor. React'in kontrollu input mekanizmasi,
her `input` olayindan sonra DOM degerini son render'daki `value` prop'una
geri sarar (React ic mekanizmasi: `restoreControlledState`) — bu yuzden
`userEvent.clear()` + `userEvent.type()` yazilan metni gostermiyor, yalnizca
son karakter sizip taban degere ekleniyor. Ayni klasordeki HICBIR baska
input bu sekilde (`value={prop}` + duz metin/`type="text"`) yazilmiyor;
`KonumBlogu.tsx`'teki `birimMaliyetGiris` ayni riski `defaultValue` ile
onceden cozmustu (bkz. "On kontroller").

### Duzeltme

`value={piyasaFiyati}` -> `defaultValue={piyasaFiyati}` (satir 44), Turkce
yorumla nedeni belgelendi. `onChange` degismedi; bildirim hala
`e.target.value` uzerinden gidiyor.

### GREEN (duzeltme sonrasi)

Komut: `npx jest src/app/hesapla/mobile/KarsilastirmaBlogu --no-coverage`

```
PASS src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx
  KarsilastirmaBlogu
    √ piyasa fiyatini gosterir (41 ms)
    √ ucuzsa yesil rozet gosterir (11 ms)
    √ pahaliysa rozet yon degistirir (6 ms)
    √ fark yoksa rozet ELEMENTI render edilmez (6 ms)
    √ piyasa fiyati bosken TESVIK gosterir (7 ms)
    √ bu degerin hesaba GIRMEDIGINI soyler (8 ms)
    √ girilen deger bildirilir (251 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

Cikti temiz — `act()` uyarisi yok.

## Kapsam guard

Komut: `npx jest src/app/hesapla/mobile/mobileStyles --no-coverage`

```
PASS src/app/hesapla/mobile/mobileStyles.scope.test.ts
  mobile.module.css kapsam guard
    √ mobil medya sorgusunun DISINDA hicbir kural yok (3 ms)
    √ TUM min-height tanimlari mobil medya sorgusu icinde (1 ms)
    √ guard sizinti yakalar (kendini dogrulayan test degil)
    √ temiz fikstur bos doner (1 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

Yeni eklenen `.karsGiris { min-height: 36px; }` dahil tum yeni kurallar
medya sorgusu icinde kaldigi icin guard yesil.

## tsc

Komut: `npx tsc --noEmit`

Cikti: bos (0 hata).

## Tum test suite (regresyon)

Komut: `npx jest --no-coverage`

```
Test Suites: 96 passed, 96 total
Tests:       686 passed, 686 total
```

Baseline 679 + yeni 7 = 686. Regresyon yok.

## Commit

```
git add src/app/hesapla/mobile/KarsilastirmaBlogu.tsx src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(hesapla): karsilastirma blogu - piyasa fiyati sonucun altinda"
```

Sonuc: `d19de3c` — "feat(hesapla): karsilastirma blogu - piyasa fiyati
sonucun altinda" (3 dosya degisti, +184 satir, hicbir dosya
silinmedi/degistirilmedi disinda `mobile.module.css`). `git add -A`
KULLANILMADI; yalnizca brief'in adlandirdigi 3 dosya stage edildi.
Commit sonrasi `git status --short` bos donuyor.

## Self-review bulgulari

1. **Completeness** — Brief'teki 7 test de mevcut ve gecti: piyasa fiyatini
   gosterme, ucuz yon (yesil), pahali yon, `farkYuzde: null` -> rozet
   ELEMENTI yok (`container.querySelector('[class*="karsRozet"]')` ile,
   yalnizca metin degil), bos piyasa fiyatinda TESVIK metni, aria-label'in
   "yalnizca karsilastirma" ibaresini icerdigi, girilen degerin bildirilmesi.

2. **Rol netligi** — `aria-label="Yaklaşık piyasa fiyatı (yalnızca
   karşılaştırma)"` birebir brief'teki gibi; bu deger motor hesaplamasina
   girmiyor, yalnizca rozet ve (ileride) kirilma noktasi grafigini besliyor.
   JSDoc yorumu bunu acikca soyluyor.

3. **Kontrast** — Kopyalanan renkler `rgba(255,255,255,.82/.55/.38/.18)` ve
   `#fff` — gradyan sonuc kartinin ustunde acik renk seti (mevcut
   `.sonucEtiket`/`.sonucFiyat`/`.sonucRozet` ile ayni aile), `girdiKarti`/
   `konumBlogu`'nun kullandigi koyu-cam paleti (`var(--m-ink)`,
   `var(--m-body)`) DEGIL. Dogru sette oldugu dogrulandi.

4. **Masaustu guvenligi** — Tum yeni CSS kurallari `@media (max-width:
   768px)` icinde; scope guard testi bunu dogruladi. Tek `min-height`
   (`.karsGiris`de 36px) medya sorgusu icinde kaldi — guard'in ikinci testi
   bunu ayrica dogruluyor.

5. **Test kalitesi** — RED ("Cannot find module") -> ilk GREEN denemesi 6/7
   (1 gercek hata) -> duzeltme -> tam GREEN (7/7) akisi yasandi ve
   yukarida belgelendi; nihai cikti `act()` uyarisi icermiyor.

6. **Rozet elementi secici** — `karsRozetUcuz`/`karsRozetPahali` alt
   siniflari `karsRozet` alt-dizgisini icerse de, bunlar HER ZAMAN ayni
   `<span className={karsRozet karsRozetUcuz|Pahali}>` elemaninin
   uzerinde birlesik gorunuyor (ayri bir sarmalayici yok); `farkYuzde ===
   null` durumunda bu span hic render edilmiyor (yerine `karsTesvik` render
   ediliyor, o da "karsRozet" alt-dizgisini icermiyor). Yani
   `container.querySelector('[class*="karsRozet"]')` gercekten `null`
   donuyor, brief'in istedigi "elementin kendisi yok" garantisi korunuyor.

## Brief kod/kural celiskisi taramasi

**Bir gercek kod hatasi bulundu ve duzeltildi**: brief'in Adim 3'teki
`KarsilastirmaBlogu.tsx` orneginde giris alani `value={piyasaFiyati}` ile
TAM KONTROLLU baglanmisti. Ancak brief'in KENDI Adim 1 testi ("girilen
deger bildirilir") tam da bu input'u `userEvent.clear()` + `userEvent.type()`
ile doldurmayi bekliyor — `onPiyasaFiyati` bir `jest.fn()` oldugundan
(hicbir state guncellemesi yapmiyor) ve `piyasaFiyati` prop'u test boyunca
sabit kaldigindan, React'in kontrollu-input geri-sarma davranisi yazilan
metni goz ardi ediyor (yalnizca son karakter taban degere ekleniyor —
kanit yukarida). Bu, aynen brief'in kendisinin isaret ettigi "transkribe
edilmis kod guvenilmez olabilir" hata sinifinin bir ornegi.

Bu bir "yazili kural vs kod" celismesi degil (brief'in nesirinde
kontrollu/kontrolsuz secimi hakkinda bir ifade yok) — bilesenin KENDI
testini gecirmesini imkansiz kilan bir kod hatasi. Ayni klasorde
(`KonumBlogu.tsx`, satir 74) ayni riskli senaryo icin zaten `defaultValue`
kullaniliyordu; ben de ayni cozumu, ayni gerekceyle uyguladim ve kodda
Turkce yorumla belgeledim. `onChange` sozlesmesi (`onPiyasaFiyati(e.target
.value)`) DEGISMEDI; yalnizca `value` -> `defaultValue` degisti.

Bunun disinda brief'in nesri (KRİTİK notu, aria-label, sinyal sozlesmesi,
`--m-r-chip`/`--m-success-text`/`--m-danger` degiskenleri) ile kod/CSS
arasinda baska hicbir celiski bulunmadi.

## Endiseler

- Yukaridaki `value` -> `defaultValue` degisikligi brief'in Adim 3
  kodundan TEK sapma. Islevsel sozlesme (props, aria-label, rozet mantigi,
  CSS) aynen korundu; yalnizca giris alaninin DOM baglanma bicimi
  degisti. Task 4, bu bileseni `SonucKarti` icine sarmalarken
  `piyasaFiyati` prop'u DIS KAYNAKTAN (orn. formatlama sonrasi) degisirse,
  `defaultValue` kullanan bir input yalnizca ILK mount'ta o degeri yansitir
  — sonraki prop degisikliklerinde DOM'daki metni KENDILIGINDEN
  guncellemez (KonumBlogu'nun `birimMaliyetGiris`i de ayni sinirlamayi
  tasiyor, ama o `duzenleniyor` durumuyla kosullu render edildigi icin her
  acilista yeniden mount olup taze deger aliyor). Task 4'u uygularken bu
  noktanin goz onunde bulundurulmasi (gerekirse `key={piyasaFiyati}` ile
  kontrollu remount) faydali olabilir; bu, Task 3'un kapsaminda bir sorun
  YARATMIYOR (testler bunu dogruluyor) ama sonraki entegrasyon icin bir
  not.

---

## Fix raporu — Round 1: yanlis katmanda duzeltme (koordinator geri bildirimi)

**Kok neden teshisi dogruydu, duzeltme yanlis katmandaydi.** Koordinator
geri bildirimi: `defaultValue`ye gecis, kontrollu-input testinin gercek
kisitini dogru teshis etmisti (bare `jest.fn()` ile React her tus
vurusundan sonra DOM'u degismemis prop'a geri yaziyor) ama cozumu YANLIS
tarafa uyguladim — bilesenin kendisini bozdum, testi degil.

### Neden `defaultValue` BU bilesen icin yanlis

`KarsilastirmaBlogu` ekran boyunca mount'lu kalir (KonumBlogu'nun
`birimMaliyetGiris`inin aksine, o yalnizca duzenleme modunda mount'lu ve
her acilista yeniden mount olup taze prop okuyor). Bu plan tam olarak
ilce seciminin `page.tsx` uzerinden `setManualMarketPrice(...)` ile bu
alani DISARIDAN doldurmasini saglamak icin var. `defaultValue` yalnizca
ILK mount'ta okunur; ilce degisince input DOM'u guncellenmez, rozet yeni
degerle yeniden hesaplanir ama giris alani eski metni gostermeye devam
eder — rozet ve giris gorsel olarak birbirinden kopar. Bu, cozdugu test
hatasindan daha kotu bir urun kusuruydu.

### Degisiklik

**`KarsilastirmaBlogu.tsx`** — `defaultValue={piyasaFiyati}` geri
`value={piyasaFiyati}`ye alindi (kontrollu input restore edildi).
Yorum, neden kontrollu tutuldugunu (ilce seciminin bu alani disaridan
doldurmasi gerektigini) ve `KonumBlogu` ile analojinin neden GECERSIZ
oldugunu (o hic unmount olmuyor) aciklayacak sekilde yeniden yazildi.
`onChange` sozlesmesi degismedi.

**`KarsilastirmaBlogu.test.tsx`** — "girilen deger bildirilir" testi,
gercek state tutan bir `Sarmalayici` bileseniyle yeniden yazildi:
`useState` ile `deger` tutuluyor, `onPiyasaFiyati` hem disaridaki jest
mock'unu cagiriyor hem de `setDeger` ile state'i guncelliyor — boylece
input GERCEKTEN kontrollu kalirken yazma islemi de calisiyor
(`userEvent.clear()` kaldirildi, bos state zaten '' ile basliyor).
`import { useState } from 'react'` eklendi (kod tabanindaki mevcut
kullanim bicimiyle ayni, `KonumBlogu.tsx`/`FiyatAciklamasi.tsx`'teki gibi
`import React from 'react'` degil).

Ayrica **eksik kalan regresyon testi** eklendi — tam olarak
`defaultValue` hatasini yakalayacak olan test:

```tsx
it('prop degisimi alana YANSIR (ilce secimi piyasa fiyatini doldurur)', () => {
    const { rerender } = render(<KarsilastirmaBlogu {...props({ piyasaFiyati: '' })} />)
    expect(screen.getByLabelText(/Yaklaşık piyasa fiyatı/)).toHaveValue('')
    rerender(<KarsilastirmaBlogu {...props({ piyasaFiyati: '5.740.000' })} />)
    expect(screen.getByLabelText(/Yaklaşık piyasa fiyatı/)).toHaveValue('5.740.000')
})
```

Bu test, `defaultValue` kullanan onceki versiyonda KIRILIRDI (rerender
sonrasi alan hala '' gosterirdi) — yani round 1'in kendisini yakalayacak
bir guard'di, ama round 1'de yazilmamisti; simdi eklendi.

### Komutlar ve cikti

`npx jest src/app/hesapla/mobile/KarsilastirmaBlogu --no-coverage`

```
PASS src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx
  KarsilastirmaBlogu
    √ piyasa fiyatini gosterir (43 ms)
    √ ucuzsa yesil rozet gosterir (14 ms)
    √ pahaliysa rozet yon degistirir (6 ms)
    √ fark yoksa rozet ELEMENTI render edilmez (6 ms)
    √ piyasa fiyati bosken TESVIK gosterir (6 ms)
    √ bu degerin hesaba GIRMEDIGINI soyler (7 ms)
    √ girilen deger bildirilir (236 ms)
    √ prop degisimi alana YANSIR (ilce secimi piyasa fiyatini doldurur) (7 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

Cikti temiz, `act()` uyarisi yok.

`npx tsc --noEmit` → cikti bos (0 hata).

`npx jest src/app/hesapla/mobile/mobileStyles --no-coverage` → 4/4 PASS
(CSS bu round'da degismedi, guard zaten yesildi; regresyon icin tekrar
kosuldu).

`npx jest --no-coverage` (tum suite):

```
Test Suites: 96 passed, 96 total
Tests:       687 passed, 687 total
```

Baseline 679 + 8 (7 orijinal + 1 yeni regresyon guard) = 687. Regresyon
yok.

### Commit

```
git add src/app/hesapla/mobile/KarsilastirmaBlogu.tsx src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx
git commit -m "fix(hesapla): karsilastirma alanini kontrollu tut, testi state ile duzelt"
```

Sonuc: `8a279a1` — "fix(hesapla): karsilastirma alanini kontrollu tut,
testi state ile duzelt" (2 dosya degisti, +40/-11 satir). `git add -A`
KULLANILMADI; yalnizca degisen 2 dosya stage edildi (`mobile.module.css`
bu round'da dokunulmadi).

### Ders

Kok neden teshisi (kontrollu input + state-geri-beslemesi-olmayan test =
React'in DOM'u geri sarmasi) DOGRUYDU. Ama "hangi taraf yanlis" sorusunun
cevabi mimari baglama bagli: `KonumBlogu`'nun kosullu-mount input'unda
`defaultValue` dogruydu, ama bu bilesenin surekli-mount input'unda YANLIS.
Ayni yuzeysel belirti (RED test), iki farkli bilesende iki farkli dogru
cozume isaret edebiliyor — kopyalamadan once "bu bilesen hic unmount
oluyor mu, disaridan prop guncellemesi gerekiyor mu" sorusunu sormam
gerekiyordu.

---

**Status:** DONE (round 1 fix uygulandi; kontrollu input restore edildi,
test state ile duzeltildi, eksik regresyon guard'i eklendi; 8/8 test,
tsc 0, scope guard 4/4, tum suite 687/687)
