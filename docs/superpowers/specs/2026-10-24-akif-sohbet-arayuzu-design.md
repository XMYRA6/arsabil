# Akif sohbet arayüzü (ChatGPT düzeni) — tasarım

Tarih: 2026-10-24 · Dal: `gorsel-yenileme-arazi` · Durum: Emre onayı bekliyor

## 1. Niyet ve neden

`/akif` bugün tek kutu içinde bir sohbet: üstte "Akif Usta" başlığı, ortada mesajlar, altta yazı kutusu. Emre'ye göre "çok acemice görünüyor". Akif ArsaBil'in en güçlü ürünü (arsa değeri, kat karşılığı senaryoları, sesli konuşma), ama arayüz bunu taşımıyor.

Hedef: ChatGPT'yi tanıyan biri ilk saniyede ne yapacağını bilsin; sohbetlerini bulsun, arasın, eski senaryosuna dönsün; "Sesli konuş"a bastığında bir asistanla konuştuğunu hissetsin. Sohbetin yanında Akif'in hesapladığı değerleri canlı gösteren bir çalışma paneli bunu ChatGPT'den ayırır: ArsaBil'e özgü kısım orası.

## 2. Hedefler

1. Sol kenar çubuğu: Yeni sohbet, "Sohbetlerde ara", **Senaryolarım**, sohbet geçmişi (Bugün / Dün / Son 7 gün / Daha eski), altta kullanıcı.
2. Ortada geniş sohbet; hesap sonuçları mesajın içinde kart olarak görünür.
3. Sağda canlı **çalışma paneli**: konum, alan, ₺/m², arsa payı çubuğu, varsayımlar; Akif bir şey hesaplayınca ya da kullanıcı bir değeri değiştirince güncellenir, değişen değer vurgulanır ("%46 → %50").
4. **Sesli konuş** sohbetin içinde açılır (tam ekran değil): sohbet alanının yerini nabız atan küre alır, panel görünür kalır ve canlı güncellenir, konuşulanlar altta yazıya dökülür. Bitince konuşma sohbet geçmişine mesaj olarak işlenir.
5. Sohbet geçmişi **kalıcı** olur (giriş yapmış kullanıcı için) ve aranabilir.
6. Mobilde aynı özellikler, kenar çubuğu çekmece, panel alt sayfa olarak.

## 3. Hedef olmayanlar

