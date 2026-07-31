# Task 4 Report: `SonucKarti` — karsilastirma blogu ve Analiz satiri

## Ozet

`SonucKarti` artik piyasa karsilastirma rozetini kendisi cizmiyor; bu sorumluluk
Task 3'un `KarsilastirmaBlogu` bilesenine tasindi. `SonucKarti` metrikler
blogundan sonra `<KarsilastirmaBlogu {...karsilastirma} />` render ediyor ve
"Hesap fisi" satirinin altina, ayni bicimde ikinci bir "Analiz" satiri eklendi.
Cagri yeri (`page.tsx`) bu task icinde guncellendi; `mobilAnalizAcik` state'i
eklendi (Task 6 tuketecek).

## Degisen dosyalar

- `src/app/hesapla/mobile/SonucKarti.tsx` — `piyasaFarkiYuzde` prop'u ve rozet
  JSX'i kaldirildi; `karsilastirma: KarsilastirmaBloguProps` ve `onAnalizAc: () => void`
  eklendi; `KarsilastirmaBlogu` import edilip render edildi; ikinci `fisButonu`
  (Analiz) eklendi. `IconCheckCircle` importu ve `trFormat`'in rozet icin
  kullanimi kaldirildi (formatlayici `fmt()` icin hala gerekli, kaldi).
- `src/app/hesapla/mobile/SonucKarti.test.tsx` — `BASE` nesnesi `karsilastirma`
  ve `onAnalizAc` alanlarini iceriyor; rozet testleri `karsilastirma={{ ...BASE.karsilastirma, farkYuzde: ... }}`
  bicimine cevrildi; rozet-yok testinin container sorgusu `sonucRozet` →
  `karsRozet`e guncellendi (rozet artik o class ile KarsilastirmaBlogu icinde);
  iki yeni test eklendi ("Analiz satiri onAnalizAc i cagirir",
  "karsilastirma blogu kart icinde render edilir").
- `src/app/hesapla/page.tsx` — mobil dalin `sonuc={{ ... }}` nesnesinde
  `piyasaFarkiYuzde` alani `karsilastirma: { piyasaFiyati, onPiyasaFiyati, farkYuzde }`
  ile degistirildi, `onAnalizAc: () => setMobilAnalizAcik(true)` eklendi;
  `mobilAnalizAcik` state'i `mobilFisAcik`in hemen altina eklendi.

`HesaplaMobile.tsx`e dokunulmadi (yalnizca `{...sonuc}` yayiyor, prop sekli
degismedigi icin degisiklik gerekmedi). Tab seridi / header'a dokunulmadi —
bunlar Task 6 kapsaminda.

## TDD kaniti

**RED** — Step 1 sonrasi (`karsilastirma`/`onAnalizAc` henuz bilesende yokken):

```
npx jest src/app/hesapla/mobile/SonucKarti --no-coverage
...
Tests:       5 failed, 5 passed, 10 total
```
Basarisiz olan 5 test: 3 rozet testi (eski `piyasaFarkiYuzde` prop'u artik
taninmiyor, komponent hala eski imzayla oldugu icin state gecmiyordu),
"Analiz satiri onAnalizAc i cagirir" (buton yok), "karsilastirma blogu kart
icinde render edilir" (`KarsilastirmaBlogu` henuz render edilmiyor). Beklenen
davranis buydu: brief'in Step 2 beklentisiyle birebir orttu.

**GREEN** — Step 3 (bilesen + cagri yeri) sonrasi:

```
npx jest src/app/hesapla/mobile/SonucKarti --no-coverage
...
Tests:       10 passed, 10 total
```

Tum suite + tsc (Step 5):

```
npx jest --no-coverage
Test Suites: 96 passed, 96 total
Tests:       689 passed, 689 total   (baseline 687 + 2 yeni test)

npx tsc --noEmit
(cikti yok, exit 0)
```

## `getAllByText('—')` sayisi sorusu

