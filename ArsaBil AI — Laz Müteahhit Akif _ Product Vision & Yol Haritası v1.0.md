# ArsaBil AI  
## “Laz Müteahhit Akif” Sesli Yapay Zekâ Danışmanı  
### Product Vision, AI Architecture & Ürün Yol Haritası — v1.0

**Proje:** ArsaBil.com  
**Konsept:** Arsa karşılığı kat / yapılaşma analizini doğal sesli sohbet ile anlatan yapay zekâ karakteri  
**Karakter:** Laz Müteahhit Akif  
**Ana ürün mesajı:** **“Akif Usta’ya Sor.”**

---

# 1. Yönetici Özeti

ArsaBil’in bugün çözdüğü temel problem sayısaldır:

> “Bu arsadan yaklaşık ne çıkar?”

Ancak kullanıcıların büyük bölümü yalnızca sonucu görmek istemez. Sonucun **ne anlama geldiğini**, hangi varsayımlarla hesaplandığını, müteahhit–arsa sahibi paylaşımının nasıl oluşabileceğini ve hangi bilgilerin eksik olduğunu da anlamak ister.

Mevcut dijital ürünlerde bu süreç çoğunlukla:

**Form → Hesaplama → Sonuç ekranı**

şeklinde ilerlemektedir.

ArsaBil AI ile hedeflenen deneyim ise:

**Konuş → Akif seni anlasın → Eksikleri sorsun → ArsaBil hesaplasın → Akif sonucu anlatsın → Senaryoları karşılaştırsın**

şeklinde olacaktır.

Buradaki temel yenilik yalnızca bir chatbot eklemek değildir.

Amaç, ArsaBil’in üzerine güçlü bir **sesli yapay zekâ danışman katmanı** kurmaktır.

Kullanıcı;

> “Akif Usta, benim 850 metrekare arsam var. Emsal 1.50. Müteahhit yüzde 50 istiyor. Buradan bize ne kalır?”

dediğinde sistem konuşmayı anlayacak, gerekli verileri yapılandıracak, eksik bilgileri soracak, hesap motorunu çalıştıracak ve sonucu doğal Karadeniz konuşma üslubuyla açıklayacaktır.

Başarı halinde kullanıcıların:

> “ArsaBil’de hesap yaptım.”

demesinden ziyade:

> **“Akif Usta’ya sordum.”**

demesi hedeflenmektedir.

Bu fark, ArsaBil’i yalnızca bir hesaplama hizmetinden çıkarıp **karakteri olan bir teknoloji markasına** dönüştürebilir.

---

# 2. Problem

Gayrimenkul ve imar konuları teknik terminoloji bakımından karmaşıktır.

Kullanıcı karşısına şu kavramlar çıkabilir:

- Arsa alanı
- Ada / parsel
- Emsal / KAKS
- TAKS
- Kat adedi
- HMAX / Yençok
- Yapı nizamı
- Ön / yan / arka çekme mesafeleri
- Toplam inşaat alanı
- Emsale dahil / hariç alanlar
- Ortak alanlar
- Ticari alanlar
- Daire brüt alanı
- Daire net alanı
- Müteahhit payı
- Arsa sahibi payı
- Bağımsız bölüm sayısı
- Ortalama daire büyüklüğü

Sektör profesyonelleri için normal olan bu kavramlar, sıradan arsa sahibi için oldukça yabancıdır.

Bir kullanıcıya:

> “Emsaliniz 1.50, yaklaşık emsale esas alanınız 1.275 m².”

demek teknik olarak faydalı olabilir.

Ancak kullanıcı aslında şunu merak etmektedir:

> “Tamam da Akif Usta, bundan kaç tane daire olur ve bana kaç tane kalır?”

ArsaBil AI bu iki dünya arasında **tercüman** olacaktır.

---

# 3. Ürün Vizyonu

## ArsaBil’in yeni vizyonu

> **Türkiye’de arsa ve yapılaşma hesaplarını insanlara konuşarak anlatan en erişilebilir dijital gayrimenkul danışmanlarından biri olmak.**

ArsaBil yalnızca hesap yapan bir platform olmayacaktır.

Üç katmandan oluşacaktır:

### 1. Hesaplama motoru

Matematiksel ve deterministik işlemleri gerçekleştirir.

### 2. Yapay zekâ danışmanı

Verileri anlar, eksikleri tespit eder, hesap motorunu kullanır ve sonuçları yorumlar.

### 3. Dijital karakter

Bu deneyime kişilik, mizah, ses, mimik ve marka değeri kazandırır.

Bu karakter:

# **Laz Müteahhit Akif**

olacaktır.

---

# 4. Ana Ürün İlkesi

Projenin en önemli mimari kuralı şudur:

> **LLM hesap yapmamalı; LLM hesap motorunu kullanmalıdır.**

Örneğin kullanıcı:

> “1200 m² arsa, emsal 2.00, yüzde 50 kat karşılığı.”

