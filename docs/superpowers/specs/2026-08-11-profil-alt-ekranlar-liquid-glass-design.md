# Profil Alt Ekranları (Mobil) — Liquid Glass Göçü

**Tarih:** 2026-08-11
**Durum:** Onaylandı (mockup üzerinden), plan aşamasına geçiliyor.
**Önceki iş:** [[2026-08-08-profil-mobil-liquid-glass-design.md]] — hero kartı + menü
listesi zaten `--m-*` sistemine taşındı. O spec'in "Kapsam dışı" bölümü bu işi
açıkça erteledi: "Drill-down alt ekranlar ... Bunlar için ayrı mockup gösterilmedi,
onay yok." Bu spec o onayı sağlıyor.

## Bağlam

`/dashboard/profile`'da 4 sekme (Portfolyo/İlanlarım/Favorilerim/Tema&Ayarlar) ve
hesap silme modalı, mobilde `AppBar` geri-tuşuyla açılan tam ekran alt görünümler
(`data-mobile-section="true"`). Hero/menü göçünden sonra bunlar geride kaldı:
`.tabPanel` mobilde hâlâ masaüstü token'larını (`var(--panel)`, `var(--border)`,
20px radius) taşıyor, Favoriler/Ayarlar sekmeleri ve silme modalı hiç CSS module
class'ı kullanmıyor — 38 satır-içi `style={{}}` bloğu ve modal butonunda 2 yerde
hardcoded `#ef4444`. Sonuç: hero cam/gradyan/mesh estetiğindeyken hemen altındaki
sekme içeriği düz, eski görünüyor.

Mockup (onaylandı): https://claude.ai/code/artifact/f66f8b51-7c00-4011-bcb9-336a5119482b

**Bu bir yeniden-tasarım değil, önceki spec'in ertelediği kısmın aynı sistemle
tamamlanmasıdır.** Bilgi mimarisi, veri akışı, `fetch` çağrıları, state — hiçbiri
değişmiyor; yalnızca görsel yüzey.

## Kapsam

- `data-mobile-section="true"` durumundaki 4 sekme içeriği (`tabContent` içi):
  Portfolyo, İlanlarım, Favorilerim, Tema & Ayarlar.
- Hesap silme modalı (`showDeleteModal` açıkken render edilen overlay+kart).
- Dosyalar: `src/app/dashboard/profile/page.tsx`,
  `src/app/dashboard/profile/profile.module.css`.
- Tüm değişiklikler `@media (max-width: 768px)` içinde, self-gating — masaüstü
  **hiç dokunulmuyor** (önceki spec'in kanıtladığı aynı desen).

## Kapsam dışı (bu turda da YAPILMIYOR)

- Hesap silme modalının `BottomSheet` bileşenine geçirilmesi. Önceki spec'in
  ertelediği karar hâlâ geçerli: drag-to-dismiss bir davranış değişikliğidir,
  ayrı bir onay gerektirir. Bu spec modalı **aynı `position:fixed` merkezi
  overlay mekanizmasıyla** bırakıp yalnızca yüzeyini cam'a çeviriyor (mockup'ta
  onaylanan tasarım da bu).
- E-posta tercihleri / veri indirme / hesap silme'nin işlevsel akışı (API
  çağrıları, hata mesajları, `handleDeleteAccount` vb.) — birebir korunuyor.
- Masaüstü görünüm.

## Token karşılığı (tek doğruluk kaynağı)

Mockup'ta gösterilen ve onaylanan eşleme; aşağıdaki tüm CSS class tanımları bu
tabloyu birebir uygular, yeni bir renk/değer icat edilmiyor:

