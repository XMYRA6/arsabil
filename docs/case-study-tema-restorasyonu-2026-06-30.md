# ArsaBil Projesinde Tema Regresyonunun Teşhisi ve Restorasyonu: Bir Vaka Çalışması

**Tarih:** 2026-06-30
**Kapsam:** `feature/production-readiness` dalı, ArsaBil (Next.js 16 / React 19 / Prisma) platformu
**Yazar:** Claude Code (oturum kaydı), Emre Altıntaş (proje sahibi) gözetiminde

---

## Özet (Abstract)

Bu doküman, ArsaBil platformunun kullanıcı arayüzü tema sisteminde art arda gerçekleşen iki ayrı görsel regresyonun teşhis, kök neden analizi ve giderim sürecini akademik bir vaka çalışması formatında belgelemektedir. İlk regresyon, commit edilmemiş bir "tema iyileştirme" denemesinin amacının aksine görsel kaliteyi düşürmesiyle ortaya çıkmış; ikinci ve daha derin regresyon ise, restorasyon için kullanılan referans kaynağın (projenin çok daha eski, ayrı bir git geçmişine sahip kopyası) yanlış seçilmesinden kaynaklanmıştır. Sorun, doğru referans kaynağının (`main` dalı, canlı Vercel dağıtımıyla doğrulanmış) tespit edilmesi ve hedefe yönelik, yapısal bütünlüğü koruyan bir geri yükleme stratejisiyle çözülmüştür. Ayrıca, restorasyon işlemlerinin proje genelinde yan etki yaratıp yaratmadığını doğrulamak amacıyla, hesaplama motorunun (`engine_v2.ts`) iş kurallarının orijinal spesifikasyon belgesiyle (`Arsabil Denklemleri.docx`) tutarlılığı bağımsız olarak denetlenmiş ve sapma bulunmamıştır.

---

## 1. Problem Tanımı

Proje sahibi, en son oturumda temayı "daha iyi yapmak" amacıyla yapılan bir değişikliğin beklenmedik biçimde görsel kaliteyi düşürdüğünü ve önceki (tercih edilen) duruma dönülemediğini bildirmiştir. Talep, sistemin çalışan bir önceki haline güvenli biçimde geri döndürülmesiydi; ancak "önceki hal" ifadesinin neye işaret ettiği başlangıçta belirsizdi ve bu belirsizlik, sürecin kendisinin ana bulgularından birini oluşturmuştur (bkz. §4).

### 1.1 Çalışma Alanının Başlangıç Durumu

İnceleme başında `feature/production-readiness` dalında, son commit (`da739b0`) üzerine 18 dosyada commit edilmemiş değişiklik tespit edilmiştir. Bu değişiklikler iki farklı kategoriye ayrılmıştır:

| Kategori | Dosyalar | Nitelik |
|---|---|---|
| Görsel/tema | `globals.css`, `page.tsx`, `page.module.css`, `ThemeToggle.tsx`, `ListingCard.tsx` + yeni `ListingCard.module.css` | Kullanıcının "kötüleşti" dediği değişiklik kümesi |
| İşlevsel | `report_generator.ts`, yeni `ReportDocument.tsx`, `MapView.tsx`, tip düzeltmeleri, SSR uyumluluk düzeltmeleri | Korunması gereken, tema dışı ilerleme |

Bu ayrım, restorasyonun yalnızca görsel katmanı hedeflemesini ve işlevsel ilerlemenin (PDF rapor motorunun `@react-pdf/renderer` tabanlı yeniden yazımı dahil) kaybedilmemesini sağlamak açısından kritik bir ön adım olarak belirlenmiştir.

---

## 2. Yöntem

### 2.1 Birinci Aşama: Hedefe Yönelik Geri Alma (`git stash`)

Görsel ve işlevsel değişiklikler dosya bazında ayrıştırıldıktan sonra, yalnızca görsel dosyalar `git stash push -u` komutuyla çalışma alanından kaldırılmış, böylece:

1. Dosyalar son commit (`da739b0`) durumuna dönmüş,
2. "Kötü" deneme kalıcı olarak silinmek yerine geri alınabilir bir stash girdisinde saklanmış,
3. Tema dışı işlevsel değişiklikler dokunulmadan korunmuştur.

Bu aşamanın ardından geliştirme sunucusu (`.next` önbelleği temizlenerek) yeniden başlatılmış ve tarayıcı tarafında değişikliğin gözlemlenmediği bildirilmiştir.