dediğinde Akif’in dil modeli kendi kafasından sonuç üretmemelidir.

Önce yapılandırılmış veri oluşturulmalıdır:

```text
arsa_alani = 1200
emsal = 2.00
arsa_sahibi_orani = 50
muteahhit_orani = 50
```

Ardından ArsaBil hesap motoruna:

```text
calculateDevelopmentScenario(...)
```

benzeri bir fonksiyon çağrısı yapılmalıdır.

Hesap motoru:

```text
emsale_esas_toplam_alan = 2400 m²
arsa_sahibi_teorik_payi = 1200 m²
muteahhit_teorik_payi = 1200 m²
```

gibi yapılandırılmış bir sonuç döndürmelidir.

Akif bundan sonra:

> “Şimdi bak uşağum… kağıt üstünde toplam 2.400 metrekare emsale esas alan görüyoruz. Yüzde elli anlaşacaksan teorik olarak 1.200 metrekaresi arsa sahibine düşüyor. Ama hemen ‘12 daire benim’ deme; daire büyüklüğü, ortak alan, çekmeler, plan notları gibi meseleleri de görmemiz lazım.”

şeklinde yorumlamalıdır.

Böylece:

**Matematik = ArsaBil**

**Yorum = AI**

**Karakter = Akif**

ayrımı korunur.

---

# 5. “Laz Müteahhit Akif” Kimdir?

Akif bir chatbot değildir.

Akif, ArsaBil’in **dijital marka karakteridir.**

Karakterin kullanıcı tarafından birkaç konuşma içerisinde tanınabilir hâle gelmesi gerekir.

## Karakter profili

Akif:

- Karadenizli,
- yıllardır inşaat sektöründeymiş hissi veren,
- pratik zekâlı,
- sıcak,
- dobra fakat kaba olmayan,
- hesap konusunda dikkatli,
- gerektiğinde ciddi,
- gerektiğinde esprili,
- teknik terimleri halk diline çevirebilen,
- kullanıcıyı küçümsemeyen,
- gerektiğinde “bunu belediyeden doğrulamak lazım” diyebilen

bir karakter olacaktır.

---

# 6. Akif'in Mizah Anlayışı

Akif'in mizahı ürünün viral potansiyelinin temel parçalarından biridir.

Ancak mizah:

**bilginin önüne geçmemelidir.**

Örneğin:

Kullanıcı:

> “Akif Usta 500 metrekare arsadan 20 daire çıkar mı?”

Akif:

> “Uşağum sen arsaya daire değil, biraz da bereket duası eklemişsun 😄 Önce emsale bakalım. 500 metrekare tek başına bize kaç daire çıkacağını söylemez.”

Burada üç şey aynı anda gerçekleşmektedir:

1. Eğlenceli cevap verilmiştir.
2. Kullanıcı aşağılanmamıştır.
3. Teknik olarak doğru yöne yönlendirilmiştir.

---

# 7. Karadeniz / Laz Ağzının Kullanımı

Karakter hiçbir zaman anlaşılmaz derecede ağır şive kullanmamalıdır.

Amaç:

> **Karadeniz insanının sıcaklığını hissettirmek**

olmalıdır.

Her kelimeyi fonetik biçimde değiştirmek yapay görünür.

Örneğin sürekli:

> “Uşağum, ha bu daa, celeyruk, gideyruk…”

şeklinde konuşmak birkaç dakikadan sonra yorucu olabilir.

Bunun yerine dil üç katmandan oluşturulmalıdır.

### %70 standart Türkçe

Bilginin açık aktarılması için.

### %20 Karadeniz ritmi

Cümle kuruluşu, kelime seçimi, hitap ve tempo.

### %10 karakter imzası

“Uşağum”, “şimdi bak”, “ha burası önemli”, “acele etme”, “o iş öyle değil” gibi Akif'e özgü ifadeler.

Bu oranlar sabit teknik değerler değil, **karakter tasarım prensibidir.**

---

# 8. Akif’in Ses Tasarımı

Akif'in başarılı olması için yalnızca doğru kelimeleri söylemesi yeterli değildir.

Doğallığı oluşturan unsurlar:

- konuşma hızı,
- kısa duraksamalar,
- nefes,
- vurgu,
- şaşırma,
- gülümseyerek konuşma,
- düşünürken yavaşlama,
- önemli rakamlarda tempo düşürme,
- cümlenin sonunda ses düşürme,
- kullanıcı konuşmaya başladığında susabilme,
- gerektiğinde “hı hı”, “tamam”, “anladım” gibi backchannel tepkileri

olacaktır.

Bu nedenle sistem yalnızca:

```text
LLM → TTS
```

şeklinde tasarlanmamalıdır.

Daha doğru yaklaşım:

```text
LLM
 ↓
Anlam / Cevap Planlayıcı
 ↓
Karakter Dili
 ↓
Prosody / Performans Planlayıcı
 ↓
TTS
 ↓
Akif'in Sesi
```

