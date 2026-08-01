# Konum Seçici Planı — TAMAMLANDI (2026-08-01)

**7/7 task bitti. Whole-branch review verdict: "Ship it" (engelleyici bulgu yok).**
Ayrıntılı SDD ledger'ı `.superpowers/` altındaydı ve gitignored'dı; plan bitince silindi.
Kalıcı kayıt bu dosya + git geçmişidir.

**Plan:** `docs/superpowers/plans/2026-08-01-ilce-fiyat-verisi-ve-mobil-konum-secici.md`
**Spec:** `docs/superpowers/specs/2026-08-01-ilce-fiyat-verisi-ve-mobil-konum-secici-design.md`
**Branch:** `feature/konum-secici` · **main'den ayrım:** `7a2add9` · **HEAD:** `901feb6` (11 commit)
**Doğrulama (HEAD):** jest **765/765** · tsc **0** · eslint **12** (baseline) · `npm run build` başarılı
`origin` ÖLÜ, push yapılmadı.

| Task | Commit |
|---|---|
| 1 — Türkçe-duyarlı arama | `e281715` |
| 2 — Veri dosyası + doğrulayıcı + seed | `bca1417` + `4da3457` |
| 3 — `handleKonumSec` atomik seçim | `cc08d8d` |
| 4 — `KonumSecici` kapalı hal | `3b8561c` |
| 5 — Aranabilir sheet | `6a2f262` + `5149033` |
| 6 — `KonumBlogu` entegrasyonu | `170ebdd` + `e4e8015` |
| 7 — Canlı ölçüm turu | kod değişikliği yok |
| Final review fix dalgası | `901feb6` |

## İNSANDAN HÂLÂ BEKLENEN

**~900 ilçe için satış TL/m² + birim inşaat maliyeti TL/m².** Mekanizma hazır ve boş diziyle
çalışıyor: `src/lib/districtPrices/data.ts` içindeki `ILCE_FIYATLARI` doldurulup
`npm run db:seed:district-prices` koşulacak. Başka hiçbir dosya değişmeyecek.
`validate.test.ts` veri dosyasını otomatik denetliyor, bozuk veri commit edilemiyor.

**ÖNCE ŞUNU YAP:** dev DB'de **5 UYDURMA ilçe satırı** var (İstanbul/Kadıköy·Beşiktaş·Üsküdar,
Ankara/Çankaya, İzmir/Karşıyaka) — denetim ve Task 7 turu için elle girilmişti, rakamlar gerçek
DEĞİL. Seed **upsert-only, hiçbir satırı SİLMEZ**, yani gerçek veri gelince bu satırlar
silinmeyecek; aynı il/ilçe çifti varsa sessizce güncellenecek, yoksa uydurma olarak KALACAK.
**Gerçek seed'den önce elle silinmeli.** Kodda değil veritabanında oldukları için hiçbir test
bunu yakalayamaz.

## MERGE ÖNCESİ BİLİNMESİ GEREKENLER

**Bu branch ne düzeltti:** "mobilde il/ilçe seçici yok" teşhisi yanlıştı — seçici vardı ve
çalışıyordu. Gerçek engeller (1) `DistrictPrice` tablosunun boş olması + seed olmaması,
(2) mobilde masaüstü `LocationSelector`'ın birebir render edilmesi (28px `<select>`'ler,
projenin kendi `--touch-target`'ı 44px). İkisi de kapandı.

**Masaüstü hiç değişmedi.** `git diff main -- src/components/LocationSelector.tsx
src/app/hesapla/page.module.css` boş. `page.tsx:1138-1146` hâlâ `LocationSelector`'ı
`onIlChange`/`onIlceChange` ile besliyor; `handleIlChange` bu yüzden duruyor.

## AYRI TİKET İSTEYEN — KOYU TEMA (whole-branch review bulgusu)

**Koyu temada yeni sheet okunamıyor.** `BottomSheet.module.css:17` `var(--panel)` kullanıyor,
bu `[data-theme="dark"]` altında `#0f2a4a` oluyor; ama tüm `--m-*` token'ları mobil media
query'sinin içinde koşulsuz tanımlı ve yalnızca açık tema için — `.konumSeciciBaslik`
`var(--m-ink)` = `#0b2036`. Koyu lacivert zeminde koyu lacivert yazı.
**Mekanizma bu branch'ten ÖNCE de vardı** (`GelismisAyarlarSheet` aynı sorunu yaşıyor) ve
varsayılan tema `light` (`layout.tsx:58`), ama temayı bir kez koyuya almış bir kullanıcı
artık mobilde konum seçemez. Bu branch o akışı sheet'in arkasına koyduğu için önem kazandı.

## DÜZELTİLMEDEN BIRAKILANLAR (review triyajı: "ertelenebilir")