- Akif'in LLM orkestrasyonuna, araçlarına, gerçek zamanlı ses altyapısına, maliyet korumalarına dokunulmaz. Yalnız arayüz ve kalıcılık eklenir.
- Mesaj düzenleme, yeniden üretme, dosya/görsel ekleme, sohbet paylaşma ya da dışa aktarma yok.
- WhatsApp sohbet geçmişi bu kenar çubuğuna taşınmaz (WhatsApp proje kartları Senaryolarım'a girer, mesajlar girmez).
- Çok cihazlı canlı eşitleme yok (sayfa açıldığında sunucudan okunur).

## 4. Anti-hedefler (teknik olarak çalışsa da başarısızlık sayılır)

- Kenar çubuğu şablon/AI-slop görünürse (aynı boyda gri satırlar, emoji, bildirim zili). **Bildirim zili hiçbir yerde olmayacak** (Emre'nin kararı).
- Ses modunda tam ekran karartma ve sayfanın geri kalanının kaybolması (B yönü reddedildi).
- Açık temada siyah blok. Açık tema: orman mürekkebi `#2F3B34`, bej zemin, amber/mavi vurgu; koyu tema navy.
- Panelin boş ve ölü görünmesi: ilk açılışta da neyin dolacağını anlatan bir durum göstermeli.

## 5. Mevcut durum (koddan doğrulandı)

- `src/app/akif/page.tsx` sohbeti **istemci state**'inde tutar; her turda `history` (son 40 mesaj) ile `POST /api/akif/turn` çağırır. Sunucuda sohbet/mesaj tablosu **yok**; yalnız denetim kayıtları var (`AkifTurnLog`, `AkifVoiceSessionLog`, `AkifVoiceTurnLog`).
- Sayfa giriş yapmadan da çalışır (`useSession` yalnız proje listesi için).
- `AkifTurn` (`src/lib/ai/akif/contract.ts`): `speech`, `state`, `assumptions`, `facts_used`, `missing_fields`, `needs_confirmation`, `tool_result` (term / contractor_offers / apartment_sizes / parcel / project kartları).
- Ses: `useRealtimeVoice` (durum, `transcript` öğeleri `{role,text,card?}`, `pendingAction` onay akışı, `elapsedSec`), `AkifVoicePanel`, `AkifActionConfirmCard`. Araç sonuçları `voiceToolBridge` ile `ToolResultCard` olarak gelir.
- Projeler: `GET /api/projects` (site projeleri + senaryolar), `GET /api/akif/projeler` (`ProjeKarti`: WhatsApp/Akif ile oluşturulan kartlar, revizyon geçmişiyle).
- Mevcut Akif bileşenleri (`AkifChat`, `AkifMessageBubble`, `AkifScenarioCard`, `AkifAssumptionsBar`) yeni düzene taşınacak ya da yerini alacak; testleri güncellenir.

## 6. Tasarım

### 6.1 Veri: kalıcı sohbet (yeni)

Prisma'ya iki model (isimler öneridir; `AkifMessage` zaten TypeScript sözleşmesinde olduğu için tablo `AkifChatMessage`):

- `AkifConversation`: `id`, `userId` (cascade), `title`, `projectId?`/`projeKartiId?` (bağlı senaryo, opsiyonel), `createdAt`, `updatedAt`, `lastMessageAt`; indeks `(userId, lastMessageAt)`.
- `AkifChatMessage`: `id`, `conversationId` (cascade), `role` (`user`|`akif`), `content`, `turn Json?` (Akif yanıtının tam `AkifTurn`'ü, kartlar dahil), `channel` (`text`|`voice`), `createdAt`; indeks `(conversationId, createdAt)`.

Kaydetme, giriş yapmış kullanıcı için **sunucuda** yapılır: `POST /api/akif/turn` zaten `conversationId` alır; oturum varsa konuşmayı oluşturur/günceller, kullanıcı mesajını ve Akif yanıtını yazar (istemci ayrıca kaydetmez, çift yazma olmaz). Başlık ilk kullanıcı mesajından türetilir (ilk ~40 karakter, **benim kararım**; LLM ile başlık üretmek maliyet ekler, sonraya bırakılır). Kullanıcı yeniden adlandırabilir.

Ses oturumu bitince istemci transkripti `POST /api/akif/conversations/[id]/voice-transcript` ile yollar; sunucu `channel='voice'` mesajlar olarak yazar. Ses oturumları şu an metin turlarından bağımsız; yeni sohbetin içinde başlatılırsa o sohbete eklenir.

Uç noktalar (hepsi oturum zorunlu, yalnız kendi kayıtları): `GET /api/akif/conversations?q=` (liste + arama), `GET /api/akif/conversations/[id]` (mesajlar), `PATCH` (başlık), `DELETE`. Arama: başlık + mesaj içeriği üzerinde büyük/küçük harf ve Türkçe karakter duyarsız eşleşme (basit `ILIKE` yeterli; tam metin indeksi sonraya).

Misafir (girişsiz) kullanıcı: bugünkü gibi çalışır, sohbet yalnız sayfa açıkken bellekte durur; kenar çubuğunda "Sohbetlerini kaydetmek için giriş yap" bandı görünür (**benim kararım**).

### 6.2 Kenar çubuğu

Yukarıdan aşağı: "Yeni sohbet" düğmesi · "Sohbetlerde ara" alanı (yazdıkça süzer, 250 ms bekleme) · **Senaryolarım** (amber noktalı satırlar) · sohbet geçmişi tarih gruplarıyla · altta kullanıcı kartı (ad, Profil'e bağlantı).

**Senaryolarım**, kayıtlı site projelerini/senaryolarını (`/api/projects`) **ve** Akif/WhatsApp ile oluşturulan proje kartlarını (`/api/akif/projeler`) tek listede gösterir; satırda ad ve kısa özet (konum · alan · pay). Kaynaklar birbirinden küçük bir etiketle ayrılır. Bir senaryoya tıklamak o sohbeti ona bağlar (`projectId`/kart bağlamı Akif'e gider) ve paneli o senaryonun değerleriyle doldurur. Bir senaryoyu yazarak ya da konuşarak yeniden ele almak isteyen kullanıcının ana yolu budur.

Sohbet satırında üç nokta menüsü: yeniden adlandır, sil (onaylı). Sürüm: 15+ sohbette "Daha fazla göster".

Mobil (<900 px): kenar çubuğu soldan açılan çekmece; üst çubukta menü düğmesi, sohbet başlığı, "Sesli".

### 6.3 Ortadaki sohbet

Üst çubuk: sohbet başlığı (tıklayınca yeniden adlandır) + "Sesli konuş". Mesajlar: kullanıcı sağda yeşilimsi balon, Akif solda avatarla; sonuç kartları (`AkifScenarioCard`, parsel kartı, terim kartı) mesajın altında; `needs_confirmation` ve hızlı yanıt çipleri mevcut davranışla. Altta yuvarlak mesaj çubuğu: yazı, mikrofon (sesi başlatır), gönder. Boş sohbet: üç öneri sorusu (bugünkü öneriler korunur) ve kısa bir tanıtım cümlesi. Mevcut "Akif Usta / Kat karşılığı danışmanı" başlığı üst çubukta küçülür.

### 6.4 Çalışma paneli (sağ)

"Senaryo" bölümü: konum, alan, m² fiyatı, (varsa) emsal notu; "Arsa payı" bölümü: arsa sahibi / müteahhit yüzdeleri çubukla; "Varsayımlar" listesi (`assumptions`, `defaultsUsed`). Veri kaynağı: o sohbetteki **son** `tool_result` ve `AkifTurn`'ler (parsel kartı → konum, alan, ₺/m²; senaryo kartı → pay satırları). Ses modunda `voiceToolBridge`'den gelen kartlar aynı yolla panele işlenir.

Değişiklik vurgusu: bir alan önceki değerden farklıysa eski → yeni biçimde (`%46 → %50`) amber zemin ~1,5 sn gösterilir, sonra sakinleşir. "Rapor oluştur" düğmesi paneli `/hesapla` girdileriyle açar (alanlar aktarılır; ayrıntı builder'a bırakıldı). Panelde değer düzenleme (örneğin payı elle değiştirme) **ilk sürümde yok**: panel yalnız gösterir; değiştirmek için Akif'e söylenir ya da yazılır.

Boş durum: "Bir arsa söyle, burada değerleri göreceksin" ve gri yer tutucu satırlar. Geniş ekranda (≥1280 px) sabit; 900–1280 px arasında katlanır (düğmeyle açılır); mobilde sohbetin üstünde "Senaryo" çipi, dokununca alt sayfa.

### 6.5 Sesli konuş (A yönü)

"Sesli konuş" (üst çubuk ya da mikrofon) sohbet alanını ses görünümüne çevirir: ortada küre (durum: bağlanıyor / dinliyorum / Akif konuşuyor, süreölçer), küre çevresinde sakin, nabız atan halkalar (**parlama/bulanık ışık yok**), altında canlı transkript (kullanıcı koyu, Akif ikincil), "Bitir" ve "Metne dön". Kenar çubuğu ve panel yerinde kalır; panel konuşma boyunca canlı güncellenir. `useRealtimeVoice`'in mevcut onay akışı (`AkifActionConfirmCard`: "senaryoyu kaydet") ses görünümünün içinde, transkriptin altında yer alır. Bitince transkript sohbete mesaj olarak eklenir ve görünüm sohbete döner.

### 6.6 Görsel dil

Ana sayfada kurulan Arazi tokenları (`tokens-arazi.css`, `--ink`, `--surface`, `--amber`, `--blue`, `--ok`), Inter, mevcut `Button`/`Chip`/`SegmentedControl` bileşenleri. Hareket: yeni mesaj hafifçe süzülerek gelir, panel değişim vurgusu, kenar çubuğu çekmecesi; `prefers-reduced-motion`'da hepsi kapalı. Koyu tema ve mobil (390 px) her ekran için kontrol edilir. Emoji yok; ikonlar `src/components/icons` içinden (zil yok).

## 7. Kısıtlar

- Giriş yapmamış kullanıcı akışı bozulmaz. Mevcut rate-limit, maliyet bütçesi ve denetim günlüğü aynen kalır.
- Kişisel veri: sohbetler yalnız sahibine açık; hesap silinince cascade; kullanıcı sohbeti silebilir (kalıcı silme).
- Yeni tablolar için migration + `prisma generate`; mevcut 28+ migration'a dokunulmaz.
- Test: yeni uç noktalar için yetki (başkasının sohbeti 404), arama, silme testleri; arayüz için mevcut Akif testlerinin güncellenmesi; gerçek tarayıcıda masaüstü/mobil, açık/koyu görsel doğrulama.

## 8. Builder'a bırakılanlar

Prisma alan adları ve indeks ayrıntıları; arama sorgusunun yazımı; kenar çubuğu/çekmece bileşen ayrımı ve durum yönetimi; panel durumunun turlardan türetilme şekli; "Rapor oluştur"un `/hesapla`'ya tam eşlemesi; "Daha fazla göster" sayfalama biçimi; başlık yeniden adlandırma etkileşimi.

## 9. Sonraya (bu işin dışında)

LLM ile sohbet başlığı üretme; panelde değer düzenleme; sohbet paylaşma/dışa aktarma; WhatsApp mesaj geçmişini birleştirme; tam metin arama indeksi.

## 10. Netleştirilenler (bağımsız okuyucu kontrolünden sonra)

Aşağıdakilerin hepsi **builder'ın sorduğu, benim karara bağladığım** noktalardır (Emre onayında göz atılmalı):

1. **Panel türetilir, ayrı saklanmaz.** Panel durumu, sohbetin saklı `turn` JSON'larından (ve ses kartlarından) bir indirgeyici (reducer) ile **yükleme anında** hesaplanır; ayrı bir "çalışma alanı" tablosu yok. "Eski → yeni" vurgusu yalnız **canlı** değişimde (bu oturumda gelen yeni tur/kart) çıkar; geçmiş bir sohbet açılınca vurgu yok, yalnız son değerler görünür.
2. **Senaryo tıklama davranışı.** `POST /api/akif/turn` bugün `projectId` kabul ediyor ve sahipliği doğruluyor (yalnız site `Project`'leri için, orkestrasyona dokunmadan). Bu yüzden:
   - **Site projesi** tıklanınca: sohbet boşsa o sohbete bağlanır, doluysa yeni sohbet açılıp bağlanır; sonraki turlar `projectId` ile gider; panel projenin son senaryosunun değerlerini (ad, alan, arsa payı, varsa ₺/m²) gösterir, olmayan alan "—" kalır.
   - **Akif/WhatsApp proje kartı (`ProjeKarti`)** tıklanınca: tur API'si bu türü tanımadığı için orkestrasyona dokunulmaz. Panel kartın `inputs`/`result` değerleriyle dolar; yazı kutusuna "<ad> senaryosunu güncelleyelim:" taslağı konur, kullanıcı gönderirse Akif konuşmayı serbest metinden sürdürür. (Tur API'sine kart desteği eklemek ayrı bir iş, §9.)
3. **Ses transkripti.** Sohbet kimliğini istemci üretir (bugünkü gibi `makeId`); sunucu ilk yazımda `conversationId` ile sohbeti **oluşturur** (başkasına ait bir kimlikle gelirse 409, istemci yeni kimlik üretir). Ses oturumu bitince (ya da sekme kapanırken `sendBeacon` ile) transkript `POST /api/akif/conversations/[id]/voice-transcript` ile yazılır; sohbet yoksa bu uç da oluşturur. Mesajların ses kartı için `AkifChatMessage`'a ayrıca `card Json?` alanı konur (`turn` yalnız metin turları için). Bağlantı koparsa kaydedilmemiş transkript kaybolabilir; kabul edilir.
4. **Misafir → giriş.** Giriş yapılınca misafir sohbeti taşınmaz, düşer (sade olan; taşıma ayrı uç noktası ister).
5. **Oluşturma zamanı ve hata.** İlk metin turunda sunucu, istemcinin yolladığı `conversationId` ile sohbeti upsert eder; yanıt sözleşmesi değişmez. Başarısız tur (429/503/hata) **kaydedilmez** (ne kullanıcı mesajı ne yanıt); kullanıcı yeniden dener.
6. **Arama.** Düz `ILIKE` Türkçe `ı/İ` ve aksanları katlamaz. `AkifConversation` ve `AkifChatMessage`'a normalize edilmiş bir `searchText` sütunu eklenir (küçük harf + ASCII katlama, TercihRadar'daki "Türkçe arama" yaklaşımıyla aynı); sorgu da aynı biçimde normalize edilip `contains` ile aranır. Postgres eklentisi gerekmez.