| Kullanım | Şu an (mobilde de) | Liquid Glass (mobil override) |
|---|---|---|
| Kart/satır zemini | `var(--bg)`, `var(--panel)` | `var(--m-glass-bg)` + `backdrop-filter: var(--m-glass-blur)` |
| Kart kenarlığı | `var(--border)` | `var(--m-glass-border)` |
| Köşe yarıçapı (kart) | `10px` / `16px` / `20px` | `var(--m-r-card)` (dış panel) / `var(--m-r-inner)` (iç satır/kart) |
| Kart gölgesi | yok / `boxShadow` yok | `var(--m-sh-card-sm)` (satır) / `var(--m-sh-card)` (modal), `inset 0 1px 0 #fff` |
| Başlık metni | `var(--card-title)` | `var(--m-ink)` |
| İkincil/meta metin | `var(--muted)` | `var(--m-body)` |
| Birincil buton | `var(--primary)` düz | `var(--m-grad-btn)` |
| İkincil/outline buton | `var(--panel)` + `var(--border)` | `rgba(255,255,255,.55)` zemin + `var(--m-glass-border)` |
| Yıkıcı aksiyon (Sil) | `#ef4444` (hardcoded × 2) | `var(--m-danger)` |
| Toggle switch (açık) | `var(--primary)` düz | `var(--m-grad-btn)` |
| Toggle switch (kapalı) | `var(--border)` | `var(--m-fill)` |
| Fiyat/sayısal veri | gövde fontu | `var(--m-mono)` + `font-variant-numeric: tabular-nums` |
| Input (modal şifre) | `var(--bg)` + `var(--border)` | `rgba(255,255,255,.6)` + `var(--m-glass-border)` |
| Modal overlay zemini | `rgba(0,0,0,.6)` | `rgba(8,23,41,.42)` |

**Kritik kısıt (önceki spec'in final review'inde bulunan gerçek regresyondan
miras):** `--m-*` sistemi tamamen ışık-temalı/koşulsuzdur, dark tema varyantı
yoktur. Yeni/taşınan hiçbir metin `var(--text)` / `var(--muted)` /
`var(--card-title)` KULLANMAMALI — hepsi `var(--m-ink)` / `var(--m-body)`
kullanmalı. Aksi halde koyu temada bu ekranlar (hero zaten düzeltildiği gibi)
neredeyse görünmez hale gelir.

## Değişiklikler

### 1. `.tabPanel` mobil kılıf — Portfolyo + İlanlarım'ı ücretsiz kapsar

`data-mobile-section="true"` iken `.tabPanel` şu an tanımsız (masaüstü
`var(--panel)`/`var(--border)`/20px kalır). Mobil override eklenir:

```css
@media (max-width: 768px) {
  .container[data-mobile-section="true"] .tabPanel {
    background: var(--m-glass-bg);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-card);
    backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
    box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
  }
  .listRow {
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-inner);
  }
  .listTitle { color: var(--m-ink); }
  .listMeta { color: var(--m-body); }
  .emptyNote { color: var(--m-body); }
}
```

Bu tek blok, Portfolyo ve İlanlarım sekmelerinin (ikisi de `.listRow`/`.listTitle`/
`.listMeta`/`.emptyNote` kullanıyor, `page.tsx:448-468`) tamamını kapsar — JSX
değişikliği gerekmez.

### 2. Favorilerim sekmesi — yeni class'lar, tam inline stil kaldırılıyor

`page.tsx:470-511` şu an sıfır className kullanıyor. `profile.module.css`'e
eklenir (mobil override, masaüstü tanımı da aynı blokta base olarak — bu sekme
masaüstünde de className'siz kalmıştı, o yüzden base kural mevcut inline
değerlerin birebir kopyası olmalı ki masaüstü pixel-parity bozulmasın):

```css
.favSectionTitle { font-size: 0.95rem; font-weight: 800; color: var(--card-title); margin-bottom: 16px; }
.favEmpty { text-align: center; padding: 2rem; color: var(--muted); }
.favEmptyIcon { font-size: 2rem; margin-bottom: 8px; }
.favList { display: flex; flex-direction: column; gap: 10px; }
.favRow {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  background: var(--bg); border-radius: 10px; border: 1.5px solid var(--border);
  text-decoration: none; color: inherit;
}
.favIcon { font-size: 1.2rem; }
.favBody { flex: 1; min-width: 0; }
.favTitle { font-weight: 700; font-size: 0.85rem; color: var(--card-title); }
.favMeta { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }
.favArrow { font-size: 0.8rem; color: var(--primary); }

@media (max-width: 768px) {
  .favSectionTitle { color: var(--m-ink); }
  .favEmpty { color: var(--m-body); }
  .favRow {
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-inner);
    box-shadow: var(--m-sh-card-sm);
  }
  .favIcon {
    width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
    background: var(--m-grad-btn);
    display: flex; align-items: center; justify-content: center;
  }
  .favTitle { color: var(--m-ink); }
  .favMeta { color: var(--m-body); font-family: var(--m-mono); font-variant-numeric: tabular-nums; }
  .favArrow {
    width: 24px; height: 24px; border-radius: 50%; background: rgba(31,111,235,.1);
    color: #1560d0; display: flex; align-items: center; justify-content: center;
  }
}
```

