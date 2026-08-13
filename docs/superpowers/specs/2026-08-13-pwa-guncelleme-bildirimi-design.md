# PWA Güncelleme Bildirimi — Tasarım

## Amaç

Uygulama yeni bir sürüme deploy edildiğinde, service worker arka planda
sessizce yeni sürümü indirip devreye alıyor ve sayfayı kullanıcı fark
etmeden (sekme gizlenince) yeniliyor. Bu görünmezlik, kullanıcının "hâlâ
eski sürümü mü görüyorum?" belirsizliğine düşmesine yol açıyor. Amaç: yeni
bir sürüm hazır olduğunda kullanıcıya görünür, kontrollü bir bildirim
göstermek ve güncellemeyi onun onayıyla tetiklemek.

**Not:** Bugünkü oturumda yaşanan "hâlâ eski görünüyor" anlarının kök
nedeni aslında tamamlanmamış deploy'lardı, SW cache'i değildi — ama bu
özellik gelecekteki gerçek SW-mantığı değişiklikleri ve uzun süre açık
kalan sekmeler için kalıcı bir değer taşıyor.

## Mevcut Durum

`public/sw.js`: `install` olayında `self.skipWaiting()` çağrılıyor — yeni
SW, eski istemciler hâlâ açıkken bile HEMEN devreye giriyor. `activate`
olayında eski cache'ler otomatik siliniyor (`CACHE_NAME` dışındaki tüm
cache'ler). `ServiceWorkerRegister.tsx`: saatlik + sekme-odaklanınca
otomatik `registration.update()` çağrısı yapıyor, `controllerchange`
olayında sayfayı ya hemen (sekme gizliyse) ya da sekme gizlenene kadar
bekleyip yeniliyor. Tüm bu mekanizma ÇALIŞIYOR ama tamamen sessiz —
kullanıcıya hiçbir görsel geri bildirim yok.

## Mimari Değişiklik

`self.skipWaiting()` `install` olayından KALDIRILIR. Yeni SW artık
`waiting` durumuna geçer ve orada kalır — tarayıcının standart davranışı.
SW'ye bir `message` dinleyicisi eklenir: `SKIP_WAITING` mesajı gelince
`self.skipWaiting()` çağrılır. `activate` (cache temizleme) davranışı
DEĞİŞMEZ.

Bu, "arka planda sessiz zorla güncelleme" modelinden "hazır, kullanıcı
onayıyla güncelle" modeline geçiş — endüstri standardı PWA update pattern'i.

## Bileşenler

### `src/lib/pwa/usePwaUpdate.ts` (yeni hook)

```ts
export function usePwaUpdate(): { updateAvailable: boolean; applyUpdate: () => void }
```

- Mount'ta `navigator.serviceWorker.getRegistration()` ile mevcut
  registration'ı okur (YENİDEN register ETMEZ — `ServiceWorkerRegister`
  zaten register etmiş olur, tarayıcı aynı script URL'i için tek bir
  registration paylaşır).
- Zaten bir `registration.waiting` worker varsa (sayfa açıldığında önceden
  bulunmuş bir güncelleme) `updateAvailable=true` ile başlar.
- `registration.addEventListener('updatefound', ...)` ile yeni worker'ı
  izler; `newWorker.state === 'installed' && navigator.serviceWorker.controller`
  olduğunda (yani bu İLK kurulum değil, MEVCUT bir controller'ın üstüne
  gelen bir güncelleme) `updateAvailable=true` yapar. İlk kurulumda
  (`controller` henüz yokken) banner GÖSTERİLMEZ.
- `applyUpdate()`: `registration.waiting?.postMessage({ type: 'SKIP_WAITING' })`
  gönderir, `navigator.serviceWorker.addEventListener('controllerchange', ...)`
  ile bir kerelik dinleyici kurar, tetiklenince `window.location.reload()`
  çağırır.

### `src/components/pwa/UpdateBanner.tsx` (yeni bileşen)

`usePwaUpdate()`'i kullanır, `updateAvailable` false ise `null` döner.
True ise `InstallPrompt.tsx` ile aynı görsel dili kullanan (panel/blur/
rounded, `var(--panel)`/`var(--border)`/`var(--primary)` token'ları) ama
daha sade tek-satır bir banner: "🔄 Yeni bir sürüm mevcut" metni + "Güncelle"
butonu + kapat (✕) butonu. Kapatma yalnızca bu banner'ı gizler (`InstallPrompt`
gibi kalıcı `localStorage` bayrağı YOK — her yeni güncelleme kendi başına
yeni bir olay, kullanıcı bir öncekini kapatmış olsa bile bir sonrakini
görmeli). `layout.tsx`'e `InstallPrompt`'un yanına eklenir.