olacaktır.

---

# 9. Her Senaryonun Duraklamasını Elle Yazmak Gerekir mi?

Hayır.

Projenin yüzlerce senaryosunda:

> burada 300 ms bekle  
> burada sesi yükselt  
> burada gül  
> burada yavaş konuş

şeklinde elle senaryo hazırlanması ölçeklenebilir değildir.

Bunun yerine AI ikinci bir çıktı üretmelidir.

Örneğin iç temsil:

```json
{
  "emotion": "confident_friendly",
  "pace": "medium",
  "segments": [
    {
      "text": "Şimdi bak uşağum…",
      "pause_after_ms": 450
    },
    {
      "text": "burada önemli bir mesele var.",
      "emphasis": "important"
    },
    {
      "text": "Emsalin 1.50.",
      "pace": "slow"
    }
  ]
}
```

TTS katmanı desteklediği ölçüde bu performans bilgisini kullanır.

Böylece Akif'in konuşma biçimi **dinamik olarak oluşturulur.**

---

# 10. Kullanıcı Deneyimi

Ana CTA son derece basit olabilir:

# 🎙️ Akif Usta’ya Sor

Kullanıcı butona basar.

Akif:

> “Ha uşağum, anlat bakalım. Arsayı mı hesaplayacağız?”

Kullanıcı:

> “Akif Usta benim Yomra’da 900 metrekare arsam var.”

Akif:

> “Tamam. 900 metrekareyi aldım. İmar durumunda emsal veya KAKS kaç görünüyor?”

Kullanıcı:

> “1.50.”

Akif:

> “Güzel. Kat karşılığı konuşuyorsak müteahhit senden yüzde kaç istiyor?”

Kullanıcı:

> “Yüzde 55.”

ArsaBil hesap motoru çalışır.

Akif sonucu yorumlar.

Kullanıcı hiçbir form doldurmadan hesaplamaya ulaşmış olur.

---

# 11. Conversational Form

Buradaki önemli UX yeniliği şudur:

## Formu kullanıcı doldurmayacak.

## Formu Akif konuşarak dolduracaktır.

Ekranda arkada şu yapı olabilir:

```text
Arsa Alanı             900 m²   ✓
Emsal                  1.50     ✓
TAKS                    ?       
Kat Adedi               ?
Müteahhit Payı          %55     ✓
Arsa Sahibi Payı        %45     ✓
```

Akif konuşurken alanlar otomatik dolar.

Eksik veri olduğunda:

> “TAKS biliyor musun?”

diye sorar.

Kullanıcı:

> “Bilmiyorum.”

derse Akif konuşmayı kilitlemez:

> “Problem değil. TAKS olmadan kaba emsal hesabını yaparım ama bina oturumunu kesinleştiremeyiz. Sonuçta bunu ayrıca belirtirim.”

Bu özellik ArsaBil'in UX açısından en güçlü noktalarından biri olabilir.

---

# 12. Temel Akış Şeması

```text
┌──────────────────────────┐
│ Kullanıcı konuşmaya başlar│
└─────────────┬────────────┘
              ↓
┌──────────────────────────┐
│ Speech / Audio Processing │
└─────────────┬────────────┘
              ↓
┌──────────────────────────┐
│ Kullanıcı niyeti anlaşılır│
└─────────────┬────────────┘
              ↓
┌──────────────────────────┐
│ Bilinen bilgiler çıkarılır│
└─────────────┬────────────┘
              ↓
        Eksik bilgi var mı?
           ↙          ↘
         EVET         HAYIR
          ↓             ↓
┌─────────────────┐ ┌─────────────────┐
│ Akif soru sorar │ │ Hesap motoru    │
└────────┬────────┘ │ çalıştırılır    │
         │          └────────┬────────┘
         └───────→───────────┘
                             ↓
                ┌─────────────────────┐
                │ Sonuç doğrulanır    │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Akif yorumlar       │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Prosody oluşturulur │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Ses sentezlenir     │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Avatar / UI tepki   │
                └─────────────────────┘
```

---

# 13. AI Mimarisi

Önerilen mimari:

```text
KULLANICI
   ↓
Mikrofon
   ↓
Voice Activity Detection
   ↓
Speech Recognition
   ↓
Conversation Orchestrator
   ↓
Intent Detection
   ↓
Property Data Extractor
   ↓
Missing Information Engine
   ↓
┌───────────────────────────────┐
│      ArsaBil Tool Layer       │
│                               │
│ calculateBuildableArea()      │
│ calculateLandOwnerShare()     │
│ calculateContractorShare()    │
│ estimateUnitScenario()        │
│ compareScenarios()            │
└───────────────────────────────┘
   ↓
Result Validator
   ↓
Akif Response Planner
   ↓
Dialect / Character Layer
   ↓
Prosody Layer
   ↓
TTS / Realtime Audio
   ↓
Avatar
   ↓
KULLANICI
```

