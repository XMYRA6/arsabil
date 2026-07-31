# SDD ledger — plan: docs/superpowers/plans/2026-07-30-hesapla-girdi-mimarisi.md

Worktree: `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass`
Branch: `feature/mobil-liquid-glass` · Başlangıç HEAD: `ea25d66`
Baseline: jest 664/664, `tsc --noEmit` 0, `eslint src` 12 (2 hata/10 uyarı — hiçbiri
bu planın dosyalarında), `npm run build` başarılı.
origin ÖLÜ — push yok, yalnızca lokal commit.

Spec: `docs/superpowers/specs/2026-07-29-hesapla-girdi-mimarisi-design.md`
Önceki planın ledger'ı: `../2026-07-28-mobil-faz0-temel-faz1-hesapla/progress.md`
(o plan tamamlandı; A1 review borcu da kapatıldı, `c797c7f`..`7274b1c`)

## Pre-flight taraması

Plan yazımının öz-denetiminde 4 sorun bulunup düzeltildi (bkz. `7b6d7f1` commit mesajı):
tip tutarsızlığı (`karsilastirma`ın yeri), karşılanmayan spec gereksinimi (ezme
bildirimi), Task 7'nin Task 6'nın çağrı yerini kırması, `as never` tip kaçışı.

SDD pre-flight'ında **bir sorun daha** çıktı ve düzeltildi (`ea25d66`):
Task 4 ve Task 5 `page.tsx`in çağrı yerlerini kırıp düzeltmeyi Task 6'ya bırakıyordu →
o iki task **`tsc` kırmızı** halde bağımsız review'a gidecekti. Subagent-driven'da her
task kendi review kapısından geçer; kırık derleme devretmek reviewer'ı gerçek bulgudan
uzaklaştırır. Artık her task kendi çağrı yerini kapatıyor ve `tsc`yi yeşil bırakıyor.

İnsan kararı gerektiren plan çelişkisi KALMADI.

## Bu planda taşınan dersler (önceki turdan)

- **Ekran görüntüsü ve `getByRole` yetmiyor.** A1 turunda dört gerçek kusurun dördünü
  de kaçırdılar; yakalayanlar hesaplanmış stil okuması ve simüle edilmiş jest oldu.
  Plan §10 Step 2 bu üç doğrulamayı zorunlu kılıyor.
- **`tsc` ve `jest` birlikte koşulur.** Bu iş sırasında `tsc`, jest'in kaçırdığı üç
  hatayı yakaladı (eksik test fikstürü, zorunlu prop, tip uyumsuzluğu).
- **Regresyon çitlerini kaldırma, yönlendir.** İki kez kaynakta literal metin arayan
  2026-07-24 çitleri refaktör yüzünden kırıldı; ikisinde de niyet korunup assertion
  doğru hedefe çevrildi.
- **`git add -A` KULLANMA** — takipsiz `hatalar/` ve ~12 MB kullanılamaz
  `public/images/**` sessizce staging'e girer.

## İlerleme

Task 1: BASE `ea25d66`. İmplementer DONE (`f7d4c6f`), jest 671/671, tsc 0.
Task review → **Approved**, Critical/Important YOK. Reviewer adlandırılmış riski
bağımsız doğruladı: testlerin elle yazılmış beklenen değerlerini Node'da hesaplayıp
doğru buldu (`41000×140`, `41333.4×140` — ikincisi tam sayı, yuvarlama bir şey gizlemiyor),
yani implementasyon yanlış bir beklentiye bükülmemiş. Öncelik kuralı gerçekten koşulsuz
(fonksiyon "önceki elle değer" parametresi almıyor, akıllı guard yok).
Task 1: minor (deferred): `kaynakEtiketi`'nin `switch`i `varsayilan`ı `default`la
karşılıyor; birlik dördüncü bir `tur` kazanırsa sessizce "Varsayılan" basar.
Task 1: minor (deferred): `ilceSecildi` `Math.round` yapıyor, biçimleyici de zaten
yuvarlıyor — zararsız ama gereksiz.
Task 1: complete (commits `ea25d66`..`f7d4c6f`, review clean)

