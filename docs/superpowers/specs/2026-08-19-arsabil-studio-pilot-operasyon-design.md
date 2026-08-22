# Arsabil Studio - Pilot Operasyon Design Spec

## Product Decision

Studio, tamamlanan teknik planlardan sonra dogrudan genis kullanima acilmaz. Ilk asama sinirli pilot kullanicilarla, destekli onboarding ve veri-kalitesi izleme akisi olarak tasarlanir.

Pilotun amaci kullanicinin 3D goruntuyu begenip begenmedigini degil, su zinciriyle karar alip alamadigini anlamaktir:

```text
parsel bilgisi -> hesap -> program -> teklif -> rapor/paylasim -> geri bildirim
```

## Pilot Principles

- Her senaryoda kaynak, varsayim ve kritik uyarilar gorunur kalir.
- Pilot kullanicisi yanlis veya eksik parsel/alan verisini “dogru” gibi duzeltmeden ilerleyemez.
- Destek ekibi kullanicinin teklif ayrintilarini gereksiz gormez; yalnizca onayli geri bildirim ve anonim kalite sinyalleri toplar.
- Pilot, yeni feature backlog'una donusmeden once aktivasyon ve karar-kalitesi kaniti uretir.

## Success Evidence

- Pilot kullanicisi yardimsiz olarak ilk senaryosunu kurup raporlayabilir.
- Kritik uyarilar fark edilir, ihmal edilirse nedeni kayda gecirilebilir.
- Onboarding, veri girisindeki hatalari sonradan destek ekibinin elle temizlemesine birakmaz.
- Ekip hangi hata/eksikligin hesap, geometri, teklif ya da UX kaynakli oldugunu ayirt eder.