`page.tsx`, `tab === 'favorites'` bloğu (satır 470-511) tüm `style={{...}}`'lar
kaldırılıp yukarıdaki class'larla değiştirilir; JSX yapısı (koşullar, `.map`)
aynen korunur.

### 3. Ayarlar sekmesi — glass kart bölümleri + toggle + buton class'ları

Üç blok (Görünüm/tema seçimi zaten `.themeGrid`/`.themeBtn` kullanıyor —
dokunulmuyor; E-posta Bildirimleri; Hesap Yönetimi) ortak bir `.settingsSection`
kabına alınır:

```css
.settingsSection { margin-top: 28px; }
.settingsSection + .settingsSection { padding-top: 20px; border-top: 1px solid var(--border); }
.settingsSectionTitle { font-size: 0.9rem; font-weight: 800; color: var(--card-title); margin-bottom: 16px; }
.toggleList { display: flex; flex-direction: column; gap: 12px; }
.toggleRow { display: flex; justify-content: space-between; align-items: center; }
.toggleLabel { font-size: 0.85rem; color: var(--text); }
.toggleSwitch {
  width: 40px; height: 22px; border-radius: 11px; position: relative; cursor: pointer;
  transition: background 0.2s; background: var(--border);
}
.toggleSwitchOn { background: var(--primary); }
.toggleKnob {
  width: 16px; height: 16px; background: white; border-radius: 50%;
  position: absolute; top: 3px; left: 3px; transition: left 0.2s;
}
.toggleKnobOn { left: 21px; }
.btnPrimarySmall,
.btnSecondarySmall,
.btnDangerSmall {
  padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: inherit;
  font-weight: 700; font-size: 0.85rem; border: none;
}
.btnPrimarySmall { background: var(--primary); color: white; margin-top: 16px; }
.btnSecondarySmall { background: var(--panel); color: var(--text); border: 1px solid var(--border); margin-right: 10px; }
.btnDangerSmall { background: transparent; color: #ef4444; border: 1px solid #ef4444; }

@media (max-width: 768px) {
  .settingsSection + .settingsSection { border-top-color: rgba(11, 32, 54, 0.08); }
  .settingsSectionTitle { color: var(--m-ink); }
  .toggleLabel { color: var(--m-ink); font-weight: 600; }
  .toggleSwitch { background: var(--m-fill); box-shadow: none; }
  .toggleSwitchOn { background: var(--m-grad-btn); box-shadow: 0 4px 10px rgba(43,124,255,.3); }
  .btnPrimarySmall { background: var(--m-grad-btn); box-shadow: 0 8px 18px rgba(43,124,255,.25); }
  .btnSecondarySmall {
    background: rgba(255, 255, 255, 0.55); color: var(--m-ink); border: 1px solid var(--m-glass-border);
  }
  .btnDangerSmall {
    background: rgba(255, 45, 85, 0.08); color: var(--m-danger); border: 1px solid rgba(255, 45, 85, 0.3);
  }
}
```

`page.tsx`, `tab === 'settings'` bloğundaki (satır 514-607) E-posta Bildirimleri
ve Hesap bölümleri bu class'lara geçirilir; `saveEmailPrefs`/`handleExportData`/
`onClick={() => setShowDeleteModal(true)}` handler'ları aynen korunur, yalnızca
`style={{...}}` yerine `className` kullanılır. `savedPrefs`/`exporting`/`saving`
gibi durumlara göre değişen buton metni/opaklığı korunur (`opacity` durumu
`btnPrimarySmall`'a koşullu inline `style={{opacity: savingPrefs ? .6 : 1}}`
olarak KALABİLİR — bu bir renk/token değil, geçici durum stili, spec'in
kapsamındaki "hardcoded renk" sorununa girmiyor).

### 4. Hesap silme modalı — cam overlay, `#ef4444` → `var(--m-danger)`

