# ArsaBil Faz 3B Implementation Orchestration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement the referenced sub-plans. This file is the umbrella plan for `docs/superpowers/specs/2026-06-07-arsabil-faz3b-design.md`.

**Goal:** Faz 3B kapsamindaki uc bagimsiz gelistirmeyi production'a uygun sirayla tamamlamak: Cloudinary fotograf yukleme, ilan duzenleme, SSE mesajlasma.

**Architecture:** 3B-I once gelir cunku ilan duzenleme fotograf veri tipine baglidir. 3B-II Cloudinary sonucu uzerine wizard reuse ile edit akisini kurar. 3B-III mesajlasma altyapisinda polling'i SSE'ye tasir ve diger iki isten bagimsizdir.

**Sub-plans:**
- `docs/superpowers/plans/2026-06-07-arsabil-faz3b-i-cloudinary-photos.md`
- `docs/superpowers/plans/2026-06-07-arsabil-faz3b-ii-listing-edit.md`
- `docs/superpowers/plans/2026-06-07-arsabil-faz3b-iii-sse-messaging.md`

## Global Constraints

- DB `Listing.photos String[]` kalir; Cloudinary `publicId` yalnizca wizard state/API response tarafinda tutulur.
- Upload validation helper'lari (`src/lib/upload.ts`) korunur; MIME/size/path traversal guvenligi zayiflatilmaz.
- Cloudinary env eksikse API anlasilir hata doner; build veya unrelated route'lar kirilmaz.
- Edit akisi owner-only olmalidir; admin/owner disi PATCH reddedilir.
- APPROVED/REJECTED ilan edit sonrasi yeniden `PENDING` olur ve `isActive=false`.
- SSE Node runtime'da calisir; Edge runtime'a tasinmaz.
- SSE in-memory registry single-instance kabuludur; multi-instance Redis kapsam disidir.

---

### Phase Gate 1: 3B-I Cloudinary fotograf yukleme

**Owned by:** `2026-06-07-arsabil-faz3b-i-cloudinary-photos.md`

- [ ] `POST /api/upload` filesystem yerine Cloudinary upload yapar.
- [ ] `DELETE /api/upload` `publicId` ile Cloudinary asset siler.
- [ ] Wizard `photos` tipi `{ url; publicId }[]` olur.
- [ ] Preview/publish DB'ye yalnizca URL string dizisi yazar.
- [ ] Remove akisi UI'dan hemen kaldirir, Cloudinary delete'i fire-and-forget yapar.
- [ ] Dogrulama:

```bash
npx jest src/lib/upload.test.ts src/components/listing-wizard src/app/api/upload
npx tsc --noEmit
```

---

### Phase Gate 2: 3B-II ilan duzenleme

**Owned by:** `2026-06-07-arsabil-faz3b-ii-listing-edit.md`

- [ ] `PATCH /api/listings/[id]` owner-only guncelleme yapar.
- [ ] `/listings/[id]/edit` wizard'i mevcut ilanla pre-fill eder.
- [ ] Mevcut DB URL'lerinden `publicId` gerekirse turetilebilir; turetilemezse delete no-op/fail-soft olur.
- [ ] `/listing/[id]` sayfasinda duzenle butonu yalnizca sahibine gorunur.
- [ ] Status davranisi dogru: `APPROVED|REJECTED -> PENDING`, `PENDING -> PENDING`.
- [ ] Dogrulama:

```bash
npx jest src/app/api/listings src/components/listing-wizard src/app/listings
npx tsc --noEmit
```

---

### Phase Gate 3: 3B-III SSE mesajlasma

**Owned by:** `2026-06-07-arsabil-faz3b-iii-sse-messaging.md`

- [ ] `src/lib/sse.ts` client registry eklendi.
- [ ] `GET /api/messages/sse` auth kontrollu SSE stream acar.
- [ ] `POST /api/messages` receiver'a `notifyUser` cagirir.
- [ ] `/inbox` polling yerine `EventSource` kullanir.
- [ ] Heartbeat ve reconnect davranisi test/manuel smoke ile dogrulandi.
- [ ] Dogrulama:

```bash
npx jest src/lib/sse.test.ts src/app/api/messages src/app/inbox
npx tsc --noEmit
```

---

### Phase Gate 4: Faz 3B entegrasyon kabul testi

- [ ] Env kontrolu:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

- [ ] Tam paket:

```bash
npx tsc --noEmit
npx jest
npm run build
```

- [ ] Playwright/manual smoke:
  - Yeni ilan fotograf upload/remove.
  - Publish sonrasi listing detail fotograflari render.
  - Owner edit sayfasi pre-fill, guncelleme, status PENDING.
  - Owner olmayan kullanici edit/PATCH reddi.
  - Iki tarayici oturumunda mesaj gonderimi SSE ile anlik gorunur.

---

## Final Output

Faz 3B tamamlandiginda rapor:
- Her alt faz commit araligi.
- Cloudinary env gereksinimleri.
- Test/build sonuclari.
- SSE single-instance sinirinin acik notu.
