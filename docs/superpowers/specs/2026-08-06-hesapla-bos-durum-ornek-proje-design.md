# Hesapla — Boş Durum + "Örnek Proje ile Dene" — Tasarım

**Tarih:** 2026-08-06
**Durum:** Onaylandı (brainstorming), implementasyon planı bekliyor.

## Problem

`/hesapla` sayfası açılır açılmaz, kullanıcı hiçbir veri girmeden, sabit varsayılan değerlerle
(`AYAR_VARSAYILANLARI`: `arsaAlani: 360`, `apartmentSize: 140`, `globalUnitPrice: 12000`, `landShareRatio: 33`,
`riskLevel: 10`, `builderProfit: 1.30`) otomatik bir hesaplama çalıştırıyor ve sonucu ("Min. Daire Fiyatı:
5.019.940 TL" gibi) tam teşekküllü, iddialı bir "Hesap Sonuçları" panelinde gösteriyor (mobilde ekranın en
üstünde büyük mavi bir hero kart olarak). Bu, gerçek bir hesaplama gibi görünüyor ama aslında günün rastgele
demo senaryosu — kullanıcı (müteahhit/müşteri) bunu kendi verisi sanıp ciddiye alabilir. Bir fizibilite aracı
için bu bir güven sorunu.

Kök neden: `page.tsx:217-255`'teki `useEffect` her state değişiminde koşulsuz çalışıyor ve `setResult(res)`
yapıyor; sayısal input state'leri (`apartmentSize`, `globalUnitPrice`, `arsaAlani`) hiçbir zaman "boş" bir
başlangıç durumuna sahip değil, hep sabit bir sayı ile başlıyor.

## Karar: Boş durumdan başla + isteğe bağlı "Örnek Proje ile Dene"

Kullanıcı gerçek veri girene (parsel seçme VEYA iki temel sayısal alanı doldurma) kadar hiçbir sonuç
gösterilmez. Aracı ilk kez kullanan/ne yapacağını bilmeyen kullanıcı için, sonucu tek tıkla dolduran ayrı bir
"Örnek Proje ile Dene" butonu sunulur — bu, gösterilen verinin kullanıcının kendi verisi olmadığını açıkça
işaretler (rozet ile) ve kullanıcı bir alanı kendi eliyle değiştirdiği an bu işaret kalkar.

**Terminoloji notu:** "Senaryo" kelimesi bu uygulamada zaten dolu — kullanıcının kaydettiği karşılaştırma
senaryoları için kullanılıyor (`savedScenarios`, `ScenarioCompare.tsx`, "+ Karşılaştır" butonu, "Senaryo 1/2/3"
etiketleri). Bu yüzden yeni özellik bilinçli olarak "senaryo" kelimesini kullanmıyor — **"Örnek Proje ile
Dene"** deniyor.

### Reddedilen alternatifler

- **Sadece etiketleme (yapı değişmez):** Mevcut otomatik-doldurma davranışını koruyup sonuç paneline "bu bir
  örnektir" rozeti eklemek. Ucuz ama kullanıcının açıkça istediği "boş durumdan başlama" davranışını
  karşılamıyor.
- **Sayfa girişinde tam ekran mod seçimi ("Yeni Proje / Örnek Proje"):** Her ziyarette (tekrar gelen,
  deneyimli kullanıcı dahil) fazladan bir adım zorunlu kılar, araç yerine bir onboarding akışı gibi
  hissettirir. Reddedildi.

## Veri modeli / geçit mantığı

**Nullable state'ler:** `apartmentSize`, `globalUnitPrice` → `number | null`, başlangıç değeri `null` (şu anki
sabit varsayılanların yerine). İlgili `<input type="number">` alanları mevcut deseni koruyor:
`value={apartmentSize ?? ''}`, `onChange`'de boş string → `null`. Stepper (`+`/`-`) butonları `null`'dan
tıklanırsa mantıklı bir başlangıç değerine (140, 12000) atlar.

