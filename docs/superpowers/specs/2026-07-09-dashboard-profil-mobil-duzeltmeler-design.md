# Dashboard/Profil — Canlı Test Sonrası Mobil Düzeltmeler

**Tarih:** 2026-07-09
**Durum:** Onaylandı (kullanıcı diyaloğu ile)
**Kapsam:** `src/app/dashboard/profile/page.tsx` + `profile.module.css` (yalnızca mobil) ve `src/app/dashboard/dashboard.module.css` (yalnızca mobil, `/dashboard` altındaki tüm sayfaları etkiler). Aynı branch üzerinde devam: `feature/dashboard-profil-mobil-ux` (önceki 4 task'lık plan zaten bu branch'te tamamlandı, henüz merge edilmedi).

---

## 1. Problem Teşhisi

Önceki plan (`2026-07-08-dashboard-profil-mobil-ux.md`) tamamlandıktan sonra kullanıcı canlı ortamda sayfayı kullanırken 3 gerçek sorun buldu:

1. **Çift "Profilim" başlığı** — `AppBar`'ın `title="Profilim"` prop'u ile hemen altındaki `<h1 className={styles.pageTitle}>Profilim</h1>` aynı anda render oluyor (`page.tsx:183,188`), aynı metin iki kez görünüyor.

2. **AppBar geri butonu kayboluyor** — Kök neden Playwright ile canlı ölçülerek doğrulandı: `dashboard/layout.tsx`'in `<main className={styles.mainContent}>` sarmalayıcısı (`dashboard.module.css:140-149`) `backdrop-filter: blur(16px)` taşıyor. CSS spesifikasyonunda `backdrop-filter` (tıpkı `transform`/`filter`/`will-change` gibi) ardılları için yeni bir **containing block** oluşturur; bu da içindeki `position: sticky` elemanların referans noktasını gerçek viewport yerine bu bloğa kaydırır. Ölçüm: `.mainContent`'in kendisi hiç kaymıyor (`scrollTop` her zaman `0`, `scrollHeight === clientHeight`) — asıl kayan pencere/`document`. Sonuç: `AppBar`'ın `position:sticky;top:0`'ı etkisiz kalıyor, sayfa kaydırıldığında `AppBar` viewport dışına çıkıyor (ölçülen: `y:-278px`, tamamen görünmez). Bu, `/dashboard/*` altında `AppBar` kullanan **ilk** sayfa (`dashboard/profile`) olduğu için önceki hiçbir işte ortaya çıkmamış bir mimari çelişki — `inbox` ve `listing/[id]` bu `dashboard/layout` sarmalayıcısının dışında oldukları için sorunu hiç yaşamamışlar.

3. **Hakkında/LinkedIn/Website her zaman düzenlenebilir form** — Instagram'da olduğu gibi varsayılan görünüm salt-okunur olmalı; şu anki hep-açık form + hep aynı görünen "Kaydet" butonu, kullanıcıda "kaydetmiyor mu" hissi yaratıyor (kod aslında `handleSave`'de başarıyla kaydediyor ve 2sn "✓ Kaydedildi" gösteriyor, ama form hep açık kaldığı için bu geri bildirim fark edilmiyor).

## 2. Kapsam Kararları (kullanıcı onaylı)

- **Sorun 2 (backdrop-filter):** `dashboard.module.css`'teki `.mainContent`'in `backdrop-filter`'ı **mobilde (`@media max-width:768px`) tüm `/dashboard/*` sayfaları için** kaldırılır (sadece profile için izole bir çözüm değil) — sidebar zaten mobilde `display:none` olduğu için görsel fark sınırlı olacak, ve gelecekte başka bir `/dashboard/*` sayfası `AppBar` kullanmak isterse aynı hataya düşülmeyecek. Masaüstü hiç değişmez.
- **Sorun 3 (görünüm/düzenleme ayrımı):** Tek bir kalem ikonu (isim/rol bloğunun yanında) — basılınca Hakkında + LinkedIn + Website + Kaydet/İptal birlikte düzenleme moduna geçer (Instagram'ın "Profili Düzenle" mantığı, alan bazlı değil). **Yalnızca mobil** — masaüstü sol profil kartı hiç değişmez, form her zaman açık kalır (mevcut davranış).

## 3. Tasarım

### 3.1 Çift başlık düzeltmesi

`<h1 className={styles.pageTitle}>Profilim</h1>` (`page.tsx:188`) tamamen kaldırılır — `AppBar`'ın `title="Profilim"` prop'u zaten bu işi görüyor. `.pageTitle` CSS class'ı kullanılmaz hale gelirse (başka yerde referans yoksa) `profile.module.css`'ten de silinir.

**Not:** Bu satırın kaldırılması masaüstünü de etkiler (aynı JSX paylaşılıyor, `AppBar` zaten masaüstünde `display:none`) — masaüstünde "Profilim" başlığı bu değişiklikten sonra sadece `pageTitle`'dan kalkacak, ki `AppBar` orada zaten görünmediği için masaüstünde başlık **tamamen kaybolmuş** olur. Bu istenmiyor. Çözüm: `pageTitle` masaüstünde kalmalı, sadece mobilde (AppBar zaten başlığı gösterdiği için) gizlenmeli — `h1`'i silmek yerine `profile.module.css`'e mobil media query içinde `.pageTitle { display: none; }` eklenir (masaüstü dokunulmaz, mobilde çift görünüm biter).

### 3.2 AppBar sticky düzeltmesi

`dashboard.module.css`'e **yeni** bir `@media (max-width: 768px)` bloğu eklenir (dosyadaki mevcut tek media query `@media (max-width: 900px)` — sidebar çöküşü için, farklı bir amaç; karıştırılmaz çünkü `AppBar` zaten yalnızca ≤768px'te görünür, bu yüzden düzeltme de tam o eşikte olmalı):

