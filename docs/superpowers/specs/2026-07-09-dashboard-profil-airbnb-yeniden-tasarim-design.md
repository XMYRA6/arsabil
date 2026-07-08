# Dashboard/Profil — Airbnb Tarzı Yapısal Yeniden Tasarım

**Tarih:** 2026-07-09
**Durum:** Onaylandı (görsel mockup ile — kullanıcı "Harika yapalım" dedi)
**Kapsam:** `src/app/dashboard/profile/page.tsx` + `profile.module.css` — yalnızca mobil (`@media max-width:768px`). Masaüstü hiç değişmez. Aynı branch: `feature/dashboard-profil-mobil-ux`.

---

## 1. Arka Plan

Kullanıcı önceki oturumlarda yapılan mobil düzeltmeleri (menü listesi, görünüm/düzenleme ayrımı) "junior/noob" ve mevcut tasarıma fazla bağlı kalan yüzeysel yamalar olarak eleştirdi: *"popüler mobil uygulamalara bakıyorum, ciddi hatalarımız var, aynı tasarımı bozmadan hareket ediyorsun."* `ui-ux-pro-max` skill'i çağrıldı, ardından Airbnb'nin profil sekmesinden ilham alan, gerçek verilerle (Manual Check / USER / boş Hakkında-LinkedIn-Website) kurulan bir Artifact mockup'ı üretildi ve onaylandı.

Mockup URL (referans, kalıcı olmayabilir): `https://claude.ai/code/artifact/5e0e319f-4337-497d-a9c9-125a6de7d030`

## 2. Değişen Şey — Önceki Yapı vs Yeni Yapı

| Önceki (Plan 2, şimdi kaldırılıyor) | Yeni (bu plan) |
|---|---|
| Küçük 44-56px yatay menü satırları, tek bordürlü kutu içinde | Her biri kendi gölgesiyle **yüzen 76px kart**, ikon+başlık+alt-satır+sayaç |
| İsim yanında küçük kalem → salt-okunur Hakkında/LinkedIn/Website listesi | **Büyük hero**: 96px avatar + serif isim + rol/doğrulama alt satırı |
| "Henüz bilgi eklenmedi" boş-durum metinleri | **Tamamlanma kartı**: gerçek 0-100% yüzde + ilerleme çubuğu + "Profili tamamla" CTA (dolu alanlar için "Profilin tamam ✓") |
| Çıkış Yap, Ayarlar alt-ekranının içinde | Çıkış Yap, ana mobil ekranın en altında (Airbnb deseni), Ayarlar'dan kaldırılıyor |

**Değişmeyenler (dokunulmuyor):** `AppBar`+`data-mobile-section` ile alt-ekran açma/kapama mekanizması (Portfolyo/İlanlarım/Favorilerim/Ayarlar hâlâ aynı şekilde açılıyor), avatar fotoğraf yükleme (`handleAvatarUpload`, `avatarEditBadge`), `profileEditForm`'un kendisi (Hakkında/LinkedIn/Website inputları + Kaydet/İptal — sadece TETİKLENME şekli değişiyor: kalem yerine tamamlanma kartının CTA'sı), favoriler lazy-load, tema/e-posta tercihleri, masaüstü (`profileCard`/`tabPanel`/`tabs` birebir aynı kalıyor).