Test: `sonuc yoksa rakam yerine tire basar, sifir DEGIL` —
`minDaireFiyati={null} birimFiyat={null}`, `karsilastirma` ise `BASE`'ten
degismeden geliyor (`piyasaFiyati: '10.000.000'`, `farkYuzde: -14`).
`KarsilastirmaBlogu` bu durumda dolu bir input (`value="10.000.000"`) ve
UCUZ rozeti render ediyor — hicbir ek '—' metni uretmiyor; `placeholder="—"`
zaten yalnizca `piyasaFiyati === ''` iken gorunur ve DOM'da metin dugumu
degil, `input` elementinin `placeholder` niteligidir (`getByText` bunu hic
gormez). Sonuc: sayi hala **2** — degistirmedim, brief'teki orijinal
assertion aynen dogru kaldi. (Eger bir sonraki adimda test `karsilastirma`
icin bos `piyasaFiyati` gecseydi, sayim 2 kalirdi yine — placeholder text
node'a donmuyor; bunu ayrica jest ciktisinda da dogruladim, test PASS.)

## Test kapsam degerlendirmesi (yargı sorusu 1)

Eski 3 rozet testi ("ucuzsa yesil rozet", "pahaliysa rozet yon degistirir",
"rozet ELEMENTI HIC render edilmez") `karsilastirma` prop'u uzerinden
gecirilerek korundu — brief'in istedigi bicimde. Bu testlerin UCUZ/PAHALI
renk mantigi artik `KarsilastirmaBlogu.test.tsx`de birebir ayni senaryolarla
(farkYuzde -14/9/null) zaten kapsanmis durumda; yani rozetin *kendi* mantigi
icin bu 3 test `SonucKarti` seviyesinde teknik olarak yedekli. Yine de
sildim — cunku farkli bir seyi dogruluyorlar: `SonucKarti`in `karsilastirma`
prop'unu doğru sekilde `KarsilastirmaBlogu`'na aktardigini (kablolama/
wiring) — yani entegrasyon noktasini. Brief acikca bu donusumu istedigi
icin sildim degil, korudum; ama bu notu burada belirtiyorum: iceriklerinin
cogu `KarsilastirmaBlogu`'nun kendi suite'inde de var, katma degerleri
esas olarak "SonucKarti karsilastirma'yi doğru geciriyor mu" sorusuna
cevap vermeleri.

Yeni eklenen "karsilastirma blogu kart icinde render edilir" testi de
benzer bir entegrasyon kanit: `KarsilastirmaBlogu`nun `aria-label`ini
`SonucKarti` agaci icinde arayarak montajin gercekten oldugunu dogruluyor.

## Self-review

- **Completeness:** `piyasaFarkiYuzde` `SonucKartiProps`'tan ve JSX'ten tamamen
  kalkti (grep ile dogrulandi — kalan tum `piyasaFarkiYuzde*` esleri
  `hesaplaMobileProps.ts` icindeki ayri `piyasaFarkiYuzdesi()` fonksiyonuna
  ait, prop degil). `karsilastirma` ve `onAnalizAc` ikisi de kullaniliyor.
- **Coverage preserved:** cheap/expensive/absent/em-dash davranislarinin
  hepsi hala test ediliyor (yukaridaki bolum).
- **Call site:** `page.tsx` derleniyor (`tsc --noEmit` 0), `mobilAnalizAcik`
  state'i eklendi ve `onAnalizAc` tarafindan yaziliyor.
- **Scope discipline:** `HesaplaMobile.tsx`, sekme seridi, header'a
  dokunulmadi. CSS dosyasina hic dokunulmadi (Analiz satiri mevcut
  `.fisButonu`'nu yeniden kullaniyor) — `mobileStyles.scope.test.ts` PASS.
- **Test quality:** `npx jest --no-coverage` ciktisinda hic `act()` uyarisi
  veya kirmizi/sari satir yok; tum suite'ler PASS, sessiz.

## Endiseler

Yok. Brief'in kodu ile kurallari arasinda catisma bulmadim; degistirilen tum
davranis brief'te acikca tarif edilmisti.

## Commit

`00e72de` — `feat(hesapla): sonuc kartina karsilastirma blogu ve analiz satiri`
(3 dosya: `SonucKarti.tsx`, `SonucKarti.test.tsx`, `page.tsx`).
