# Arsabil Studio - Parsel Geometrisi ve Emsal Veri Contracti

## Karar

Studio 3D kutlesi, hesap sayfasindaki demo cokgeni uzerinde kalmayacak. Giris verisi iki acik kaynaktan gelecektir:

1. Kullanici tarafindan TKGM parsel dogrulama akisi sonunda girilen veya yuklenen parsel siniri.
2. Mevcut fizibilite motorundan gelen insaat alani ve kat/adet varsayimlari.

TKGM, bu fazda zorunlu otomatik veri saglayici degildir. Kullanici tarafindan dogrulanan geometriyi Studio'ya tasiyan sinirli bir contract kurulur. Harici servis, yetki veya hukuki veri lisansi netlesmeden resmi TKGM entegrasyonu varsayilmaz.

## Urun Akisi

```text
Parsel kimligi / dogrulama
  -> alan ve sinir kaynagi gorunur
  -> geometri inceleme ve onay
  -> hesap motoru alan varsayimlari
  -> Studio 3D kutlesi
  -> program ve teklif senaryolari
```

Kullanici 3D goruntude hangi verinin nereden geldigini gorur:

- Parsel alani: dogrulanmis / kullanici girisi / tahmini.
- Parsel siniri: dogrulanmis / cizilmis / demo.
- Insaat alani: hesap motoru varsayimi / yetkili imar verisi / kullanici duzeltmesi.

Bu kaynak etiketi, “gorsel gercek proje” algisini kontrollu tutar.

## Domain Contract

Yeni saf veri tipi `ParcelGeometrySource` asagidaki alanlari tasir:

- `source`: `verified_tkgm | user_drawn | imported | demo | unavailable`;
- `parcelIdentity`: il, ilce, mahalle, ada, parsel gibi istege bagli kimlik alanlari;
- `areaM2`: bildirilen parsel alani;
- `polygon`: kapali 2D nokta dizisi;
- `verifiedAt` ve `notes`: istege bagli izlenebilirlik alanlari.

`StudioMassingInput` iki ayri alani netlestirir:

- `parcelGeometry`: gorsel ve footprint kaynagi;
- `grossConstructionAreaM2`: kutle hacmi icin tek otoriter alan.

Mevcut hesap motoru yalnizca `Sd * Ad` turevi bir yaklasim verebiliyorsa bu deger `estimated` kaynagi ile etiketlenir. Ileride emsal veya onayli insaat alani gelirse ayni alan `authoritative` olarak degisir; 3D renderer bu farki hesaplamaz.

## Dogrulama Kurallari

- Polygon en az uc ayri noktadan olusur ve kendi kendini kesmez.
- Polygon alaninin, bildirilen parsel alanindan anlamli derecede sapmasi uyari uretir; kaydi engellemez.
- Alan birimleri her zaman m2'dir; koordinat projeksiyonu/olcegi metadata ile aciklanir.
- Geometri yoksa Studio yazili ozet ve program/teklif akisini surdurur; 3D Canvas acilmaz.
- Demo geometri hicbir zaman kaydedilmis resmi senaryo veya paylasilabilir raporda “dogrulanmis” diye sunulmaz.

## UX Karari

Hesapla ekraninda Studio bolumu uc durum kullanir:

1. **Dogrulanmis parsel:** 3D gorunum, alan kaynagi rozeti ve son dogrulama zamani.
2. **Cizilmis/ithal parsel:** 3D gorunum, belirgin “taslak geometri” rozeti ve dogrulama cagrisi.
3. **Geometri yok:** Canvas yerine aciklama, parsel ekleme eylemi ve calismaya devam eden sayisal ozet.

Kullanici bir alan uyusmazligi gordugunde gorseli degil veri kaynagini duzeltmeye yonlendirilir.

## Kapsam Disi

- TKGM ekraninin otomatik scraping'i veya yetkisiz veri cekimi.
- Resmi imar hakki, ruhsat ya da hukuki uygunluk iddiasi.
- Koordinat donusum motoru ve harita tabanli tam CAD editoru.

## Basari Olcutu

Bir kullanici, kaydedilen Studio senaryosunda parsel sinirinin kaynagini, alani ve 3D kutle alaninin tahmin mi otoriter mi oldugunu tek ekranda anlayabilmelidir.
