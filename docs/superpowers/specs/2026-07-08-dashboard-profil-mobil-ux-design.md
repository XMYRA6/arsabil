# Dashboard/Profil — Mobil UX Yeniden Tasarımı

**Tarih:** 2026-07-08
**Durum:** Onaylandı (kullanıcı diyaloğu ile)
**Kapsam:** `src/app/dashboard/profile/page.tsx` — **yalnızca mobil** (`@media max-width: 768px`). Masaüstü (sol profil kartı + sağ yatay sekme paneli) hiç değişmez.

---

## 1. Problem Teşhisi

Bugünkü oturumda önce `.tabs`/`.tab` mobilde `flex:1` ile 4 sekmeyi (Portfolyo/İlanlarım/Favorilerim/Tema&Ayarlar) eşit genişliğe sıkıştırdığı için metin kırılıyordu; bu, aynı oturumda 2x2 grid'e çevrilerek düzeltildi (`profile.module.css` mobil media query). Kullanıcı canlı sonucu görünce daha köklü bir UX sorunu tarif etti: sayfanın tamamı mobil için yeniden düşünülmeli.

Kod taramasında ek bir gerçek bulgu: `.avatarOverlay` (avatarın üstündeki 📷 düzenle ikonu) yalnızca `:hover` ile görünür. Mobilde hover state hiç tetiklenmediği için düzenle ikonu **hiçbir zaman görünmüyor** — kullanıcı avatarın tıklanabilir olduğunu bilemiyor. Bu, Instagram tarzı sabit görünür bir "kalem rozeti" ile çözülüyor.

## 2. Değerlendirilen Yaklaşımlar (bölüm yerleşimi için)

Kullanıcıyla diyalogda 3 seçenek tartışıldı:

| Yaklaşım | Özet | Karar |
|---|---|---|
| A — Akordiyon | 4 başlık alt alta, dokununca açılır/kapanır | Reddedildi — kullanıcı: "biri çok dolu olduğunda aşağı çekmek UX'i etkiler" |
| B — Sürekli scroll | Instagram gibi 4 bölüm hep açık, alt alta | Reddedildi (bu iş için) — sekme/anlık odaklanma hissi kaybolur |
| **C — Dikey menü listesi → AppBar'lı alt ekran** | 4 başlık menü satırı gibi durur, dokununca geri butonlu tam ekran açılır | **Seçildi** — kullanıcı: "geri gelebilmesi UX tarafında daha iyi bir deneyim sunar" |

