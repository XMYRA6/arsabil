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