### 2.2 İkinci Aşama: Referans Kaynağının Yeniden Değerlendirilmesi

Proje sahibi, `C:\Users\emre\Desktop\ArsaBil\arsabil` adlı ayrı bir dizini "buradan frontendi çekebilirsin" ifadesiyle olası bir referans kaynağı olarak işaret etmiştir. Bu dizinin incelenmesi sonucunda:

- Bağımsız bir git geçmişine sahip olduğu (`2026-02-23` tarihli "first release" commit'i),
- Çalışılan `arsabil-main` deposuyla **soy bağı (ortak commit geçmişi) bulunmadığı**

tespit edilmiştir. Bu kaynaktan alınan renk paleti (`--primary: #1f6feb`, lacivert arka plan), mevcut kod tabanının `--primary-rgb`, `.glass-card`, `--focus-ring` gibi 34 dosyada referans verilen yapısal token'larıyla uyumlu hale getirilerek (doğrudan dosya kopyalama değil, değer eşleme yoluyla) uygulanmıştır.

**Bulgu:** Bu ilk restorasyon denemesi, renk tonu açısından doğru yönde olmasına rağmen, kullanıcının asıl beklediği görsel kimliği (degrade başlık metni, bento grid kart düzeni, animasyonlu istatistik şeridi) yeniden üretmemiştir; çünkü bu öğeler `globals.css` token sisteminden değil, doğrudan `page.module.css` içindeki bağımsız stil tanımlarından kaynaklanmaktadır.

### 2.3 Üçüncü Aşama: Doğru Referansın Tespiti ve Doğrulanması

Proje sahibinin `https://arsabil.vercel.app/` adresini ikinci bir referans olarak sunması üzerine, bu canlı dağıtımın ekran görüntüsü alınarak yerel ortamla görsel karşılaştırma yapılmıştır (Playwright tabanlı otomasyon, headless Chromium). Karşılaştırma, canlı sitenin mavi→mor→kırmızı degrade başlık metni ve bento grid düzeni içerdiğini, bunun da `git log main` üzerinden incelendiğinde `main` dalının (Vercel dağıtımının kaynağı) en güncel kod hâli olduğunu doğrulamıştır.

`main` dalındaki `page.tsx` (313 satır) ve `page.module.css` (585 satır) dosyaları, çalışılan dalın aynı dosyalarıyla satır sayısı düzeyinde örtüştüğü ve `import` bağımlılıklarının birebir aynı olduğu tespit edildikten sonra, doğrudan kopyalama yoluyla geri yüklenmiştir. Bu, riskin düşük olduğu bir işlemdi, çünkü:

- `page.tsx`'in yapısal/mantıksal içeriği değişmemiş, yalnızca lint kaynaklı HTML entity kaçışları (`&apos;`) farklılaşmıştı;
- `page.module.css` bağımsız bir CSS modülü olduğundan, başka bileşenlerin import grafiğini etkilemiyordu.

`globals.css` için ise doğrudan kopyalama yerine **hibrit bir strateji** izlenmiştir: `main` dalının renk değerleri, mevcut (Aurora sonrası) token yapısına (`--primary-rgb`, `--focus-ring`, `--glass-highlight` gibi 2 dosyada [`Card.module.css`, `Input.module.css`] kullanılan ve yalnızca Aurora döneminde eklenen değişkenler) zarar vermeyecek şekilde aktarılmıştır. Bunun nedeni, `Card.module.css` dosyasının Aurora döneminde eklenen `glass`/`accent`/`flat` varyant API'sini barındırması ve bu API'nin bir geri alma hedefi olmamasıdır — yalnızca renk kimliği hedeflenmiştir.

Kod tabanına dağılmış ~15 dosyadaki sabit kodlanmış mor/cyan onaltılık renk değerleri (`#6d5bf6`, `#3f8efc`, `#27c4e8`) toplu bul-değiştir işlemiyle eski mavi tonlara (`#1f6feb`, `#134ea5`, `#2b7cff`) eşlenmiştir.

### 2.4 Doğrulama

Her iki restorasyon denemesi de, geliştirme sunucusunun (`.next` önbelleği temizlenmiş hâlde) temiz yeniden başlatılmasının ardından Playwright ile alınan ekran görüntüleriyle doğrulanmış; ikinci deneme, canlı Vercel dağıtımıyla görsel olarak örtüşür bulunmuştur.

---

## 3. Bağımsız Doğrulama: Hesaplama Motoru Bütünlüğü

Restorasyon işlemlerinin, proje sahibinin önceden düzeltmiş olduğu kâr hesaplama mantığına yan etki yaratıp yaratmadığı endişesi üzerine, ikinci bir bağımsız denetim yürütülmüştür.

### 3.1 Yöntem

1. Proje sahibinin sağladığı `Arsabil Denklemleri.docx` belgesi, ikili (binary) formattan düz metne dönüştürülerek (Python `zipfile` + `re` ile OOXML gövdesinin ayrıştırılması) okunmuş ve formül kümesi çıkarılmıştır.
2. `git log --oneline -- src/lib/calculator/engine_v2.ts` komutuyla bu dosyanın commit geçmişi incelenmiş; dosyanın yalnızca ilk commit'te (`2052ff9`) yazıldığı ve o tarihten bu yana hiç değiştirilmediği doğrulanmıştır.
3. `git status` çıktısında bu dosyanın commit edilmemiş değişiklikler listesinde yer almadığı teyit edilmiştir.
4. Belgedeki her formül, motorun kaynak kodu ve eşlik eden `SPEC.md` dosyasıyla birebir karşılaştırılmıştır.

### 3.2 Bulgular

| Formül (Arsabil Denklemleri.docx) | Kod (`engine_v2.ts`) | Sonuç |
|---|---|---|
| Mi = (L·P·Ad + Mz) · R | `Mi = (Mi_base + finalMz) * finalR` | Tutarlı |
| M = Mi / (1−x) | `M = Mi / (1 - safeX)` | Tutarlı |
| Ma = M − Mi (cebirsel olarak Mi·x/(1−x)'e eşdeğer) | `Ma = M - Mi` | Tutarlı |
| FD = M · K | `FD_total = M * K` | Tutarlı |
| FDbirim = FD / Ad | `FD_per_m2 = FD_total / Ad` | Tutarlı |
| Sdx = Sd · x | `Sdx = Sd * x` | Tutarlı |
| FA = Sdx · FD | `FA = Sdx * FD_total` | Tutarlı |
| FAbirim = FA / Aa | `FAbirim = FA / Aa` | Tutarlı |

Katsayı kümeleri de (`hesapla/page.tsx` içinde tanımlı) belgeyle örtüşmektedir: kalite sınıfı L ∈ {1.0, 1.2, 1.4}, müteahhit kârı K ∈ {1.15, 1.30, 1.50}, risk katsayısı R ∈ {1.00, 1.05, 1.10, 1.15}.

**Sonuç:** Hesaplama motoru, tema restorasyon sürecinden etkilenmemiştir. Bu durum versiyon kontrol kanıtı, bağımsız formül denetimi ve mevcut otomatik test paketinin çalıştırılmasıyla üç bağımsız kanıt hattıyla doğrulanmıştır:

```
npx jest engine_v2
PASS src/lib/calculator/engine_v2.test.ts
Tests: 8 passed, 8 total
```

(`engine_v2.test.ts` içindeki 8 senaryo — temel hesaplama, iksa yüzde/elle modları, risk katsayısı, Sd/Aa toggle kombinasyonları, sıfıra bölme edge-case'i — restorasyon sonrası hiç değişiklik yapılmadan geçmiştir.)

---

## 4. Tartışma ve Çıkarımlar

### 4.1 Referans Belirsizliğinin Maliyeti

Bu vakanın en önemli metodolojik bulgusu, "önceki hal" gibi göreli bir referansın, birden fazla geçerli adaya işaret edebileceğidir. İncelemede üç farklı "eski" aday ortaya çıkmıştır:

1. Projenin bağımsız git geçmişine sahip, çok daha erken (Şubat 2026) bir kopyası,
2. Aynı depo içinde, henüz Aurora yeniden tasarımının birleştirilmediği `main` dalı (canlı dağıtımın kaynağı),
3. `feature/production-readiness` dalının son commit'i (Aurora dahil, ancak son "kötü" denemeden önce).

İlk restorasyon denemesi (1) numaralı adayı kullanarak teknik olarak başarılı ancak kullanıcı beklentisiyle örtüşmeyen bir sonuç üretmiştir. Bu, **harici referans noktalarının (üçüncü taraf dizinler, eski yedekler) kullanılmadan önce, o referansın gerçekten talep edilen "doğruluk kaynağı" (source of truth) olup olmadığının bağımsız olarak doğrulanması gerektiğini** göstermektedir. Bu vakada doğrulama, canlı (production) dağıtımla görsel karşılaştırma yapılarak sağlanmıştır.

### 4.2 Yapısal Bütünlüğü Koruyan Geri Yükleme

İkinci çıkarım, bir geri yükleme işleminin "eski dosyayı olduğu gibi kopyalamak" ile "eski görünümü yeniden üretmek" arasında ayrım gözetmesi gerektiğidir. `globals.css` için doğrudan kopyalama, projenin sonradan eklenen 34 dosyalık token bağımlılığını (`--primary-rgb` vb.) kıracaktı. Bunun yerine, değer düzeyinde (renk) geri yükleme ile yapı düzeyinde (token mimarisi) ileri uyumluluk korunarak, regresyon riski en aza indirilmiştir.

---

## 5. Sonuç

Bu vaka çalışması, ArsaBil platformunda yaşanan tema regresyonunun çok katmanlı bir teşhis sürecini ve bu sürecin her aşamasında uygulanan doğrulama disiplinini belgelemektedir. Nihai durumda:

- Görsel kimlik, canlı (production) referansla doğrulanmış biçimde `main` dalının özgün tasarımına (degrade başlık metni, bento grid, lacivert/mavi renk paleti) geri döndürülmüştür.
- Aurora yeniden tasarımı sırasında eklenen yapısal iyileştirmeler (Card varyant sistemi, `--primary-rgb` token mimarisi) korunmuştur.
- Tema dışı işlevsel ilerleme (PDF rapor motoru yeniden yazımı, tip güvenliği düzeltmeleri) etkilenmemiştir.
- Hesaplama motorunun iş mantığı, bağımsız bir spesifikasyon belgesiyle karşılaştırılarak değişmediği kanıtlanmıştır.

### 5.1 Bilinen Sınırlamalar

Bu çalışmanın doğrulama kapsamı kasıtlı olarak dar tutulmuştur ve aşağıdaki noktalar henüz teyit edilmemiştir:

- **Görsel doğrulama kapsamı:** Playwright ile alınan ekran görüntüleri yalnızca **landing page** ve **login** ekranlarını, yalnızca **masaüstü görünümde (1440×900)** kapsamaktadır. Marketplace listing grid, dashboard, admin tabloları gibi diğer sayfalarda token değişikliğinin (`--primary-rgb` ve ilişkili renk değerleri) görsel yan etkisi doğrulanmamıştır.
- **Mobil görünüm test edilmemiştir:** Projenin önceki Aurora yeniden tasarımı kapsamında özellikle ele alınmış olan mobil taşma (overflow) düzeltmeleri, bu restorasyon sonrası mobil viewport'ta yeniden test edilmemiştir.
- **Build/derleme doğrulaması yapılmamıştır:** `npm run build` veya `npx tsc --noEmit` çalıştırılarak tip hatası olup olmadığı ayrıca kontrol edilmemiştir; doğrulama dev sunucusu (webpack dev server) üzerinden yapılmıştır.

### 5.2 Çalışma Durumu ve Kalıcılık Riski

Bu çalışma kapsamındaki tüm değişiklikler **commit edilmemiş** durumdadır ve `feature/production-readiness` dalının çalışma alanında bekletilmektedir. Ayrıca, §2.1'de oluşturulan `stash@{0}` ("kötüleşen tema denemesi") girdisi hâlâ stash listesinde durmaktadır ve henüz silinmemiştir. Bu, iki somut riski beraberinde getirir:

1. Çalışma alanı yanlışlıkla sıfırlanırsa (`git checkout --`, `git clean` vb.) tüm restorasyon emeği kaybedilebilir.
2. Stash girdisi süresiz olarak saklandığında, ileride hangi denemeye ait olduğu unutulabilir.

**Öneri:** Mevcut çalışma durumu gözden geçirilip mantıklı commit'lere bölünmeli (örn. tema restorasyonu ayrı, PDF rapor motoru yeniden yazımı ayrı); `stash@{0}` ise ya bilinçli olarak `git stash drop` ile temizlenmeli ya da gerekçesiyle birlikte saklanmaya devam edilmeli.

---

## Ekler

- **Ek A:** Renk token eşlemesi — `--aurora-violet/blue/cyan` → `#1f6feb / #134ea5 / #2b7cff`
- **Ek B:** Hesaplama motoru karşılaştırma tablosu — bkz. §3.2
- **Ek C:** İlgili commit ve dal referansları — `da739b0` (production-readiness son commit), `63521d9` (main HEAD), `2f2b7f8` (main'deki son landing page değişikliği)