```css
.mainContent {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
```

Masaüstü (`.mainContent`'in temel tanımı) dokunulmaz.

### 3.3 Görünüm/Düzenleme ayrımı (yalnızca mobil)

Yeni state: `isEditingProfile: boolean` (varsayılan `false` = görünüm modu).

**Görünüm modu (varsayılan):** Ad Soyad + rol etiketi + doğrulama rozetinin yanında/altında tek bir kalem butonu; altında Hakkında/LinkedIn/Website **salt-okunur metin** olarak gösterilir (boşsa "Henüz bilgi eklenmedi" gibi bir placeholder metni — LinkedIn/Website doluysa tıklanabilir link olarak render edilir).

**Düzenleme modu:** Kaleme basılınca mevcut form (textarea + 2 input + Kaydet) açılır, yanına **İptal** butonu eklenir. İptal, `bio`/`linkedin`/`website` state'lerini son kaydedilmiş `profile` değerlerine geri döndürür ve görünüm moduna döner (kaydedilmemiş taslak kaybolur — beklenen davranış). Kaydet başarılı olduğunda `isEditingProfile` otomatik `false` olur — kullanıcı hemen güncellenmiş salt-okunur değerleri görür, bu da eski 2 saniyelik "✓ Kaydedildi" yanıp-sönmesinden çok daha güçlü bir "kaydedildi" sinyali verir (o mekanizma dokunulmadan kalır, sadece artık mobilde görünmeyecek çünkü form kapanıyor).

**Teknik uygulama:** Görünüm bloğu ve form JSX'i **ikisi de her zaman render edilir** (JSX koşulu değil), görünürlük mobilde `data-profile-edit="true"|"false"` attribute'u ile CSS attribute-selector gate'iyle kontrol edilir — bu planın önceki task'larında kurulan `data-mobile-section` deseniyle birebir aynı teknik. Masaüstünde her iki CSS kuralı da devre dışı (media query dışında) — form her zaman `display:` temel değerinde (görünür), yeni görünüm-bloğu `display:none` temel değerinde (hiç görünmez) — yani masaüstü kodu hiç değişmemiş gibi davranır.

```css
/* temel (masaüstü) */
.profileViewBlock { display: none; }

@media (max-width: 768px) {
  .container[data-profile-edit="false"] .profileEditForm { display: none; }
  .container[data-profile-edit="true"] .profileViewBlock { display: none; }
  .profileViewBlock { display: block; } /* mobilde varsayılan görünür (false gate'i açık) */
}
```

## 4. Test/Doğrulama Stratejisi

- Jest: `profileStyles.scope.test.ts`'e yeni guard testleri — `.mainContent`'in backdrop-filter override'ı `dashboard.module.css`'in mobil media query'si içinde mi (yeni bir `dashboardStyles.scope.test.ts` veya mevcut dosyaya ek), `.profileViewBlock`/`.profileEditForm` gate kuralları doğru scope'lu mu, `.pageTitle` mobilde `display:none` mi.
- Gerçek Playwright (bu oturumda zaten kanıtlanmış yöntem — login + mobil viewport): AppBar artık scroll sırasında viewport'ta kalıyor mu (bounding box y ≥ 0 kontrolü), tek "Profilim" başlığı var mı, kalem ikonuna basınca form açılıyor/İptal ile kapanıyor mu, Kaydet sonrası görünüm moduna dönüyor mu ve yeni değer görünüyor mu.
- Masaüstü ekran görüntüsü karşılaştırması — özellikle §3.1'in "masaüstünde pageTitle kalmalı" kararı ve §3.3'ün "masaüstünde form hep açık kalmalı" kararı için regresyon guard'ı.

## 5. Riskler

- `.mainContent`'in backdrop-filter'ının mobilde kaldırılması `/dashboard/*` altındaki DİĞER sayfaları (raporlar, projeler, ana dashboard) da görsel olarak etkiler — kullanıcı bunu bilerek onayladı (§2).
- Görünüm/düzenleme geçişinde İptal'in state reset mantığı hatalıysa (profile'dan değil, boş string'den resetlerse) kullanıcı kaydedilmiş verisini "kaybolmuş" sanabilir — plan aşamasında açıkça `profile?.bio ?? ''` gibi kaynak belirtilecek.
- `pageTitle` masaüstünde kalmaya devam ettiği için CSS class'ı silinmiyor, sadece mobil override ekleniyor — "kullanılmayan class" riski yok.

## 6. Kapsam Dışı

- Masaüstü sol profil kartının görünüm/düzenleme ayrımına geçmesi (kullanıcı kararıyla mobil-only).
- Ad Soyad'ın (`session.user.name`) düzenlenebilir hale getirilmesi — şu an zaten düzenlenemiyor, bu işin kapsamında da değil.
- Avatar rozeti/menü listesi/Çıkış Yap konumu — önceki plan zaten hallettti, bu işte tekrar dokunulmuyor.

## 7. Sonraki Adım

`writing-plans` skill'i ile implementasyon planı (`docs/superpowers/plans/`) oluşturulacak, aynı branch (`feature/dashboard-profil-mobil-ux`) üzerinde `subagent-driven-development` ile uygulanacak.