**Geçit koşulu (DÜZELTME — implementasyon planı öncesi kod incelemesiyle netleşti):**
```ts
const hasEnoughDataForResult = apartmentSize !== null && globalUnitPrice !== null;
```
İlk taslakta "parsel seçmek VEYA iki alanı doldurmak" deniyordu, ama `handleParcelConfirm`
(`page.tsx:258-267`) yalnızca `arsaAlani`/`riskLevel` dolduruyor — `apartmentSize`/`globalUnitPrice`'a hiç
dokunmuyor. Motor (`CalculatorEngineV2.calculate`) bu ikisi olmadan hiçbir zaman anlamlı bir sonuç
üretemiyor, yani parsel seçimi TEK BAŞINA yeterli değil — sadece arsa alanı/risk doğruluğunu artıran ayrı bir
katman. Kullanıcı onayıyla eşik sadeleştirildi: **her zaman** iki sayısal alan gerekli, parsel seçimi
gerekliliği değiştirmiyor.

`page.tsx:217-255`'teki hesaplama `useEffect`'i aynı kalıyor, ama başında bu koşul `false` ise
`setResult(null)` ile erken çıkıyor — motor `null`/eksik değerlerle çağrılmıyor.

**`isDemoData` bayrağı:** `useState<boolean>(false)`. "Örnek Proje ile Dene" tıklanınca **sadece o an boş
olan** `apartmentSize`/`globalUnitPrice` alanlarını demo sabitleriyle (140, 12000) doldurur — kullanıcı zaten
bir değer girmişse o alana dokunmaz — ve bayrağı `true` yapar. Kullanıcı bu iki alandan birini kendi eliyle
değiştirdiğinde (`onChange` içinde) bayrak otomatik `false` olur; ayrı bir "vazgeç/temizle" kontrolü yok
(YAGNI).

**Kaydedilmiş senaryo yükleme:** `apartmentSize`/`globalUnitPrice` dahil ilgili state'leri gerçek değerle
dolduruyor, dolayısıyla geçit otomatik açılır ve `isDemoData` hiç tetiklenmez (zaten `false` kalır).

**Parsel seçme:** Yukarıdaki düzeltme gereği artık geçidi TEK BAŞINA açmıyor (`apartmentSize`/`globalUnitPrice`
hâlâ `null` kalabilir). Eğer kullanıcı önce "Örnek Proje ile Dene"yi tıklamışsa (`isDemoData=true`) ve sonra
bir parsel seçerse, `isDemoData` bilinçli olarak `false`'a ÇEKİLMEZ — çünkü m²/birim maliyet hâlâ demo
değerleri, parsel seçimi bunları gerçek yapmıyor. Rozet yalnızca kullanıcı bu iki alandan birini kendi eliyle
değiştirdiğinde kalkar (yukarıdaki genel kural, ek bir istisna yok).

**Arsa Alanı (`arsaAlani`/`isAaEnabled`) notu:** Geçit koşuluna dahil değil — mevcut davranışta zaten opsiyonel
bir alt-ayar (toggle kapalıyken `Aa: undefined` gönderiliyor, motor bunsuz da çalışıyor). Bu spec'in kapsamı
dışında, dokunulmuyor.

## UI

**Masaüstü — "Hesap Sonuçları" paneli (boşken):** Panel çerçevesi korunuyor (ani layout sıçraması olmasın),
içeriği: kısa açıklama metni ("Sonuçları görmek için parsel seçin ya da daire m² ve birim maliyeti girin") +
ikincil-stil **"Örnek Proje ile Dene"** butonu (mevcut "Haritadan parsel seç" birincil CTA'sıyla görsel olarak
yarışmıyor). "Hesap Özeti" (pasta grafik) paneli de aynı mantıkla boş/soluk bir versiyon gösteriyor (grafik
yok, değerler "—").

**Mobil — üstteki büyük mavi hero kart:** Aynı görsel ağırlıkta kalıyor, içerik "MIN. DAİRE FİYATI / ... TL"
yerine kısa bir davet metni + aynı buton.

