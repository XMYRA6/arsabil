### Task 6: `HesaplaMobile` ve `page.tsx` bağlaması

**Files:**
- Modify: `src/app/hesapla/mobile/HesaplaMobile.tsx`
- Modify: `src/app/hesapla/mobile/GirdiKarti.tsx`
- Modify: `src/app/hesapla/page.tsx`

**Interfaces:**
- Consumes: `KonumBlogu` (Task 2), `SonucKarti` yeni props (Task 4), `AnalizSekmesi` (Task 7'de güncellenecek — bu task'ta mevcut hâli kullanılır)
- Produces: `HesaplaMobileProps` şu hale gelir — `aktifSekme`/`onSekmeDegis` **kalkar**, yerine `analizAcik`/`onAnalizAc`/`onAnalizKapat` gelir; `onKonumAc` kalkar (konum artık girdi kartında); `konumEtiketi` kalkar.

**KRİTİK — spec K4/K5:** başlıktaki dişli ve konum çipi **kaldırılır**; Hesap/Analiz sekme şeridi (`SekmeSecici` ve `.sekmeKap`) **kaldırılır**. Gelişmiş ayarlara tek kapı: girdi kartının altındaki etiketli buton.

- [ ] **Step 1: `GirdiKarti`ya konum bloğunu ekle**

`GirdiKarti.tsx`: `KonumBloguProps`u prop olarak al (`konum: KonumBloguProps`) ve kartın **en üstünde** `<KonumBlogu {...konum} />` render et. Diğer satırlar değişmez.

`GirdiKarti.test.tsx`'in `props()` fikstürüne `konum` alanını ekle (Task 2'nin test fikstürünü yeniden kullan) ve şu testi ekle:

```tsx
    it('konum blogu kartin EN USTUNDE', () => {
        const { container } = render(<GirdiKarti {...props()} />)
        const ilk = container.querySelector('section')!.firstElementChild!
        expect(ilk.className).toMatch(/konumBlogu/)
    })
```

- [ ] **Step 2: `HesaplaMobile`ı sadeleştir**

- Başlıktaki konum çipi ve dişli butonunu **sil**; başlık `logo + "Hesapla"` kalır.
- `SekmeSecici` importunu ve `.sekmeKap` sarmalayıcısını **sil**.
- `analizAcik` prop'una göre: `true` ise `<AnalizSekmesi {...analiz} />`, aksi halde `SonucKarti` + (`fisAcik ? FiyatAciklamasi : GirdiKarti`) + gelişmiş ayarlar butonu.
- `AnalizSekmesi`nin üstüne "Kapat" satırı ekle (`onAnalizKapat`), `FiyatAciklamasi`nin kapat butonuyla aynı desen.

- [ ] **Step 3: `page.tsx`i bağla**

- Yeni state: `const [birimMaliyetKaynagi, setBirimMaliyetKaynagi] = useState<BirimMaliyetKaynagi>({ tur: 'varsayilan' })`. (`mobilAnalizAcik` Task 4'te eklendi.)
- `mobilSekme` state'ini ve `MobilSekme` importunu **sil**.
- `handleIlceChange`i Task 1'in yardımcısıyla yeniden yaz:

```tsx
  const handleIlceChange = (ilce: string) => {
    setSelectedIlce(ilce);
    const entry = districtPrices.find(d => d.il === selectedIl && d.ilce === ilce);
    if (!entry) return;
    if (originalUnitPrice === null) setOriginalUnitPrice(globalUnitPrice);
    const sonuc = ilceSecildi(entry, apartmentSize);
    setGlobalUnitPrice(sonuc.birimMaliyet);
    setManualMarketPrice(sonuc.piyasaFiyati);
    // Spec 4: elle girilmis bir deger EZILDIYSE kullaniciya soylenir.
    // Sessizce degistirmek, kullanicinin "neden degisti" diye sormasina yol
    // acar. `react-hot-toast` bu dosyada zaten import edili.
    if (birimMaliyetKaynagi.tur === 'elle') {
      toast(`${entry.ilce} ortalamasına güncellendi`);
    }
    setBirimMaliyetKaynagi(sonuc.kaynak);
  };
```

Bu dalı sabitleyen testi `src/app/hesapla/mobile/unitPriceSource.test.ts`e **eklemeyin** —
saf yardımcı `toast` bilmez. Bunun yerine Task 10 Step 2'nin davranış turunda canlı
doğrulanır (elle gir → ilçe değiştir → bildirim görünür).

- `handleIlChange` ve `handleClearLocation` içindeki geri-yükleme dallarına `setBirimMaliyetKaynagi(konumTemizlendi(originalUnitPrice).kaynak)` ekle.
- `sonuc={{ ... }}` nesnesi Task 4'te güncellendi; bu task'ta ona dokunma.
- Mobil dalda `HesaplaMobile`a yeni prop'ları geçir; `konum` nesnesini kur:

```tsx
          konum={{
            districtPrices, selectedIl, selectedIlce,
            onIlChange: handleIlChange,
            onIlceChange: handleIlceChange,
            onClear: handleClearLocation,
            birimMaliyet: globalUnitPrice,
            birimMaliyetKaynagi,
            onBirimMaliyet: (v: number) => {
              setGlobalUnitPrice(v);
              setBirimMaliyetKaynagi({ tur: 'elle' });
            },
            parselIsaretli: parcelValue.lat !== null && parcelValue.lng !== null,
            onParselAc: () => { setMobilAyarBolumu('risk'); setMobilAyarlarAcik(true); },
          }}
          analizAcik={mobilAnalizAcik}
          onAnalizAc={() => setMobilAnalizAcik(true)}
          onAnalizKapat={() => setMobilAnalizAcik(false)}
```

- `GelismisAyarlarSheet` çağrısı Task 5'te güncellendi; bu task'ta ona dokunma.

- [ ] **Step 4: Doğrula**

```bash
npx tsc --noEmit
npx jest --no-coverage
npx eslint src
```
Expected: tsc 0; tüm testler PASS; eslint 12 (baseline).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/HesaplaMobile.tsx src/app/hesapla/mobile/GirdiKarti.tsx src/app/hesapla/mobile/GirdiKarti.test.tsx src/app/hesapla/page.tsx
git commit -m "feat(hesapla): tek kapi, sekme seridi kalkti, konum girdi kartinda"
```

---