```css
.deleteModalOverlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.deleteModalCard {
  background: var(--panel); border-radius: 16px; padding: 24px;
  max-width: 400px; width: 90%; border: 1px solid var(--border);
}
.deleteModalTitle { font-size: 1.1rem; font-weight: 800; color: var(--card-title); margin-bottom: 8px; }
.deleteModalBody { font-size: 0.85rem; color: var(--muted); margin-bottom: 16px; }
.deleteModalError {
  padding: 8px 12px; background: rgba(239, 68, 68, 0.1); color: #ef4444;
  border-radius: 8px; font-size: 0.8rem; margin-bottom: 12px;
}
.deleteModalInput {
  width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-family: inherit; font-size: 0.85rem; margin-bottom: 16px;
}
.deleteModalActions { display: flex; gap: 8px; }
.deleteModalCancel,
.deleteModalConfirm {
  flex: 1; padding: 10px; border-radius: 8px; cursor: pointer; font-family: inherit;
  font-weight: 700; font-size: 0.85rem;
}
.deleteModalCancel { border: 1px solid var(--border); background: transparent; color: var(--text); }
.deleteModalConfirm { border: none; background: #ef4444; color: white; }

@media (max-width: 768px) {
  .deleteModalOverlay { background: rgba(8, 23, 41, 0.42); backdrop-filter: blur(2px); }
  .deleteModalCard {
    background: rgba(242, 248, 255, 0.88); border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-card); backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
    box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
  }
  .deleteModalTitle { color: var(--m-ink); }
  .deleteModalBody { color: var(--m-body); }
  .deleteModalInput {
    background: rgba(255, 255, 255, 0.6); border: 1px solid var(--m-glass-border); color: var(--m-ink);
  }
  .deleteModalCancel {
    border: 1px solid var(--m-glass-border); background: rgba(255, 255, 255, 0.5); color: var(--m-ink);
  }
  .deleteModalConfirm {
    background: var(--m-danger); box-shadow: 0 8px 18px rgba(255, 45, 85, 0.35);
  }
}
```

`page.tsx:613-676` tüm `style={{...}}` bloğu bu class'larla değiştirilir;
`showDeleteModal`/`deletePassword`/`deleteError`/`deleting`/`handleDeleteAccount`
state ve mantığı birebir korunur — yalnızca render.

## Test güncellemeleri

`profileStyles.scope.test.ts`'e, önceki spec'in yerleştirdiği desenle birebir
aynı biçimde eklenir:

- `.container[data-mobile-section="true"] .tabPanel` mobil bloğunda
  `var(--m-glass-bg)` + `var(--m-glass-blur)` kullandığı.
- `.favRow`, `.deleteModalCard`, `.settingsSection` sınıflarının hem masaüstü
  (base) hem mobil override bloğunda tanımlı olduğu.
- **Kritik regresyon guard'ı** (önceki spec'in final review'inde bulunan hatanın
  tekrarını engeller): mobil bloktaki `.favTitle`, `.favMeta`, `.toggleLabel`,
  `.settingsSectionTitle`, `.deleteModalTitle`, `.deleteModalBody` kurallarının
  HİÇBİRİ `var(--text)` / `var(--muted)` / `var(--card-title)` içermemeli,
  hepsi `var(--m-ink)` veya `var(--m-body)` kullanmalı.
- Mobil bloktaki `.deleteModalConfirm`/`.btnDangerSmall` kurallarının artık
  `#ef4444` DEĞİL `var(--m-danger)` kullandığı (hardcoded hex regresyon guard'ı).
- Masaüstü (media query dışı) `.deleteModalCard`/`.favRow`/`.deleteModalConfirm`
  tanımlarının DEĞİŞMEDİĞİ (mevcut inline değerlerin birebir CSS karşılığı
  olduğu — `background: var(--panel)`, `background: var(--bg)` vb.).
- `page.tsx` içinde `tab === 'favorites'` ve modal render bloklarında artık
  `style={{` deseninin (durum-bağımlı `opacity` dışında) geçmediği.

## Doğrulama planı

- `tsc --noEmit` → 0 hata.
- `npx jest --no-coverage --roots "src"` → tüm suite yeşil.
- Gerçek dev server'da (giriş yapılmış oturum, yerel DB) `/dashboard/profile`
  mobil genişlikte (≤768px, gerçek resize) 4 sekmenin her biri + silme modalı
  açılıp `getComputedStyle` ile cam yüzey/gradyan/`--m-danger` doğrulanır.
  Masaüstü genişlikte sayfanın BİREBİR ÖNCEKİ GİBİ kaldığı doğrulanır (bu
  spec'in de en kritik regresyon riski budur — önceki spec ile aynı desen).
  Önceki oturumlarda DB/Docker kapalı kaldığı için canlı doğrulama sık sık
  ertelendi; bu kez mümkünse Docker açılıp gerçekten tamamlanmalı.
