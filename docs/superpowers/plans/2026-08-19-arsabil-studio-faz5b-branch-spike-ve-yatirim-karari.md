# Arsabil Studio - Faz 5B Branch Spike ve Yatirim Karari Plani

> **For agentic workers:** Faz 5A'da yeterli kanit toplandiktan sonra uygulanir. Bu faz en fazla bir branch icin sinirli spike onaylar; uc branch'i paralel urunlestirmez.

**Goal:** AR, ic mimari veya mobilya marketplace arasinda teknik cekicilige gore degil, dogrulanmis is ihtiyacina, operasyon maliyetine ve cekirdek Studio ile stratejik uyuma gore secim yapmak.

**Architecture:** Secilen spike ayri feature flag ve izole modulle gelisir. Kalici bagimlilik, yeni mobil uygulama, katalog veya odeme altyapisi spike basarisindan once eklenmez.

**Depends on:** Faz 5A karar metrikleri ve yazili business owner onayi.

## Global Constraints

- Bir donemde sadece bir branch spike'i aktif olabilir.
- Spike, production promise veya satilabilir paket olarak pazarlanmaz.
- Basari eşiği, baslamadan once sayisal ve nitel olarak kayda gecirilir.
- Odeme, kredi, stok, lojistik ve resmi imar iddialari spike kapsami disindadir.

### Task 1: Branch secim matrisi ve go/no-go

**Files:**
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-branch-secim-matrisi.md`
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-faz5-karar-log.md`

- [ ] Her branch'i su boyutlarda puanla: kanit gucu, cekirdek Studio uyumu, gelir yolu, teknik risk, operasyon riski, hukuk/uyum riski, 90-gunluk maliyet.
- [ ] Puani tek basina karar yapma; business owner, teknik owner ve kullanici kanitlarini ayni karar kaydinda tut.
- [ ] Uc olasi karari tanimla: `spike approved`, `defer`, `reject/continue core`.
- [ ] “Daha ayrintili teklif” talebi baskinsa, branch acmak yerine Faz 1-4 cekirdek backlog'una geri donme kuralini ekle.

### Task 2: AR spike contracti

**Files:**
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-ar-spike-contract.md`

- [ ] Sadece bir parsel, bir bina kutlesi ve bir fiziksel cihaz deneyi ile sinirla.
- [ ] Gercek jeo-ankorlu AR ile tarayici 3D preview'i birbirinden acikca ayir.
- [ ] ARCore/ARKit, cihaz kapsami, VPS/konum dogrulugu ve Turkiye saha testi icin kabul olcutleri tanimla.
- [ ] “Yaklasik gorsellestirme; resmi yerlesim veya onay degildir” ifadesini deneyin her gorunumunde koru.

### Task 3: Ic mimari spike contracti

**Files:**
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-ic-mimari-spike-contract.md`

- [ ] Serbest oda cizimi yerine bir secili `2+1` veya `3+1` tip daire sablonuyla basla.
- [ ] Basariyi oda cizim sayisi degil, kullanicinin teklif/rapor gorusmesine tasidigi kararlar ile olc.
- [ ] Asset kaynaklarini generic, lisansli ve marka kaynakli olarak ayir; lisans belirsiz asset kullanma.
- [ ] 2D plan -> basit 3D oda -> paylaşılabilir stil panosu sirasini bozmadan kapsam belirle.

### Task 4: Marketplace spike contracti

**Files:**
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-marketplace-spike-contract.md`

- [ ] Ilk deneyimi checkout degil, bir markadan sinirli katalogla “urun ilgisi/teklif talebi” olarak tasarla.
- [ ] Urun verisi icin boyut, fiyat tarihi, stok kaynagi ve gorsel/model lisansi zorunlu metadata olsun.
- [ ] Referral/lead-gen, direct seller ve marketplace modellerini karsilastir; kredi/BNPL'yi kapsam disi tut.
- [ ] Partner yoksa sahte stok/fiyatla marketplace arayuzu yayinlama.

### Task 5: Spike ciktisi ve kapatma protokolu

**Files:**
- Add: `docs/superpowers/plans/2026-08-19-arsabil-studio-spike-sonuc-sablonu.md`

- [ ] Spike sonunda kullanim, nitel geri bildirim, teknik bulgular, maliyet ve operasyon riski ayni formatta raporlanir.
- [ ] Basarisiz spike icin flag kapatma, gecici veri temizleme ve dokumantasyon karari tanimla.
- [ ] Basarili spike icin ayri, tam implementation plan zorunlu tut; spike kodunu dogrudan urunlestirme.

## Exit Criteria

- En fazla bir genisleme branch'i net kanitla spike asamasina girer.
- AR/ic mimari/marketplace kararinin sahipligi, maliyeti ve durdurma kosulu bellidir.
- Cekirdek Studio, dikkati dagitan ama kanitsiz bir yeni urun koluna donusmez.