- **`validate.ts` makullük bandı YOK.** Sadece sonlu/pozitif/boş-değil/tekrar kontrolü var.
  İki fiyat sütunu yer değiştirirse (sıradan CSV hatası) hiçbir kontrol yakalamaz ve 900 satır
  sessizce yanlış yazılır. Reviewer'ın önerdiği "satış > inşaat maliyeti" kuralı bazı depresif
  ilçelerde gerçek veriyi de reddedebilir; bu yüzden bilinçli olarak eklenmedi.
  **Gerçek veri gelmeden önce yeniden değerlendir.**
- **Seed transaction'sız.** 900 upsert tek tek yazılıyor; 500. satırda bağlantı koparsa yarısı
  yazılmış tablo kalır (exit 1 döner ama kimse bakmazsa fark edilmez). `$transaction` ile
  sarılması hem bunu çözer hem çok hızlandırır. Upsert idempotent olduğu için tekrar koşmak düzeltir.
- **Arama kutusu sticky değil.** 81 il / 60 sonuç arasında kaydırınca arama kutusu ve
  "← İl listesi" ekrandan çıkıyor. `position: sticky; top: 0` çözer. Gerçek veri gelince
  baskın etkileşim bu olacak.
- `validate.ts` tekrar anahtarı `` `${il} ${ilce}` `` boşlukla birleşiyor (resmi adlarda boşluk
  yok, pratik risk ~0). `pageStyles.scope.test.ts` kaynak-metin regex'i — tek bir regresyona
  kurulmuş tuzak, kapsam değil (kırılabilirliği kasten kanıtlandı).
  `iller`/`konumAra`/`ilceler` her render'da yeniden hesaplanıyor (900 satırda ölç, sonra optimize et).

## BU BRANCH'İN KAPSAMI DIŞINDA KALAN ÖLÇÜLMÜŞ KUSURLAR

Task 7 canlı turu (390×844) **kapalı halde 8 dokunma hedefi ihlali** buldu. Hepsi
`GirdiKarti.tsx` / `SonucKarti.tsx` sahipli; bu branch ikisine de dokunmadı
(`git diff main --name-only` yalnızca `GirdiKarti.test.tsx`i gösteriyor). Önceki planın
Task 10'unda ölçülüp ayrı bir yeniden tasarım spec'ine devredilmişti:
"Arsa payı yüzdesi" (h=44 ama merkezinde isabet almıyor), "Metrekareyi azalt/artır" (h=38),
"Birim maliyeti değiştir" (h=12), "Toplam daire sayısı" (h=27), 3 açıklama satırı.

Sheet açık geçişlerde **0 sorunlu**; seçicinin kendi kontrolleri (arama kutusu, il satırları,
sonuç satırları) ölçümle 44px ve isabet alıyor.

## ÖLÇÜM ALETİ TUZAĞI — SONRAKİ CANLI TURLAR İÇİN

Task 7'nin ilk turu **sheet'i hiç ölçmemişti** ve bunu fark etmek kolay değildi: sheet açıkken
toplam eleman sayısı kapalı haldekiyle aynı çıkıyordu. Sebep: `waitForSelector('[role="dialog"]')`
dialog DOM'a girer girmez çözülüyor, ama framer-motion sheet'i hâlâ ekran altından yukarı
kaydırıyor; o anda tüm sheet çocukları script'in görünürlük filtresine (`rect.top >= innerHeight`)
takılıp atlanıyor. **Açık sheet ölçmeden önce bir sheet çocuğunun gerçekten görünür olmasını bekle.**

İkinci tuzak: sheet açıkken `elementFromPoint` arka plandaki her eleman için backdrop'u döndürür —
bu modalın DOĞRU çalıştığının kanıtıdır, kusur değil. Script'in `NEXTJS-PORTAL` istisnası tam
bunun içindi ama bu kod tabanı `<nextjs-portal>` üretmiyor, o yüzden hiç tetiklenmiyor.

## GENEL DERS: PLANIN VERDİĞİ KOD OTORİTE DEĞİL

Bu planda "aynen kullan" diye yazılmış kod **beş ayrı yerde** kusurlu çıktı ve hepsi review
turunda yakalandı: (1) Windows'ta çalışmayan npm script (cmd.exe tırnakları sıyırıyor);
(2) `/il \/ ilçe seçin/i` regex'i — JS'in `/i` bayrağı Türkçe noktalı `İ`yi katlamaz, üç ayrı
task'ın brief'inde vardı; (3) `page.tsx`te iki yerde geçen dizeyi arayan, asla geçemeyecek scope
assertion'ı; (4) exit code'u yutan seed script'i; (5) değişiklikten önce de yeşil olan, yani
hiçbir şeyi korumayan iki test. Ayrıca brief'lerin "beklenen test sayısı" satırları iki kez yanlıştı.
