# Profil Alt Ekranları (Mobil) — Liquid Glass Göçü Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard/profile`'ın mobilde açılan 4 alt ekranını (Portfolyo/İlanlarım/Favorilerim/Tema&Ayarlar) ve hesap silme modalını, hero/menünün zaten kullandığı "Premium Liquid Glass" (`--m-*`) token sistemine taşımak — yalnızca görsel, davranış/veri akışı/masaüstü değişmeden.

**Architecture:** Tüm değişiklikler `src/app/dashboard/profile/profile.module.css`'in `@media (max-width: 768px)` bloğu içinde (self-gating, masaüstü dokunulmuyor). Portfolyo+İlanlarım zaten paylaşılan `.tabPanel`/`.listRow` class'larını kullandığı için tek bir CSS eklemesiyle ücretsiz kapsanır. Favorilerim/Ayarlar/Silme modalı hiç className kullanmıyor (tam satır-içi stil) — her biri için yeni, dar kapsamlı CSS class'ları eklenip `page.tsx`'teki ilgili `style={{...}}` blokları bu class'larla değiştirilir.

**Tech Stack:** Next.js 16 App Router, React, CSS Modules, Jest (regex tabanlı "scope" testleri — jsdom render değil, ham CSS/TSX metni üzerinde).

## Global Constraints