Task 2: BASE `f7d4c6f`. İmplementer DONE (`4fdda5b`), KonumBlogu 8/8, kapsam guard 4/4,
jest 679/679, tsc 0. Task review → **Approved**, Critical/Important YOK. Reviewer dört
adlandırılmış riski de izledi (kademe sızıntısı, kontrolsüz input davranışı, boş
`districtPrices`, kapsam sızıntısı) ve Task 1'in sözleşme metinlerini + ikon export'larını
kaynağından doğruladı (uydurma import kontrolü).
Task 2: fix round 1/5 (1 addressed, 0 open; commits `4fdda5b`..`66830e3`) — `mNum` tüm
etiket cümlesine uygulanmıştı, yer adı da mono basılıyordu. **Planın kendi transkripsiyon
kusuru.** D1 kararıyla çelişiyordu: mono, alt alta hizalanan rakam sütunları için;
satır içi etiket için değil. Kullanıcı zaten "eski daktilo tarzı fontlar" diye
şikayet etmişti. Span'dan kaldırıldı, sayısal input'ta korundu, gerekçe koda yazıldı.
Task 2: minor (deferred): düzenleyiciyi başarılı bir düzenlemeden SONRA yeniden açma
senaryosunun testi yok. Remount davranışı incelemeyle sağlam (`defaultValue` her açılışta
güncel prop'u okur); Task 10'un canlı davranış turu bu yolu uçtan uca kapsıyor.
Task 2: complete (commits `f7d4c6f`..`66830e3`, review clean)

Task 3: BASE `66830e3`. İmplementer DONE_WITH_CONCERNS (`d19de3c`) → **planın test kodunda
gerçek bir kusur buldu:** kontrollü bir input'a `onChange` olarak düz `jest.fn()` verilirse
yazılan metin birikmez (React her tuştan sonra DOM değerini değişmeyen prop'tan geri yazar).
**Teşhis doğru, çözüm yanlış katmandaydı:** input'u `defaultValue` ile kontrolsüze çevirmiş.
Controller reddetti — bu blok ekran boyunca mount kalıyor ve **ilçe seçimi bu alanı
`setManualMarketPrice` ile dışarıdan dolduruyor**; kontrolsüz alan o güncellemeyi sessizce
yok sayar, rozet yeni sayıdan hesaplanırken input eski metni gösterir. `KonumBlogu`'nun
`defaultValue` kullanımı orada meşru (alan blur'da unmount olup her açılışta prop okuyor),
gerekçe buraya taşınmıyor.
Task 3: fix round 1/5 (3 addressed, 0 open; commits `d19de3c`..`8a279a1`) — input kontrollü
hale döndü, test state'li sarmalayıcıyla düzeltildi, ve **kaçırılan hatayı yakalayacak
regresyon testi eklendi** (`rerender` ile prop değişimi alana yansıyor mu). Re-reviewer
guard'ın ayırt edici olduğunu akıl yürütmeyle doğruladı: React DOM değerini yalnızca `value`
prop'u varken yeniden senkronize eder, yani `defaultValue`'ya dönülürse test kırmızı olur.
Task 3: complete (commits `66830e3`..`8a279a1`, review clean) — jest 687/687, tsc 0.

**DERS (bu plan için):** test kırmızı olduğunda soru "hangi taraf yanlış" — burada test
yanlıştı, bileşen doğruydu; bileşeni bükmek testi geçirip ürünü bozuyordu.

Task 4: BASE `8a279a1`. İmplementer DONE (`00e72de`), jest 689/689, tsc 0.
Task review → **Approved**, Critical/Important YOK. Reviewer implementer'ın üç iddiasını
tek tek doğruladı — özellikle "`getAllByText('—')` sayısı 2 kalır çünkü placeholder metin
düğümü değil" iddiasını DOM davranışından teyit etti. Rozet gerçekten kaldırılmış
(markup + `ucuz` state + artık kullanılmayan `IconCheckCircle` import'u silinmiş, gizlenmemiş).
Çağrı yeri bu task'ta kapatılmış: `mobilAnalizAcik` gerçekten `useState` ile tanımlı.
Task 4: minor (deferred) → **Task 6'ya süpürme işi:** `.sonucRozet`, `.sonucRozetUcuz`,
`.sonucRozetPahali` artık hiçbir bileşenden referans almıyor (ölü CSS). Ayrıca `.sonucUst`
hâlâ `justify-content: space-between` taşıyor ama tek çocuğu kaldı — atıl kural.
Task 4: complete (commits `8a279a1`..`00e72de`, review clean)

Task 5: BASE `00e72de`. İmplementer DONE (`fd72559`), jest 691/691, tsc 0.
Task review → **Needs fixes**, 2 Important:
(a) Sarmalayıcının koruma yorumu yok — masaüstü paritesi tek başına JSX sırasına bağlı ama
bunu söyleyen bir şey yoktu ve yakalayan test de yok.
(b) **`onSifirla` bu task'ın kapattığı hatayı geri getiriyordu:** yaprakta artık görünmeyen
daire-sayısı kontrollerini sessizce yazmaya devam ediyordu. Render yolundan reset yoluna
taşınmış aynı "bir ekranı değiştir, diğerini sessizce yaz" hatası. **İz benim:** A1 turunda
"Sıfırla yaprağın GÖSTERDİĞİ 9 alanı sıfırlasın" diye genişletmiştim; Task 5 yaprağı
daraltınca o liste bayatladı.
Ayrıca implementer'ın doğrulama yönteminde zayıflık: "diff'te çağrı yerine dokunulmadı,
demek ki aynı" — çağrı yerinin METNİNİ kanıtlar, ÇIKTISINI kanıtlamaz; değişen şey tam
olarak sarmalayıcının içiydi. Reviewer gerçek gerekçeyi (aynı JSX sırası, aynı kök element,
`page.module.css`'te kardeş seçici yok) ayrı ayrı doğruladı.
Task 5: fix round 1/5 (2 addressed, 0 open; commits `fd72559`..`d75703b`) — sarmalayıcıya
"SADELESTIRMEYIN + sıra + testi yok" yorumu; reset sekiz alana indirildi; kapsam testi
İKİYE ayrıldı (11 alan başlangıç değeri, 8 alan reset) **ve düşürülen üçü için negatif
assertion eklendi** — re-reviewer bu testin regresyonu gerçekten yakaladığını doğruladı.
Task 5: minor (deferred): masaüstü çekmecesinin `FormulParamsFields` render'ını koruyan
otomatik test yok; Task 10'un masaüstü regresyon turu kapsıyor, snapshot kırılgan olurdu.
Task 5: complete (commits `00e72de`..`d75703b`, review clean) — jest 692/692, tsc 0.

Task 6: BASE `d75703b`. İmplementer DONE_WITH_CONCERNS (`bad6b55`) — kapsam taşması bildirdi:
grep'in boş dönmesi şartını koyarken `SekmeSecici`'nin Task 7'nin dosyasında olduğunu
hesaplamamıştım, **controller hatası**. İmplementer yalnızca çağrısı kalmayan kodu silmiş,
`AnalizSekmesi`/`AnalizSekmesiProps`'a dokunmamış ve saklamak yerine bildirmiş; reviewer
bu iddiayı doğruladı.
Task review (opus) → **Needs fixes**, 2 Important + 7 Minor. Reviewer doğruladıkları:
`page.tsx` diff'i masaüstü ağacına FİZİKSEL olarak dokunamıyor (her hunk masaüstü ağacı
başlamadan 51 satır önce bitiyor), hiçbir hook koşullu olmadı, silinen beş CSS sınıfı
gerçekten referanssız, toast eski kaynağı doğru okuyor, 692→691 test aritmetiği doğru.
İki Important **ikisi de planın kendi metninden** (controller hatası) ve ikisi de tam olarak
bu planın var oluş sebebi olan provenance arayüzünde:
1. "İki değer birden dolar" kuralının YARISI sessizdi — ilçe seçimi `manualMarketPrice`'ı da
   eziyor ama bildirim yalnızca birim maliyetin kaynağına bakıyordu. Kullanıcı piyasa fiyatını
   yazıp ilçe seçince sayısı haber verilmeden gidiyordu.
2. Konum temizlenince kullanıcının YAZDIĞI değer "Varsayılan" diye etiketleniyordu
   (12000 → elle 15000 → ilçe → temizle ⇒ "Varsayılan 15.000 TL/m²"). Kaynak etiketi,
   kullanıcının kendi sayısı hakkında yanlış beyanda bulunuyordu.
Task 6: fix round 1/5 (6 addressed, 0 open; commits `bad6b55`..`33ffb3c`) — `piyasaFiyatiElle`
izleme bayrağı, toast iki değeri de kapsıyor + `position: 'top-right'`, `originalUnitPriceKaynagi`
ile kaynak birlikte yedeklenip geri yükleniyor, ölü `onAnalizAc` prop'u kaldırıldı,
`konumTemizlendi` tek kaynak oldu, Analiz kapat satırına başlık eklendi, ve
**`HesaplaMobile.test.tsx` "tek kapı" değişmezi için yazıldı** (4 test).
Re-reviewer Finding 2'nin dizisini kodda adım adım izledi (artık "Elle girildi · 15.000 TL/m²")
ve yeni testin ayırt edici olduğunu doğruladı: `role="tab"` kontrolü `banner`a scope'lu, yani
girdi kartının kasıtlı segment kontrolleriyle çakışmıyor ama eski sekme şeridi geri gelirse
yakalıyor.
Task 6: complete (commits `d75703b`..`33ffb3c`, review clean) — **jest 695/695**, tsc 0, eslint 12.

Task 6: minor (deferred): `analizAcik` + `fisAcik` iki bağımsız boolean, `fis && analiz`
durumu erişilebilir. Davranış savunulabilir ("önceki derinliğe dön") ama tasarlanmış değil,
ortaya çıkmış. Tek bir `mobilDerinlik: 'girdi'|'fis'|'analiz'` union'ı bunu açık hale getirirdi.
Task 6: minor (deferred): `onParselAc` İKİ bölümü aynı anda vurguluyor (`bolum('kar','risk','iksa')`
de `'risk'` içeriyor) ve hiçbirine kaydırmıyor; parsel bölümü yaprağın sonunda olduğu için
ekran dışında açılabilir. Ayrı bir `'parsel'` üyesi bunu tek bölüme nişanlardı.
**Task 10 canlı viewport turunda ölçülmeli.**
Task 6: **AÇIK KALEM (reviewer'ın out-of-scope bulgusu, ele alınmadı):** `page.tsx:316-325`'te
ÖNCEDEN VAR OLAN bir `useEffect`, ilçe seçiliyken `apartmentSize` değişince `manualMarketPrice`'ı
sessizce yeniden hesaplıyor — ne toast atıyor ne `piyasaFiyatiElle`'ye dokunuyor. Yani kullanıcı
ilçe seçiliyken elle piyasa fiyatı yazıp sonra metrekareyi değiştirirse değeri **hiçbir bildirim
olmadan** kaybediyor ve bayrak stale-`true` kalıyor. Bu diff'in dışında, ama yeni bayrak
`manualMarketPrice` için TAM bir provenance izleyicisi değil — yalnızca ilçe yolunu kapsıyor.

Task 7: implementer DONE_WITH_CONCERNS (commit `16e3b23`, 698/698, tsc 0, eslint 12).
Concern GERÇEK ve doğrulandı: `HesaplaMobile.tsx:76-85` Task 6'dan beri kendi "Analiz" +
"Kapat" satırını basıyor ve hemen altında `AnalizSekmesi`'yi render ediyor; Task 7'nin brief'i
aynı satırı `AnalizSekmesi`'nin İÇİNE eklettirdi → canlı sayfada ÜST ÜSTE İKİ başlık/Kapat.
Testler yakalamadı çünkü her seviye diğerini mock'luyor.
Task 7: plan çelişkisi → **insan kararı (2026-07-30): `AnalizSekmesi` tek sahip.** Task 7'nin
plan metni geçerli; Task 6'nın satırı bayat. `HesaplaMobile.tsx`ten satır + ölü `onAnalizKapat`
prop'u kaldırılacak, `HesaplaMobile.test.tsx`e tekrar dönerse kırılacak ayırt edici test yazılacak.
Task 7: fix round 1/5 (1 addressed, 0 open — mükerrer kapat satırı; commits `16e3b23`..`b77aa66`)
— `HesaplaMobile.tsx`ten satır + `onAnalizKapat` prop'u (tip, destructure, JSDoc, `page.tsx`
çağrısı) tamamen çıktı; `HesaplaMobile.test.tsx`e `jest.requireActual` ile GERÇEK `AnalizSekmesi`
render eden ayırt edici test eklendi (implementer mükerreri kasten geri koyup "Received length: 2"
ile kırıldığını kanıtladı).
Task 7: reviewer ✅ spec compliant, task quality Approved, Critical/Important YOK.
Reviewer'ın adlandırılmış risk kontrolleri: `onAnalizKapat` grep'i src genelinde 0 kalıntı;
`FinancialDashboard` prop adları (`totalInvestment`/`totalRevenue`) kaynağa karşı doğrulandı.
⚠️ "FiyatAciklamasi deseniyle eşleşme diff'ten görülemez" kalemi CONTROLLER TARAFINDAN ÇÖZÜLDÜ:
`FiyatAciklamasi.tsx:74-76` birebir aynı desen (`<header>` + `<h2 .aciklamaBaslikMetin>` +
`<button .aciklamaKapat>`) — gerçek boşluk değil, h2/h3 hiyerarşisi de tutarlı.
Task 7: complete (commits `892ab70`..`b77aa66`, review clean) — jest 698/698, tsc 0, eslint 12.

Task 8: implementer DONE_WITH_CONCERNS (commit `f5ba814`, 700/700, tsc 0, eslint 12).
Concern GERÇEK: brief "`.desktopSidebar` içinde `LocationSelector`ın hemen altına" diyor ama
`LocationSelector` `page.tsx:1103`'te `.rightGrid` (SONUÇ sütunu) içinde — talimat fiilen
imkânsız, uygulanması brief'in kendi KRİTİK notunu ("yerleşim yeniden tasarlanmaz") ihlal ederdi.
Task 8: plan çelişkisi → **insan kararı (2026-07-30): sol sütunun en üstü geçerli.** Girdi
kontrolü sonuç sütununa taşınmayacak; o iş ayrı spec'te (Parça 3 — masaüstü yerleşimi).
Task 8: reviewer ❌ 3 Important — (1) brief'in dayattığı test VACUOUS (`'isSettingsSidebarOpen &&'`
kodda hiç yok, `indexOf` hep -1, assertion koşulsuz true), (2) yeni sayı input'u temizlenemiyor
(`Number('')===0` guard'a takılıyor, kontrollü input geri sıçrıyor), (3) `.drawerCardHeader`
kartsız kullanılmış, kardeş `.settingsGroup>h4` başlıklarıyla uyumsuz + görsel doğrulama yapılmamış.
Task 8: (1) ve (2) plan-mandated → **insan kararı: ikisi de düzeltilsin** (brief'in kodu kusurlu).
Task 8: fix round 1/5 (3 addressed, 0 open; commits `f5ba814`..`dd122d8`) — test gerçek çekmece
sınırına (`styles.settingsDrawerOverlay`) bağlandı ve MarketField çekmeceye geri konarak kırıldığı
kanıtlandı; input `AdvancedSettingsSections.tsx`e `BirimMaliyetField` olarak çıkarıldı (Next.js
page-export sözleşmesi `page.tsx`te named export'a izin vermiyor — gerçek tsc hatasıyla doğrulandı),
yerel string buffer + render-zamanı prop uzlaştırması (useEffect DEĞİL, lint ihlali vermiyor),
`{tur:'elle'}` semantiği korundu; başlık düz `<h4>` oldu ve 6 kardeş başlıkla `getComputedStyle`
eşitliği canlı doğrulandı (13px/700/rgb(25,50,79)/none/normal).
Task 8: complete (commits `b77aa66`..`dd122d8`, review clean) — jest 704/704, tsc 0, eslint 12.

Task 9: implementer NEEDS_CONTEXT (commit `aae82c9` — `RaporPdfButonu` + 3 test, sayfaya BAĞLANMADI).
GERÇEK PLAN BOŞLUĞU, controller bağımsız doğruladı: `ReportInput` (`ReportDocument.tsx:217-230`)
`riskLevel`/`builderProfit`/`iksaMode`/`marketPrice` + TAM `CalculationOutput` istiyor; Prisma
`Report` modeli yalnızca title/totalApartments/apartmentSizeSqm/luxLevelModifier/landShareRatio/
minApartmentPrice/landCost/userId saklıyor. Kayıtlı rapordan mevcut şablon UYDURMADAN üretilemez.
Task 9: **insan kararı (2026-07-31): küçültülmüş PDF şablonu.** Migration yok, varsayılan girdiyle
yeniden hesaplama yok. Kayıtlı 8 alan gösterilir; eksik bölümler sıfır/boş satır olarak DEĞİL,
tamamen çıkarılır. Ortak blob→indirme adımı paylaşılan yardımcıya çıkarılacak (kopyalanmayacak).
`landCost` tarihsel olarak `result.FA || result.Ma` diye yazılmış — etiketi ikisi için de doğru
olmalı. "Saklanmayan alanlar render EDİLMEZ" testi zorunlu.
Task 9: reviewer ✅ spec compliant (karara göre, bayat brief'e göre DEĞİL), Approved,
Critical/Important YOK. Adlandırılmış üç risk de kontrol edildi ve temiz çıktı: (1) saf modül
üzerindeki koruma testi TİYATRO DEĞİL — `SavedReportDocument` yalnızca `hero`/`rows` dizilerini
geçiriyor, yan kanaldan alan enjekte etmiyor; (2) paylaşılan `downloadPdf.ts` çıkarımı davranışı
birebir koruyor (dosya adı, DOM temizliği, revoke, hata yayılımı); (3) "Arsa Değeri" etiketi
`reports/page.tsx:224`te zaten kullanılan nötr terim, FA/Ma ikisi için de doğru.
Task 9: complete (commits `dd122d8`..`25608ff`, review clean) — jest 709/709, tsc 0, eslint 12.

Task 9: minor (deferred): `SavedReportDocument.tsx:274-418` renk paleti + `StyleSheet`i
`ReportDocument.tsx`ten yapısal olarak kopyalıyor (paylaşılan tema modülü yok) — biri restyle
edilirse ikisi sessizce ayrışır.
Task 9: minor (deferred): `savedReportContent.ts:679` `luxLevelModifier`i `nf.format()` olmadan
`x${...}` diye basıyor; `reports/page.tsx:222`teki mevcut konvansiyonla tutarlı ama global
kısıttaki `Intl.NumberFormat` kuralına teknik olarak uymuyor.
Task 9: minor (deferred): iki generator da aynı 2 satırlık `React.createElement(...) as any` +
eslint-disable bloğunu taşıyor; tek satırlık ortak yardımcı olabilirdi.
Task 9: **İNSAN ONAYI BEKLİYOR (bloke etmiyor):** `SavedReportDocument.tsx:486-489`teki alt bilgi
feragat cümlesi spec'te yok — implementer'ın kendi işaretlediği UX kararı. Reviewer düşük riskli
ve makul buldu (hiçbir çıkarılmış alanı sızdırmıyor). Final review'da insana sorulacak.

Task 10: canlı tur yapıldı (390×844 + 1440×900, Docker ayağa kaldırıldı, DB boştu → geçici
ilçe fiyat satırları eklenip silindi). Commit `08a39bb`, jest 716/716, tsc 0, eslint 12, build ok.
ÜÇ GERÇEK KUSUR bulundu ve TDD ile düzeltildi: (1) "Konumu temizle" birim maliyeti sıfırlıyor
ama piyasa fiyatını bayat bırakıyordu; (2) `prefers-reduced-motion: reduce` altında BottomSheet
`transition` prop'u HER ZAMAN spring kalıyordu (opacity 0.789 ölçüldü) → `sheetTransition()`
yardımcısı, normal hareket bozulmadı; (3) `onParselAc` iki bölümü birden vurguluyor ve hiç
kaydırmıyordu → tek `'parsel'` hedefi + scrollIntoView.
Task 10: reviewer ✅ üç fix'i bağımsız doğruladı (yetim `konumTemizlendi` çağrısı yok, `'risk'`in
başka çağıranı yok, normal hareket bozulmamış) ama **1 Important:** ölçülen dokunma hedefi
örtüşmesi (scroll=0'da "Metrekareyi azalt/artır" ve daire sayısı toggle'ı StickyActionBar/
BottomNavbar'ın gerçek vuruş alanına düşüyor, 40px/100px kaydırınca temizleniyor) implementer
tarafından kendi verdiği kapsam istisnasıyla ertelenmişti.
Task 10: **controller kararı: DÜZELTİLECEK, ertelenmeyecek.** Gerekçe: kök neden raporun kendi
ifadesiyle Task 5'in `KonumBlogu`'yu kartın üstüne alması (bu planın ayak izi, önceden var olan
yoğunluk sorunu değil); brief Step 6 "bulgular varsa düzelt" diyor, carve-out yok; ve görsel
konumdaki dokunuş YANLIŞ elemana gidiyor. Minimal düzeltme istendi (alt sabit çubuklar için
kaydırma konteynerine alt boşluk), yeniden tasarım değil; mobil media query içinde kalacak.

Task 10 fix turu: DISPATCH EDILMEDI/DUSTU — `08a39bb` sonrasi tek commit `4c6de9a` ve o da
yalnizca DURUM.md dokumani. Worktree temiz, kod degisikligi yok.

Task 10 dokunma hedefi: **CONTROLLER KARARI OLCUMLE GERI ALINDI (2026-07-31).** Onceki karar
("minimal padding-bottom ile duzelt") yanlis bir kok-neden modeline dayaniyordu. Canli olcum
(390x844, Playwright, `document.elementFromPoint` her etkilesimli eleman icin):
  viewport 844 · scrollHeight 1063 · maxScroll 219
  main padding-bottom 96px + MobileScreen padding-bottom 72px = 168px
  sabit cubuklar: StickyActionBar ~64px + BottomNavbar 96px = ~164px
  scrollTop=0 -> 2 ihlal · 40 -> 3 · 100 -> 2 · 150 -> 1 · **219 (maxScroll) -> 0 ihlal**
**Alt dolgu ZATEN yeterli (168 > 164) ve maxScroll'da tum kontroller erisilebilir.** Daha fazla
padding yalnizca maxScroll'u buyutur, scrollTop=0'daki isabet testini MATEMATIKSEL OLARAK
degistiremez — sadece olu kaydirma alani yaratir. Yani prescribed fix etkisiz olurdu.
Gercek kok neden: icerik 1063px, kullanilabilir viewport 844-164 = 680px; icerik alani 215px
asiyor, dinlenme halinde son ~164px yari saydam camin altinda kaliyor. Bu bir CSS dolgu bugu
degil, icerik yuksekligi meselesi; minimal dokunusla kapanmiyor.
Olcum notu: bu turda "Metrekareyi azalt/artir" ihlal ETMIYOR (merkez 673, cubuk ustu ~680) —
task-10-report'un listesi DistrictPrice seed satirlari yuzunden birkac piksel kaymis. Buna
karsilik `"Arsa payi yuzdesi"` input'u ve `"Gelismis ayarlar"` butonu raporda hic gecmiyordu
ama ihlal ediyorlar. Kusur SINIFI ayni, kapsanan eleman kimligi farkli.
**Insan karari (2026-07-31): kod yazilmayacak.** Bulgu whole-branch review'a "olculmus, bilinen"
triyaj kalemi olarak gosterilecek ve ayri mobil yerlesim spec'ine aday olarak yazilacak.
Olcum scripti tekrar kosulabilir: `.superpowers/touch-target-measure.mjs` (gitignored,
`SCROLLS=0,40,100,150,219 node .superpowers/touch-target-measure.mjs`, dev server acikken).

Task 10: complete (commit `08a39bb`, review clean + 1 Important olcumle triyaja donusturuldu)
— jest 716/716, tsc 0, eslint 12.

PLAN DURUMU: 10/10 task complete. Kalan tek adim: whole-branch review `c65e26c..HEAD`.

## WHOLE-BRANCH REVIEW (c65e26c..de8103a, opus) — 2026-07-31

Verdict: **With fixes.** Critical YOK. 5 Important, 8 Minor.
Reviewer masaustu kisitini (`page.module.css`/desktop JSX degismedi) `git diff` ile bizzat
dogruladi ve dogru buldu; uc insan override'ini da bagimsiz turetip hakli buldu; iki eski
failure mode'un (vacuous test, karsilikli mock korlugu) gercekten kapandigini teyit etti.

**Kapatildi (`de1a766`, jest 728/728, tsc 0, eslint 12):**
- I1 `piyasaFiyatiElle` masaustunde hic kurulmuyordu (6 yazici ham setter aliyordu) →
  tek giris noktasi `piyasaFiyatiGirildi`; "Ayarlari sifirla" da bayragi false'a cekiyor.
  Test kirilabilirligi kanitlandi (ham setter geri konunca 2 test kirmizi).
- I2 metrekare degisimi elle yazilmis toplami eziyordu → saf `metrekareDegisti()` (5 test).
- I4 PDF hatasi sessizce yutuluyordu, yorumu ("Sentry global alir") YANLISTI → toast + console.
- M4 `kaynakEtiketi` tuketilmis switch (`never` guard); garanti tsc ile kanitlandi (TS2322).
- M5 kalite katsayisi tr-TR: `x1.2` -> `x1,2`.

**Reviewer triyaji — ship-as-is denenler:** deferred minor 1 (analizAcik/fisAcik union: kombinasyon
erisilebilir ama render edilemez, `HesaplaMobile.tsx:70-96` analize kosulsuz oncelik veriyor),
2 (PDF palet kopyasi: ucuncu belge/rebrand gelince cikarilsin), 4 (`createElement as any` iki satir).
Footer feragat cumlesi: **onaylandi, KALSIN** — hicbir cikarilmis alani sizdirmiyor ve indirgenmis
PDF'in tam rapor sanilmasini onledigi icin K6 karari acisindan tasiyici.
Dokunma hedefi analizi: **aritmetik bagimsiz dogrulandi, saglam.** Tek ek: yanlis dokunus no-op
DEGIL — `StickyActionBar`a giden dokunus `handleSaveReport` tetikliyor (rapor kaydeder / auth
modali acar). Takip spec'ine bu cumle yazilmali.

**ACIK KALAN (bu branch'te kapatilmadi, reviewer "sonraki branch" dedi):**
- I3: `page.tsx:850-964` (`.mobileSidebar`) + `:1194-1196` (`.mobileActionsSlot`) ~115 satir
  JSX artik IKI YONDE de olu — `page.tsx:570` <=768px'te zaten `HesaplaMobile` donuyor, CSS de
  masaustunde `display:none`. Ustelik `pageStyles.scope.test.ts:256-262` bu olu koda dayanarak
  akil yuruyor; silinirse o test SADELESIR.
- I5: `page.tsx`i render eden HICBIR davranis testi yok; sayfa garantilerinin hepsi kaynak-metin
  regex'i. I1 ve I2'nin gozden kacmasinin YAPISAL nedeni bu. Bir sonraki provenance dokunusunda
  mobil dali mock'lu fetch'lerle mount eden bir entegrasyon testi yazilmali.
- M1 segmented control ARIA (`GirdiKarti.tsx:95-105` `role="tablist"`/`tab` ama tabpanel yok →
  `radiogroup`/`radio`/`aria-checked` olmali) — takip spec'ine, ayni ekran.
- M2 `landShareRatio` uc farkli alt sinir (0 / 10 / 1), M3 "PAHALI" rozetinde check-circle ikonu,
  M6 olu `arsaRef`, M7 `FiyatAciklamasi.tsx:57-59` guard'siz `localStorage` render yolunda
  (storage bloklu istemcide render'dan throw → fis gorunumu komple duser), M8 birim maliyet
  yalnizca blur'da commit (Enter/Escape yok).
- **Reviewer Recommendation 4 — INSAN KARARI BEKLIYOR:** masaustunde piyasa fiyati alani artik
  IKI kez gorunuyor (`page.tsx` "Piyasa Analizi" grubu + `HesapOzetiSeridi`'nin kendi input'u),
  ikisi ayni state'e bagli oldugu icin bug degil ama spec 5'in sekli tek alan tarif ediyor.