**Kaldırılan (dead code temizliği):** `.profileViewBlock`/`.viewField`/`.viewLabel`/`.viewValue`/`.viewLink` (Plan 2'de eklenmişti, zaten yalnızca mobil-only bir özellikti, tamamlanma kartı onun yerini alıyor — masaüstü hiç kullanmıyordu, güvenle silinebilir). `.nameRow` içindeki `.editProfileBtn` (kalem) mobilde artık gösterilmiyor (tamamlanma kartı tetikleyici oluyor) — component/CSS'i silinmez (masaüstünde zaten hep `display:none`'dı, JSX'te de kalabilir, kullanılmayan bir mobil-only buton haline gelir; kod temizliği için JSX'ten de kaldırılacak, bkz. Task 2).

## 3. Tasarım Detayları

### 3.1 Hero (avatar + isim)

- Mevcut TEK `avatarWrapper` elemanı korunur (yeni bir tane eklenmez — upload mantığı `fileInputRef`'e bağlı, çoğaltılamaz). Mobilde 80px→**96px** büyütülür (`.avatarWrapper`/`.avatarCircle`/img boyutları mobil media query'de override edilir).
- **Yeni mobil-only blok** `.heroName` — avatarWrapper'ın hemen altına, `.nameRow`'dan önce eklenir: serif font (`Georgia, "Iowan Old Style", "Palatino Linotype", serif` — proje şu an hiç serif kullanmıyor, bilinçli bir kontrast/sıcaklık kararı, mockup'ta onaylandı) ile büyük isim (`session.user?.name`), altında rol + "· ✓ Doğrulandı" (varsa) tek satırlık alt bilgi.
- Mevcut `.nameRow` (mockup öncesi eklenmiş, kalem içeren) mobilde **tamamen gizlenir** (`display:none` mobil media query içinde) — masaüstünde birebir aynı kalır (zaten oradaki tek isim/rol kaynağı). Mevcut `.verifiedBadge` pill'i de mobilde gizlenir (doğrulama bilgisi artık heroName'in alt satırında).

### 3.2 Tamamlanma Kartı (eski profileViewBlock'un yerine)

Yeni state yok — mevcut `avatarUrl`/`profile` state'lerinden türetilen bir **hesaplanmış değer**:

```
tamamlanan alan sayısı = [avatarUrl dolu mu, profile.bio dolu mu, profile.linkedin dolu mu, profile.website dolu mu] içinde true olanlar
completionPct = round(tamamlanan / 4 * 100)
```

- `completionPct < 100`: kart başlığı `"Profilin %${completionPct} tamamlandı"`, ilerleme çubuğu genişliği `${completionPct}%`, CTA metni **"Profili tamamla"**.
- `completionPct === 100`: kart başlığı `"Profilin tamam"`, ilerleme çubuğu yok (veya dolu gösterilir), CTA metni **"Profili düzenle"**.
- CTA'ya (ve/veya kartın tamamına) tıklamak mevcut `startEditingProfile()`'ı çağırır (aynı `isEditingProfile`/`data-profile-edit` mekanizması, değişmiyor).
- Mobil-only (`display:none` temel kural, mobil media query'de `display:block`/`flex`). `data-profile-edit` gate'i ile `isEditingProfile=true` iken bu kart gizlenir, form gösterilir — **aynı mevcut `.container[data-profile-edit="true"] .profileViewBlock{display:none}` kuralı, sadece hedef selector `.profileViewBlock`'tan `.completionCard`'a değişiyor.**

### 3.3 Menü Kartları (mevcut `.menuList`/`.menuRow`'un yeniden derinlemesine stillendirilmesi)

Yapı korunur (aynı `MENU_ITEMS.map` + `openSection(item.key)`), ama:

- `MENU_ITEMS`'a `subtitle: string` eklenir (Portfolyo: "Hesapladığın fizibilite raporları", İlanlarım: "Yayınladığın ve taslak ilanların", Favorilerim: "Kaydettiğin ilanlar", Ayarlar: "Görünüm, bildirimler ve hesap").
- Portfolyo ve İlanlarım kartlarında gerçek sayaç: `profile?.reports?.length ?? 0` / `profile?.listings?.length ?? 0` (senkron olarak zaten yüklü `profile` state'inden — yeni fetch yok). **Favorilerim'de sayaç YOK** (mevcut lazy-load-on-open davranışı değişmiyor, sayfa açılışında favoriler hiç çekilmiyor — bilinçli kapsam sınırı). Ayarlar'da sayaç yok.
- İki gruba ayrılır: "Hesabım" (Portfolyo/İlanlarım/Favorilerim) ve "Tercihler" (Ayarlar) — her grubun üstünde küçük uppercase bir `.sectionLabel`.
- `.menuRow` 44-56px'ten **76px min-height**'e çıkar, kendi `border-radius:18px` + `box-shadow` alır (artık bir liste satırı değil, bağımsız kart), aralarında `border-bottom` yerine **10px `gap`** olur (menuList `flex-direction:column; gap:10px`).
- `.tabPanel`'in kendisi (mevcut bordürlü/arka planlı kutu), menü GÖRÜNÜRKEN (`data-mobile-section="false"`) mobilde şeffaflaşır — kartlar `tabPanel`'in içinde değil, sayfa arka planında yüzüyormuş gibi görünür. Bir alt-ekran AÇIKKEN (`data-mobile-section="true"`) `.tabPanel` mevcut bordürlü panel görünümünü korur (Plan 1'in "AppBar + içerik paneli" hissi bozulmaz). Bu, `.container[data-mobile-section="false"] .tabPanel { background:none; border:none; box-shadow:none; padding:0 }` mobil-only kuralıyla yapılır.

### 3.4 Çıkış Yap taşınması

- `.tabContent` içindeki mevcut Ayarlar-bölümü `settingsSignOutBtn` mobilde **gizlenir** (`display:none` mobil media query'de eklenir — masaüstünde dokunulmaz, orada kalmaya devam eder).
- **Yeni mobil-only** `.mobileSignOut` bloğu — `.layout`'un kapanışından hemen sonra, `.container` içinde (yani hem hero+kartlar hem de açık bir alt-ekran GÖRÜNMÜYORKEN sayfanın en altında) eklenir, `onClick={() => signOut()}` (mevcut import, değişmiyor). Sadece `mobileSectionOpen === false` iken görünür olması gerekmiyor — mockup'ta ana ekranın SABİT bir parçası, alt-ekran açıkken zaten `.layout` tamamı `data-mobile-section` gate'i ile İÇERİK YÖNÜNDEN etkilenmiyor (mevcut mimaride `.profileCard` ve menü/tabContent ayrı ayrı gate'leniyor, `.layout`'un tamamı gizlenmiyor) — **açıklık için:** bu yeni buton `data-mobile-section="false"` iken gösterilsin, `true` iken gizlensin (alt-ekrandayken ekranın altında representative bir "Çıkış Yap" görünmesin, kafa karıştırmasın). Kural: `.container[data-mobile-section="true"] .mobileSignOut { display:none }`.

## 4. Test/Doğrulama Stratejisi

- Jest guard testleri (`profileStyles.scope.test.ts`): `.heroName` mobil-only, `.completionCard` mobil-only + `data-profile-edit` gate'i doğru hedefte, `.menuRow` yeni min-height (76px), `.settingsSignOutBtn` mobilde gizli + masaüstünde `display:none` YOK (base rule'a dokunulmadığı doğrulanır), `.mobileSignOut` mobil-only + `data-mobile-section="true"` iken gizli.
- Gerçek Playwright: completionPct hesaplamasının doğru çalıştığı (test kullanıcısının bio/linkedin/website boş, avatar da default → %0 beklenir — mockup'taki %40 sadece illüstrasyondu, gerçek formülle bu test kullanıcısı için %0 çıkması NORMAL ve doğru, spec bunu netleştiriyor), kart sayaçlarının gerçek rapor/ilan sayısını gösterdiği, tamamlanma kartına tıklayınca formun açıldığı, alt-ekran açıkken menü kartlarının/hero'nun kaybolup AppBar+panel görünümüne geçtiği, en alttaki Çıkış Yap'ın çalıştığı.
- Masaüstü regresyon: `profileCard`/`tabPanel`/`tabs` birebir aynı, hiçbir yeni mobil-only eleman görünmüyor, Ayarlar'daki `settingsSignOutBtn` hâlâ orada.

## 5. Riskler

- Tamamlanma yüzdesi formülü gerçek veriyle görsel olarak "boş" hissettirebilir (test kullanıcısı %0) — mockup'ın %40'lık illüstrasyonuyla karışmaması için kullanıcıya raporlanacak.
- `.tabPanel`'in koşullu şeffaflaşması (`data-mobile-section` durumuna göre) yeni bir CSS dallanması — dikkatli test edilmeli, özellikle geçiş anında (menüden alt-ekrana geçerken) ani bir stil sıçraması olmamalı.
- `.menuList`'in `.tabPanel` dışına "görsel olarak taşması" (background/border kaybı) yalnızca mobilde ve yalnızca `data-mobile-section="false"` iken olmalı; yanlış scope edilirse masaüstünü veya alt-ekran görünümünü bozabilir — guard testli.

## 6. Kapsam Dışı

- Masaüstü profil kartının aynı hero/kart stiline geçmesi (kullanıcı daha önce bunu mobil-only istemişti, bu kural burada da geçerli — mockup'ın kendisi de sadece mobil çerçeve gösteriyordu).
- Favoriler için sayaç eklemek (yeni fetch-on-load davranışı gerektirir, kapsam dışı bırakıldı).
- İsim (`session.user.name`) düzenlenebilir hale getirmek — hâlâ salt-okunur.
- Diğer `/dashboard/*` sayfalarının (raporlar, projeler, ana dashboard) aynı hero/kart diline geçmesi — ayrı, gelecekteki bir iş.

## 7. Sonraki Adım

`writing-plans` skill'i ile implementasyon planı oluşturulacak, aynı branch üzerinde `subagent-driven-development` ile uygulanacak.
