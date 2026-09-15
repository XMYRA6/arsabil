# Akif-2 Sesli Danışman — Deploy Sonrası İnsan Duman Testi

WebRTC + mikrofon otomatik test edilemez. Deploy sonrası gerçek cihazda (mobil + masaüstü) elle:

- [ ] `/akif` → "🎙 Sesli konuş" → mikrofon izni istendi, verince bağlandı
- [ ] "900 metrekare arsam var, emsal 1.5, müteahhit yüzde 50 istiyor" de → Akif eksik sormadan hesapladı
- [ ] Ekranda `AkifScenarioCard` belirdi + sesle söylenen sayı ekrandaki tabloyla AYNI
- [ ] Akif konuşurken araya gir ("tamam tamam") → Akif SUSTU, yeni soruyu aldı (barge-in)
- [ ] Sayıları net/yavaş telaffuz etti, abartılı şive YOK
- [ ] Bir terim sor ("emsal nedir?") → term kartı + sözlü açıklama
- [ ] Geçersiz veri ver ("emsal 50") → Akif düzeltme istedi (uçuk sonuç vermedi)
- [ ] ~9. dakikada Akif kapanış uyarısı yaptı, 10. dakikada oturum kapandı
- [ ] Giriş yapmadan "Sesli konuş" → "giriş yapmalısın" mesajı
- [ ] Uçağa alıp ağı kes → "Bağlantı koptu" + oturum düzgün kapandı
- [ ] Coolify `AkifVoiceSessionLog` tablosunda oturum satırı var, `estCostUsd` makul (~$0.02-0.1/dk)
- [ ] **Oturum ortasında gerçek ağ kesintisi** — konuşma sürerken Wi-Fi'yi ~5 sn kapatıp aç. Beklenen: panel "Bağlantı yeniden kuruluyor…" gösterir, ardından kendiliğinden `listening`'e döner; süre sayacı sıfırlanmaz; Akif kaldığı yerden devam eder ve daha önce verdiğin arsa alanı / emsal / pay bilgilerini BAŞTAN sormaz.
- [ ] **Zorla çift kopma** — yeniden bağlandıktan sonra Wi-Fi'yi bir daha kapat. Beklenen: bu sefer "Bağlantı koptu." bandı + "Tekrar dene" düğmesi; "Tekrar dene" temiz bir yeni oturum başlatır (transkript sıfırlanır).

Sorun çıkarsa: `AKIF_VOICE_MODEL=gpt-realtime` (kalite) veya guard eşiklerini düşür.

## Kabul edilen kalıntı — oturum süre sınırı yalnız istemci tarafında

GA `/v1/realtime/client_secrets` oturum başladıktan sonra süreyi kısan bir alan
(`max_session_duration_seconds` vb.) sunmuyor. `AKIF_VOICE_SESSION_MAX_SEC` bu yüzden
SADECE tarayıcı sayacıyla (`useRealtimeVoice`) uygulanır. Çökmüş/kötü niyetli istemci
sayacı atlarsa oturum OpenAI'nin kendi sert üst sınırına kadar sürebilir; global aylık
bütçe + kullanıcı aylık dakika + `AKIF_VOICE_SESSION` rate limit bu riski sınırlar.
İnsan testinde 10. dk kapanışını gerçek tarayıcıda doğrula (yukarıdaki timeout maddesi).

### Akif-2-Aksiyon (senaryo kaydet)
- [ ] Sesli "şu yüzde elliyi kaydet" → onay kartı doğru sayılarla çıkar (arsa payı, sahibine daire/tutar, toplam maliyet) → "Kaydet" → proje sayfasında `Scenario` görünür → 30sn içinde "Geri Al" onu siler
- [ ] Akif yüzdeyi yanlış duyar (ör. %15 yerine %50) → kart yanlış değeri gösterir → kullanıcı "Vazgeç" der, hiçbir şey kaydedilmez
- [ ] Hiç proje yok → Akif "hangi ada?" diye sorar → kart proje adı input'uyla çıkar → ad + Kaydet → yeni proje + senaryo birlikte oluşur; Geri Al ikisini de siler
- [ ] Buton yerine sesli "evet" ile commit → kaydedilir, Akif "kaydettim" der
- [ ] Birden çok proje → kart radio listesi → seçim + Kaydet → doğru projeye yazılır
- [ ] FREE planda 3 senaryo dolu → Akif "hakkın dolmuş" der, kart çıkmaz
- [ ] `npm run akif:voice-smoke` (gerçek key) → yeni tool şemaları (`prepareScenarioSave`, `commitPendingAction`) Realtime tarafından reddedilmiyor

## Akif-3 (Arsa Dosyası — kalıcı hafıza)

Model çıktısına bağlı davranış, Playwright simüle edemez — insan doğrulaması şart. Ayrıca: bu özelliğin migration'ı (`..._add_project_akif_memory`) şu ana kadar hiçbir CANLI veritabanına uygulanmadı (yalnız şema+tip seviyesinde doğrulandı) — deploy öncesi `prisma migrate deploy` bu listedeki maddelerden önce çalıştırılmalı.

- [ ] `/akif`'te oturum açıkken bir proje seç, birkaç tur konuş (ör. bütçe üst sınırı, deprem riskine hassasiyet gibi somut bir bilgi ver) → Dashboard → Projelerim'de o projenin kartında "Akif'in Hatırladıkları" bloğunda bu bilgi gerçekten göründü
- [ ] Aynı projeyi seçip YENİ bir sohbet başlat (farklı `conversationId`) → Akif önceki sohbette öğrendiği bilgiyi hiç sormadan biliyor gibi davrandı (sistem promptuna gerçekten enjekte edildiği doğrulandı)
- [ ] Dashboard → Projelerim'de "Temizle" butonuna bas → blok kayboldu, aynı projeye yeni bir Akif sohbetinde artık eski bilgi yok

## Akif-5 (WhatsApp entegrasyonu)

Gerçek Meta webhook + gerçek telefon numarası gerektirir — hiçbir otomatik test bunu simüle edemez.

**Ön koşul:** `OPENAI_API_KEY` Coolify'da tanımlı olmalı — eksikse WhatsApp botu tamamen SESSİZ kalır (web Akif'in aksine, kullanıcıya görünür bir hata dönmez).

- [ ] Gerçek numaraya "merhaba" yaz → Akif serbest sohbetle karşılık verir (eski "hangi il?" state machine'i YOK)
- [ ] "Trabzon Ortahisar Uğurlu 123/45" gibi tam bir sorgu yaz → gerçek Değer Kartı (renderCard formatında) + kısa Akif girişi gelir
- [ ] Belirsiz bir mahalle adı yaz → Akif adayları kendi cümleleriyle sorar, numaralı liste DEĞİL
- [ ] Kart geldikten sonra "evet" yaz → "takibe alındı" mesajı + `WhatsappSubscription` tablosunda satır oluşur
- [ ] DURDUR yaz → abonelikler silinir, Akif'e hiç gitmeden anında yanıt gelir
- [ ] Bir terim sor ("emsal nedir?") → Akif açıklar (lookupParcel'e gitmeden)
- [ ] Aynı numaradan hızlıca çok mesaj gönder → önce spam guard (WHATSAPP_INBOUND), sonra (eğer aşarsa) AKIF_WHATSAPP_TURN limiti devreye girer
- [ ] `AkifTurnLog`'da `conversationId` alanı `wa:<telefon>` formatında satırlar oluştuğunu doğrula (Coolify DB'den)
