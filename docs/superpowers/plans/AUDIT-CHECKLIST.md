# Plan Archive Audit Checklist

Bu checklist, yeni bir spec veya plan eklendiginde plan arsivinin dagilmamasini
saglamak icin kullanilir.

## 1. Coverage

- [ ] Her `docs/superpowers/specs/*-design.md` icin plan karsiligi var.
- [ ] Birebir plan yoksa umbrella/closure/pointer plan eklendi.
- [ ] Coverage check bos sonuc veriyor:

```powershell
$specs = Get-ChildItem docs\superpowers\specs -Filter *.md | ForEach-Object { $_.BaseName -replace '-design$','' }
$plans = Get-ChildItem docs\superpowers\plans -Filter *.md | ForEach-Object { ($_.BaseName -replace '-plan$','') }
Compare-Object $specs $plans | Where-Object SideIndicator -eq '<=' | Select-Object -ExpandProperty InputObject
```

## 2. Canonical Source

- [ ] Detay plan tek canonical kaynak olarak isaretli.
- [ ] Umbrella dosyalari alt planlari listeliyor.
- [ ] Closure/obsolete dosyalari acik `STATUS` notu tasiyor.
- [ ] `README.md` tablo satiri yeni dosyayi kapsiyor.
- [ ] `EXECUTION-QUEUE.md` gerekiyorsa yeni isi dogru siraya yerlestiriyor.

## 3. Dispatch Safety

- [ ] Dispatch edilecek dosya orchestration/closure degil.
- [ ] Dispatch edilecek task kapsam olarak kucuk ve testlenebilir.
- [ ] Task baslangic komutlari yazili.
- [ ] Task bitis testleri ve commit mesaji yazili.
- [ ] Gerekli migration/env/dependency notlari task icinde gorunur.

## 4. Conflict Scan

- [ ] Ayni yuzeye dokunan daha yeni tarihli planlar kontrol edildi.
- [ ] Obsolete tasarim dili yeni plana tasinmadi.
- [ ] Mobil ve masaustu kapsamlari ayrildi.
- [ ] Veri/model degisikligi gerektiren isler gorsel redesign'dan once siralandi.

## 5. Completion Evidence

Plan tamamlandiginda ilgili plan veya durum dosyasina su bilgiler eklenir:

- [ ] Commit araligi.
- [ ] `npx tsc --noEmit` sonucu.
- [ ] `npx jest` veya kapsamli jest sonucu.
- [ ] `npm run build` sonucu, gerekiyorsa.
- [ ] Playwright/manual smoke sonucu, gerekiyorsa.
- [ ] Devreden follow-up'lar.

## Recommended Maintenance Flow

1. Yeni spec gelir.
2. Once `README.md` ve `EXECUTION-QUEUE.md` okunur.
3. Coverage check calistirilir.
4. Mevcut bir canonical plan kapsiyorsa pointer dosyasi eklenir.
5. Kapsam yeni ise detay implementation plan yazilir.
6. Queue'daki sirasi guncellenir.
7. `NEXT-DISPATCH.md` sadece siradaki is degistiyse guncellenir.