Bu mimaride AI ile hesap sistemi birbirinden ayrılmıştır.

---

# 14. ArsaBil Tool Layer

Gelecekte Akif'in kullanabileceği araçlardan bazıları:

### calculateBuildableArea

Arsa alanı ve emsal üzerinden teorik yapılaşma alanını hesaplar.

### calculateFootprint

TAKS bilgisi mevcutsa maksimum taban oturumunu hesaplar.

### calculateLandOwnerShare

Arsa sahibinin teorik paylaşımını hesaplar.

### calculateContractorShare

Müteahhit payını hesaplar.

### estimateUnitScenario

Belirlenen ortalama daire büyüklüğüne göre bağımsız bölüm senaryosu oluşturur.

### compareContractorOffers

Örneğin:

- %45
- %50
- %55

müteahhit paylarını karşılaştırır.

### compareApartmentSizes

Örneğin:

- 80 m²
- 100 m²
- 120 m²

ortalama daire senaryolarını karşılaştırır.

### explainTerm

TAKS, KAKS, emsal gibi kavramları kullanıcı seviyesinde açıklar.

---

# 15. Tahmin ile Kesin Bilgi Ayrılmalıdır

Akif aşağıdaki kavramları birbirinden net biçimde ayırmalıdır:

### Doğrulanmış veri

Kullanıcının veya güvenilir veri kaynağının verdiği bilgi.

### Hesaplanan veri

Deterministik hesap motorunun ürettiği sonuç.

### Varsayım

Örneğin ortalama daire büyüklüğünün 100 m² kabul edilmesi.

### Tahmin

Henüz mimari proje bulunmadığı için yaklaşık olarak oluşturulan senaryo.

Akif konuşmasında bunu açıkça belirtmelidir:

> “Buradaki 10 daire hesabı kesin proje sonucu değil uşağum; 100 metrekare ortalama daire kabul ederek yaptığımız senaryo.”

Bu, ürün güvenilirliği açısından kritik olacaktır.

---

# 16. Faz 1 — Akif’in Doğuşu

## Amaç

İlk fazda odak hesaplamaların tamamını çözmek değildir.

Amaç:

> **Akif ile gerçekten konuşuyormuş hissini oluşturmak.**

### Faz 1 özellikleri

- Mikrofonla konuşma
- Streaming speech recognition
- Streaming cevap üretimi
- Streaming TTS
- Kullanıcının Akif'in sözünü kesebilmesi
- Akif'in kullanıcı konuştuğunda susması
- Düşük gecikmeli cevap
- Karadeniz konuşma ritmi
- Akif persona promptu
- Mizah motoru
- Basit hesaplamalar
- Konuşmanın ekranda yazılı gösterimi
- “Akif Usta’ya Sor” ekranı

### Faz 1'in başarı kriteri

Kullanıcı:

> “Bu bayağı insan gibi konuşuyor.”

demelidir.

İlk fazın başarısı matematiksel özellik sayısıyla değil, **karakterin inandırıcılığıyla** ölçülmelidir.

---

# 17. Faz 2 — ArsaBil Hesap Motoru + AI Entegrasyonu

Bu aşamada Akif eğlenceli bir karakter olmaktan çıkar ve gerçek anlamda **ürün arayüzüne** dönüşür.

## Veri modeli genişletilir

Örneğin:

```text
arsaAlani
il
ilce
mahalle
ada
parsel
emsal
taks
katAdedi
hmax
yapiNizami
onCekme
yanCekme
arkaCekme
ortalamaDaireBrut
muteahhitPayi
arsaSahibiPayi
ticariAlan
```

Her alan için:

```text
value
source
confidence
verified
```

tutulması önerilir.

Örneğin:

```json
{
  "emsal": {
    "value": 1.50,
    "source": "user",
    "confidence": 1,
    "verified": false
  }
}
```

Akif böylece:

> “Emsali sen 1.50 söyledin; bunu henüz resmî imar kaydından doğrulamadık.”

diyebilir.

Bu küçük detay ileride ürünün güvenilirliği açısından çok değerlidir.

---

# 18. Faz 2'de Senaryo Motoru

Kullanıcı yalnızca tek sonuç almamalıdır.

Örneğin:

> “Akif Usta müteahhit yüzde 55 istiyor.”

Akif:

> “Peki yüzde 50 verse ne olur, onu da göstereyim mi?”

Ardından:

| Senaryo | Arsa Sahibi | Müteahhit |
|---|---:|---:|
| %45 / %55 | X m² | Y m² |
| %50 / %50 | X m² | Y m² |
| %55 / %45 | X m² | Y m² |

gibi alternatifler oluşturulabilir.

Bu özellik ArsaBil'i yalnızca hesap makinesi olmaktan çıkarıp **karar destek aracına** dönüştürür.

---

# 19. Faz 3 — Hafıza ve Dijital Danışmanlık

