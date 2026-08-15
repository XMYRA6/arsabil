# Superpowers Execution Queue

Bu dosya plan arsivini uygulanabilir bir siraya indirger. `README.md` hangi spec'in hangi planla kapandigini gosterir; bu dosya ise hangi isi once baslatmanin daha mantikli oldugunu soyler.

## Queue Principles

- Once veri dogrulugu ve hesap motoru, sonra gorsel/yerlesim isleri.
- Ayni yuzeye dokunan planlar cakismayacak sekilde siralanir.
- Obsolete/closure/orchestration dosyalari dispatch edilmez.
- Her item kendi canonical planindaki test/build kapilariyla kapanir.

---

## Completed / Closed In Current Branch

- [x] `2026-07-01-emsal-arsa-maliyeti.md` — kod commit: `c0fe45b`.
- [x] `2026-08-14-hesapla-masaustu-girdi-sirasi.md` — mevcut uygulama dogrulandi, kod commit: `c0fe45b`.
- [x] `2026-08-13-hesapla-masaustu-sutun-dengesi.md` — mevcut uygulama dogrulandi, kod commit: `c0fe45b`.
- [x] `2026-08-12-pazaryeri-veri-butunlugu.md` — mevcut uygulama dogrulandi, kod commit: `c0fe45b`.
- [x] `2026-08-13-pwa-guncelleme-bildirimi.md` — mevcut uygulama dogrulandi, kod commit: `c0fe45b`.
- [x] `2026-06-08-arsabil-professional-ui-redesign.md` — kod commit: `c0fe45b`; Playwright smoke PASS.
- [x] `2026-07-28-mobil-premium-liquid-glass.md` Gate 2 — Faz 2-9 detay planlari olusturuldu.

---

## Recommended Next Dispatch

### 1. Mobil Premium Liquid Glass Faz 2: Pazar + ilan detay

**Plan:** `2026-07-28-mobil-faz2-pazar-ilan-detay.md`

**Neden once:** Pazar yeri ve ilan detay, mobil urun kesfinin ana yuzeyi. Veri butunlugu ve profesyonel UI katmani kapandigi icin artik mobil cam diline guvenle tasinabilir.

**Risk:** Orta-yuksek. Marketplace liste/filtre/harita ve ilan detay CTA ayni fazda ele aliniyor.

**Definition of Done:**
- Mobil marketplace kartlari, filtreleri ve harita/liste gecisi Liquid Glass dilinde.
- Mobil ilan detay hero, metrikler ve teklif CTA safe-area ile cakismiyor.
- 390x844 Playwright smoke raporlu.

### 2. Mobil Premium Liquid Glass Faz 3: Giris, kayit, ana ekran

**Plan:** `2026-07-28-mobil-faz3-auth-ana-ekran.md`

### 3. Mobil Premium Liquid Glass Faz 4: Mesajlar, sohbet, teklifler

**Plan:** `2026-07-28-mobil-faz4-mesaj-teklif.md`

### 4. Mobil Premium Liquid Glass Faz 5: Portfoy

**Plan:** `2026-07-28-mobil-faz5-portfoy.md`

### 5. Mobil Premium Liquid Glass Faz 6: Profil, ayarlar, bildirimler

**Plan:** `2026-07-28-mobil-faz6-profil-ayar-bildirim.md`

### 6. Mobil Premium Liquid Glass Faz 7: Ilan sihirbazi

**Plan:** `2026-07-28-mobil-faz7-ilan-sihirbazi.md`

### 7. Mobil Premium Liquid Glass Faz 8: Admin

**Plan:** `2026-07-28-mobil-faz8-admin.md`

### 8. Mobil Premium Liquid Glass Faz 9: Durum ekranlari

**Plan:** `2026-07-28-mobil-faz9-durum-ekranlari.md`

---

## Do Not Dispatch Directly

Bu dosyalar orchestration/closure/pointer dosyalaridir; dogrudan kod isi olarak baslatilmamali:

- `2026-06-07-arsabil-gelistirme-yol-haritasi.md`
- `2026-06-07-arsabil-faz2.md`
- `2026-06-07-arsabil-faz3b.md`
- `2026-06-07-mobile-ui-premium-redesign.md`
- `2026-06-08-arsabil-ui-design-system.md`
- `2026-07-03-mobile-ui-redesign.md`
- `2026-07-28-mobil-premium-liquid-glass.md`
- `2026-07-29-hesapla-girdi-mimarisi.md`
