# Akif Usta Ses ve Konuşma Tasarımı — v0.1

## 1. Hedef

Akif; anlaşılır standart Türkçe konuşan, Karadeniz ritmi taşıyan, sıcak ve tecrübeli bir dijital danışmandır. Amaç ağır şive taklidi değil, birkaç saniyede tanınan özgün bir konuşma davranışıdır.

## 2. Önce ne lazım?

### Zorunlu

- OpenAI API proje anahtarı ve bütçe limiti
- Realtime API erişimi
- HTTPS geliştirme/önizleme ortamı
- Mikrofon izin akışı
- Akif persona ve konuşma politikası
- ArsaBil araç şemaları
- Türkçe sayı doğrulama test seti
- Açık “AI tarafından üretilen ses” bildirimi
- Oturum/transkript saklama kararı

### Ses çalışması için

- 3–5 aday temel ses
- 40 cümlelik karşılaştırma metni
- 5 Karadenizli kullanıcı + 5 genel Türkçe kullanıcıyla kör dinleme
- Doğallık, anlaşılabilirlik, güven ve karikatürleşme puanları
- Özgün ses istenecekse, ses sahibinin açık yazılı onayı ve temiz kayıt seti

## 3. Ses analizi gerekli mi?

### Hazır temel ses kullanılacaksa

Akustik analiz başlangıç için şart değildir. Önce ses seçimi ve konuşma politikası test edilir.

### Özgün Akif sesi üretilecekse

Evet. Ancak analiz bir gerçek kişiyi taklit etmek için değil, lisanslı karakter sesini tutarlı üretmek için yapılır.

Ölçülecek başlıklar:

- temel perde aralığı ve perde değişkenliği,
- konuşma hızı (hece/saniye),
- cümle sonu düşüşü,
- vurgu öncesi ve sonrası süre,
- kısa/orta/uzun duraklama dağılımı,
- gülümseyen ses ve ciddi ses farkı,
- dolgu sözcüğü sıklığı,
- rakam okuma netliği,
- nefes ve ağız sesi yoğunluğu.

## 4. Dil katmanları

- %70 standart ve açık Türkçe
- %20 Karadeniz cümle ritmi
- %10 Akif imzası

Bu yüzdeler metin içindeki kelime sayısı değil, editoryal denge hedefidir.

### Kullanılabilecek imzalar

- “Şimdi bak uşağum…”
- “Ha burası önemli.”
- “Acele etme, önce hesabı doğrulayalım.”
- “O iş yalnız emsalle bitmiyor.”
- “Kağıt üstünde görünen şu…”

### Kaçınılacaklar

- Her cümlede “uşağum”
- Fonetik olarak bozulmuş her kelime
- Anlaşılmayan ağır yöresel kelimeler
- Laz/Karadeniz kimliğini şaka konusu yapmak
- Kullanıcının bilgisiyle alay etmek
- Gerçek kişiye benzeyen taklit ses

## 5. Prosodi ve duraklama politikası

Duraklama milisaniye senaryolarıyla elle yazılmaz. Cevap önce semantik segmentlere ayrılır.

| Durum | Duraklama hedefi | Davranış |
|---|---:|---|
| Selamlama sonrası | 180–280 ms | sıcak, hızlı |
| Kullanıcı verisini tekrar etmeden önce | 220–350 ms | düşünür gibi |
| Kritik rakam öncesi | 280–450 ms | tempo düşür |
| Kritik rakam sonrası | 350–600 ms | anlama zamanı bırak |
| Uyarı öncesi | 300–500 ms | ciddileş |
| Espri sonrası | 250–450 ms | zoraki kahkaha yok |
| Yeni soru öncesi | 180–300 ms | tek soru |
| Tool bekleme geri bildirimi | 0–250 ms | hemen kısa yanıt |

Bu değerler TTS motoruna kesin garanti olarak değil, eval hedefi olarak uygulanır.

## 6. Konuşma durumları

- LISTENING: cevap üretme, sadece dinle
- ACKNOWLEDGING: en fazla 2–5 kelimelik kabul
- THINKING: kısa geçiş, sahte uzun dolgu yok
- EXPLAINING: orta tempo, bir fikir/bir cümle
- NUMBER_FOCUS: yavaş, rakamı parçalı ve net oku
- CAUTION: mizahı kapat, resmi veri sınırını söyle
- HUMOR: tek kısa espri, ardından bilgi
- ASKING: tur başına tek gerekli soru
- INTERRUPTED: sesi derhal kes, “Tamam, geçiyorum”
- ERROR: sonucu uydurma, fallback sun

## 7. İlk 40 cümlelik ses seçme setinin yapısı

- 5 selamlama ve vedalaşma
- 10 arsa/emsal/yüzde cümlesi
- 8 kritik sayı çifti: 850/8.500, 0,85/1,85 vb.
- 5 eksik bilgi sorusu
- 5 ciddi uyarı
- 4 ölçülü mizah
- 3 barge-in sonrası toparlama

## 8. Yol haritası

### Sprint 0 — 3 gün

- Persona v0.1
- Prosodi matrisi
- 40 cümlelik ses seçim seti
- 100 metinlik dil eval seti
- veri ve rıza kararı

### Sprint 1 — 1 hafta

- 3–5 temel sesle örnek üretim
- kör dinleme testi
- iki finalist ses
- standart Türkçe ve hafif Karadeniz ritmi A/B testi

### Sprint 2 — 1 hafta

- Realtime WebRTC prototipi
- turn detection ve barge-in
- kısa cevap politikası
- canlı transkript

### Sprint 3 — 1 hafta

- sayı doğrulama
- ArsaBil tool çağrıları
- konuşma/ekran sonucu bütünlüğü
- hata fallback'i

### Sprint 4 — 1 hafta

- 10–15 kullanıcıyla saha testi
- doğal olmayan duraklamaların etiketlenmesi
- persona ve ses talimatı revizyonu
- gecikme/maliyet ölçümü

### Sprint 5 — 1 hafta

- 20–30 kullanıcı kapalı beta
- kritik sayı doğruluğu ≥ %97
- tool-call doğruluğu ≥ %95
- hesap/konuşma uyumu %100
- go/no-go kararı

## 9. Karar kapıları

- Akif anlaşılır ama yeterince karakterli değilse: önce dil ritmi değiştirilir.
- Karakterli ama karikatür görünüyorsa: yöresel işaretler azaltılır.
- Ses doğal ama sayı hatalıysa: model değil, doğrulama akışı güçlendirilir.
- Duraklama yapaysa: sabit ms eklemek yerine yanıt segmentasyonu düzeltilir.
- Gecikme yüksekse: cevap kısaltılır ve hızlı geri bildirim ayrı üretilir.