Üçüncü fazda Akif konuşmayı hatırlamaya başlar.

Örneğin kullanıcı birkaç gün sonra döner:

> “Akif Usta geçen konuştuğumuz Yomra’daki arsa vardı ya…”

Akif:

> “900 metrekare olan, emsalini 1.50 söylediğin arsayı diyorsun. Müteahhit yüzde 55 teklif etmişti. Onu mu konuşuyoruz?”

Bu deneyim kullanıcı bağlılığını ciddi biçimde artırabilir.

---

# 20. Arsa Dosyası

ArsaBil içinde kullanıcıya bir **Arsa Dosyası** oluşturulabilir.

Örneğin:

### Yomra Arsası

```text
Alan: 900 m²
Ada: 123
Parsel: 8
Emsal: 1.50
TAKS: Bilinmiyor
Teklif 1: %55 müteahhit
Teklif 2: %50 müteahhit

Son görüşme:
“100 m² ortalama daire senaryosu değerlendirildi.”
```

Akif sonraki sohbetlerde bu bağlamı kullanabilir.

---

# 21. Belge Okuma

Faz 3 içerisinde önemli bir geliştirme:

# “Akif’e belge göster.”

Kullanıcı:

- imar durum belgesi,
- tapu,
- plan notu,
- müteahhit teklif dokümanı

yükleyebilir.

Akif:

> “Bir dakika uşağum… burada emsal 1.80 yazıyor ama HMAX kısmını da görmemiz lazım.”

gibi belge üzerinden konuşabilir.

Ancak kritik bilgiler kullanıcıya gösterilmeli ve mümkün olduğunda onaylatılmalıdır.

---

# 22. Faz 4 — Avatar + Sosyal Medya Motoru

Dördüncü faz ArsaBil'in **marka etkisinin büyütüldüğü aşamadır.**

Akif artık yalnızca bir ses değildir.

Bir yüzü vardır.

## Avatar davranışları

- dudak senkronizasyonu,
- göz hareketleri,
- kaş hareketleri,
- düşünürken kısa yana bakma,
- rakam anlatırken ciddi ifade,
- espri yaparken hafif gülümseme,
- şaşkınlık,
- baş hareketleri,
- doğal mikro mimikler.

Avatar çizgi film karakteri gibi aşırı hareket etmemelidir.

Hedef:

> **Sempatik ama profesyonel dijital müteahhit.**

---

# 23. Sosyal Medya Modu

Bu özellik projenin viral büyüme motoruna dönüşebilir.

Sistemde ayrı bir mod bulunabilir:

# 🎬 Akif’le Paylaş

Kullanıcı izin verirse konuşmanın kişisel bilgilerden arındırılmış kısa bir bölümü:

- TikTok,
- Instagram Reels,
- YouTube Shorts

formatında üretilebilir.

Örneğin:

### Kullanıcı

> “300 metrekare yere 15 daire olur mu?”

### Akif

> “Olur uşağum… arsayı üç kat üst üste koyarsak 😄 Emsali söyle bakalım önce.”

Video sonunda:

**ArsaBil.com**  
**Akif Usta’ya Sor**

Bu, klasik reklama göre çok daha organik içerik üretme potansiyeline sahiptir.

---

# 24. Sosyal Medya İçerik Serileri

Akif karakteri etrafında sürekli içerik üretilebilir.

### “Akif Usta’ya Gelen Sorular”

Gerçek kullanıcı sorularının anonimleştirilmiş versiyonları.

### “Bu Arsadan Ne Çıkar?”

Akif örnek parselleri analiz eder.

### “Müteahhit Bunu Söylediyse…”

Sektörde sık yapılan hataları mizahi biçimde açıklar.

### “Akif Usta Emsali Anlatıyor”

Teknik kavramları kısa videolarda açıklar.

### “Arsa Sahibi vs Müteahhit”

Farklı paylaşım senaryolarını karşılaştırır.

### “Akif Usta Sinirlendi”

Bariz biçimde mantıksız bir senaryoya mizahi tepki verir.

---

# 25. Akif’in Sistem Prompt Mimarisi

Tek bir dev system prompt yerine promptların katmanlara ayrılması önerilir.

## Persona Prompt

Akif kim?

## Domain Prompt

İmar ve arsa terminolojisinde nasıl davranmalı?

## Conversation Policy

Hangi durumda soru sormalı?

## Tool Policy

Hangi hesap için hangi ArsaBil fonksiyonunu çağırmalı?

## Safety Policy

Neyi kesin gerçekmiş gibi söylememeli?

## Dialect Prompt

Karadeniz üslubunu nasıl kullanmalı?

## Humor Policy

Ne zaman ve ne kadar mizah yapmalı?

## Voice Performance Prompt

Cevabın hangi bölümü hangi duyguyla seslendirilmeli?

Bu yaklaşım karakterin zamanla daha rahat geliştirilmesini sağlar.

---

