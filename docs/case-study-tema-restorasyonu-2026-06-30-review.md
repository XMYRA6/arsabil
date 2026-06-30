# Akran Değerlendirmesi: "ArsaBil Projesinde Tema Regresyonunun Teşhisi ve Restorasyonu" Vaka Çalışması

**Değerlendirilen Doküman:** `case-study-tema-restorasyonu-2026-06-30.md`
**Değerlendirme Modu:** ARS academic-paper-reviewer — `full` (tür uyarlamalı: mühendislik vaka çalışması / practitioner experience report)
**Değerlendirme Tarihi:** 2026-06-30

---

## Faz 0 Özeti (önceki turda sunuldu)

Alan: Yazılım Mühendisliği — Sürüm/Konfigürasyon Yönetimi · Paradigma: Tekil Vaka Çalışması · 5 hakem yapılandırıldı (EIC, Metodoloji, Alan/Pratik, Çapraz-disiplin, Devil's Advocate).

---

## Faz 1: Bağımsız Hakem Raporları

### Hakem #1 — EIC (Editör)

**Kimlik:** Yazılım mühendisliği pratisyen yayınları editörü (IEEE Software / ACM Queue tarzı)
**Tavsiye:** Minor Revision
**Güven Skoru:** 4/5

**Özet Değerlendirme:** Doküman, çok katmanlı bir görsel regresyon teşhis sürecini ve hesaplama motoru bütünlüğü denetimini şeffaf biçimde belgeliyor. §4'teki "Referans Belirsizliğinin Maliyeti" tartışması, okuyucuya gerçekten aktarılabilir bir ders sunuyor — bu tür vaka çalışmalarının en değerli kısmı budur. Ancak doküman, sürecin kendi içindeki bir verimsizliği (üç farklı referans adayının sırayla denenmesi) bir "metodolojik bulgu" olarak çerçevelemiş, oysa bu aynı zamanda önlenebilir bir maliyetti; bu ayrım netleştirilmeli. Yapı düzeyinde sağlam, IEEE Software "Practitioner's Digest" formatına yakın.

**Güçlü Yönler:**
- **S1 — Şeffaf hata anlatımı:** §2.2'de ilk restorasyon denemesinin yanlış referans kaynağı kullandığı açıkça itiraf ediliyor; bu, pratisyen raporlarında nadir görülen ve değerli bir dürüstlük.
- **S2 — Bağımsız doğrulama disiplini:** §3, görsel değişikliklerin işlevsel koda yan etkisi olup olmadığını ayrı bir denetim olarak ele alıyor — iyi mühendislik pratiği.
- **S3 — Eklerle izlenebilirlik:** Ek C'deki commit referansları, iddiaları doğrulanabilir kılıyor.

**Zayıf Yönler:**
- **W1 — Önlenebilir maliyet, "bulgu" olarak çerçevelenmiş (Major):** §4.1, üç referans adayının sırayla denenmesini bir metodolojik içgörü olarak sunuyor, ama aslında bu, restorasyona başlamadan önce canlı (production) referansla karşılaştırma yapılmamasından kaynaklanan, önlenebilir bir verimsizlikti. **Öneri:** §4.1'e, "bu adım önceden atlanmış olsaydı süreç tek geçişte tamamlanabilirdi" şeklinde bir öz-eleştiri cümlesi eklenmeli.
- **W2 — Sonraki adımlar eksik (Minor):** Doküman bir "Sonuç" ile bitiyor ama "bundan sonra ne yapılmalı" (commit edilmesi gereken değişiklikler, temizlenmesi gereken stash) belirtilmiyor.

**Yazarlara Sorular:**
1. Restorasyon sürecine başlamadan önce canlı dağıtımla karşılaştırma yapılması neden ilk adım olarak düşünülmedi?
2. Commit edilmemiş durumdaki değişiklikler ne zaman commit edilmeyi planlıyor?

**Boyut Skorları:** Özgünlük 70, Yöntemsel Sıkılık 75, Kanıt Yeterliliği 80, Argüman Tutarlılığı 85, Yazım Kalitesi 88 → **Ağırlıklı Ortalama: ~79 (Minor Revision)**

---

### Hakem #2 — Metodoloji (Sürüm Kontrolü / Konfigürasyon Yönetimi Uzmanı)

**Tavsiye:** Minor Revision
**Güven Skoru:** 5/5

**Özet Değerlendirme:** §2.1'deki `git stash push -u` kararı ve §2.3'teki hibrit token-değer aktarım stratejisi, yöntemsel olarak sağlam ve doğru gerekçelendirilmiş. Ancak doğrulama adımı (§2.4) yalnızca görsel ekran görüntüsü karşılaştırmasına dayanıyor; bu, CSS regresyonlarını yakalamak için yeterli olsa da, otomatik test paketinin var olup olmadığı/çalıştırılıp çalıştırılmadığı hiç ele alınmamış.

**Güçlü Yönler:**
- **S1 — Geri alınabilir geri alma:** `git stash` tercihi (kalıcı silme yerine), iyi bir konfigürasyon yönetimi pratiği; §2.1'de doğru gerekçelendirilmiş.
- **S2 — Bağımlılık analizi önce yapılmış:** §2.3'te `--primary-rgb` token'ının 34 dosyada kullanıldığının önceden tespit edilmesi, "kopyala-yapıştır" yerine "etki analizi sonrası müdahale" yaklaşımının doğru uygulandığını gösteriyor.

**Zayıf Yönler:**
- **W1 — Commit hijyeni belgelenmemiş (Major):** Süreç boyunca hiçbir commit atılmamış; tüm değişiklikler hâlâ çalışma alanında. Doküman bunu bir risk olarak işaretlemiyor. **Öneri:** §5 Sonuç'a, "bu çalışma henüz commit edilmemiştir, bu bir kalıcılık riski taşır" notu eklenmeli.
- **W2 — Stash temizliği belirsiz (Minor):** §2.1'de oluşturulan stash girdisinin akıbeti (silindi mi, hâlâ duruyor mu) belgenin hiçbir yerinde açıklanmıyor.
- **W3 — Otomatik test kullanılmamış (Critical — bkz. Devil's Advocate raporu, çapraz referans):** Doğrulama yalnızca manuel/görsel; bu konuyu ayrıntılı olarak Devil's Advocate ele alıyor, ben de katılıyorum.

**Boyut Skorları:** Yöntemsel Sıkılık 70 (otomatik test kullanılmaması nedeniyle düşürüldü), Kanıt Yeterliliği 75, Argüman Tutarlılığı 88 → **Ağırlıklı Ortalama: ~76 (Minor Revision)**

---

### Hakem #3 — Alan/Pratik (Kıdemli Front-end Mühendisi, Design Token Mimarisi)

**Tavsiye:** Accept (küçük notlarla)
**Güven Skoru:** 5/5

**Özet Değerlendirme:** §2.3'teki hibrit strateji (yapı korunur, değer aktarılır) teknik olarak doğru ve bu tür design-token geçişlerinde standart pratiktir. `Card.module.css`'in Aurora döneminde eklenen varyant API'sinin (`glass`/`accent`/`flat`) bir geri alma hedefi olmadığının ayırt edilmesi (§2.3 son paragraf), token mimarisi ile bileşen API'si arasındaki ayrımı doğru kavramış.

**Güçlü Yönler:**
- **S1 — Token/değer ayrımı doğru kavranmış:** §2.3, "doğrudan kopyalama" ile "değer düzeyinde geri yükleme" arasındaki farkı net biçimde ortaya koyuyor; bu, design system bakımı literatüründe (token-based theming) kabul gören bir pratik.
- **S2 — Kapsam disiplini:** Sadece 3 dosyaya (`globals.css`, `page.tsx`, `page.module.css`) odaklanılması ve diğer sayfaların (dashboard, admin) bilinçli olarak kapsam dışı bırakılması doğru bir önceliklendirme.

**Zayıf Yönler:**
- **W1 — Kapsam dışı sayfalar için görsel doğrulama eksik (Major):** Doküman yalnızca landing page ve login ekranını ekran görüntüsüyle doğruluyor (§2.4). Marketplace listing grid, dashboard, admin tabloları gibi sayfalarda token değişikliğinin (renk + `--primary-rgb`) görsel yan etkisi olup olmadığı doğrulanmamış. **Öneri:** §2.4'e "kapsam dışı bırakılan sayfalarda görsel doğrulama yapılmadı, bu bilinen bir sınırlamadır" notu eklenmeli — bu, iddianın kapsamını dürüstçe daraltır.
- **W2 — `dashboard.module.css`'in dahil edilmeme gerekçesi zayıf (Minor):** §1.1 tablosunda bu dosya "işlevsel" kategoriye konmuş ama içeriği (navItemActive stil düzeltmesi) aslında görsel bir değişiklik; sınıflandırma tutarsız.

**Boyut Skorları:** Yöntemsel Sıkılık 85, Kanıt Yeterliliği 70 (kapsam dışı sayfalar nedeniyle), Argüman Tutarlılığı 90 → **Ağırlıklı Ortalama: ~83 (Accept/Minor borderline)**

---

### Hakem #4 — Çapraz-disiplin (AI-Destekli Yazılım Geliştirme Süreçleri Araştırmacısı)

**Tavsiye:** Minor Revision
**Güven Skoru:** 4/5

**Özet Değerlendirme:** Bu vaka, insan-AI işbirlikli hata teşhisinde "referans belirsizliği" probleminin somut bir örneğini sunuyor ve bu açıdan literatüre (informal olarak) katkı sunabilecek bir gözlem içeriyor. Ancak doküman bu süreci yalnızca bir kez yaşanmış bir olay olarak anlatıyor; bunun AI-destekli geliştirme oturumlarında tekrarlayan bir desen olup olmadığına dair hiçbir genelleme veya öneri (örn. "her zaman önce production referansı kontrol et" kuralı) sunmuyor.

**Güçlü Yönler:**
- **S1 — Somut bir insan-AI işbirliği başarısızlık modu belgelenmiş:** §4.1, "göreli referans → çoklu geçerli aday" probleminin gerçek bir örneğini sunuyor; bu, AI-destekli yazılım mühendisliği pratiğine aktarılabilir bir gözlem.
- **S2 — Kullanıcı müdahalesinin rolü görünür kılınmış:** §2.2 ve §2.3'te kullanıcının (proje sahibinin) yeni referanslar sunarak süreci düzelttiği açık; bu, "AI tek başına yeterli değildi, insan denetimi kritikti" anlatısını destekliyor ama doküman bunu açıkça söylemiyor.

**Zayıf Yönler:**
- **W1 — Genellenebilir kural önerisi yok (Major):** §4.1'deki bulgu, somut bir kural/checklist'e dönüştürülmemiş (örn. "harici/geçmiş referans kullanılmadan önce her zaman canlı production ortamıyla karşılaştırma yapılmalı"). **Öneri:** §4'e "Pratik Çıkarım" alt başlığı eklenip bu kural yazılı hale getirilmeli.
- **W2 — İnsan denetiminin rolü zımni kalmış (Minor):** Kullanıcının iki kez ("ilk haline gelemedik" ve sonra Vercel linkini paylaşması) düzeltici geri bildirim vermesinin sürecin başarısındaki rolü açıkça tartışılmamış.

**Boyut Skorları:** Özgünlük 65, Önem/Etki 70, Argüman Tutarlılığı 80 → **Ağırlıklı Ortalama: ~74 (Minor Revision)**

---

### Devil's Advocate Raporu

**En Güçlü Karşı-Argüman (200-300 kelime):**

Dokümanın §3 başlığı "Bağımsız Doğrulama: Hesaplama Motoru Bütünlüğü" iddialı bir çerçeve kuruyor ve §3.2 sonunda "Hesaplama motoru, tema restorasyon sürecinden etkilenmemiştir" şeklinde kesin bir sonuca varıyor. Ancak bu sonuca varış yöntemi incelendiğinde, kullanılan kanıtların ikisi de **dolaylı**: (1) git geçmişinin dosyanın değişmediğini göstermesi, (2) formüllerin spesifikasyon belgesiyle elle karşılaştırılması. Projede zaten `src/lib/calculator/engine_v2.test.ts` adlı bir **otomatik test dosyası mevcut** (bu, konuşma içinde Hakem #2'nin de işaret ettiği bir bulgu) — ama doküman bu testlerin çalıştırılıp çalıştırılmadığından, geçip geçmediğinden hiç bahsetmiyor. "Bağımsız doğrulama" başlığı altında en güçlü ve en ucuz kanıt kaynağı (mevcut otomatik testleri çalıştırmak, `npx jest engine_v2`) atlanmış, onun yerine daha zahmetli ve hataya açık bir manuel karşılaştırma tercih edilmiş. Bu, "doğrulama yapıldı" iddiasının kanıt gücünü zayıflatıyor: dosyanın değişmemiş olması ve formüllerin elle eşleşmesi, motorun *çalışma zamanında* hâlâ doğru sonuç ürettiğinin garantisi değildir (örn. bir bağımlılık paketi güncellemesi, TypeScript derleme hatası, veya tip uyumsuzluğu test çalıştırılmadan tespit edilemez).

**Sorun Listesi:**

| # | Sorun | Boyut | Konum | Şiddet |
|---|---|---|---|---|
| DA1 | "Bütünlük doğrulandı" iddiası, mevcut otomatik test paketi (`engine_v2.test.ts`) çalıştırılmadan yapılmış | Kanıt Yeterliliği | §3.2 Sonuç | **Critical** |
| DA2 | "Hiçbir şey etkilenmedi" genellemesi, yalnızca 2 sayfanın (landing, login) görsel doğrulamasına dayanıyor ama tüm proje için genelleniyor | Aşırı Genelleme | §5 Sonuç | Major |
| DA3 | Üç referans adayının karşılaştırılması sırasında, neden ilkinin (Şubat kopyası) yanlış olduğuna dair "soy bağı yok" kanıtı sunulmuş ama bu kanıtın *neden* doğruluk kaynağı seçiminde yeterli olduğu açıklanmamış (yalnızca commit geçmişinin ayrı olması, içeriğin yanlış olduğunu kanıtlamaz) | Mantık Zinciri | §2.2 | Minor |

**Göz Ardı Edilen Alternatif Açıklamalar/Yollar:**
- Belgede tartışılmayan bir alternatif: restorasyona başlamadan önce `npm run build` veya `npx tsc --noEmit` çalıştırılarak tip hatası olup olmadığı kontrol edilebilirdi; bu adımın atlanmış olması, hibrit token stratejisinin gerçekten "sıfır yan etkili" olduğu iddiasını zayıflatıyor.

**Eksik Paydaş Perspektifleri:**
- Son kullanıcı/QA perspektifi: ekran görüntüsü karşılaştırması yalnızca masaüstü görünümde (1440×900) yapılmış; mobil görünüm (memory kayıtlarına göre projenin önceki fazlarında özellikle önemsenen bir konu — "Mobil overflow kökten çözüldü") hiç test edilmemiş.

**Gözlemler (Kusur Değil):**
- Hibrit token stratejisinin gerekçelendirilmesi (§2.3) titiz ve iyi savunulmuş; DA'nın itirazı yöntemin kendisine değil, doğrulama kapsamının eksikliğine yönelik.

---

## Faz 2: Editöryal Sentez ve Karar

# Editorial Decision

## Manuscript Information
- **Title:** ArsaBil Projesinde Tema Regresyonunun Teşhisi ve Restorasyonu: Bir Vaka Çalışması
- **Review Round:** 1

---

## Decision

### **Minor Revision**

---

## Reviewer Summary

| Hakem | Rol | Tavsiye | Güven |
|---|---|---|---|
| EIC | Pratisyen yayın editörü | Minor Revision | 4/5 |
| R1 | Konfigürasyon yönetimi uzmanı | Minor Revision | 5/5 |
| R2 | Front-end / design token uzmanı | Accept (sınırda) | 5/5 |
| R3 | AI-destekli geliştirme araştırmacısı | Minor Revision | 4/5 |
| DA | — | (CRITICAL bulgu mevcut) | — |

---

## Consensus Analysis

### Görüş Birliği (Consensus)

**[CONSENSUS-3]** (EIC, R1, DA hemfikir; R2 sessiz, R3 dolaylı değindi):
1. Hesaplama motoru doğrulamasının yalnızca manuel/dolaylı kanıta dayanması ve mevcut otomatik test dosyasının (`engine_v2.test.ts`) çalıştırılmamış olması, dokümanın en somut metodolojik açığı.

**[CONSENSUS-4]** (tüm hakemler hemfikir):
1. Hibrit token-değer aktarım stratejisi (§2.3) teknik olarak sağlam ve doğru gerekçelendirilmiş — bu bir değişiklik gerektirmiyor.
2. Görsel doğrulama kapsamı (yalnızca landing + login, yalnızca masaüstü) dokümanda açıkça bir sınırlama olarak belirtilmemiş.

### Görüş Ayrılıkları

**Ayrılık 1: Genel karar — Accept mi Minor Revision mi?**
- **R2 görüşü:** Teknik içerik sağlam, küçük notlarla kabul edilebilir.
- **EIC/R1/DA görüşü:** Critical şiddetindeki doğrulama açığı (DA1) düzeltilmeden kabul edilemez.
- **Ayrılık türü:** Şiddet değerlendirmesi farkı.
- **Editörün Kararı:** Minor Revision. **Gerekçe:** Devil's Advocate'in CRITICAL bulgusu (DA1) editöryal kural gereği (IRON RULE #4) tek başına "Accept" kararını engelliyor; ancak düzeltme, dokümanın yeniden yazılmasını değil, var olan testlerin çalıştırılıp sonucun eklenmesini gerektirdiği için "Major" değil "Minor Revision" olarak sınıflandırıldı.

---

## Decision Rationale

Bu vaka çalışması, teknik içerik ve anlatı tutarlılığı açısından güçlü (4/5 hakem Minor Revision veya üzeri öneriyor, hiçbiri Reject önermiyor). Ancak Devil's Advocate'in DA1 bulgusu — "bütünlük doğrulandı" iddiasının, mevcut ve kolayca çalıştırılabilir bir otomatik test paketi atlanarak yapılmış olması — editöryal kural gereği tek başına Accept kararını engelliyor (Checkpoint Rule #4). Bu, dokümanın temel tezini geçersiz kılmıyor (muhtemelen testler de geçecektir), ancak "doğrulandı" iddiasının kanıt zincirini tamamlamak için tek bir komutluk ek bir adım (`npx jest engine_v2`) gerekiyor. R2'nin "Accept" önerisi göz ardı edilmedi — onun odak alanı (token mimarisi) gerçekten kusursuz; ancak EIC, R1 ve DA'nın ortak vurguladığı doğrulama kapsamı sorunu, daha geniş bir "kanıt yeterliliği" sorunu olduğu için ağır bastı.

---

## Required Revisions (Must Fix)

| # | Revizyon | Kaynak | Şiddet | Bölüm | Durum |
|---|---|---|---|---|---|
| R1 | `npx jest engine_v2` (veya proje test komutu) çalıştırılıp sonucu §3'e eklenmeli | DA1 (DA), R1, EIC | Critical | §3.2 | ✅ **Kapatıldı** — 8/8 test geçti, sonuç ana dokümana eklendi (2026-06-30) |
| R2 | §5 Sonuç'a, görsel doğrulamanın yalnızca landing+login ve yalnızca masaüstü görünümde yapıldığı, mobil ve diğer sayfaların (marketplace, dashboard, admin) doğrulanmadığı açıkça belirtilmeli | DA2, R3 (Hakem #3) | Major | §2.4, §5 | ✅ **Kapatıldı** — §5.1 "Bilinen Sınırlamalar" eklendi (2026-06-30) |
| R3 | Commit edilmemiş çalışma durumu ve stash girdisinin akıbeti hakkında bir not eklenmeli (kalıcılık riski) | R1 (Hakem #2) | Major | §5 | ✅ **Kapatıldı** — §5.2 "Çalışma Durumu ve Kalıcılık Riski" eklendi (2026-06-30) |

### Required Item Details

**R1: Otomatik test sonucu eksik**
- **Problem:** §3.2'deki "tutarlıdır" sonucu, projede mevcut `engine_v2.test.ts` dosyası çalıştırılmadan yazılmış.
- **Kaynak:** Devil's Advocate raporu (DA1), Hakem #2 W3.
- **Gereklilik:** Test komutu çalıştırılmalı, çıktısı (pass/fail sayısı) §3.2'ye eklenmeli.
- **Kabul kriteri:** §3.2'de test çalıştırma komutu ve sonucu (örn. "X/X test geçti") görünür olmalı.

**R2: Doğrulama kapsamı sınırlaması belirtilmemiş**
- **Problem:** §2.4 ve §5, doğrulamanın kapsamını (2 sayfa, 1 viewport) açıkça sınırlamıyor, "hiçbir şey etkilenmedi" gibi geniş ifadeler kullanıyor.
- **Kaynak:** DA2, Hakem #3 W1.
- **Gereklilik:** "Bilinen Sınırlamalar" alt başlığı eklenmeli.
- **Kabul kriteri:** Doğrulanmamış sayfalar/viewport'lar açıkça listelenmeli.

---

## Suggested Revisions (Should Fix)

| # | Revizyon | Kaynak | Öncelik | Bölüm |
|---|---|---|---|---|
| S1 | §4'e "Pratik Çıkarım" alt başlığı eklenip genellenebilir kural ("harici referans kullanmadan önce production ile karşılaştır") yazılı hale getirilmeli | Hakem #4 W1 | P2 | §4 |
| S2 | §4.1'deki "metodolojik bulgu" çerçevelemesi, önlenebilir maliyet olduğu netleştirilerek dengelenmeli | EIC W1 | P2 | §4.1 |
| S3 | `dashboard.module.css`'in §1.1 tablosundaki sınıflandırması ("işlevsel") gözden geçirilmeli | Hakem #3 W2 | P3 | §1.1 |

---

## Revision Roadmap

### Öncelik 1 — Kanıt Tamamlama (Tahmini toplam efor: ~30 dk)
- [ ] R1: Otomatik testleri çalıştır, sonucu §3.2'ye ekle
- [ ] R2: "Bilinen Sınırlamalar" bölümü ekle
- [ ] R3: Commit/stash durumu notunu ekle

### Öncelik 2 — İçerik Zenginleştirme (Tahmini toplam efor: ~20 dk)
- [ ] S1: "Pratik Çıkarım" alt başlığı
- [ ] S2: §4.1 çerçevelemesini dengele

### Öncelik 3 — Küçük Düzeltmeler (Tahmini toplam efor: ~5 dk)
- [ ] S3: Dosya sınıflandırmasını düzelt

**Toplam Tahmini Efor:** ~1 saat (Minor Revision)

---

## Closing

Bu vaka çalışması iyi yapılandırılmış, dürüst ve teknik olarak büyük ölçüde sağlam. Tek somut açık — mevcut bir otomatik test paketinin doğrulama iddiası için kullanılmamış olması — küçük ve hızlı bir düzeltmeyle kapatılabilir. Revize edilmiş sürümün yeniden incelemeye gerek kalmadan kabul edilmesi beklenir.

---

## Re-Review Notu (2026-06-30, aynı oturum)

Üç Required Revision maddesi (R1, R2, R3) de yazar tarafından aynı oturumda kapatılmıştır:

| Madde | Doğrulama |
|---|---|
| R1 — Otomatik test eksikliği (Critical) | `npx jest engine_v2` çalıştırıldı, 8/8 test geçti, sonuç ana dokümanın §3.2'sine eklendi |
| R2 — Doğrulama kapsamı sınırlaması belirtilmemiş (Major) | Ana dokümana §5.1 "Bilinen Sınırlamalar" eklendi |
| R3 — Commit/stash kalıcılık riski belirtilmemiş (Major) | Ana dokümana §5.2 "Çalışma Durumu ve Kalıcılık Riski" eklendi |

Suggested Revisions (S1-S3) henüz işlenmemiştir ancak P1 maddelerin tamamı kapatıldığından **Decision, Minor Revision'dan Accept'e yükseltilmiştir.**

---

## Appendix

Tam hakem raporları yukarıda Faz 1 bölümünde yer almaktadır.
