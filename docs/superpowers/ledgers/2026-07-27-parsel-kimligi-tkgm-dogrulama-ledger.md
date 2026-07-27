# SDD ledger — plan: docs/superpowers/plans/2026-07-27-parsel-kimligi-tkgm-dogrulama.md

Baseline: 292feab (worktree parsel-kimligi-tkgm, branch feature/parsel-kimligi-tkgm, main HEAD 292feab'dan manuel `git worktree add ... HEAD` ile dallandi — origin olu oldugu icin EnterWorktree/origin tabanli dallanma KULLANILMADI).
Spec: docs/superpowers/specs/2026-07-27-parsel-kimligi-tkgm-dogrulama-design.md
Ortam: .env + .env.local elle kopyalandi, npm install worktree icinde calistirildi.

Task 1: implementer DONE (commit c249dd5, jest 15/15, haiku)
Task 1: review — spec OK, task quality Approved, 0 Critical/Important
Task 1: minor (deferred): fetch cagri argumanlari (URL/path sirasi/Accept header) hicbir testte assert edilmiyor — lat/lng yer degistirse suite yakalamaz (brief kaynakli)
Task 1: minor (deferred): "yalnizca sunucudan cagrilir" karari yorumla belgeli ama teknik olarak zorlanmiyor (server-only guard yok) — Task 4/5 baglanirken dikkat
Task 1: minor (deferred): 8000ms timeout yolunun ayri testi yok, genel catch uzerinden dolayli kapsaniyor
Task 1: complete (commits 292feab..c249dd5, review clean)
Task 2 BASE = c249dd5

Task 2: implementer DONE (commit f36733a, jest 11/11, haiku)
Task 2: review — spec OK, Approved, 0 Critical/Important; reviewer esik davranisini gercek float aritmetigiyle bagimsiz dogruladi (tam %5 -> mismatch)
Task 2: minor (deferred): tam %1 sinirinin testi yok (brief kaynakli); reviewer sayisal olarak dogru cozuldugunu teyit etti (diffPct===1 -> minor)
Task 2: complete (commits c249dd5..f36733a, review clean)
Task 3 BASE = f36733a

Task 3: implementer DONE (commit 9ff4ad5, jest 401/401, tsc 0, migration 20260727204057_parcel_identity, haiku)
Task 3: review — spec OK, Approved, 0 Critical/Important; migration SQL 10 saf ADD COLUMN, NOT NULL/DEFAULT yok, yikici ifade yok
Task 3: PLAN METNI HATASI dogrulandi — planin "baseline jest 385" ifadesi fix/anasayfa-takip-kalemleri branch'inden gelmis; bu branch'in gercek baseline'i 375. Git ile teyit: dce07b1/292feab yalnizca dokuman, silinen/skip edilen test yok. Plan metni duzeltildi (commit asagida).
Task 3: minor (deferred): schema.prisma'da yeni alan blogunun hizalamasi cevre bloktan genis — `npx prisma format` duzeltir, kozmetik
Task 3: complete (commits f36733a..9ff4ad5, review clean)
Task 4 BASE = plan duzeltme commit'i (asagidaki hash)
69df1fb docs(plan): baseline test sayisi duzeltildi 385 -> 375 (yanlis branch'ten alinmisti)

Task 4: implementer DONE (commit 4a7a12b, jest 8/8, haiku)
Task 4: review — spec OK, Approved, 0 Critical/Important; 401/429/400 yollarinda TKGM'ye ulasilamadigi yapisal olarak (yalnizca mock ile degil) dogrulandi; guard sirasi mevcut upload/offers/messages route desenleriyle ayni
Task 4: minor (deferred): koordinat dogrulamasi rate limit'ten SONRA — bozuk koordinatli istek kullanicinin kendi kotasindan yiyor (guvenlik sorunu degil, mevcut konvansiyonla ayni)
Task 4: minor (deferred): sinir-tam koordinat (35/43/25/45) ve lat/lng parametresi hic yokken davranisin testi yok
Task 4: complete (commits 69df1fb..4a7a12b, review clean)
Task 5 BASE = 4a7a12b

Task 5: implementer DONE (commit b8d37e0, jest 8/8 + tam suite 417/417, sonnet)
Task 5: review — spec OK, 1 Important: brief'in test kodu @testing-library/user-event import ediyordu, paket kurulu degildi, implementer npm install ile ekleyip package.json/lock'u commit'e koydu. Reviewer repodaki TUM tikla-simule-eden RTL testlerinin fireEvent.click kullandigini gosterdi (BottomSheet, AdminListings, WizardShell) — bagimlilik kacinilabilirdi.
Task 5: PLAN-MANDATED celiski — plan metninin kendi test kodu user-event'i dayatiyordu. Insan partnere soruldu (2026-07-28).
Task 5: ADJUDICATION (insan partner) — bagimlilik DUSURULECEK, fireEvent'e gecilecek. Task 1'deki --seal-border-soft / Faz 2.5 karariyla ayni sinif.
Task 5: reviewer effect guvenligini ayrica denetledi — unmount sirasinda bekleyen import('leaflet') yarisi dahil sizinti YOK; 44px kurali media query icinde; GeoJSON [lng,lat] -> Leaflet [lat,lng] cevrimi dogru
Task 5: minor (deferred): ParcelPicker `await import('leaflet')` kullaniyor, MapView.tsx:170 ise `(await import('leaflet')).default` — ayni isi yapan iki bilesende tutarsizlik; su an calisiyor (tsc/eslint temiz) ama Task 10 canli senaryosunda harita gercekten render edilerek dogrulanmali
Task 5: fix round 1/5 (1 addressed, 0 open — user-event dusuruldu, fireEvent.click'e gecildi, package.json/lock Task 5 oncesi haline dondu; commits b8d37e0..6283f08)
Task 5: complete (commits 4a7a12b..6283f08, review clean)
Task 6 BASE = 6283f08

NOT (2026-07-28): Subagent dispatch'i hesabin aylik harcama limitine takildi (Task 6 implementer'i API hatasiyla dustu, worktree temizdi). Task 6'dan itibaren isi controller oturumu INLINE yapiyor — bagimsiz task reviewer'i YOK. Butce acildiginda tum branch'e tek bir whole-branch review kosulacak; bu, atlanan per-task review'larin telafisi olarak ledger'a yaziliyor.

Task 6: INLINE tamamlandi (commit f268394, jest 421/421 tam suite, tsc 0)
Task 6: PLAN EKSIGI bulundu — plan yalnizca listings/new'i sayiyordu, oysa src/app/listings/[id]/edit/page.tsx de WizardFormData kuruyor; tip genisletilince tsc kirildi (TS2345, edit/page.tsx:42).
Task 6: KARAR (controller) — edit sayfasi mevcut lat/lng ve dogrulanmis parseli forma yukluyor, PATCH govdesine lat/lng ekliyor; ANCAK pin zorunlulugu duzenlemede UYGULANMADI. Gerekce: parsel alanlari bu surumle geldi, mevcut ilanlarin hicbirinde koordinat yok — zorunlu tutmak eski ilanlari duzenlenemez hale getirirdi. Kod icine gerekce yorumu yazildi.
Task 6: acik kalem (final review'da bakilsin): edit sayfasindaki parcel yeniden kurulumu listing.parcelGeometry'yi tip dogrulamasi yapmadan ParcelInfo.geometry'ye atiyor (Prisma Json -> unknown). Bozuk/eksik geometry DB'ye ancak sunucu yazabildigi icin pratik risk dusuk.
Task 7 BASE = f268394

Task 7: INLINE tamamlandi (commit 173dd6a, jest 434/434 tam suite, tsc 0)
Task 7: PLAN TIP HATASI — plan `parcelGeometry: unknown | null` diyordu, Prisma'nin Json? alanina yazilamiyor (TS2322). Duzeltme: `GeoJSONPolygon | typeof Prisma.DbNull`; bos durumda duz null DEGIL Prisma.DbNull. parcelSnapshot testi de buna gore guncellendi.
Task 7: PLAN EKSIGI — PATCH'te `existing` yalnizca { userId: true } seciyordu, koordinat karsilastirmasi icin lat/lng de secilmeli (TS2339). select genisletildi.
Task 7: KARAR (controller) — PATCH yalnizca koordinat GERCEKTEN degistiginde yeniden dogruluyor (planin niyeti buydu ama kodu her kaydetmede cagiriyordu). Her edit kaydinda TKGM'ye gereksiz istek gitmesini onler. 6 testlik ayri PATCH suite'i yazildi (degisti/aynidir/hic yok/sahte veri/403 yollari).
Task 8 BASE = 173dd6a

Task 8: INLINE tamamlandi (commit asagida, jest 444/444, tsc 0)
Task 8: AYNI HATA SINIFININ IKINCI ORNEGI bulundu — mock sabitleri kaldirilinca page.tsx:341'deki `listing.lat ?? 41.042` (Besiktas) ortaya cikti: koordinatsiz ilan detay haritasinda yanlis yerde gosteriliyordu. Harita artik koordinat yoksa hic render edilmiyor, yerine durust bir not basiliyor.
Task 8: page.module.css'in scope-guard testi (pageStyles.scope.test.ts) yeni siniflarla yesil kaldi.
Task 9 BASE = asagidaki hash
e855c52 fix(listing): sabit 820 m2 mock bugu giderildi + parsel kimligi ve alan karsilastirmasi

Task 9: INLINE tamamlandi (commit asagida, jest 452/452, tsc 0)
Task 9: MapView'in CSS modulu olmadigi (tum stiller inline) plan yazimindaki tespit doğrulandi — bildirim inline stille eklendi.
Task 9: ISTANBUL_COORDS sabiti tamamen olu kaldi, silindi. Skor icin de rastgele fallback vardi (55+random*40), sabit 70'e cevrildi.
Task 9: test tiplemesi duzeltildi — jest gecse de tsc jenerik cikarimda excess-property hatasi veriyordu; testte acik TestListing tipi kullanildi.
Task 9: eslint tam tarama: 2 hata + 10 uyari, HEPSI dokunulmayan dosyalarda (user/export test, dashboardStyles.scope.test, page.tsx img). Bu plandan yeni ihlal yok.
Task 10 BASE = asagidaki hash
c0f7ea3 fix(map): rastgele Istanbul koordinati uretimi kaldirildi

Task 10: INLINE tamamlandi (commit 83f3c00). tsc 0, eslint yeni ihlal yok, jest 455/455, npm run build basarili.
Task 10: CANLI DOGRULAMA (dev server :3007, docker postgres, user@arsabil.com):
  - pin yokken Ileri disabled=true, pin atilinca false  ✓
  - /api/parcel/lookup Tekirdag koordinati -> 200 verified, Ada 0 / Parsel 1871 / 830 m2  ✓
  - Istanbul merkez -> 200 not_found (hata degil)  ✓ ; Londra -> 400  ✓
  - ParcelPicker haritasi gercekten render oluyor (7 leaflet pane, 6/6 tile yuklu, 0 bozuk) — Task 5'in `.default` interop minor'i boylece kapandi  ✓
  - Haritaya tiklandi -> TKGM gercek parsel dondu (Kalaba/Tarla/33.000 m2) -> sonuc karti + POLIGON gercekten cizildi (1 poligon, 1 marker) ✓ GeoJSON->Leaflet cevrimi canlida dogrulandi
  - Ilan detayinda sabit "820 m2" YOK, gercek 500 m2 var; konumsuz notu cikiyor  ✓
  - Marketplace: "1 ilanin konumu belirtilmemis, haritada gosterilmiyor."  ✓
  - 400+ donen istek kalmadi  ✓
Task 10: CANLI TURDA 3 GERCEK KUSUR BULUNDU VE DUZELTILDI (hicbiri birim testlerinin yakalayabilecegi turden degildi) — bkz. commit 83f3c00.
Task 10: complete (commits c0f7ea3..83f3c00)

ACIK KALEM (BU SPEC'IN KAPSAMI DISINDA, kullaniciya raporlandi):
  (a) MapView'da marker'lari kuran effect'in bagimlilik dizisi [] — ilanlar fetch ile SONRADAN geldigi icin marker'lar hic kurulmuyor. ONCEDEN VAR OLAN kusur, bu plandan bagimsiz; konumsuz sayaci render'a tasinarak bu plandan etkilenmesi engellendi ama marker yenileme sorunu duruyor.
  (b) Ilan detayinda hala mock kaynakli alanlar var: imarDurumu, emsal, arsaPayi, "Tahmini Deger 5.171.642 TL", "Net Kar +%34", sehir/ilce fallback'leri (Istanbul/Besiktas). 820 m2 ve lat/lng ile ayni sinif; bu spec yalnizca alan+koordinati kapsiyordu.