Yaklaşım C, `inbox` sayfasının zaten kanıtlanmış "konuşma listesi ↔ chat" iki-ekran desenini (`isMobileChatActive` state + özel geri butonu) temel alır; burada geri butonu için proje primitifi `AppBar` kullanılır (inbox kendi özel SVG geri butonunu yazmıştı, `AppBar` primitifi Faz 0'da ondan sonra eklendi).

## 3. Tasarım

### 3.1 Sayfa iskeleti (mobil)

```
┌─────────────────────────────┐
│ AppBar: "Profilim"           │  ← geri butonu yok (tab-bar hedefi)
├─────────────────────────────┤
│   [Avatar] ✏️(rozet)          │
│   Ad Soyad · ROL · ✓Doğrulandı│
│   Hakkında (textarea)         │
│   LinkedIn (input)            │
│   Website (input)             │
│   [Kaydet]                    │
├─────────────────────────────┤
│  📁 Portfolyo             ›   │
│  🏗️ İlanlarım             ›   │
│  ❤️ Favorilerim           ›   │
│  ⚙️ Tema & Ayarlar        ›   │
└─────────────────────────────┘
```

Menüden bir satıra dokununca aynı sayfa **alt görünüme** geçer:

```
┌─────────────────────────────┐
│ AppBar: ← "Portfolyo"         │  ← geri butonu → menüye döner
├─────────────────────────────┤
│  (mevcut tabContent içeriği,  │
│   değişmeden — sadece taşındı)│
├─────────────────────────────┤
│  [Ayarlar alt ekranındaysa:]  │
│  ... tema/e-posta bölümleri   │
│  [Çıkış Yap]                  │  ← üst karttan buraya taşındı
└─────────────────────────────┘
```

### 3.2 Avatar düzenle rozeti

- Mobilde `.avatarOverlay`'in `:hover`'a bağlı görünürlüğü kaldırılır; yerine avatarın sağ-alt köşesinde her zaman görünür, `--primary` renkli, ~28px dairesel bir "✏️" rozeti eklenir (dokunma hedefi guard'ı: rozet + görünmez dokunma alanı birlikte ≥44×44px).
- Rozete dokununca mevcut `fileInputRef.current?.click()` tetiklenir (davranış aynı, sadece görünür/erişilebilir hale geliyor). Avatarın kendisine dokunmak da aynı işlevi yapmaya devam eder (yedek hedef, davranış değişmiyor — sadece rozet ekleniyor).
- Masaüstünde hiçbir değişiklik yok (`:hover` davranışı aynen kalır).

### 3.3 Dikey menü listesi

4 satır, her biri: sol ikon + etiket + sağ `›` chevron, tam genişlik, dokunma hedefi ≥44px. Var olan `tab` state'i (`'portfolio' | 'listings' | 'favorites' | 'settings'`) **aynen** menü seçimi için kullanılır — yeni bir state türü icat edilmez.

### 3.4 Alt görünüm mekanizması (CSS attribute-selector gate)

Yeni bir boolean state: `mobileSectionOpen` (`false` = menü görünür, `true` = seçili `tab`'ın içeriği AppBar'lı tam ekran görünür). Container'a `data-mobile-section={mobileSectionOpen}` eklenir; hesapla'nın `data-revealed` deseniyle birebir aynı teknik:

```css
@media (max-width: 768px) {
  .container[data-mobile-section="false"] .tabContent { display: none; }
  .container[data-mobile-section="true"]  .menuList    { display: none; }
}
```

Bu sayede **`tabContent` JSX'i tek yerde kalır** — masaüstü sekme paneli ile mobil alt-ekran aynı DOM/React ağacını paylaşır, JSX koşulu (`{condition && ...}`) DEĞİL, CSS attribute-selector kullanılır (Faz 1/hesapla'dan ödünç alınan kural: paylaşılan içerik JSX ile değil CSS ile gate'lenir, masaüstü DOM'u etkilenmesin diye).

Menü satırına dokunma → `setTab(key); setMobileSectionOpen(true)`. AppBar geri butonu → `setMobileSectionOpen(false)` (tab state korunur, tekrar aynı bölüme dönüldüğünde veri tekrar çekilmez).

**Favoriler lazy-load'u bozulmaz:** Mevcut `useEffect` zaten `tab === 'favorites'` değiştiğinde veri çekiyor; `mobileSectionOpen` bu efekti tetiklemiyor, sadece görünürlüğü kontrol ediyor — davranış değişmez.

### 3.5 Ayarlar alt ekranı

Kullanıcı kararı: "Çıkış Yap" butonu üst profil kartından **kaldırılır**, Ayarlar (`tab === 'settings'`) alt ekranının en altına taşınır — hem masaüstü hem mobilde bu yeni konumda görünür (bu, davranışsal değil konumsal bir değişiklik; masaüstü sekme paneli zaten aynı `tabContent` JSX'ini kullandığı için bu taşıma masaüstünü de etkiler — kullanıcıya bu yan etki açıkça belirtilir, bkz. §6).

### 3.6 AppBar entegrasyonu

`Navbar.tsx` içinde `isProfile = pathname.startsWith("/dashboard/profile")` zaten mobilde Navbar'ı otomatik gizliyor (mevcut merkezi kural, dokunulmuyor). Ana görünümde `<AppBar title="Profilim" />` (geri butonsuz), alt görünümde `<AppBar title={sectionTitles[tab]} showBack onBack={...} />` — `AppBar`'ın `showBack` davranışı `router.back()` yapıyor; burada gerçek route değişmediği için `backHref` yerine `onClick` tabanlı özel bir geri davranışı gerekebilir. **Açık teknik detay:** `AppBar` bileşeni şu an sadece `router.back()`/`router.push(backHref)` destekliyor, saf state-setter callback almıyor — plan aşamasında `AppBar`'a opsiyonel `onBack` prop'u eklenmesi (inbox'ın kendi özel geri butonunu kullanmaya devam etmesi yerine) ya da bu sayfada `AppBar`'ı sarmalayan ince bir yerel bileşenle çözülmesi gerekiyor. Bu, plan yazımında netleştirilecek küçük bir implementasyon kararı.

## 4. Test/Doğrulama Stratejisi

- Jest: mevcut testler yeşil kalmalı; yeni bir `pageStyles.scope.test.ts`-tarzı guard testi (hesapla emsali) — `data-mobile-section` kurallarının yalnızca `@media (max-width:768px)` bloğu içinde tanımlı olduğunu doğrular.
- Playwright (gerçek tarayıcı, 390×844): login → `/dashboard/profile` → menü görünür → "Portfolyo" dokun → AppBar+geri butonu+içerik görünür → geri → menüye dönüldü → "Favorilerim" dokun → "Yükleniyor…" sonra veri/boş durum → geri → "Tema & Ayarlar" dokun → "Çıkış Yap" burada görünüyor.
- Masaüstü ekran görüntüsü karşılaştırması (regresyon guard'ı) — özellikle "Çıkış Yap"ın yeni konumu masaüstünde de görünür olacağı için.

## 5. Riskler

- **CSS attribute-selector gate yanlış scope edilirse** (media query dışına taşarsa) masaüstünü bozar — guard testi zorunlu (bkz. §4).
- **"Çıkış Yap" taşınması masaüstünü de etkiliyor** — küçük ama kasıtlı bir yan etki, kullanıcıya bu spec'te açıkça bildirildi.
- **AppBar'ın `onBack` desteği eksik** — plan aşamasında ya `AppBar`'a prop eklenir ya da yerel çözüm kurulur; iki yöntem de düşük riskli.

## 6. Kapsam Dışı

- Masaüstü sekme paneli yapısı (Çıkış Yap konumu hariç — bkz. §3.5, §5).
- Avatar tam ekran görüntüleyici / lightbox.
- Yeni route dosyaları (`/dashboard/profile/portfolio` vb.) — sayfa içi state ile çözülüyor.
- Yeni upload/silme özellikleri — mevcut `handleAvatarUpload` davranışı aynen korunuyor.

## 7. Sonraki Adım

`writing-plans` skill'i ile implementasyon planı (`docs/superpowers/plans/`) oluşturulacak.
