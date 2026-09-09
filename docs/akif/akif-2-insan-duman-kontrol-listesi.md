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

Sorun çıkarsa: `AKIF_VOICE_MODEL=gpt-realtime` (kalite) veya guard eşiklerini düşür.

## Kabul edilen kalıntı — oturum süre sınırı yalnız istemci tarafında

GA `/v1/realtime/client_secrets` oturum başladıktan sonra süreyi kısan bir alan
(`max_session_duration_seconds` vb.) sunmuyor. `AKIF_VOICE_SESSION_MAX_SEC` bu yüzden
SADECE tarayıcı sayacıyla (`useRealtimeVoice`) uygulanır. Çökmüş/kötü niyetli istemci
sayacı atlarsa oturum OpenAI'nin kendi sert üst sınırına kadar sürebilir; global aylık
bütçe + kullanıcı aylık dakika + `AKIF_VOICE_SESSION` rate limit bu riski sınırlar.
İnsan testinde 10. dk kapanışını gerçek tarayıcıda doğrula (yukarıdaki timeout maddesi).