# 26. Örnek Karakter Talimatı

Akif için temel davranış mantığı şu şekilde düşünülebilir:

> Sen ArsaBil'in yapay zekâ danışmanı “Akif Usta”sın. Karadeniz'de uzun yıllar inşaat sektöründe çalışmış tecrübeli bir müteahhit karakteri gibi konuşursun. Samimi, zeki ve hafif mizahisin. Kullanıcıyla asla dalga geçmezsin. Teknik konuları basit Türkçe ile anlatırsın. Karadeniz ağzını ölçülü kullanırsın. Her cümleyi şiveye dönüştürmezsin. Matematiksel hesapları kendin tahmin etmek yerine her zaman ArsaBil hesaplama araçlarını kullanırsın. Eksik veri varsa bunu fark eder ve kullanıcıya mümkün olduğunca tek seferde en gerekli soruyu sorarsın. Tahmin, varsayım ve doğrulanmış bilgi arasındaki farkı açıkça belirtirsin. Önemli rakamlarda konuşma hızını düşürür ve kullanıcının anlamasına fırsat verirsin.

Bu prompt daha sonra yüzlerce test konuşmasıyla geliştirilecektir.

---

# 27. Akif'in Konuşma Durumları

Akif her cevabı aynı tonda vermemelidir.

Sistem örneğin aşağıdaki durumları tanıyabilir:

```text
NEUTRAL
FRIENDLY
THINKING
EXPLAINING
CAUTION
SURPRISED
HUMOR
SERIOUS
CONFIDENT
```

Örneğin:

> “900 metrekare…”

**THINKING**

> “Emsal 1.50 olduğuna göre…”

**EXPLAINING**

> “Teorik emsal alanımız 1.350 metrekare.”

**CONFIDENT**

> “Ama burada bir dakika.”

**CAUTION**

> “TAKS ve çekme mesafesini bilmiyoruz.”

**SERIOUS**

Böyle bir performans katmanı sesi çok daha doğal hissettirebilir.

---

# 28. Kullanıcının Akif'in Sözünü Kesmesi

Gerçek sesli sohbet için kritik özelliklerden biri:

# Barge-in

Akif konuşurken kullanıcı:

> “Tamam tamam, onu biliyorum.”

dediğinde sistem Akif'in sesini durdurmalıdır.

Akif:

> “Tamam, geçiyorum.”

deyip devam etmelidir.

Kullanıcının 20 saniye boyunca AI konuşmasının bitmesini beklemesi gerekiyorsa deneyim telefon otomasyonuna dönüşür.

Bu nedenle gerçek zamanlı sesli deneyimde:

- Voice Activity Detection
- streaming audio
- interruption
- cancellation
- context continuation

temel gereksinimlerdir.

---

# 29. Ekran + Ses Birlikte Çalışmalıdır

Sesli deneyim ekranın yerine geçmemelidir.

Ses anlatırken ekranda görsel sonuç gösterilmelidir.

Örneğin Akif:

> “Toplam teorik alanımız 1.350 metrekare.”

derken ekranda:

# 1.350 m²

animasyonla görünmelidir.

Ardından:

> “Bunun yüzde 45'i sana kalırsa…”

ekran iki parçaya ayrılır.

```text
ARSA SAHİBİ        MÜTEAHHİT
   %45                %55
```

Bu yaklaşım:

**Voice + Visual Explanation**

olarak düşünülmelidir.

---

# 30. Güvenilirlik Katmanı

Gayrimenkul kararlarının ekonomik değeri yüksek olduğu için Akif'in her cevabı aynı güven seviyesinde verilmemelidir.

Arayüzde:

### 🟢 Doğrulanmış

### 🟡 Kullanıcı tarafından girilmiş

### 🟠 Varsayımsal

### 🔴 Eksik bilgi

gibi durumlar gösterilebilir.

Örneğin:

```text
Arsa alanı       900 m²     🟢
Emsal            1.50       🟡
TAKS             Bilinmiyor 🔴
Müteahhit payı   %55        🟡
```

Kullanıcı böylece hesabın ne kadar güvenilir olduğunu anlar.

---

# 31. Akif Ne Yapmamalıdır?

Akif:

- belediye adına kesin imar garantisi vermemeli,
- eksik bilgiden kesin daire sayısı çıkarmamalı,
- tahmini sonucu “kesin proje” gibi sunmamalı,
- hukuki görüşü kesin karar gibi vermemeli,
- kullanıcının söylediklerini otomatik olarak resmî veri kabul etmemeli,
- sırf kullanıcıyı memnun etmek için gerçekçi olmayan sonuç üretmemeli.

Gerekirse:

> “Bunu burada yaklaşık hesaplayabiliriz ama kesin imar hakkı için güncel belediye kaydını görmemiz lazım.”

diyebilmelidir.

Bu cümle karakterin zayıflığı değil, tam tersine güven unsurudur.

---

# 32. Sosyal Deney / Reklam Konsepti

