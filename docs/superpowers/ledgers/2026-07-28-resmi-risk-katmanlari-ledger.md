# SDD ledger — plan: docs/superpowers/plans/2026-07-28-resmi-risk-katmanlari.md

Worktree: `.claude/worktrees/risk-katmanlari`
Branch: `feature/resmi-risk-katmanlari`
Base: `2403056` (main)
Spec: `docs/superpowers/specs/2026-07-28-resmi-risk-katmanlari-design.md` (`9751f61`)

Baseline (main, 2026-07-28): jest 455 geçiyor, `tsc --noEmit` 0 hata.

## Ön uçuş taraması (Task 1 dispatch'inden önce)

- Plan içi çelişki taraması yapıldı: Global Constraints ile task'lar arasında çelişki YOK.
- Review rubriğinin kusur sayacağı plan zorunluluğu YOK (her testin gerçek assertion'ı var, mükerrer mantık bloğu yok).
- Plan yazımı sırasında bulunan iki kısıt zaten plana işlendi: `/hesapla`'da `R` state'i yok (ayrık `riskLevel` yüzdesi), `MiniMap` kasıtlı etkileşimsiz.

## SONUÇ

**Final whole-branch review (opus, `2403056..5ebe4cf`): Ready to merge = With fixes.** Critical yok, 5 Important. Fix dalgası (`5ebe4cf..e2f8b59`, 3 commit) + tek scoped re-review (opus) → **7/7 addressed, Ready to merge = Yes.** Branch head `e2f8b59`, jest 525/525, tsc 0, eslint yeni ihlal yok (12 pre-existing, stash ile önce/sonra karşılaştırılarak doğrulandı), build başarılı.

Final review'ın yakaladığı ve düzeltilen 5 Important:
1. **Ölçülmüş taşkın verisi gizleniyordu** — risk satırı `faultDistanceM != null`'a bağlıydı, `floodQ100` içine gömülüydü → faydan uzak + Q100 taşkın bölgesindeki parselde ekranda hiçbir şey yok. Ayrıca "ölçüldü, 25 km'de fay yok" ile "TUCBS erişilemedi" aynı görünüyordu. Artık `riskSnapshotAt != null`'a bağlı, iki durum ayrı metinlerle. **Bu kısmen spec §7.1 kusuruydu** — implementasyon spec'ten dikkatliydi, spec onu geri çekti.
2. **İlan kaydı ~32 sn bloke olabiliyordu** — sıralı snapshot + `measureRisk` içinde 3 ardışık 8 sn timeout. Artık `Promise.all` + `riskSnapshot.ts`'te 6 sn toplam bütçe (her iki çağrı yeri devralıyor). Fake-timer testi: 5999 ms'de settle olmamış, 6000 ms'de boş snapshot.
3. **"Uygula" risk payını sıfırlayabiliyordu** — `suggestedR=1` → `riskLevel=0` → `isRiskEnabled` kapanıyor. Kullanıcı %10 varsayılanda otururken resmi görünümlü kartla payını sıfırlıyordu. "Risk Payı" genel belirsizlik payı; fay ölçümü piyasa/inşaat hakkında hiçbir şey söylemiyor. Artık `percent===0` iken buton AĞAÇTA YOK (disabled değil) + kapsam cümlesi eklendi. Dört feragat ifadesi karakterine dokunulmadı.
4. **`ParcelPicker` sonuç kartları hâlâ wizard dilindeydi** ("İlanınız doğrulanmadan yayınlanabilir") + `/hesapla` auth'suz ama `/api/parcel/lookup` 401 dönüyor → anonim kullanıcıya "servis çalışmıyor" deniyordu. Metinler opsiyonel prop'a alındı (destructuring default, wizard çıktısı bit bit aynı, `ParcelPicker.test.tsx` diff'te sıfır silinen satır), 401 ayrı `unauthorized` durumu oldu.
5. **Mobil**: özellik `.desktopSidebar` içindeydi (`display:none !important`) → mobilde erişilemez ama gizli konteynerde Leaflet mount ediliyordu. **İNSAN KARARI (2026-07-28): mobil kapsam DIŞI, takip kalemi olarak kaydedildi** (spec §10'a eklendi). Yalnızca ölü maliyet giderildi (`isDesktopViewport` ile koşullu mount).

**Fix dalgasının GETİRDİĞİ 3 yeni Minor (açık, merge'i engellemiyor):**
- `wms.ts:19-21` yorumu `riskSnapshot.ts`'in bütçesinin `TIMEOUT_MS`'ten türediğini söylüyor — YANLIŞ, `SNAPSHOT_DEADLINE_MS=6000` bağımsız sabit. Yorum yanıltıcı.
- `listings/[id]/route.ts:75` `let parcelFields: Record<string, unknown>` — snapshot alan adlarının derleme zamanı kontrolünü siliyor; `Partial<Prisma.ListingUpdateInput>` geri kazandırırdı.
- `hesapla/page.tsx:97` 768-769 px arası kesirli viewport'ta ne `max-width:768px` ne `min-width:769px` eşleşiyor → sidebar var ama picker yok. `not all and (max-width: 768px)` CSS'i birebir yansıtırdı.

**Test kapsamı en ince yer:** Madde 1, 5 ve 7 testsiz ship oldu; özellikle taşkın-only render yolu yalnızca gözle doğrulandı (ilan detay sayfası için render harness'ı yok — `next-auth`/`next/navigation`/dinamik Leaflet mock'lanmamış).

## İlerleme

Task 1: complete (commits 2403056..05d966b, review clean) — jest 464/464
Task 10: complete (commit 5ebe4cf) — TÜM 5 adım gerçek ortamda koşuldu, hiçbiri atlanmadı:
  1. Komut paketi: FAIL → fix → PASS. `hesapla/page.tsx:93`'te main'e göre 1 YENİ eslint ihlali bulundu ve kodtabanının standart `eslint-disable-next-line` konvansiyonuyla giderildi. tsc 0, jest 517/517, build başarılı.
  2. Canlı TUCBS: PASS — `diri_fay` ve `taskin_tehlike_haritasi_q100` ikisi de gerçek 256x256 PNG döndü (mock değil).
  3. 4 Playwright senaryosu: PASS — gerçek authenticated oturum + gerçek DB'ye seed edilmiş koordinatlı ilan + gerçek harita etkileşimi.
  4. Dürüstlük sınırları: PASS — dört zorunlu ifade hem kaynakta hem canlı DOM'da doğrulandı.

Task 9: complete (commits 56b3921..a2bbc94, review clean) — jest 517/517, tsc 0, next build temiz
Task 9: fix round 1/5 (2 addressed, 0 open; commits f92bd68..a2bbc94). (1) `withSuggestedRiskLevel` saf yardımcıya çıkarıldı (`riskSuggestionHelpers.ts`), id artık yüzdeden türüyor; test (c) iki farklı yüzdenin id'lerini `Set` boyutuyla karşılaştırıyor → fix'siz kodda Set boyutu 1 olur, yani gerçekten yakalar. (2) `ParcelPicker`'a opsiyonel `hint` prop'u (varsayılan = orijinal metin, destructuring default ile — `hint || ''` DEĞİL), `/hesapla` "isteğe bağlıdır" diyen kendi metnini geçiyor. Wizard'ın tek çağrı yeri prop geçmiyor, `ParcelPicker.test.tsx` diff'te hiç yok → wizard çıktısı bit bit aynı.
Task 9: review (commits 56b3921..f92bd68) — spec ❌, 2 Important (ikisi de plan-mandated ama task'ın KENDİ kısıtlarını ihlal ediyor → insana sorulmadan fix dispatch edildi):
  (1) `page.tsx:122` `applyRiskSuggestion` sabit `id:'tbdy-suggested'` kullanıyor, dedup ise `value` üzerinden → iki farklı öneri arka arkaya uygulanınca mükerrer React key (`key={opt.id}`), stale click handler riski. `applyRiskSuggestion` için hiç test yoktu.
  (2) `ParcelPicker.tsx:119-121` sabit ipucu: "Konum, **ilanın** haritada doğru görünmesi için **zorunludur**" — /hesapla'da konum AÇIKÇA opsiyonel ve "ilan" bu sayfada olmayan bir kavram. Kullanıcıya sayfanın gerçek davranışının tersi söyleniyor.
Task 9: iki implementer sapması reviewer tarafından doğrulandı ve kabul edildi: (a) `@testing-library/user-event` devDependency kurulumu (brief'in kendi test kodu import ediyordu, orantılı), (b) `/tahmini/i` → `/Tahmini/` (brief kendi içinde çelişiyordu: feragat metninde küçük harf "tahminidir" + `<em>Tahmini</em>` → ambiguous match). Reviewer feragat metninin karakteri karakterine korunduğunu teyit etti.
Task 9: minor (deferred): risk lookup effect'i tüm `parcelValue` nesnesine bağlı; ParcelPicker'ın status-only patch'leri de aynı `/api/risk/lookup` isteğini tekrar tetikliyor (RISK_LOOKUP limiti 20/dk, her sorgu 2-3 upstream WMS turu). `[parcelValue.lat, parcelValue.lng]` yeterli olurdu.
Task 9: minor (deferred): `page.tsx:125` `sortOrder: prev.length` diziyi `value`'ya göre sıralamadan ÖNCE atanıyor → alan gerçek sırayı yansıtmıyor. Şu an kullanılmıyor, kozmetik.
Task 8: complete (commits c17e327..56b3921, review clean) — jest 507/507, tsc 0
Task 8: fix round 2/5 (1 addressed, 0 open — leaflet mock'lu gerçek test; commits db78538..56b3921). Implementer RED kanıtı üretti: reset satırları silinince `tileLayer.wms` 3 yerine 2 çağrıldı. Re-reviewer bunu elle izleyip doğruladı ve ayrıca mock-modül kimliğini teyit etti (`__importDefault`/`__importStar` aynı ham fabrika nesnesine çözülüyor → çağrı sayısı assertion'ları anlamlı, tesadüfi değil). Production kodu bu turda sıfır diff.
Task 8: fix round 1/5 (1 addressed kod tarafında, 1 yeni açık — test boş; commits 0a77f98..db78538). Production fix (ref reset, first effect cleanup) doğru ve her iki sonucu da kapatıyor. AMA yeni "covering test" vakum: repo'da leaflet mock'u yok + ts-jest `module:'commonjs'` → `await import('leaflet')` mikro-görevde çözülüyor, senkron test gövdesinde hiç tick yok, `mapRef.current` baştan sona `null`, `attach()` guard'ı her seferinde kısa devre yapıyor. Test fix'siz kodda da AYNEN geçer.
Task 8: fix round 2/5 dispatch edildi — testi gerçek yap (leaflet mock + async act, ve ref reset satırları silinince KIRMIZI olduğunu göster) VEYA yanıltıcı testi sil ve raporda "yalnızca gözle doğrulandı" de.
Task 8: review (commits c17e327..0a77f98) — spec ✅, task quality Approved ama 1 Important (plan-mandated): `MiniMap.tsx:92-131` harita `[lat,lng]` değişince yeniden kuruluyor, katman ref'leri sıfırlanmıyor → seçili katman yeni haritaya bağlanmıyor, sonraki uncheck ölü katmanda `removeLayer` çağırıyor. Bugün dormant (page.tsx koordinatı bir kez alıyor). Planla ÇELİŞMİYOR (ihmal, karar değil) → insana sorulmadan fix dispatch edildi. Not: bu, hafızadaki mevcut `MapView` `[]` dep-array bug'ıyla aynı sınıf.
Task 8: iki implementer sapması reviewer tarafından doğrulandı ve onaylandı: (a) `MiniMap.module.css` oluşturuldu (brief `styles.layerToggles`e atıf yapıyordu ama modül yoktu; kardeş bileşenlerde colocated CSS module konvansiyonu doğrulandı), (b) `@jest-environment jsdom` pragma'sı (jest.config default `node`; `ParcelPicker.test.tsx` aynı pragma'yı taşıyor).
Task 7: complete (commits 887eb27..c17e327, review clean) — jest 503/503, tsc 0. Migration: `20260728125627_listing_risk_snapshot`. Reviewer iki güvenlik riskini doğrudan kod okuyarak temizledi: create route'ta `...riskSnapshot` en son spread ve gövde destructure'ı risk alanlarını hiç okumuyor; update route'ta koordinat yoksa alanlar `data`'ya hiç girmiyor.
Task 7: minor (deferred): `[id]/route.ts:73` değişken adı `parcelFields` ama artık risk alanlarını da taşıyor — yanıltıcı ad.
Task 7: minor (deferred, plan-mandated): `buildParcelSnapshot` ve `buildRiskSnapshot` `Promise.all` yerine sırayla await ediliyor; ikisi de 8 sn timeout'lu ağ turu yapıyor → ilan kaydında gereksiz gecikme. Brief'in Step 7/8 kodu böyle yazmış.
Task 6: complete (commits 3c965bf..887eb27, review clean) — jest 500/500, tsc 0
Task 6: fix round 1/5 (2 addressed, 0 open — `buildWmsParams` ortak yardımcısı + 2 yeni 502 testi; commits ce3ab8a..887eb27). Re-reviewer grep ile `version:'1.1.1'`in `src/` içinde artık TEK yerde olduğunu ve route validasyonunun bayt bayt değişmediğini doğruladı.
Task 6: minor (deferred): `TIMEOUT_MS = 8000` hem `wms.ts:18` hem `tiles/route.ts:14` içinde ayrı tanımlı — az önce düzeltilen desenin küçük bir benzeri, fix diff'inin dışında.
Task 6: review (commits 3c965bf..ce3ab8a) — spec ✅ ama 2 Important, ikisi de plan-mandated:
  (1) `route.ts:147-152` WMS parametre setini `wms.ts:buildWmsUrl`'ü çağırmak yerine sıfırdan kuruyor → `version=1.1.1` pini iki dosyada. Brief'in Interfaces bloğu `Consumes: buildWmsUrl` diyor ama Step 3 kodu çağırmıyor — plan KENDİ İÇİNDE çelişiyor. **İNSANA SORULDU (2026-07-28): tekrarı kaldır, ortak yardımcı çıkar.** Bu karar brief'in Step 3 kodunu geçersiz kılar.
  (2) 502'nin üç tetikleyicisinden yalnızca biri (ağ istisnası) test edilmiş; upstream non-ok ve 200+PNG-olmayan content-type testsiz. İkincisi güvenlik açısından anlamlı — XML hata belgesi tarayıcıya tile diye servis edilmemeli.
Task 6: minor (deferred): bbox regex `[\d.]+` çok noktalı bozuk değere izin veriyor (`1.2.3,0,0,0`); width/height `Number.isInteger` kontrolü yok. İkisi de zararsız — upstream reddeder, 502 olarak yüzeye çıkar.
Task 5: complete (commits f85de5c..3c965bf, review clean, hiç bulgu yok) — jest 489/489
Task 4: complete (commits d6a4824..f85de5c, review clean) — jest 483/483
Task 4: fix round 1/5 (1 addressed, 0 open — decodePng throw koruması; commits c5453e6..f85de5c). Re-reviewer catch kapsamının dar olduğunu ve iki "sonuç yok" halinin hâlâ ayrıştığını doğruladı.
Task 4: review (commits d6a4824..c5453e6) — spec ✅ ama 1 Important: `lookup.ts:124,141` `decodePng` korumasız, bozuk PNG gövdesinde `measureRisk` throw eder ("ASLA throw etmez" kısıtı ihlali). Kusur brief'in referans kodundan geliyor (plan-mandated) ama planın KENDİ kısıtıyla çelişmiyor — kısıtı yerine getiriyor, bu yüzden insana sorulmadan fix dispatch edildi.
Task 4: minor (deferred): `faultDistance` dönüş tipi gevşek `{ok: boolean; distanceM: number|null}` — ayrık birleşim (discriminated union) değil; şu an tüm dönüş noktaları doğru, ileride `ok:false` dalında `distanceM` set edilmesini TS yakalayamaz.
Task 3: complete (commits 4382214..d6a4824, review clean) — jest 476/476, tsc 0. Reviewer "contains" tuzağını kontrol etti: test hem `version=1.1.1` hem `not.toContain('1.3.0')` hem `startsWith(WMS_BASE)` pinliyor.
Task 3: minor (deferred): `wms.test.ts` HTTP non-ok (404/500) ve timeout/abort yollarına ayrı test içermiyor. İkisi de doğru implement edilmiş ve gözle doğrulanabilir; boşluk brief'in kendi test dosyasından geliyor, implementer sapması değil. Final review triyaj etsin.
Task 2: complete (commits 05d966b..4382214, review clean) — jest 470/470. Reviewer float aritmetiğini bağımsız doğruladı: `toBe` eşitlikleri yuvarlama sayesinde gerçekten tam.
Task 2: minor (deferred): `suggestedR` parametresi brief'te `gammaF`, kodda `gamma` — kozmetik; reviewer `gamma`'nın modül seviyesindeki `gammaF` fonksiyonunu gölgelememesi açısından daha iyi olduğunu belirtti. Düzeltme önerilmiyor.
Task 1: minor (deferred): `sampling.ts` içinde iki "merkez" tanımı tutarsız — `nearestOpaquePixelPx` kesirli geometrik merkez `(w-1)/2` (256'da 127,5), `isCenterOpaque` ise `Math.floor((w-1)/2)` (127). Testlerdeki tek sayı boyutlarda (8, 9) görünmüyor; üretimdeki 256×256'da yarım piksel sapma var. Fonksiyonel hata değil (km ölçeğinde ihmal edilebilir) ama çift boyutta testi yok. Final review triyaj etsin.