**Buton görünürlüğü:** Sadece `hasEnoughDataForResult === false` iken görünür; gerçek sonuç belirdiğinde
tamamen kayboluyor.

**"Örnek Veri" rozeti:** `isDemoData === true` iken sonuç paneli başlığının yanında küçük, kapatılamaz
(X'siz) bir rozet. Kullanıcı bir alanı değiştirince otomatik kalkar (yukarıya bkz.).

**"?" yardım ikonu:** Bu özelliğin kapsamı dışında — alan bazlı yardım ikonları (varsa/eklenecekse) ayrı bir
iş, "Örnek Proje ile Dene" ile karıştırılmıyor çünkü farklı işlevler görüyorlar (yardım = pasif bilgi, buton =
aktif veri doldurma eylemi).

## Bulunan ve bu işin kapsamına alınan mevcut hata

"Rapor Kaydet" butonu (`page.tsx:372`, mobil sticky CTA `:889`, ikisi de `handleSaveReport`'u çağırıyor) şu an
**sadece** `disabled={isSaving}` — `result`'a bağlı değil. `handleSaveReport`'un kendisi `if (!result) return;`
ile zaten korunuyor (veri bozulması/çökme riski yok), ama buton boş durumda bile tıklanabilir görünüyor ve
tıklanınca sessizce hiçbir şey yapmıyor — PDF İndir/Karşılaştır'ın doğru `!result` davranışıyla tutarsız, kafa
karıştırıcı bir UX detayı. Bu spec kapsamında `disabled={!result || isSaving}` olarak düzeltilecek.

## Kenar durumlar

- Stepper `null`'dan `+`: mantıklı başlangıç değerine atlar (140/12000). `-`: no-op.
- Erişilebilirlik: sorun yok, alanların zaten ayrı `<label>` başlıkları var, placeholder tek etiket kaynağı
  değil.
- SSR/hydration: `null` başlangıç değeri deterministik, server/client arasında uyuşmazlık riski yok.

## Test etkisi (dürüst kapsam — koda bakılarak doğrulandı)

İlk tahminin aksine, mevcut testlerin çoğu ZATEN `result`/`globalUnitPrice` için `null`/farklı-değer
senaryolarını izole test ediyor (bu kod tabanının genel alışkanlığı — bkz. `HesapFisi.test.tsx`'te
`result={null}` testi, `AdvancedSettingsSections.test.tsx`'te `BirimMaliyetField`'i kendi yerel state'iyle
saran bir `Sarmalayici`), yani KIRILMALARI beklenmiyor; sadece nullable durum için yeni test case'leri
eklenecek. `page.tsx`'in kendi test dosyası (`page.test.tsx`) yalnızca parsel modalinin iki platformda da
mount olduğunu doğruluyor, sayısal varsayılanlara hiç dokunmuyor — etkilenmiyor. `SonucKarti.test.tsx`
zaten `minDaireFiyati={null}` durumunu test ediyor ("—" render). Gerçek yeni test ihtiyacı: `GirdiKarti.tsx`
için nullable `apartmentSize` durumu (`GirdiKarti.test.tsx`'e yeni case), ve her iki dosyaya da "Örnek Proje
ile Dene" butonu + "Örnek Veri" rozeti için yeni test case'leri.

## Doğrulama

- Mekanik: `npx tsc --noEmit` + tam jest suite (güncellenen testler dahil) yeşil.
- Canlı (Playwright, masaüstü + mobil viewport):
  1. Sayfa ilk açıldığında boş durum + "Örnek Proje ile Dene" görünür, hiçbir TL değeri gösterilmez.
  2. Butona basınca alanlar demo değerleriyle dolar, "Örnek Veri" rozeti görünür, sonuç hesaplanır.
  3. Bir alanı elle değiştirince rozet kalkar, sonuç kullanıcının gerçek girdisine göre güncellenir.
  4. Parsel seçilince (rozet hiç görünmeden) doğrudan gerçek sonuç belirir.
  5. "Rapor Kaydet" boş durumda devre dışı.
