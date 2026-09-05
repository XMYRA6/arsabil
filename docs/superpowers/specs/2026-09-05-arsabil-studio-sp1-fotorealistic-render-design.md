# Arsabil Studio — SP1: Fotogerçekçi Render Katmanı Design Spec

> **İlişkili:** `2026-08-23-arsabil-studio-vitrin-3d-gorsel-zenginlestirme-design.md`'nin (Vitrin — Three.js WebGL, prosedürel cephe, PBR+HDRI, "inandırıcı gerçekçi" ama fotogerçekçi DEĞİL) devamıdır; Vitrin sahnesini DEĞİŞTİRMEZ, üzerine yeni bir üretim/sunum katmanı ekler. Bu spec, "Arsabil Studio" büyük vizyonunun 4 parçaya bölünen ilk parçasıdır (SP1→SP2 tasarım öneri motoru→SP3 cephe/malzeme çeşitliliği→SP4 iç mimari, sırasıyla). SP2-4 bu spec'in kapsamı DIŞINDADIR, ayrı brainstorming turlarında ele alınacak.

## Product Decision

Mevcut Vitrin, kütle/fizibilite verisini "inandırıcı gerçekçi" tarayıcı-içi WebGL kalitesinde gösteriyor ama gerçek fotoğraf hissi vermiyor. Hedef: aynı kütle + parsel geometrisinden, **o binanın o arsadaki fotogerçekçi bir görüntüsünü** üretmek — rakip `rayon.design` benzeri bir "wow" katmanı, ArsaBil'in **birincil hedefi C (dönüşüm kancası)**: hassas bir pro araç değil, "gir-gör-etkilen" akışını güçlendiren görsel güç.

Bu katman kesinlikle fizibilite/emsal hesabı YAPMAZ — Vitrin'in kurduğu ilkeyi (§Mimari, "değişmeyen ilke") aynen devralır: yalnızca zaten var olan kütleyi görselleştirir.

## Core User Story

> "Arsamı kaydettim, kütleyi/malzemeyi Vitrin'de ayarladım. Şimdi bu binanın gerçek bir fotoğrafmış gibi görünen halini görmek istiyorum — ortağıma/arsa sahibine gösterip etkilemek için."

## Kapsam

**Bu spec kapsar:**
- Vitrin sahnesinden (mevcut WebGL kütle + malzeme) tek bir fotogerçekçi görsel üreten uçtan uca akış
- Üretim yöntemi: ekran görüntüsü + derinlik haritası → img2img + ControlNet (geometriye sadık)
- Maliyet modeli: hibrit — WebGL önizleme ücretsiz, fotogerçekçi üretim premium'a özel, kullanıcı-özel cache
- Kalite hedefi: "prosedürelden bariz iyi", dergi/V-Ray kalitesi hedeflenmiyor

**Bu spec kapsam DIŞI bırakır:**
- Otomatik kütle/tasarım önerisi (SP2) — bu spec ELLE ayarlanmış kütleyi görselleştirir, yeni bir öneri motoru İÇERMEZ
- Cephe/malzeme preset çeşitliliği (SP3) — mevcut Vitrin malzeme seçimi neyse onu kullanır, yeni preset eklemez
- İç mimari (SP4)
- Cache'in kullanıcılar arası paylaşımı — MVP'de kullanıcı-özel, paylaşım bilinçli olarak SONRAYA bırakıldı
- Görsel depolama sağlayıcısının kesin seçimi (Docker volume vs. R2 vb.) — teknik uygulama detayı, implementasyon planında netleşir

## Mimari