- Tüm yeni/değişen kurallar `@media (max-width: 768px)` içinde kalmalı; masaüstü (media query dışı) hiçbir mevcut kural değişmemeli.
- Mobilde taşınan/yeni metin renkleri MUTLAKA `var(--m-ink)` (başlık) veya `var(--m-body)` (ikincil metin) kullanmalı — `var(--text)`, `var(--muted)`, `var(--card-title)` KULLANILMAMALI (`--m-*` sistemi tema-bağımsız/yalnızca-açık-tema'dır, önceki spec'in final review'inde bulunan gerçek koyu-tema-kontrast regresyonunun tekrarı).
- Yıkıcı aksiyon (Sil) mobilde `var(--m-danger)` kullanmalı. Masaüstü tanımı literal `#ef4444` olarak AYNEN KALMALI — `var(--red)` KULLANILMAMALI (o token `#ff5a5f`'e çözümlenir, farklı bir renk, masaüstü pixel-parity'yi bozar).
- Hesap silme modalı `position: fixed` merkezi overlay olarak KALIR — `BottomSheet` bileşenine geçirilmiyor (önceki spec'in ertelediği, hâlâ geçerli karar).
- Anlık/geçici durum stilleri (örn. istek sürerken buton `opacity`'si, "Kaydedildi" anlık renk değişimi) inline `style={{}}` olarak KALABİLİR — yalnızca sabit hardcoded renkler/masaüstü token'ları CSS class'ına taşınıyor.
- Yeni CSS kuralları dosyanın mevcut konvansiyonunu izler: HER selector kendi tek başına bloğunda (virgülle gruplanmış selector YOK) — hem dosya tutarlılığı hem `css.indexOf('.foo {')` tarzı test assertion'larının güvenilirliği için.
- Test dosyası: `src/app/dashboard/profile/profileStyles.scope.test.ts` — mevcut regex/string-slice tabanlı deseni izler, yeni bir test yaklaşımı icat edilmiyor.

---

## Dosya Yapısı Özeti

| Dosya | İşlem | Sorumluluk |
|---|---|---|
| `src/app/dashboard/profile/profile.module.css` | Değiştir | ~19 yeni class (base + mobil override), 4 task'a bölünmüş |
| `src/app/dashboard/profile/page.tsx` | Değiştir | 3 bağımsız JSX bloğu (favorites/settings/modal) inline style'dan className'e geçer |
| `src/app/dashboard/profile/profileStyles.scope.test.ts` | Değiştir | Her task kendi `it()` bloklarını ekler (append-only, çakışmasız) |

Yeni dosya oluşturulmuyor.

---

### Task 1: `.tabPanel`/`.listRow` mobil cam yüzeyi — Portfolyo + İlanlarım'ı ücretsiz kapsar

**Files:**
- Modify: `src/app/dashboard/profile/profile.module.css`
- Test: `src/app/dashboard/profile/profileStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok (bağımsız ilk task).
- Produces: `data-mobile-section="true"` iken `.tabPanel`'in mobil cam-yüzey kuralı; `.listRow`/`.listTitle`/`.listMeta`/`.emptyNote`'un mobil override'ları. Task 2/3/4 bunlara bağımlı DEĞİL (ayrı class'lar kullanıyorlar) ama AYNI `@media` bloğunun sonuna ekleniyor olacaklar — bu task'ın commit'i sonrasında dosyanın son hali referans alınmalı.

- [ ] **Step 1: Write the failing tests**

`src/app/dashboard/profile/profileStyles.scope.test.ts` dosyasının SONUNDAKİ `})` satırından (describe bloğunun kapanışı) hemen ÖNCE ekle:

```ts
  it('data-mobile-section="true" iken .tabPanel mobilde cam yüzey (m-glass) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.container\[data-mobile-section="true"\]\s+\.tabPanel\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-glass-bg\)/)
    expect(match![1]).toMatch(/var\(--m-glass-blur\)/)
  })

  it('.listRow mobil bloğunda var(--m-glass-border) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.listRow\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-glass-border\)/)
  })

  it('.listTitle/.listMeta/.emptyNote mobilde var(--m-ink)/var(--m-body) kullanmalı, var(--text)/var(--muted) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)

    const listTitleMatch = mobileBlock.match(/\.listTitle\s*\{([^}]*)\}/)
    expect(listTitleMatch).not.toBeNull()
    expect(listTitleMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(listTitleMatch![1]).not.toMatch(/var\(--text\)/)

    const listMetaMatch = mobileBlock.match(/\.listMeta\s*\{([^}]*)\}/)
    expect(listMetaMatch).not.toBeNull()
    expect(listMetaMatch![1]).toMatch(/var\(--m-body\)/)
    expect(listMetaMatch![1]).not.toMatch(/var\(--muted\)/)

    const emptyNoteMatch = mobileBlock.match(/\.emptyNote\s*\{([^}]*)\}/)
    expect(emptyNoteMatch).not.toBeNull()
    expect(emptyNoteMatch![1]).toMatch(/var\(--m-body\)/)
    expect(emptyNoteMatch![1]).not.toMatch(/var\(--muted\)/)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/dashboard/profile/profileStyles.scope.test.ts`
Expected: 3 yeni test FAIL (`.tabPanel`/`.listRow`/`.listTitle` vb. mobil bloğunda henüz tanımlı değil — `match` sonucu `null` veya beklenen string eksik).

- [ ] **Step 3: Write minimal implementation**

`src/app/dashboard/profile/profile.module.css` dosyasının SONU şu an tam olarak şöyle biter:

```css
  .container[data-mobile-section="true"] .mobileSignOut {
    display: none;
  }
}
```

Bu dosyanın EN SON satırıdır (tek başına `}` — `@media (max-width: 768px)` bloğunun kapanışı). Bu kapanış `}`'den HEMEN ÖNCE aşağıdaki yeni kuralları ekle (dosyanın yeni sonu):

```css
  .container[data-mobile-section="true"] .mobileSignOut {
    display: none;
  }

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

  .listTitle {
    color: var(--m-ink);
  }

  .listMeta {
    color: var(--m-body);
  }

  .emptyNote {
    color: var(--m-body);
  }
}
```

(`var(--m-r-inner)` tanımlı değilse — globals.css'te `--m-r-inner: 20px;` olarak zaten var, kontrol amaçlı: `grep -n -- "--m-r-inner" src/app/globals.css`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/app/dashboard/profile/profileStyles.scope.test.ts`
Expected: tüm testler PASS (yeni 3 test dahil, mevcut testler kırılmamış).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/profileStyles.scope.test.ts
git commit -m "feat(profil-mobil): tabPanel/listRow liquid glass'a tasinir (Portfolyo+Ilanlarim)"
```

---

### Task 2: Favorilerim sekmesi — yeni class'lar, tam inline stil kaldırılıyor

**Files:**
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/dashboard/profile/page.tsx`
- Test: `src/app/dashboard/profile/profileStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok (Task 1'in eklediği class'lardan bağımsız, ayrı isim alanı: `.fav*`).
- Produces: `.favSectionTitle`/`.favEmpty`/`.favEmptyIcon`/`.favList`/`.favRow`/`.favIcon`/`.favBody`/`.favTitle`/`.favMeta`/`.favArrow` class'ları — başka hiçbir task bunlara bağımlı değil.

- [ ] **Step 1: Write the failing tests**

`profileStyles.scope.test.ts`'in sonundaki `})`'den hemen önce ekle:

```ts
  it('.favRow/.favIcon mobil bloğunda cam yüzey (m-glass) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const favRowMatch = mobileBlock.match(/\.favRow\s*\{([^}]*)\}/)
    expect(favRowMatch).not.toBeNull()
    expect(favRowMatch![1]).toMatch(/var\(--m-glass-border\)/)

    const favIconMatch = mobileBlock.match(/\.favIcon\s*\{([^}]*)\}/)
    expect(favIconMatch).not.toBeNull()
    expect(favIconMatch![1]).toMatch(/var\(--m-grad-btn\)/)
  })

  it('.favTitle/.favMeta/.favSectionTitle/.favEmpty mobilde var(--m-ink)/var(--m-body) kullanmalı, var(--text)/var(--muted)/var(--card-title) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)

    const favTitleMatch = mobileBlock.match(/\.favTitle\s*\{([^}]*)\}/)
    expect(favTitleMatch).not.toBeNull()
    expect(favTitleMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(favTitleMatch![1]).not.toMatch(/var\(--card-title\)/)

    const favMetaMatch = mobileBlock.match(/\.favMeta\s*\{([^}]*)\}/)
    expect(favMetaMatch).not.toBeNull()
    expect(favMetaMatch![1]).toMatch(/var\(--m-body\)/)
    expect(favMetaMatch![1]).not.toMatch(/var\(--muted\)/)

    const favSectionTitleMatch = mobileBlock.match(/\.favSectionTitle\s*\{([^}]*)\}/)
    expect(favSectionTitleMatch).not.toBeNull()
    expect(favSectionTitleMatch![1]).toMatch(/var\(--m-ink\)/)

    const favEmptyMatch = mobileBlock.match(/\.favEmpty\s*\{([^}]*)\}/)
    expect(favEmptyMatch).not.toBeNull()
    expect(favEmptyMatch![1]).toMatch(/var\(--m-body\)/)
  })

  it('masaüstü (media query dışı) .favRow tanımı mevcut inline değerlerin birebir karşılığı olmalı (pixel-parity)', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.favRow\s*\{[^}]*background:\s*var\(--bg\)/)
  })

  it('page.tsx favorites bloğunda artık style={{ deseni geçmemeli', () => {
    const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    const favStart = tsx.indexOf("tab === 'favorites' &&")
    const favEnd = tsx.indexOf("tab === 'settings' &&")
    expect(favStart).toBeGreaterThan(-1)
    expect(favEnd).toBeGreaterThan(favStart)
    const favBlock = tsx.slice(favStart, favEnd)
    expect(favBlock).not.toMatch(/style=\{\{/)
    expect(favBlock).toMatch(/styles\.favRow/)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/dashboard/profile/profileStyles.scope.test.ts`
Expected: 4 yeni test FAIL (class'lar CSS'te yok, `page.tsx` hâlâ `style={{` kullanıyor).

- [ ] **Step 3: Write minimal implementation**

**3a. `profile.module.css` — base (masaüstü) kurallar.** `@media (max-width: 768px) {` satırının HEMEN ÜSTÜNE ekle (bu satır dosyada tektir, güvenle bulunabilir):

```css
.favSectionTitle {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--card-title);
  margin-bottom: 16px;
}

.favEmpty {
  text-align: center;
  padding: 2rem;
  color: var(--muted);
}

.favEmptyIcon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.favList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.favRow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg);
  border-radius: 10px;
  border: 1.5px solid var(--border);
  text-decoration: none;
  color: inherit;
}

.favIcon {
  font-size: 1.2rem;
}

.favBody {
  flex: 1;
  min-width: 0;
}

.favTitle {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--card-title);
}

.favMeta {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 2px;
}

.favArrow {
  font-size: 0.8rem;
  color: var(--primary);
}

@media (max-width: 768px) {
```

**3b. `profile.module.css` — mobil override.** Dosyanın SON `}` satırından hemen önce (Task 1'de eklenen `.emptyNote { color: var(--m-body); }` bloğundan sonra, kapanış `}`'den önce) ekle:

```css
  .favSectionTitle {
    color: var(--m-ink);
  }

  .favEmpty {
    color: var(--m-body);
  }

  .favRow {
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-inner);
    box-shadow: var(--m-sh-card-sm);
  }

  .favIcon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
    flex-shrink: 0;
    background: var(--m-grad-btn);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
  }

  .favTitle {
    color: var(--m-ink);
  }

  .favMeta {
    color: var(--m-body);
    font-family: var(--m-mono);
    font-variant-numeric: tabular-nums;
  }

  .favArrow {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(31, 111, 235, 0.1);
    color: #1560d0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
  }
}
```

**3c. `page.tsx` — JSX'i class'lara geçir.** `tab === 'favorites'` bloğunu (şu an tamamen `style={{...}}` kullanıyor) bul ve TAMAMINI aşağıdakiyle değiştir:

Eski (aranacak/silinecek):
```tsx
                        {tab === 'favorites' && (
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>
                                    Favorilerim
                                </h3>
                                {loadingFavs ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Yükleniyor…</div>
                                ) : favorites.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>❤️</div>
                                        Henüz favori ilan eklemediniz
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {favorites.map((fav) => (
                                            <a
                                                key={fav.id}
                                                href={`/listing/${fav.listingId}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    padding: '12px 14px',
                                                    background: 'var(--bg)', borderRadius: 10,
                                                    border: '1.5px solid var(--border)',
                                                    textDecoration: 'none', color: 'inherit',
                                                }}
                                            >
                                                <span style={{ fontSize: '1.2rem' }}>🏗️</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--card-title)' }}>
                                                        {fav.listing?.title ?? fav.listing?.report?.title ?? 'İlan'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                        {fav.listing?.district && `${fav.listing.district}, `}{fav.listing?.city ?? '—'}
                                                        {fav.listing?.price ? ` · ${fav.listing.price.toLocaleString('tr-TR')} TL` : ''}
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>→</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
```

Yeni:
```tsx
                        {tab === 'favorites' && (
                            <div>
                                <h3 className={styles.favSectionTitle}>
                                    Favorilerim
                                </h3>
                                {loadingFavs ? (
                                    <div className={styles.favEmpty}>Yükleniyor…</div>
                                ) : favorites.length === 0 ? (
                                    <div className={styles.favEmpty}>
                                        <div className={styles.favEmptyIcon}>❤️</div>
                                        Henüz favori ilan eklemediniz
                                    </div>
                                ) : (
                                    <div className={styles.favList}>
                                        {favorites.map((fav) => (
                                            <a
                                                key={fav.id}
                                                href={`/listing/${fav.listingId}`}
                                                className={styles.favRow}
                                            >
                                                <span className={styles.favIcon}>🏗️</span>
                                                <div className={styles.favBody}>
                                                    <div className={styles.favTitle}>
                                                        {fav.listing?.title ?? fav.listing?.report?.title ?? 'İlan'}
                                                    </div>
                                                    <div className={styles.favMeta}>
                                                        {fav.listing?.district && `${fav.listing.district}, `}{fav.listing?.city ?? '—'}
                                                        {fav.listing?.price ? ` · ${fav.listing.price.toLocaleString('tr-TR')} TL` : ''}
                                                    </div>
                                                </div>
                                                <span className={styles.favArrow}>→</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/app/dashboard/profile/profileStyles.scope.test.ts`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/page.tsx src/app/dashboard/profile/profileStyles.scope.test.ts
git commit -m "feat(profil-mobil): Favorilerim sekmesi liquid glass'a tasinir"
```

---

### Task 3: Ayarlar sekmesi — glass kart bölümleri + toggle + buton class'ları

**Files:**
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/dashboard/profile/page.tsx`
- Test: `src/app/dashboard/profile/profileStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok (Task 2'nin `.fav*` class'larından bağımsız, ayrı isim alanı).
- Produces: `.settingsSection`/`.settingsSectionTitle`/`.toggleList`/`.toggleRow`/`.toggleLabel`/`.toggleSwitch`/`.toggleSwitchOn`/`.toggleKnob`/`.toggleKnobOn`/`.btnPrimarySmall`/`.btnSecondarySmall`/`.btnDangerSmall` class'ları.

- [ ] **Step 1: Write the failing tests**

`profileStyles.scope.test.ts`'in sonundaki `})`'den hemen önce ekle:

```ts
  it('.toggleSwitchOn/.btnPrimarySmall mobilde var(--m-grad-btn) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const toggleMatch = mobileBlock.match(/\.toggleSwitchOn\s*\{([^}]*)\}/)
    expect(toggleMatch).not.toBeNull()
    expect(toggleMatch![1]).toMatch(/var\(--m-grad-btn\)/)

    const btnMatch = mobileBlock.match(/\.btnPrimarySmall\s*\{([^}]*)\}/)
    expect(btnMatch).not.toBeNull()
    expect(btnMatch![1]).toMatch(/var\(--m-grad-btn\)/)
  })

  it('.btnDangerSmall mobilde var(--m-danger) kullanmalı, #ef4444 KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.btnDangerSmall\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-danger\)/)
    expect(match![1]).not.toMatch(/#ef4444/)
  })

  it('.settingsSectionTitle/.toggleLabel mobilde var(--m-ink) kullanmalı, var(--text)/var(--card-title) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)

    const titleMatch = mobileBlock.match(/\.settingsSectionTitle\s*\{([^}]*)\}/)
    expect(titleMatch).not.toBeNull()
    expect(titleMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(titleMatch![1]).not.toMatch(/var\(--card-title\)/)

    const labelMatch = mobileBlock.match(/\.toggleLabel\s*\{([^}]*)\}/)
    expect(labelMatch).not.toBeNull()
    expect(labelMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(labelMatch![1]).not.toMatch(/var\(--text\)/)
  })

  it('masaüstü (media query dışı) .btnDangerSmall tanımı hâlâ #ef4444 kullanmalı (pixel-parity)', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    const match = desktopBlock.match(/\.btnDangerSmall\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/#ef4444/)
  })

  it('page.tsx settings bloğunda artık toggle/silme butonu style={{ deseni geçmemeli', () => {
    const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    const settingsStart = tsx.indexOf("tab === 'settings' &&")
    const settingsEnd = tsx.indexOf('{showDeleteModal &&')
    expect(settingsStart).toBeGreaterThan(-1)
    expect(settingsEnd).toBeGreaterThan(settingsStart)
    const settingsBlock = tsx.slice(settingsStart, settingsEnd)
    expect(settingsBlock).toMatch(/styles\.toggleSwitch/)
    expect(settingsBlock).toMatch(/styles\.btnDangerSmall/)
    expect(settingsBlock).not.toMatch(/color:\s*'#ef4444'/)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/dashboard/profile/profileStyles.scope.test.ts`
Expected: 5 yeni test FAIL.

- [ ] **Step 3: Write minimal implementation**

**3a. `profile.module.css` — base (masaüstü) kurallar.** `@media (max-width: 768px) {` satırının HEMEN ÜSTÜNE ekle (Task 2'nin base kurallarından SONRA, aynı satırın üstüne — Task 2 çalıştıktan sonra bu satır hâlâ dosyada tektir):

```css
.settingsSection {
  margin-top: 28px;
}

.settingsSection + .settingsSection {
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.settingsSectionTitle {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--card-title);
  margin-bottom: 16px;
}

.toggleList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toggleRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggleLabel {
  font-size: 0.85rem;
  color: var(--text);
}

.toggleSwitch {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  background: var(--border);
}

.toggleSwitchOn {
  background: var(--primary);
}

.toggleKnob {
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: left 0.2s;
}

.toggleKnobOn {
  left: 21px;
}

.btnPrimarySmall {
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  border: none;
  background: var(--primary);
  color: white;
  margin-top: 16px;
  transition: background 0.3s;
}

.btnSecondarySmall {
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
  margin-right: 10px;
}

.btnDangerSmall {
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
}

@media (max-width: 768px) {
```

**3b. `profile.module.css` — mobil override.** Dosyanın SON `}` satırından hemen önce (Task 2'nin `.favArrow {...}` bloğundan sonra, kapanış `}`'den önce) ekle:

```css
  .settingsSection + .settingsSection {
    border-top-color: rgba(11, 32, 54, 0.08);
  }

  .settingsSectionTitle {
    color: var(--m-ink);
  }

  .toggleLabel {
    color: var(--m-ink);
    font-weight: 600;
  }

  .toggleSwitch {
    background: var(--m-fill);
  }

  .toggleSwitchOn {
    background: var(--m-grad-btn);
    box-shadow: 0 4px 10px rgba(43, 124, 255, 0.3);
  }

  .btnPrimarySmall {
    background: var(--m-grad-btn);
    box-shadow: 0 8px 18px rgba(43, 124, 255, 0.25);
  }

  .btnSecondarySmall {
    background: rgba(255, 255, 255, 0.55);
    color: var(--m-ink);
    border: 1px solid var(--m-glass-border);
  }

  .btnDangerSmall {
    background: rgba(255, 45, 85, 0.08);
    color: var(--m-danger);
    border: 1px solid rgba(255, 45, 85, 0.3);
  }
}
```

**3c. `page.tsx` — JSX'i class'lara geçir.** `tab === 'settings'` bloğunu bul. `.themeGrid` bölümüne (zaten class'lı) DOKUNMA. Ondan sonraki iki `<div style={{marginTop:28...}}>` bloğunu (E-posta Bildirimleri + Hesap) ve `.settingsSignOutBtn` öncesindeki her şeyi aşağıdakiyle değiştir:

Eski (aranacak/silinecek — `</div>` (themeGrid kapanışı) ile `<button onClick={() => signOut()}` arası):
```tsx
                                {/* E-posta Tercihleri */}
                                <div style={{ marginTop: 28 }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>
                                        E-posta Bildirimleri
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {([
                                            { key: 'mesaj', label: 'Yeni mesaj bildirimleri' },
                                            { key: 'teklif', label: 'Yeni teklif bildirimleri' },
                                            { key: 'ilan', label: 'İlan durum bildirimleri' },
                                        ] as const).map(({ key, label }) => (
                                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{label}</span>
                                                <div
                                                    onClick={() => setEmailPrefs(p => ({ ...p, [key]: !p[key] }))}
                                                    style={{
                                                        width: 40, height: 22, borderRadius: 11,
                                                        background: emailPrefs[key] ? 'var(--primary)' : 'var(--border)',
                                                        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                                    }}
                                                >
                                                    <div style={{
                                                        width: 16, height: 16, background: 'white', borderRadius: '50%',
                                                        position: 'absolute', top: 3,
                                                        left: emailPrefs[key] ? 21 : 3,
                                                        transition: 'left 0.2s',
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={saveEmailPrefs}
                                        disabled={savingPrefs}
                                        style={{
                                            marginTop: 16, padding: '8px 20px',
                                            background: savedPrefs ? 'var(--green)' : 'var(--primary)', color: 'white',
                                            border: 'none', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                            opacity: savingPrefs ? 0.6 : 1, transition: 'background 0.3s',
                                        }}
                                    >
                                        {savingPrefs ? 'Kaydediliyor…' : savedPrefs ? 'Kaydedildi ✓' : 'Kaydet'}
                                    </button>
                                </div>

                                {/* Hesap Yönetimi */}
                                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 12 }}>
                                        Hesap
                                    </h3>
                                    <button
                                        onClick={handleExportData}
                                        disabled={exporting}
                                        style={{
                                            padding: '8px 20px', background: 'var(--panel)', color: 'var(--text)',
                                            border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                            opacity: exporting ? 0.6 : 1, marginRight: 10,
                                        }}
                                    >
                                        {exporting ? 'Hazırlanıyor…' : '📥 Verilerimi İndir'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        style={{
                                            padding: '8px 20px', background: 'transparent', color: '#ef4444',
                                            border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                        }}
                                    >
                                        Hesabımı Sil
                                    </button>
                                </div>
```

Yeni:
```tsx
                                {/* E-posta Tercihleri */}
                                <div className={styles.settingsSection}>
                                    <h3 className={styles.settingsSectionTitle}>
                                        E-posta Bildirimleri
                                    </h3>
                                    <div className={styles.toggleList}>
                                        {([
                                            { key: 'mesaj', label: 'Yeni mesaj bildirimleri' },
                                            { key: 'teklif', label: 'Yeni teklif bildirimleri' },
                                            { key: 'ilan', label: 'İlan durum bildirimleri' },
                                        ] as const).map(({ key, label }) => (
                                            <div key={key} className={styles.toggleRow}>
                                                <span className={styles.toggleLabel}>{label}</span>
                                                <div
                                                    onClick={() => setEmailPrefs(p => ({ ...p, [key]: !p[key] }))}
                                                    className={`${styles.toggleSwitch} ${emailPrefs[key] ? styles.toggleSwitchOn : ''}`}
                                                >
                                                    <div className={`${styles.toggleKnob} ${emailPrefs[key] ? styles.toggleKnobOn : ''}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={saveEmailPrefs}
                                        disabled={savingPrefs}
                                        className={styles.btnPrimarySmall}
                                        style={{ background: savedPrefs ? 'var(--green)' : undefined, opacity: savingPrefs ? 0.6 : 1 }}
                                    >
                                        {savingPrefs ? 'Kaydediliyor…' : savedPrefs ? 'Kaydedildi ✓' : 'Kaydet'}
                                    </button>
                                </div>

                                {/* Hesap Yönetimi */}
                                <div className={styles.settingsSection}>
                                    <h3 className={styles.settingsSectionTitle}>
                                        Hesap
                                    </h3>
                                    <button
                                        onClick={handleExportData}
                                        disabled={exporting}
                                        className={styles.btnSecondarySmall}
                                        style={{ opacity: exporting ? 0.6 : 1 }}
                                    >
                                        {exporting ? 'Hazırlanıyor…' : '📥 Verilerimi İndir'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className={styles.btnDangerSmall}
                                    >
                                        Hesabımı Sil
                                    </button>
                                </div>
```

(`.settingsSectionTitle`'ın `margin-bottom: 16px` sabiti her iki başlıkta da kullanılıyor — orijinalde ikinci başlık `marginBottom: 12` idi, fark görsel olarak ihmal edilebilir [4px] ve tek bir paylaşılan class'ı iki ayrı varyanta bölmeyi gerektirmez; YAGNI.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/app/dashboard/profile/profileStyles.scope.test.ts`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/page.tsx src/app/dashboard/profile/profileStyles.scope.test.ts
git commit -m "feat(profil-mobil): Ayarlar sekmesi liquid glass'a tasinir, hardcoded #ef4444 kaldirildi"
```

---

### Task 4: Hesap silme modalı — cam overlay, `#ef4444` → `var(--m-danger)`

**Files:**
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/dashboard/profile/page.tsx`
- Test: `src/app/dashboard/profile/profileStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: `.deleteModalOverlay`/`.deleteModalCard`/`.deleteModalTitle`/`.deleteModalBody`/`.deleteModalError`/`.deleteModalInput`/`.deleteModalActions`/`.deleteModalCancel`/`.deleteModalConfirm`.

- [ ] **Step 1: Write the failing tests**

`profileStyles.scope.test.ts`'in sonundaki `})`'den hemen önce ekle:

```ts
  it('.deleteModalCard mobilde cam yüzey (m-glass) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.deleteModalCard\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-glass-border\)/)
    expect(match![1]).toMatch(/var\(--m-glass-blur\)/)
  })

  it('.deleteModalConfirm mobilde var(--m-danger) kullanmalı, #ef4444 KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.deleteModalConfirm\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-danger\)/)
    expect(match![1]).not.toMatch(/#ef4444/)
  })

  it('.deleteModalTitle/.deleteModalBody mobilde var(--m-ink)/var(--m-body) kullanmalı, var(--card-title)/var(--muted) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)

    const titleMatch = mobileBlock.match(/\.deleteModalTitle\s*\{([^}]*)\}/)
    expect(titleMatch).not.toBeNull()
    expect(titleMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(titleMatch![1]).not.toMatch(/var\(--card-title\)/)

    const bodyMatch = mobileBlock.match(/\.deleteModalBody\s*\{([^}]*)\}/)
    expect(bodyMatch).not.toBeNull()
    expect(bodyMatch![1]).toMatch(/var\(--m-body\)/)
    expect(bodyMatch![1]).not.toMatch(/var\(--muted\)/)
  })

  it('masaüstü (media query dışı) .deleteModalConfirm/.deleteModalCard tanımları mevcut inline değerlerin birebir karşılığı olmalı (pixel-parity)', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.deleteModalConfirm\s*\{[^}]*#ef4444/)
    expect(desktopBlock).toMatch(/\.deleteModalCard\s*\{[^}]*background:\s*var\(--panel\)/)
  })

  it('page.tsx silme modalı bloğunda artık style={{ deseni geçmemeli (dinamik opacity haric)', () => {
    const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    const modalStart = tsx.indexOf('{showDeleteModal &&')
    const modalEnd = tsx.indexOf('<div className={styles.mobileSignOut}>')
    expect(modalStart).toBeGreaterThan(-1)
    expect(modalEnd).toBeGreaterThan(modalStart)
    const modalBlock = tsx.slice(modalStart, modalEnd)
    expect(modalBlock).toMatch(/styles\.deleteModalOverlay/)
    expect(modalBlock).toMatch(/styles\.deleteModalConfirm/)
    expect(modalBlock).not.toMatch(/background:\s*'#ef4444'/)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/dashboard/profile/profileStyles.scope.test.ts`
Expected: 5 yeni test FAIL.

- [ ] **Step 3: Write minimal implementation**

**3a. `profile.module.css` — base (masaüstü) kurallar.** `@media (max-width: 768px) {` satırının HEMEN ÜSTÜNE ekle (Task 3'ün base kurallarından sonra):

```css
.deleteModalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.deleteModalCard {
  background: var(--panel);
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  border: 1px solid var(--border);
}

.deleteModalTitle {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--card-title);
  margin-bottom: 8px;
}

.deleteModalBody {
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 16px;
}

.deleteModalError {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 8px;
  font-size: 0.8rem;
  margin-bottom: 12px;
}

.deleteModalInput {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-family: inherit;
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.deleteModalActions {
  display: flex;
  gap: 8px;
}

.deleteModalCancel {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
}

.deleteModalConfirm {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  border: none;
  background: #ef4444;
  color: white;
}

@media (max-width: 768px) {
```

**3b. `profile.module.css` — mobil override.** Dosyanın SON `}` satırından hemen önce ekle:

```css
  .deleteModalOverlay {
    background: rgba(8, 23, 41, 0.42);
    backdrop-filter: blur(2px);
  }

  .deleteModalCard {
    background: rgba(242, 248, 255, 0.88);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-card);
    backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
    box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
  }

  .deleteModalTitle {
    color: var(--m-ink);
  }

  .deleteModalBody {
    color: var(--m-body);
  }

  .deleteModalInput {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid var(--m-glass-border);
    color: var(--m-ink);
  }

  .deleteModalCancel {
    border: 1px solid var(--m-glass-border);
    background: rgba(255, 255, 255, 0.5);
    color: var(--m-ink);
  }

  .deleteModalConfirm {
    background: var(--m-danger);
    box-shadow: 0 8px 18px rgba(255, 45, 85, 0.35);
  }
}
```

**3c. `page.tsx` — JSX'i class'lara geçir.** `{showDeleteModal && (` ile başlayan bloğu (dosyanın en son JSX bloklarından biri, `</div>\n\n            <div className={styles.mobileSignOut}>`'dan hemen önce biter) bul ve TAMAMINI aşağıdakiyle değiştir:

Eski (aranacak/silinecek):
```tsx
            {showDeleteModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    }}
                    onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                >
                    <div
                        style={{
                            background: 'var(--panel)', borderRadius: 16, padding: 24,
                            maxWidth: 400, width: '90%', border: '1px solid var(--border)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 8 }}>
                            Hesabını silmek istediğine emin misin?
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 16 }}>
                            Bu işlem geri alınamaz. Tüm projelerin, ilanların, mesajların ve raporların kalıcı olarak silinecek.
                        </p>
                        {deleteError && (
                            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, fontSize: '0.8rem', marginBottom: 12 }}>
                                {deleteError}
                            </div>
                        )}
                        <input
                            type="password"
                            placeholder="Şifreni gir"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 12px', borderRadius: 8,
                                border: '1px solid var(--border)', background: 'var(--bg)',
                                color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.85rem', marginBottom: 16,
                            }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                                    background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                                    fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                }}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                                    background: '#ef4444', color: 'white', cursor: 'pointer',
                                    fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                    opacity: deleting ? 0.6 : 1,
                                }}
                            >
                                {deleting ? 'Siliniyor…' : 'Evet, Hesabımı Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
```

Yeni:
```tsx
            {showDeleteModal && (
                <div
                    className={styles.deleteModalOverlay}
                    onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                >
                    <div
                        className={styles.deleteModalCard}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className={styles.deleteModalTitle}>
                            Hesabını silmek istediğine emin misin?
                        </h3>
                        <p className={styles.deleteModalBody}>
                            Bu işlem geri alınamaz. Tüm projelerin, ilanların, mesajların ve raporların kalıcı olarak silinecek.
                        </p>
                        {deleteError && (
                            <div className={styles.deleteModalError}>
                                {deleteError}
                            </div>
                        )}
                        <input
                            type="password"
                            placeholder="Şifreni gir"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className={styles.deleteModalInput}
                        />
                        <div className={styles.deleteModalActions}>
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                                className={styles.deleteModalCancel}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                className={styles.deleteModalConfirm}
                                style={{ opacity: deleting ? 0.6 : 1 }}
                            >
                                {deleting ? 'Siliniyor…' : 'Evet, Hesabımı Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/app/dashboard/profile/profileStyles.scope.test.ts`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/page.tsx src/app/dashboard/profile/profileStyles.scope.test.ts
git commit -m "feat(profil-mobil): hesap silme modali liquid glass'a tasinir, hardcoded #ef4444 kaldirildi"
```

---

## Final Doğrulama (tüm task'lar bittikten sonra)

- [ ] **tsc:** `npx tsc --noEmit` — 0 hata.
- [ ] **Tam jest suite:** `npx jest --no-coverage --roots "src"` — tüm suite yeşil (yeni testler dahil, hiçbir mevcut test kırılmamış).
- [ ] **Canlı doğrulama (Playwright, mobil viewport 390×844, gerçek giriş yapılmış oturum — `/dashboard/profile` middleware'de korumalı route):**
  1. Docker Desktop açık değilse başlat, `docker compose -f docker-compose.dev.yml up -d` ile dev DB'yi ayağa kaldır, `npx prisma migrate deploy` ile şema güncel olduğunu doğrula.
  2. `npm run dev:next` ile sunucuyu başlat, mevcut bir test kullanıcısıyla (`user@arsabil.com`/`user123` — önceki oturumların `HomeMobile` doğrulamasında kullandığı hesap) giriş yap.
  3. `/dashboard/profile`'a git, mobil viewport'ta sırasıyla Portfolyo/İlanlarım/Favorilerim/Tema&Ayarlar sekmelerini aç; her birinde `getComputedStyle` ile `backdrop-filter` değerinin `blur(...)` içerdiğini ve metin renklerinin `--m-ink`/`--m-body`'nin gerçek hex karşılıklarına eşit olduğunu doğrula.
  4. Ayarlar sekmesinde "Hesabımı Sil"e tıkla, modalın cam yüzeyde açıldığını, "Evet, Hesabımı Sil" butonunun `var(--m-danger)` (`#ff2d55`) kullandığını doğrula (gerçek silme İŞLEMİNİ TETİKLEME — yalnızca modalı aç, ekran görüntüsü al, "Vazgeç" ile kapat).
  5. Masaüstü genişlikte (>768px) aynı 4 sekme + modalın BİREBİR ÖNCEKİ GİBİ (pixel-parity) kaldığını doğrula — bu planın en kritik regresyon riski budur.
  6. Koyu temaya geçip (Ayarlar → Gece) her 4 sekmede metin kontrastının okunaklı kaldığını doğrula (önceki spec'in bulduğu regresyonun tekrarlanmadığının kanıtı).
