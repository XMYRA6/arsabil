# ArsaBil Gelistirme Yol Haritasi Implementation Orchestration Plan

> **For agentic workers:** This is an umbrella/orchestration plan for `docs/superpowers/specs/2026-06-07-arsabil-gelistirme-yol-haritasi-design.md`. Implement concrete work through the phase plans listed below.

**Goal:** 2026-06-07 genel yol haritasindaki Faz 1A, Faz 1B, Faz 2, Faz 3 ve Faz 4 islerini sirali, dogrulanabilir ve birbirini ezmeyen alt planlar halinde yurutmek.

**Architecture:** Yol haritasi tek bir kod degisikligi paketi degil, fazlar arasi urun sirasidir. Her faz kendi plan dosyasinda uygulanir; bu dosya karar agaci, bagimlilik ve kabul kapilarini tutar.

## Phase Map

- **Faz 1A:** `docs/superpowers/plans/2026-06-07-arsabil-faz1a-plan.md`
- **Faz 1B:** `docs/superpowers/plans/2026-06-07-arsabil-faz1b-plan.md`
- **Faz 2:** `docs/superpowers/plans/2026-06-07-arsabil-faz2.md`
  - `2026-06-07-arsabil-faz2a-plan.md`
  - `2026-06-07-arsabil-faz2b-plan.md`
- **Faz 3A:** `docs/superpowers/plans/2026-06-07-arsabil-faz3a-plan.md`
- **Faz 3B:** `docs/superpowers/plans/2026-06-07-arsabil-faz3b.md`
  - `2026-06-07-arsabil-faz3b-i-cloudinary-photos.md`
  - `2026-06-07-arsabil-faz3b-ii-listing-edit.md`
  - `2026-06-07-arsabil-faz3b-iii-sse-messaging.md`
- **Faz 4 UI Design System:** `docs/superpowers/plans/2026-06-08-arsabil-faz4-ui-design-system.md`

## Global Constraints

- Fazlar birbirinin migration varsayimlarini bozmadan siralanir.
- Her faz sonunda `npx tsc --noEmit`, `npx jest`, `npm run build` calisir.
- Faz 3 odeme/VIP isleri, Faz 1 urun deneyimi ve Faz 2 admin/marketplace zemini tamamlanmadan baslatilmaz.
- Yol haritasi dosyasi dogrudan implementasyon brief'i olarak kullanilmaz; ilgili faz planina inilir.

---

### Gate 1: Faz 1A

- [ ] Dashboard, mesajlasma UI ve ilan wizard tamamlandi.
- [ ] Listing/Message schema degisiklikleri migrate edildi.
- [ ] Upload guvenlik kontrolleri mevcut testlerle sabitlendi.
- [ ] Mobil temel akislar yatay tasma olmadan calisiyor.

### Gate 2: Faz 1B

- [ ] Profil, bildirimler ve senaryo karsilastirma tamamlandi.
- [ ] Bildirim modeli ve navbar badge davranisi dogrulandi.
- [ ] Public profil ve compare linkleri auth durumuna gore dogru calisiyor.

### Gate 3: Faz 2

- [ ] Admin onay akisi, SaaS plan limitleri ve e-posta tetikleyicileri tamamlandi.
- [ ] Marketplace filtre/harita/favoriler ve ilan detay yenilemesi tamamlandi.

### Gate 4: Faz 3

- [ ] Stripe/VIP/feature gating Faz 3A ile tamamlandi.
- [ ] Cloudinary/edit/SSE Faz 3B ile tamamlandi.

### Gate 5: Faz 4

- [ ] UI design system 2 tema, ThemeToggle ve anti-flash script ile tamamlandi.
- [ ] Son gorsel smoke desktop + mobile alindi.

---

## Final Acceptance

- Tum faz planlari complete.
- Tum migration'lar uygulanabilir ve geri donuk veri okuma kirilmiyor.
- `npx tsc --noEmit`, `npx jest`, `npm run build` yesil.
- Kritik kullanici akislari Playwright ile duman testi aldi: hesapla, kaydet/rapor, ilan yayinla, admin onayla, marketplace/favori, mesajlasma, profil, auth.