**Değişmeyen ilke (Vitrin'den devralınan):** 3D renderer/render katmanı hiçbir fizibilite/emsal/teklif hesabı yapmaz; yalnızca zaten hesaplanmış/görselleştirilmiş kütleyi fotogerçekçi bir görüntüye çevirir.

**Uçtan uca akış:**

```
Vitrin (StudioVitrinScene, mevcut, DEĞİŞMEZ)
  → [YENİ] canvas screenshot (renkli) + depth buffer görüntüsü (Three.js'in kendi derinlik verisinden)
  → [YENİ] POST /api/studio/render (premium yetki kontrolü)
       → cache lookup (hash: arsaId + kütle parametreleri + malzeme + kamera açısı, kullanıcı-özel)
       → cache hit → kayıtlı görsel URL döner
       → cache miss → img2img+ControlNet sağlayıcı çağrısı (fal.ai/Replicate üzerinde SD/Flux)
           → başarı → görsel depolanır, cache'e yazılır, URL döner
           → hata → kullanıcıya yeniden dene seçeneği, kredi düşülmez, cache yazılmaz
  → Frontend: canlı bekleme ekranı (senkron, ~5-15sn) → sonuç overlay
```

**Derinlik haritası neden bedava:** Vitrin zaten gerçek bir 3D sahne olduğu için, ControlNet'in en sadık koşullama sinyali olan depth map'i ayrı bir 3D modelleme adımına gerek kalmadan doğrudan Three.js'in render pipeline'ından çıkarabiliyoruz. Bu, üretim yönteminin (img2img+ControlNet) geometri sadakatini (kullanıcının gerçek kütlesine sadık kalma) garanti eden temel mekanizma.

## Bileşenler

**Backend:**
- `POST /api/studio/render` — premium yetki kontrolü → cache lookup → (miss ise) sağlayıcı çağrısı → depolama → cache yazımı → URL döner
- `render_cache` tablosu — key: `hash(userId + arsaId + kütleParametreleri + malzemeSeçimi + kameraAçısı)`, değer: görsel URL + oluşturulma tarihi
- Aylık bütçe tavanı kontrolü (`RENDER_BUDGET_USD`) — aşılırsa buton geçici devre dışı, kullanıcıya "şu an kullanılamıyor" mesajı (sert kesme, otomatik)

**Frontend (Vitrin'e eklenen):**
- "Fotogerçekçi Görsel" butonu (yalnızca premium kullanıcıya görünür) — screenshot + depth map çıkarımını tetikler, `/api/studio/render`'a yollar
- Canlı bekleme ekranı (senkron loading state, ~5-15sn) — kullanıcı sayfada kalır, ilerleme animasyonu gösterilir
- Sonuç overlay/modal — üretilen görsel

**Showcase (herkese açık, ayrı, statik):**
- Ana sayfa/pazarlama alanında sabit demo fotogerçekçi örnekler — bu API'yi TETİKLEMEZ, bu spec'in üretim akışından bağımsız statik içerik. Amaç: ücretsiz ziyaretçiye "premium'da senin arsan için de bunu üretiyoruz" mesajını vermek, wow-etkisini pazarlama aracı olarak korumak.

## Erişim ve Maliyet Modeli

| Katman | Erişim | Maliyet |
|---|---|---|
| WebGL önizleme (Vitrin) | Herkese açık | Ücretsiz (mevcut, değişmez) |
| Showcase demo örnekleri | Herkese açık | Ücretsiz, statik, API tetiklemez |
| Fotogerçekçi render (kendi arsası) | Yalnızca premium kullanıcı | Render-başı ~$0.02-0.05 (img2img+ControlNet, fal.ai/Replicate), aylık `RENDER_BUDGET_USD` tavanı |

Bu tercih bilinçli bir gerilim çözümü: birincil hedef (C — herkese açık dönüşüm kancası) ile maliyet kontrolü arasında, showcase demo örnekleri wow-etkisini pazarlama tarafında tutarken, gerçek üretim maliyetini premium gelirine bağlıyor.

## Hata Yönetimi

- **Sağlayıcı hatası** (timeout, rate limit, içerik politikası reddi): kullanıcıya "render başarısız, tekrar dene"; premium kullanım hakkı/kredi düşülmez, cache kaydı oluşmaz
- **Bütçe tavanı aşımı:** buton geçici devre dışı, açık mesaj
- **Veri eksikse** (kütle/malzeme yoksa): buton zaten gösterilmez (Vitrin'in mevcut boş-durum deseniyle tutarlı)

## Test Stratejisi

- Hash determinizmi: aynı arsa+kütle+malzeme+kamera+kullanıcı → aynı cache key (saf fonksiyon, tam Jest kapsamı)
- Cache hit/miss davranışı (mock sağlayıcı ile)
- Premium yetki kontrolü (premium olmayan kullanıcı 403 alır, buton zaten gösterilmez ama API da bağımsız korunmalı)
- Sağlayıcı hata senaryosu → kredi/limit düşülmediğinin doğrulanması, cache yazılmadığının doğrulanması
- Depth map çıkarımının Vitrin sahnesinden doğru üretildiğinin doğrulanması (görsel/entegrasyon testi)
- Bütçe tavanı aşımında butonun devre dışı kaldığının doğrulanması

## Açık Kalan Teknik Kararlar (implementasyon planına bırakılan)

- Görsel depolama sağlayıcısı (Docker volume vs. Cloudflare R2 vb.) — VPS'te (168.231.106.19) şu an obje depolama yok
- img2img+ControlNet sağlayıcısının kesin seçimi (fal.ai vs. Replicate) ve model (SD vs. Flux) — fiyat/hız/kalite karşılaştırması implementasyon aşamasında yapılacak
- `RENDER_BUDGET_USD` tavanının tam değeri — Akif'teki (`project_akcaabatoto` benzeri Gemini görsel pipeline emsali) bütçe deseniyle tutarlı, kesin rakam implementasyon planında
