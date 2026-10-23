# İç mimar oda denemesi (ArsaBil Studio yan ürünü) — tasarım

Tarih: 2026-10-23. Durum: taslak, onay bekliyor.

## Amaç ve neden

ArsaBil'in yan ürünü olarak, iç mimarların müşterilerine sunum hazırlamasını sağlayan bir araç. İç mimar bir oda fotoğrafı yükler, katalogdan ürünler seçer, yapay zeka ürünleri odaya yerleştirilmiş bir görsel üretir. Sonuç, müşteriye gönderilen bir sunum sayfasıdır: oda görseli, ürün listesi, fiyatlar, toplam tutar. Ürünlerin satın alma linkleri afiliye komisyonuyla çalışır; gelir modeli bu komisyon ile premium üyeliktir.

Aynı zamanda ArsaBil için pazarlama mekanizmasıdır (Google'ın kıyafet deneme özelliği mantığı): paylaşılan sunum sayfaları ArsaBil markasını taşır ve markalarla iş birliği görüşmelerinde çalışan bir demo olur.

Mimar ürünün ilk kullanıcısıdır. Ev sahibine (son tüketici) doğrudan hitap etmek ilk sürümün amacı değil.

## Hedefler

1. Mimar, oda fotoğrafı yükleyip katalogdan 1 veya daha fazla ürün seçerek yapay zekayla döşenmiş bir oda görseli alır.
2. Mimar, görsel + ürün listesi + fiyat + toplam tutardan oluşan bir sunum oluşturur; paylaşım linki ve PDF olarak müşteriye verir.
3. Sunum sayfasındaki her ürün, o ürünün satıcı sayfasına giden bir "satın al" linkine sahiptir. Link, afiliye parametresi taşıyabilecek şekilde yapılandırılır.
4. Ücretsiz kullanıcıya 5 görsel üretim hakkı verilir. Premium kullanıcıya en az 25 üretim hakkı verilir (yenilenme süresi ve üst sınır tasarım kararı, aşağıya bakın).
5. İlk sürümde katalog, elle seçilmiş 30-50 gerçek ürünle (internetten) hazırlanmış örnek bir katalogdur; marka demolarında gösterilir.

## Hedef olmayanlar (ilk sürüm)

- 3D model, GLB, ölçekli veya elle konumlandırılmış yerleştirme.
- Sipariş alma, sepet, ödeme (kullanıcı satıcının sitesine yönlendirilir).
- Marka/tedarikçi yönetim paneli ve marka anlaşması otomasyonu.
- Revit/Rayon düzeyinde plan veya çizim aracı.
- Ev sahibine yönelik ayrı bir tüketici ürünü.

## Kötü sonuç (anti-hedef)

- Ürün odada bariz bozuk, ürünün şekli veya rengi seçilen ürünle uyuşmuyor. (Hassas ölçek aranmıyor; "havada olur" kabul, ama seçilen ürün tanınabilir olmalı.)
- Ücretsiz kota atlatılabiliyor veya maliyet kontrolsüz artıyor.
- Yayına açık üründe izinsiz marka görselleri kullanılıyor (hukuki risk).
- Sunum sayfasında yanlış fiyat veya ölü link.

## Kullanıcı akışı

1. Mimar giriş yapar (ArsaBil hesabıyla).
2. Yeni oda: oda fotoğrafı yükler.
3. Katalogdan ürün(ler) seçer.
4. "Üret" der; yapay zeka döşenmiş oda görselini üretir. Beğenmezse "yeniden dene" (kotadan düşer).
5. Beğendiği görsellerle sunum oluşturur: ürün listesi (adı, satıcı, fiyat, link), toplam tutar.
6. Sunum paylaşım linki oluşturur veya PDF indirir.

Sunum sayfası yerleşimi (kullanıcı seçti, "B"): solda büyük oda görseli, sağda sabit ürün paneli (ürün kartları, fiyatlar, toplam, "Satın al" düğmesi). Mobilde görsel üstte, panel altta. Tasarım dili ArsaBil "Arazi" tasarım sistemiyle uyumlu olmalı (tokenlar, açık/koyu tema).

## Verilen kararlar

- Yapay zeka yerleştirmeyi kendisi belirler; mimar elle konum seçmez.
- Ücretsiz deneme: 5 üretim. Premium: 25 veya daha fazla üretim.
- İlk katalog: örnek/mock, elle seçilmiş 30-50 ürün; ürün satıcı sayfasına link verir (Hepsiburada, Trendyol, marka siteleri).
- Hukuki çerçeve (kullanım koşulları, marka/görsel izni, afiliye bildirimi) sonra profesyonelce hazırlanacak; ilk sürüm demo amaçlıdır.
- Hesap sistemi ArsaBil'inkiyle aynıdır; paylaşım altyapısı ArsaBil'in mevcut paylaşım mekanizmasını örnek alır (süreli token link).

## Yapım yolu (benim kararlarım, kullanıcı itiraz etmedi)

- ArsaBil reposunda (Next.js 16, Prisma, mevcut auth ve plan alanı `User.plan`) ayrı bir dalda geliştirilir. Mevcut `gorsel-yenileme-arazi` dalının işi bitip push edildikten sonra veya ondan ayrı bir dal olarak.
- Görsel üretimi fal.ai üzerinden görüntü düzenleme modeliyle; mevcut `src/lib/studio/render/falClient.ts` ve ortam değişkeni yapısı temel alınabilir (henüz gerçek anahtarla test edilmedi).
- Kota sayacı sunucu tarafında, kullanıcı bazlı tutulur (yeni Prisma modeli).
- Eski 3D render (PRO fotogerçekçi) akışına dokunulmaz.

## Bilinçli olarak builder'a bırakılanlar

- Veri modeli ayrıntıları (oda, ürün, sunum, kota tabloları).
- Yapay zeka modeli seçimi ve istem (prompt) tasarımı; çoklu ürünün tek görselde nasıl işleneceği.
- Görsel saklama (nerede, ne kadar süre).
- Sunum PDF'i için mevcut PDF altyapısının kullanımı.
- Arayüzün ayrıntıları (katalog gezinme, yükleme durumu, hata durumları).

## Açık noktalar (kullanıcıya ait)

- Premium kotanın tam sayısı ve yenilenme süresi (aylık mı, toplam mı) ve premium fiyatı.
- Ürünün adı ve bu yan ürünün ArsaBil içindeki adresi ("ArsaBil Studio" adı mevcut Studio modülüyle çakışıyor).

## Yapım öncesi netleştirilen noktalar (yazarın kararları, kullanıcı onayına açık)

- **Paylaşım ve saklama:** Sunum linki varsayılan 30 gün geçerli (ArsaBil paylaşım linkleriyle aynı), süre dolunca link "süresi doldu" sayfası gösterir. Görseller ArsaBil'in mevcut dosya saklama yöntemiyle saklanır; PDF talep anında üretilir, saklanmaz. Süresi dolan sunumların görselleri temizlenir.
- **Fiyat ve link doğruluğu:** Sunumda fiyat, sunum oluşturulduğu andaki anlık görüntüdür ve "Fiyatlar <tarih> itibarıyladır" etiketi taşır. İlk sürümde fiyatlar ve linkler elle kontrol edilir; otomatik kontrol işi kapsam dışı.
- **Katalog görselleri:** İlk sürüm yalnızca demo amaçlıdır; ürün görselleri indirilip demoda ve yapay zeka girdisi olarak kullanılabilir, ama bu katalog herkese açık yayına çıkmaz. Herkese açık yayından önce marka izni veya lisanslı görsel şarttır (hukuki çerçeve sonra hazırlanacak).
- **Kota:** Başarısız veya zaman aşımına uğrayan üretim kotadan düşmez (önce ayır, hata olursa iade et). "Yeniden dene" kotadan düşer. N ürünlü tek üretim 1 hak sayılır. Hesap başına 5 ücretsiz hak (e-posta ile kayıtlı hesap); kullanıcı başına günlük üst sınır ve toplam fal.ai bütçe uyarısı eklenir.
- **Premium:** Ödeme/satın alma akışı bu sürümde YOK. Kota sayıları yapılandırmadır (ücretsiz 5, premium varsayılan ayda 25); premium kullanıcı elle (admin) atanır.
- **Kalite çıtası:** Plan, başta kısa bir deney adımı içerir: gerçek oda fotoğrafları ve 5-10 ürünle fal.ai modelleri elle denenir, kabul ölçütü "ürün tanınabilir ve görsel makul" (insan değerlendirmesi). Önce tek çağrıda çoklu ürün denenir; olmazsa ürünleri sırayla ekleme yolu seçilir. Bu deney sonucu kota ve maliyet hesabını belirler.
- **Dal ve adres:** Ayrı bir dal, `gorsel-yenileme-arazi` üzerine kurulur (Arazi tasarım tokenları gerekli). Çalışma adresi geçici olarak `/oda-studyosu`; ürün adı kararlaşınca değiştirilir.
- **Gizlilik:** Yüklenen oda fotoğrafları üçüncü taraf yapay zeka servisine (fal.ai) gönderilir; yükleme ekranında bunu belirten bir bilgilendirme ve onay kutusu bulunur. Paylaşım sayfaları tahmin edilemez token ile açılır, arama motorlarına kapalıdır (noindex).