### `src/components/pwa/ServiceWorkerRegister.tsx` (değişiklik)

Mevcut register + saatlik/görünürlük-tetiklemeli `update()` çağrıları
DEĞİŞMEDEN kalır. Mevcut `controllerchange` → "sekme gizlenince yenile"
mantığı da KALIR — ama artık yalnızca ŞU senaryo için devrede: kullanıcı
`UpdateBanner`'dan güncellemeyi tetiklemedi ama BAŞKA bir sekmede
tetiklendi (`controllerchange` her açık sekmede ateşlenir). O sekmeler
için hâlâ nazik "gizlenince yenile" davranışı doğru — kullanıcı o an o
sekmede aktif çalışıyor olabilir.

## Kullanıcı Deneyimi Akışı

1. Yeni bir sürüm deploy edilir, `public/sw.js` içeriği değişir (SW
   mantığı değiştiği zaman) VEYA kullanıcı saatlik/görünürlük kontrolünde
   yeni bir SW versiyonu bulunur.
2. Yeni SW indirilir, `waiting` durumuna geçer.
3. `UpdateBanner` görünür: "🔄 Yeni bir sürüm mevcut — Güncelle".
4. Kullanıcı "Güncelle"ye dokunursa: `SKIP_WAITING` mesajı gönderilir →
   yeni SW devreye girer → eski cache'ler silinir (`activate`) →
   `controllerchange` → sayfa hemen yenilenir → kullanıcı yeni sürümü görür.
5. Kullanıcı banner'ı kapatırsa veya hiç dokunmazsa: mevcut sürümle
   çalışmaya devam eder, sekme gizlenince (mevcut mekanizma) otomatik
   güncellenir.

## Kenar Durumları

- **İlk kurulum:** `controller` yokken banner gösterilmez (yeni kullanıcı
  için "güncelleme" kavramı anlamsız).
- **Sayfa açılışında zaten bekleyen güncelleme:** anında yakalanır (mount
  zamanında `registration.waiting` kontrolü).
- **Çoklu sekme:** yalnızca güncellemeyi tetikleyen sekme banner'dan
  reload olur; diğer açık sekmeler mevcut "gizlenince yenile" mekanizmasıyla
  devam eder (ek karmaşıklık eklenmez).
- **PWA olarak yüklenmemiş (normal tarayıcı sekmesi):** banner yine de
  gösterilir — SW her ziyaretçi için kayıtlı, standalone moduyla sınırlı
  değil.

## Test Stratejisi

- `usePwaUpdate.test.ts`: `navigator.serviceWorker` mock'lanır — (a) ilk
  kurulumda (controller yok) `updateAvailable` false kalır; (b) mevcut
  controller varken `waiting` worker tespit edilince `updateAvailable`
  true olur; (c) mount anında zaten `registration.waiting` varsa hemen
  true döner; (d) `applyUpdate()` çağrılınca `postMessage({type:'SKIP_WAITING'})`
  gönderilir ve `controllerchange` sonrası `reload()` çağrılır.
- `UpdateBanner.test.tsx`: `usePwaUpdate` mock'lanır — `updateAvailable`
  false iken hiçbir şey render edilmez; true iken banner+buton görünür;
  butona tıklanınca `applyUpdate` çağrılır; kapat butonuna tıklanınca
  banner kaybolur.
- `public/sw.js`'in kendisi (skipWaiting kaldırma, message listener) Jest
  ile test edilemez (tarayıcı SW API'si) — projenin mevcut deseninde
  olduğu gibi (`chunkErrorReload` emsali) kod incelemesi + varsa Playwright
  ile manuel doğrulanır, gerçek çok-sekmeli/gerçek-deploy senaryosu
  kullanıcının kendi cihazında teyit edilmeli (dürüstlük notu: Playwright
  gerçek bir SW `waiting`→`skipWaiting` döngüsünü güvenilir şekilde simüle
  edemez, bu proje boyunca tekrarlanan bir sınırlama).

## Kapsam Dışı

- Grup D (PWA anasayfa tasarım sorunu) — ayrı, bilinçli olarak ertelendi.
- Güncelleme sıklığı/agresifliğinin ayarlanabilir olması — mevcut saatlik+
  görünürlük-tetiklemeli kontrol yeterli, değiştirilmiyor.
- Push notification / native bildirim — kapsam dışı, yalnızca uygulama-içi
  banner.