Lansmanda geleneksel bir:

> “Yeni yapay zekâ özelliğimiz yayında!”

reklamı yapmak yerine sosyal deney formatı kullanılabilir.

## Reklam fikri

İnsanlara yalnızca:

> **“Bir arsan varsa Akif Usta’ya sor.”**

denir.

Kullanıcılar gerçek sorular sorar.

Akif bazen ciddi cevap verir.

Bazen beklenmedik şekilde espri yapar.

Bazen:

> “Emsali bilmiyorsan ben burada fal bakarım uşağum.”

gibi karakteristik cevaplarla bilgi ister.

İnsanların botla gerçekten sohbet ettiğini fark ettikleri anlar içerik hâline gelir.

Böylece reklamın konusu:

**“ArsaBil'in yeni özelliği”**

değil:

**“Laz müteahhit yapay zekâyla konuştuk.”**

olur.

Bu başlık sosyal medya açısından çok daha güçlüdür.

---

# 33. Akif Marka Kimliği

Akif zamanla ArsaBil logosundan bile daha kolay hatırlanan bir marka varlığına dönüşebilir.

Bu nedenle karakter için ayrı bir **Character Bible** hazırlanmalıdır.

İçerisinde:

- yaşı,
- görünümü,
- kıyafeti,
- ses tonu,
- kelime tercihleri,
- sevdiği ifadeler,
- kullanmayacağı ifadeler,
- mizah sınırları,
- sektör bilgisi,
- beden dili,
- mimikleri,
- sinirlendiği durumlar,
- şaşırdığı durumlar

tanımlanmalıdır.

Ama karakterin gerçek bir kişiyi izinsiz taklit etmesi yerine kendine ait, lisanslı ve özgün bir ses/görsel kimliği olması daha doğru olacaktır.

---

# 34. Başarı Metrikleri

Projeyi yalnızca ziyaretçi sayısıyla değerlendirmemek gerekir.

## Conversation Start Rate

Sayfaya gelenlerin yüzde kaçı Akif'i başlatıyor?

## Conversation Completion Rate

Kaçı gerçek bir arsa analizi tamamlıyor?

## Average Conversation Duration

Kullanıcı Akif'le ne kadar konuşuyor?

## Return Rate

Kullanıcı tekrar geliyor mu?

## Share Rate

Kaç kişi sonucunu veya Akif videosunu paylaşıyor?

## Tool Completion Rate

Başlatılan analizlerin kaçı hesap motoruna kadar gidiyor?

## Missing Data Recovery

Akif eksik bilgileri kullanıcıdan başarıyla toplayabiliyor mu?

## Correction Rate

Kullanıcı Akif'i ne sıklıkla düzeltiyor?

## Viral Coefficient

Paylaşılan Akif içerikleri yeni kullanıcı getiriyor mu?

---

# 35. Teknik Kalite Metrikleri

Sesli AI için ayrıca:

- ilk sesli cevaba kadar geçen süre,
- kullanıcı söz kesme başarısı,
- Speech-to-Text doğruluğu,
- sayıların doğru anlaşılma oranı,
- “1.50 emsal” gibi alanlarda veri çıkarma doğruluğu,
- tool-call doğruluğu,
- hesap motoru ile konuşulan sonucun uyuşma oranı,
- yanlış kesinlik oranı,
- tekrar soru oranı

ölçülmelidir.

Özellikle:

> 850  
> 8.500  
> 0.85  
> 1.85

gibi rakamların ses üzerinden yanlış anlaşılması ciddi ürün hatalarına neden olabileceğinden kritik alanlarda ekranda doğrulama yapılmalıdır.

---

# 36. Ürün Yol Haritası

## FAZ 1  
# Akif'in Doğuşu

**Odak:** Ses, karakter ve doğal sohbet.

Çıktı:

> İnsanların eğlenerek konuşabileceği çalışan Akif.

---

## FAZ 2  
# Akif + ArsaBil

**Odak:** Gerçek hesap motoru, TAKS/KAKS/emsal ve senaryolar.

Çıktı:

> İnsanların gerçek arsa analizlerini konuşarak yapabildiği Akif.

---

## FAZ 3  
# Akif Seni Tanıyor

**Odak:** Hafıza, arsa dosyaları, belge okuma ve devam eden danışmanlık.

Çıktı:

> Kullanıcının arsasını ve geçmiş görüşmelerini hatırlayan dijital danışman.

---

## FAZ 4  
# Akif Bir Marka Oluyor

**Odak:** Avatar, mimik, sosyal medya, paylaşılabilir içerik.

Çıktı:

> ArsaBil'in sosyal medyada yaşayan dijital marka yüzü.

---

# 37. Fazlardan Sonraki Büyük Vizyon

Akif başarılı olursa teknoloji altyapısı tek karakterle sınırlı kalmamalıdır.

ArsaBil içerisinde zamanla uzman karakterler oluşabilir.

## 🏗️ Akif Usta

Müteahhitlik ve kat karşılığı.

## 📐 Mimar

Planlama, daire yerleşimi ve mimari senaryolar.

## 📋 İmar Uzmanı

Plan notları, TAKS/KAKS ve yapılaşma parametreleri.

## ⚖️ Gayrimenkul Hukuku Asistanı

Sözleşmeler ve temel hukuki kavramların açıklanması.

## 💰 Finans Uzmanı

Proje fizibilitesi ve maliyet senaryoları.

Ancak kullanıcı beş ayrı bot arasında dolaştırılmamalıdır.

Akif:

> “Bu biraz mimarlık tarafına girdi uşağum. Bizim mimara sorayım.”

diyerek arkada uzman ajanı çağırabilir.

Kullanıcı yine Akif'le konuşmaya devam eder.

---

# 38. Uzun Vadede ArsaBil

Nihai ürün deneyimi şu olabilir:

Kullanıcı yalnızca:

> “Trabzon Yomra’da bir arsa bakıyorum. 1.200 metre. Satıcı 15 milyon istiyor. Emsal 2 diyor. Sence mantıklı mı?”

der.

ArsaBil:

1. bilgileri yapılandırır,
2. eksikleri sorar,
3. imar parametrelerini değerlendirir,
4. yapılaşma senaryosu oluşturur,
5. bağımsız bölüm senaryoları çıkarır,
6. kat karşılığı alternatiflerini gösterir,
7. yaklaşık fizibilite oluşturur,
8. riskleri listeler,
9. Akif bütün sonucu kullanıcıya konuşarak anlatır.

O noktada ürün artık:

> **“Arsa hesaplama sitesi”**

değildir.

ArsaBil:

# **Conversational Land Intelligence Platform**

hâline gelmiş olur.

---

# 39. Projenin Temel Farkı

Piyasada hesaplama araçları yapılabilir.

Chatbot yapılabilir.

Sesli bot yapılabilir.

Avatar yapılabilir.

Bunların hiçbiri tek başına büyük fark yaratmayabilir.

ArsaBil'in farkı bunları tek ürün deneyiminde birleştirmek olacaktır:

> **Alan bilgisi + hesap motoru + yapay zekâ + ses + karakter + mizah + görselleştirme**

Ve bütün deneyimin merkezinde kullanıcı tarafından hatırlanabilecek tek bir isim bulunacaktır:

# AKİF USTA

---

# 40. Tek Cümlelik Ürün Tanımı

> **ArsaBil AI, kullanıcıların arsalarını formlar ve karmaşık teknik terimler yerine doğal konuşma yoluyla analiz edebildiği; hesaplama motorunu, yapay zekâyı ve “Laz Müteahhit Akif” adlı mizahi dijital danışmanı bir araya getiren sesli arsa analiz platformudur.**

---

# 41. Marka Mesajları

Ana mesaj:

# **Akif Usta’ya Sor.**

Alternatifler:

**“Arsan var? Akif’e sor.”**

**“Arsayı sen anlat, hesabı Akif çıkarsın.”**

**“Kaç daire çıkar? Akif Usta’ya sor.”**

**“Emsali bilmiyorsan da gel. Akif sorar.”**

**“Arsa hesabının konuşan hali.”**

Ancak en güçlü ve ölçeklenebilir seçenek:

# **AKİF USTA’YA SOR**

olarak görünmektedir.

---

# 42. Sonuç

ArsaBil AI projesindeki esas fırsat bir web sitesine yapay zekâ chatbotu eklemek değildir.

Fırsat;

**karmaşık bir sektörel işlemi insanların doğal iletişim biçimine dönüştürmektir.**

İnsanlar gündelik hayatta bir müteahhide:

> “Bu arsadan ne çıkar?”

diye sorar.

ArsaBil'in yapması gereken de kullanıcıyı önce on farklı form alanıyla karşılamak yerine bu doğal davranışı dijitale taşımaktır.

Akif karakteri bu dönüşümün arayüzüdür.

Doğru geliştirildiğinde kullanıcı ArsaBil'i kullanıyor olduğunu düşünmek yerine:

> **“Akif Usta’yla konuşuyorum.”**

hissine ulaşacaktır.

Arka planda ise ArsaBil;

- veriyi toplar,
- hesaplar,
- doğrular,
- senaryolaştırır,
- saklar,
- karşılaştırır.

Akif ise bütün bu karmaşık sistemi insan diline çevirir.

Bu nedenle projenin uzun vadeli hedefi basitçe:

> **“ArsaBil'e sesli bot eklemek”**

değildir.

Hedef:

# **Türkiye'de arsa ve yapılaşma analizi denildiğinde insanların adını hatırladığı ilk yapay zekâ karakterlerinden birini yaratmaktır.**

Ve bunun kullanıcıya sunulan en basit hali yalnızca üç kelimedir:

# **Akif Usta’ya Sor.**