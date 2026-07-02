# AI-Ajan Orkestrasyonlu Yazılım Bakımında Görev-Parçalı Review ve Kök-Neden-Öncelikli Hata Ayıklama: ArsaBil Projesinden Bir Vaka Çalışması

**Tarih:** 2026-07-01
**Kapsam:** `feature/production-readiness` dalı, ArsaBil (Next.js 16 / React 19 / Prisma) platformu — commit aralığı `dfc2dd9`..`5ecdddf` (15 commit)
**Yazar:** Claude Code (oturum kaydı, Academic Research Skills — ARS v3.13.0 `academic-pipeline` orkestrasyonuyla üretildi), Emre Taner (proje sahibi) gözetiminde
**Atıf formatı:** APA 7.0

---

## Özet

Bu vaka çalışması, ArsaBil platformunda AI-ajan orkestrasyonuyla (subagent-driven-development metodolojisi) yürütülen bir renk-token konsolidasyonu ve Framer Motion migrasyonunu, ardından bu çalışma sırasında ortaya çıkan bir prodüksiyon hatasının sistematik kök-neden analizini belgelemektedir. On görevlik bir plan, her görev için implementer-subagent + bağımsız reviewer-subagent akışıyla ve sonunda tüm birikimli diff için geniş kapsamlı bir final review ile yürütülmüş; ~50 dağınık onaltılık renk değeri semantik CSS custom property token sistemine bağlanmış, landing page'in elle yazılmış scroll-reveal mantığı `framer-motion`'a taşınarak `prefers-reduced-motion` desteği kazanılmıştır. Ayrı bir olayda, kullanıcının bildirdiği bir runtime çökmesi (`Cannot read properties of undefined (reading 'reportCount')`) sistematik hata ayıklama disipliniyle izlenmiş; kök neden (yerel Docker/Postgres kapalıyken Prisma başlatma hatasının API'nin `stats` alanı olmayan bir hata gövdesi döndürmesine, bunun da ön ucun HTTP durumunu kontrol etmeden geçerli veri sanılmasına yol açması) izole bir Node.js reprodüksiyonuyla ampirik olarak doğrulanmıştır. Bulgular, yazılım mühendisliği literatüründeki kod-review etkinliği (Jureczko, 2020) ve sistematik hata ayıklama (Li & Coblenz, 2026) bulgularıyla karşılaştırılmış; AI-subagent tabanlı review süreçlerinin insan-review literatürüyle yalnızca kısmi ve dikkatli biçimde analojik kurulabileceği tartışılmıştır. Çalışmanın iki somut katkısı öne çıkmaktadır: (a) kök-neden analizinin izole reprodüksiyonla ampirik doğrulandığı, iyi belgelenmiş bir çalışma örneği ve (b) tasarım-token mimarisinde canvas/PDF/vektör-API gibi CSS `var()` çözemeyen render bağlamları için literatürde belgelenmemiş bir "bilinçli istisna" deseni. Bu makale bir tam ampirik çalışma değil, bir deneyim raporu (experience report) olarak konumlandırılmaktadır.

**Anahtar kelimeler:** AI-ajan orkestrasyonu, subagent-driven development, kod review, kök neden analizi, design token, CSS custom properties, vaka çalışması

## Abstract

This case study documents an AI-agent-orchestrated (subagent-driven-development methodology) color-token consolidation and Framer Motion migration on the ArsaBil platform, followed by a systematic root-cause analysis of a production defect that surfaced during the same work. A ten-task plan was executed with an implementer-subagent plus an independent reviewer-subagent per task, concluding with a broad final review of the cumulative diff; roughly 50 scattered hexadecimal color literals were migrated to a semantic CSS custom-property token system, and the landing page's hand-rolled scroll-reveal logic was migrated to `framer-motion`, gaining built-in `prefers-reduced-motion` support as a side effect. In a separate incident, a user-reported runtime crash (`Cannot read properties of undefined (reading 'reportCount')`) was traced using systematic-debugging discipline; the root cause — a Prisma initialization failure while local Docker/Postgres was down, causing the API to return an error body without a `stats` field, which the frontend then treated as valid data without checking the HTTP status — was empirically confirmed via an isolated Node.js reproduction. Findings are compared against the software-engineering literature on code review effectiveness (Jureczko, 2020) and systematic debugging (Li & Coblenz, 2026); the paper argues that AI-subagent review processes can only be analogized to the human-review literature partially and cautiously. Two concrete contributions are foregrounded: (a) a well-instrumented, empirically-confirmed root-cause-analysis worked example, and (b) an undocumented "intentional exception" pattern for design-token architecture in mixed DOM/canvas/PDF rendering contexts. This paper is positioned as an experience report, not a full empirical study.

**Keywords:** AI agent orchestration, subagent-driven development, code review, root cause analysis, design tokens, CSS custom properties, case study

---

## 1. Giriş

### 1.1 Bağlam ve Problem

ArsaBil, Next.js 16 tabanlı bir arsa payı / kat karşılığı fizibilite platformudur. Projenin `feature/production-readiness` dalı üzerinde, kod tabanına önceki geliştirme fazlarından (Aurora UI yeniden tasarımı dahil) dağılmış yaklaşık 50 sabit onaltılık (hex) renk değerinin, mevcut semantik CSS custom property token sistemine bağlanması ve landing page'in elle yazılmış `IntersectionObserver` tabanlı scroll-reveal animasyonlarının `framer-motion` kütüphanesine taşınması planlanmıştır. Bu çalışma esnasında, kullanıcı ayrı ve ilgisiz görünen bir prodüksiyon hatası bildirmiştir; bu hatanın kök nedeninin belirlenmesi ve düzeltilmesi süreci de bu vaka çalışmasının ikinci ayağını oluşturmaktadır.

### 1.2 Araştırma Sorusu

> Task-parçalı, subagent-review'lı AI-destekli yazılım bakım çalışması (görev başına implementer + bağımsız reviewer, sonda tüm-diff final review), yazılım mühendisliğinin yerleşik kod-review etkinliği ve sistematik hata ayıklama pratikleriyle ne ölçüde örtüşür — bir Next.js uygulamasında CSS tasarım-token konsolidasyonu, erişilebilirlik-güdümlü animasyon migrasyonu ve prodüksiyon runtime-hata teşhisini konu alan bir vaka çalışması ne kanıt sunar?

**Alt sorular:** (1) Yapılandırılmış/bağımsız kod review'ın hata yakalama etkinliği literatürde ne diyor, bizim deseniyle nasıl kıyaslanıyor? (2) Kök-neden-öncelikli hata ayıklama disiplini literatürde ne diyor, izlediğimiz düzeltme bunu nasıl örnekliyor? (3) CSS custom-property tabanlı design-token sistemleri için literatür/endüstri rehberliği ne diyor, bizim migrasyonumuz buna nasıl uyuyor?

### 1.3 Amaç ve Kapsam Sınırları

Bu çalışmanın amacı, genelleştirilebilir istatistiksel iddialar üretmek değil; tek, iyi belgelenmiş bir mühendislik oturumunu birincil kanıtlarla (git commit'leri, yapılandırılmış review raporları, izole reprodüksiyon script çıktıları) akademik bir vaka çalışması disipliniyle raporlamak ve mevcut literatürle karşılaştırmaktır. Kapsam dışı: geniş LLM yetenek kıyaslamaları, biçimsel kullanıcı çalışmaları, tekil vaka ötesi istatistiksel genelleme iddiaları.

**Tür konumlandırması:** Bu makale, bir deneyim raporu / uygulama içgörüsü (experience report / practitioner insights) katkısı olarak konumlandırılmaktadır — büyük-N ampirik bir çalışma (örn. EMSE, TSE tarzı) değil, tek bir mühendislik oturumunun disiplinli biçimde belgelenmesidir. Üç alt-vaka (§4.1-4.3), tek bir analitik argümanın parçaları değil, **aynı oturumda birbirine bağlı (session-coupled)** üç ayrı gözlemdir; bu, okuyucunun beklentisini baştan netleştirmek için burada açıkça belirtilmektedir.

---

## 2. Literatür / Kuramsal Çerçeve

### 2.1 Kod Review Etkinliği

Ampirik yazılım mühendisliği literatürü, akran kod review'ının maliyet-etkin bir hata tespit tekniği olduğunu göstermektedir; Jureczko (2020), araç-destekli ve omuz-üstü (over-the-shoulder) review tekniklerini karşılaştırarak review etkinliğini etkileyen faktörleri incelemiştir. (Reviewer sayısı/uzmanlığına ilişkin genel bulgular geniş literatürden derlenmiştir, tek bir çalışmaya atfedilmemiştir.) Güvenlik açıkları özelinde de akran review'ının etkili olduğu, ancak review yorumlarının yalnızca yaklaşık %1'inin güvenlik konularını ele aldığı raporlanmıştır (ESEC/FSE 2021 bulgusu, bkz. Kaynakça). Modern kod review pratiklerinin güncel bir haritası, araç-destekli review'ın (statik analiz vb.) kaliteyi artırabildiğini ama yanlış-pozitif ürettiğini ve manuel review'da tespit edilen sorunların yalnızca ~%16'sını kapsadığını vurgulamaktadır (Yang ve ark., 2024).

### 2.2 Kök Neden Analizi ve Sistematik Hata Ayıklama

Kök neden analizi (RCA), bir hatanın yalnızca semptomunu değil temel nedenini belirleyip gidermeyi ve tekrarını önlemeyi hedefleyen bir problem çözme metodolojisidir; geleneksel "hemen yamama" yaklaşımından ayrışır. Profesyonel yazılım mühendisliği pratiğinde hata ayıklamayı niteliksel olarak inceleyen yakın tarihli bir grounded theory çalışması (Li & Coblenz, 2026), 12 profesyonelin 17 hata ayıklama görevi boyunca sistematik olarak bir zihinsel model kurup bunu bilgi toplamaya rehberlik etmek için güncellediğini; ileri ve geri izleme (forward/backward tracing) modları arasında geçiş yaptıklarını göstermiştir. Bu çalışma, hata ayıklamayı "yapılandırılmış, yinelemeli bir tanısal süreç" olarak kuramsallaştırmaktadır.

### 2.3 CSS Design Token Mimarisi

Design token'lar, renk, tipografi, boşluk gibi görsel tasarım kararlarını platformdan bağımsız anahtar-değer çiftleri olarak saklayan yapılardır; CSS custom property'ler bu token'ların bir çıktı biçimidir (token kaynak-doğruluk, CSS değişkeni ise olası bir tezahürdür). Endüstri rehberliği, birincil (primitive) ve anlamsal (semantic) token'ların ayrılmasını, kategori bazlı organizasyonu ve tutarlı isimlendirmeyi önermektedir. **Önemli bir metodolojik not:** bu çalışma kapsamında yürütülen sistematik literatür taramasında, design-token mimarisi konusunda hakemli akademik bir kaynak bulunamamıştır; bulunan tek "design token" başlıklı akademik makale (Shi ve ark., 2025, CHI'25), üretken görsel tasarım manipülasyonu bağlamındadır ve terminoloji çakışması nedeniyle bu çalışmanın konusuyla eşleşmemektedir — bu yüzden atıf listesine dahil edilmemiştir. **Bu boşluk, bir bulgu değil, §5.3'teki asıl katkının motivasyonudur** — bir literatür boşluğu, çalışmanın *ürettiği* bir şey değil, çalışmadan *önce zaten var olan* bir eksikliktir; bu ayrım §5.3'te netleştirilmiştir.

---

## 3. Yöntem

**Araştırma deseni:** Tekil gömülü vaka çalışması (embedded single-case design, bkz. Yin'in vaka çalışması metodolojisi geleneği), retrospektif.

**Veri kaynakları (birincil):** (a) git commit geçmişi (`dfc2dd9`..`5ecdddf`, 15 commit), (b) her görev için üretilen yapılandırılmış implementer raporları ve bağımsız reviewer verdictleri (`.superpowers/sdd/progress.md` ilerleme kaydı ve görev brief/rapor dosyaları), (c) tüm plan için dispatch edilen final whole-diff review raporu, (d) prodüksiyon hatasının kök-neden izleme süreci ve izole Node.js reprodüksiyon script çıktıları, (e) `npx tsc`, `npx eslint`, `npx jest`, `npm run build` komut çıktıları.

**Veri kaynakları (ikincil):** Bölüm 2'de sunulan, WebSearch ile taranmış ve varlığı doğrulanmış (mümkün olduğunda tam metin, paywall durumunda yayıncı-indeksli metadata üzerinden) akademik ve endüstri kaynakları.

**Analitik çerçeve:** **Teorik uyum / yapılandırılmış literatür karşılaştırması** (gözlemlenen pratiğin literatür-türevli kriterlerle karşılaştırılması) ve explanation-building (prodüksiyon hatası için kök-neden anlatısının adım adım kurulması). **Terminolojik açıklık notu:** Bu çalışma, Yin'in teknik anlamda pattern-matching'ini (önceden literatürden türetilmiş bir "beklenen desen"in, gözlemden bağımsız olarak önceden belirlenip sonra gözlemle karşılaştırılması) uygulamamaktadır — önceden belirlenmiş bir beklenen desen yoktur. Bunun yerine §5.1-5.2'de yapılan, gözlemlenen tek bir örneğin literatürdeki bulgularla *post-hoc* niteliksel benzerlik karşılaştırmasıdır; bu daha zayıf ama dürüstçe adlandırılmış bir yöntemdir. Explanation-building ise §4.3'te teknik anlamıyla tam uygulanmıştır (alternatif açıklamaların elenmesi dahil).

**Geçerlilik ve güvenilirlik:** Construct validity, çoklu bağımsız kanıt kaynağıyla (git log, review ajan raporları, izole reprodüksiyon) sağlanmıştır; reliability, belgelenmiş ve tekrarlanabilir komutlarla desteklenmiştir. **Veri-provenance notu:** Bu çalışmanın birincil kanıtlarından biri olan "reviewer verdictleri" (§4.1), makaleyi yazan aynı AI-ajan sistemi tarafından üretilmiştir — bu, git commit SHA'ları ve `npx jest` çıktıları gibi *bağımsız, nesnel* kanıt katmanından farklı olarak, *öz-üretilmiş ve öz-seçilmiş* bir kanıt katmanıdır ve olumlu seçime (favorable selection) açıktır. Bu ayrım AI Kullanım Beyanı'nda daha da netleştirilmiştir. **Dış geçerlilik açıkça sınırlıdır** (n=1 vaka, tek kod tabanı, tek oturum) — bulgular genelleştirilebilir istatistiksel iddialar değil, zengin betimleyici bir örnek olarak sunulmaktadır.

---

## 4. Bulgular

### 4.1 Alt Vaka 1: Renk Token Konsolidasyonu ve Subagent Review Süreci

Plan, `docs/superpowers/plans/2026-07-01-renk-token-konsolidasyonu.md` dosyasında 10 görev olarak tanımlanmış ve `superpowers:subagent-driven-development` metodolojisiyle yürütülmüştür: her görev için taze bir implementer-subagent dispatch edilmiş, işini bitirip commit attıktan sonra bağımsız bir reviewer-subagent görev brief'i + implementer raporu + diff paketiyle o görevi denetlemiştir.

**Somut kanıt — review'ın gerçek hata yakaladığı an:** Task 6'nın (kalan renk strayleri) reviewer'ı, implementer'ın kendisinin fark edip raporunda not düştüğü ama düzeltmediği 2 riski doğrulamış ve "Needs fixes" verdiği vermiştir: `src/app/listing/[id]/page.tsx` dosyasında 3 adet ham `rgba(16,185,129,X)` literalinin token'a bağlanmamış olması ve `src/app/hesapla/page.tsx:24`'te eski `--green` RGB değerinin (`47,191,113`) unutulmuş olması. Bu bulgular commit `d51d15a` ile düzeltilmiş, ardından dispatch edilen odaklı bir re-review "Approved" vermiştir (`.superpowers/sdd/progress.md`, Task 6 girdisi).

**Toplam kapsam:** Task 1-6, `globals.css`'teki token foundasyonundan (`--green` #10b981, `--orange` #f59e0b, `--red` #ff5a5f, yeni `--info` #3b82f6, `--accent-violet-stat` #8b5cf6) başlayarak marketplace, admin panel, dashboard ve chart bileşenlerindeki ~50 site'yi migrate etmiştir. Canvas tabanlı (Chart.js), Leaflet vektör API'si, react-pdf ve e-posta HTML'i gibi CSS `var()`'ı çözemeyen render bağlamlarında literal hex bilinçli olarak korunmuştur — bu, §5.3'te tartışılan mimari sınır kararının doğrudan uygulamasıdır.

**Dürüstlük notu — survivorship bias riski:** Bu oturumda dispatch edilen 10 görevin tamamı sonunda "Approved" verdiği almıştır (bir düzeltme turu sonrası); hiçbir görevde reviewer subagent'ın yanlış bir "Approved" verdiği, var olmayan bir sorunu var sanması (halüsinasyon) veya implementer ile aynı yanlış varsayımda birleşmesi gibi bir başarısızlık modu **gözlemlenmemiştir**. Bu, sürecin kusursuz olduğu anlamına gelmez — yalnızca *bu özel oturumda* böyle bir arıza örneğinin rapora girmediği anlamına gelir. On görevin onunda da temiz sonuç, kendi başına dikkat çekici derecede pürüzsüz bir örneklemdir ve okuyucu bunu bir "yöntemin kanıtı" değil, tek bir olumlu örneklem olarak okumalıdır.

### 4.2 Alt Vaka 2: Framer Motion Migrasyonu

Task 8-9, landing page'in `StatsStrip` ve `FeaturesGrid` bileşenlerindeki elle yazılmış `IntersectionObserver`/`useState` tabanlı scroll-reveal mantığını `framer-motion`'ın `whileInView` API'sine taşımıştır (commit `758bc30`), ardından hero ve CTA butonlarına `whileHover`/`whileTap` mikro-etkileşimleri eklemiştir (commit `39b535d`). Bu migrasyonun belgelenmiş, plan tarafından öngörülmemiş ama olumlu bir yan etkisi, `framer-motion`'ın `prefers-reduced-motion` tercihini yerleşik biçimde desteklemesidir — eski elle yazılmış kod bu erişilebilirlik tercihini hiç gözetmiyordu. Bu, Playwright ile `reducedMotion: 'reduce'` bağlamında test edilmiş ve içeriğin animasyonsuz ama görünür render edildiği doğrulanmıştır. **Kapsam netliği:** Bu erişilebilirlik kazanımı yalnızca migrasyona konu olan iki bileşenle (`StatsStrip`, `FeaturesGrid`) ve CTA butonlarıyla sınırlıdır; uygulamanın geri kalanında `prefers-reduced-motion` desteği bu çalışmanın kapsamı dışındadır ve genellenmemelidir.

### 4.3 Alt Vaka 3: Prodüksiyon Hatasının Kök-Neden Analizi

Kullanıcı, `src/app/dashboard/page.tsx:92`'de bir runtime çökmesi bildirmiştir: `Cannot read properties of undefined (reading 'reportCount')`. `superpowers:systematic-debugging` disiplini izlenerek şu adımlar atılmıştır:

1. **Son değişiklikleri kontrol et:** `git log --oneline -- src/app/dashboard/page.tsx` ile bu dosyanın yalnızca Task 4'ün renk-token commit'i (`746edd3`) ve çok önceki bir commit tarafından değiştirildiği doğrulanmış; Task 4'ün diff'i incelenerek veri akışına (fetch, destructuring) dokunulmadığı, yalnızca renk string'lerinin değiştirildiği teyit edilmiştir — bu, çalışmamızın kök nedeni OLMADIĞINI gösteren alternatif-açıklama eleme adımıdır.
2. **Kanıt topla:** Çalışan dev server loglarında tam zincir gözlemlenmiştir: `Dashboard fetch error: Error [PrismaClientInitializationError]` → `GET /api/user/dashboard 500` → tarayıcıda `Uncaught TypeError: Cannot read properties of undefined (reading 'reportCount')`.
3. **Veriyi geriye doğru izle:** `/api/user/dashboard` route'unun kaynak kodu incelenmiş; `catch` bloğunun `{ message: "..." }` döndürdüğü (hiç `stats` alanı olmadan) ve ön uçtaki `fetch(...).then(r => r.json()).then(setData)` zincirinin HTTP durumunu (`r.ok`) hiç kontrol etmediği tespit edilmiştir.
4. **Kök neden:** Yerel geliştirme ortamında Docker Desktop çalışmadığı için Postgres'e erişilemiyor, bu da `prisma.report.count()` çağrısının `PrismaClientInitializationError` fırlatmasına, dolayısıyla API'nin hatalı-şekilli bir gövde döndürmesine yol açıyordu.
5. **İzole reprodüksiyon (ampirik doğrulama):** Tarayıcı/DB gerektirmeyen bağımsız bir Node.js script'i yazılmış; eski mantığın (`statValues['reportCount'] ?? 0`, `statValues` undefined iken) gerçekten `TypeError: Cannot read properties of undefined (reading 'reportCount')` ile çöktüğü, düzeltilmiş mantığın (fetch zincirinde `r.ok` kontrolü) ise aynı senaryoda çökmediği ve `data`'yı null bırakıp kullanıcıya düzgün bir hata mesajı gösterdiği doğrulanmıştır.

Düzeltme commit `5ecdddf` ile uygulanmış; `tsc`, `eslint`, `jest` (65/65) temiz sonuçlanmıştır. Tam tarayıcı uçtan-uca reprodüksiyonu, aynı Docker-kapalı kısıtı yüzünden (next-auth JWT middleware DB'siz oturum doğrulayamadığından) bu oturumda mümkün olmamıştır — bu, §5.4'te tartışılan bir metodolojik sınırlamadır.

---

## 5. Tartışma

### 5.1 Kod Review Bulgularının Literatürle Karşılaştırılması

Task 6'daki somut bulgu (reviewer'ın implementer'ın kendi kendine düzeltmediği 2 gerçek riski yakalaması), Jureczko'nun (2020) "review gerçekten ek hata yakalıyor" bulgusuyla niteliksel olarak *tutarlıdır* (örtüşmektedir demek fazla iddialı olur). Ancak bu analoji **dikkatle sınırlandırılmalıdır**: Jureczko'nun (2020) ve ilgili çalışmaların "reviewer uzmanlığı" ve "200-400 satır/saat" gibi ölçütleri insan reviewer'lar için tanımlanmıştır; bu çalışmadaki "reviewer", göreve özel bir talimat setiyle dispatch edilmiş bir AI subagent'tır. Bu iki varlık arasında doğrudan bir eşdeğerlik iddiası bu çalışmanın kapsamı dışındadır; yalnızca **yapısal bir benzerlik** (bağımsız, ikinci bir gözün sistematik olarak hata yakalaması) gözlemlenmektedir.

**Kanıt-ağırlığı netliği:** Bu benzerliğin sınırlandırılması yalnızca *ölçütlerin* aktarılamayacağını değil, *kanıtsal ağırlığın* da aktarılamayacağını ima eder. Başka bir deyişle: Jureczko'nun (2020) insan-review üzerine kurduğu güven, tek bir AI-subagent örneğine otomatik olarak "ödünç" verilemez. Burada sunulan, **tek bir örneğin literatürün öngördüğü desenle tutarlı olduğu, ama onu doğrulamadığıdır (illustrative, not confirmatory)** — bu, bir kanıt değil, bir gözlemdir.

### 5.2 Kök Neden Analizi Bulgularının Literatürle Karşılaştırılması

§4.3'te izlenen süreç — çökme noktasından geriye doğru izleme, alternatif açıklamaların (kendi commit'lerimiz) elenmesi, kanıt toplama, ve nihayetinde kök nedenin izole bir reprodüksiyonla ampirik doğrulanması — Li ve Coblenz'in (2026) grounded theory bulgusuyla (deneyimli geliştiricilerin sistematik mental-model kurma ve ileri/geri izleme yapması) **tutarlıdır** (n=1 bir hata-ayıklama olayının, 12 katılımcılı/17 görevli bir grounded theory çalışmasıyla "güçlü yakınsama" iddia etmesi, tekil örneklem büyüklüğü göz önüne alındığında abartılı olurdu; burada iddia edilen yalnızca niteliksel tutarlılıktır, istatistiksel ya da kapsamlı bir doğrulama değil). **Bir gerilim noktası da dürüstçe raporlanmalıdır:** RCA literatürü kök nedenin sistematik olarak giderilmesini önerir, ancak bu çalışmada aynı savunmasız `.then(r=>r.json())`-without-`r.ok` deseninin kod tabanındaki diğer sayfalarda (`admin/users`, `admin/listings`, `marketplace` vb.) bilinçli olarak dokunulmadan bırakıldığı gözlemlenmiştir — bu, kapsam disiplini ile RCA'nın "kaynağında gider" ilkesi arasındaki pratik bir gerilimdir ve gelecekteki bir sertleştirme geçişi için açık bir öneri olarak kayda geçirilmiştir.

### 5.3 Tasarım-Token Mimarisi: Render-Bağlamı İstisna Deseni (Asıl Katkı) ve Motivasyonu Olan Literatür Boşluğu

**Metodolojik açıklık:** Bir literatür boşluğu — burada, tasarım-token mimarisi için hakemli akademik kaynak bulunamaması (§2.3) — çalışmanın *ürettiği* bir şey değil, çalışmadan *önce zaten var olan* bir eksikliktir; bu yüzden kendi başına bir "bulgu" olarak sunulması bir kategori hatasıdır. Bu boşluk burada yalnızca **motivasyon** olarak konumlandırılmaktadır. Bu bölümün asıl katkısı aşağıdaki somut, aktarılabilir gözlemdir:

Bu çalışmanın gözlemlediği somut mimari sorun — Canvas (Chart.js), Leaflet vektör API'si, react-pdf ve e-posta HTML'i gibi CSS custom property'leri çözemeyen render bağlamlarında bilinçli literal-hex istisnaları tutma ihtiyacı — taranan endüstri kaynaklarının (Contentful, Telerik, Southleft) hiçbirinde ele alınmamaktadır; bu kaynaklar yalnızca DOM/web bağlamına odaklanmaktadır. Bu boşluk, karma render-bağlamlı (DOM + Canvas + PDF + harici kütüphane-vektör-API) uygulamalarda tasarım-token migrasyonu için belgelenmiş bir rehberlik eksikliğini işaret etmektedir ve bu çalışmanın somut, aktarılabilir katkısı şudur: **canvas/PDF/vektör-API render bağlamları, token-tabanlı tema sistemlerinin "bilinçli istisna" sınırı olarak ayrıca ele alınmalı ve belgelenmelidir** — literatürdeki boşluk bu katkının *nedeni*dir, katkının *kendisi* değil.

### 5.4 Metodolojik Sınırlama: Ortam Kısıtının Doğrulama Kapsamına Etkisi

Bu oturumda yerel Docker Desktop'ın çalışmaması hem §4.3'teki hatanın tetikleyicisi hem de doğrulama kapsamımızın bir sınırlayıcısı olmuştur: kimlik doğrulama gerektiren sayfaların (dashboard, admin, marketplace) tam tarayıcı görsel regresyon testleri bu ortamda tamamlanamamıştır. Bunun yerine, halka açık landing page Playwright ile görsel olarak doğrulanmış ve dashboard düzeltmesi DB'den bağımsız izole bir Node.js reprodüksiyonuyla doğrulanmıştır. Bu, "environment gap ≠ code defect" ayrımının açıkça kayıt altına alınmasını gerektiren bir durumdur ve bu çalışma boyunca bu ayrım tutarlı biçimde sürdürülmüştür.

---

## 6. Sınırlamalar

1. **n=1 vaka, tek kod tabanı:** Bulgular istatistiksel olarak genelleştirilemez; zengin, tek-örnekli bir betimleme sunulmaktadır.
2. **AI-subagent review ≠ insan review:** §5.1'de belirtildiği gibi, literatürle karşılaştırma yalnızca yapısal analoji düzeyindedir, eşdeğerlik iddiası değildir.
3. **Tasarım-token teması için hakemli kaynak yokluğu:** §2.3 ve §5.3'te açıkça raporlanmıştır; bu tema endüstri pratisyen konsensüsüne dayanmaktadır.
4. **Doğrulama kapsamı ortam kısıtıyla daraltılmıştır:** §5.4'te açıklandığı gibi, authenticated sayfaların tam görsel regresyonu bu oturumda tamamlanamamıştır.
5. **Dashboard düzeltmesinin kapsamı sınırlıdır:** Aynı savunmasız fetch deseni taşıyan diğer sayfalar bilinçli olarak bu düzeltmenin kapsamı dışında bırakılmıştır (§5.2).
6. **Paywall arkası kaynaklar:** Bazı hakemli kaynaklar (Jureczko, 2020; ESEC/FSE 2021; ACM SIGSOFT SEN) tam metin yerine yayıncı-indeksli metadata (başlık, DOI, venue) üzerinden doğrulanmıştır; tam metin erişimi bu oturumda mümkün olmamıştır.
7. **Survivorship bias riski:** §4.1'de belirtildiği gibi, bu oturumda dispatch edilen 10 görevin tamamı sonunda "Approved" almıştır; subagent iş akışının hiçbir başarısızlık modu (yanlış "Approved", halüsinasyon, implementer-reviewer'ın aynı yanlış varsayımda birleşmesi) bu raporda gözlemlenmemiştir. Bu, yöntemin kusursuz olduğunun kanıtı değildir — yalnızca bu tekil örneklemde böyle bir arızanın rastlanmadığı anlamına gelir.
8. **Çıkar çatışması yalnızca kısmen azaltılabilir:** AI Kullanım Beyanı'nda ayrıştırıldığı gibi, bağımsız (git/komut çıktısı) ve öz-üretilmiş (reviewer verdictleri) kanıt katmanları farklı güven düzeylerine sahiptir; bu ayrım yapılmış olsa da, öz-vaka-çalışması yapısının kendisi tam olarak ortadan kaldırılamaz.

---

## 7. Sonuç ve Öneriler

Bu vaka çalışması, AI-ajan orkestrasyonlu (subagent-driven-development) bir yazılım bakım sürecinin, görev-parçalı bağımsız review deseniyle yazılım mühendisliği literatüründeki kod-review etkinliği bulgularıyla yalnızca yapısal bir benzerlik taşıdığını (illustrative, doğrulayıcı değil); ayrı bir prodüksiyon hatasının sistematik kök-neden izlemesinin ise güncel bir grounded theory çalışmasıyla (Li & Coblenz, 2026) niteliksel olarak tutarlı olduğunu göstermektedir. Çalışmanın asıl iki katkısı: (a) izole reprodüksiyonla ampirik doğrulanmış, iyi belgelenmiş bir kök-neden-analizi örneği ve (b) karma render-bağlamlı (DOM/Canvas/PDF) sistemler için tasarım-token mimarisinde belgelenmemiş bir "bilinçli istisna" deseni. Tasarım-token teması için hakemli literatür eksikliği bu katkının bir bulgusu değil, motivasyonudur (§5.3).

**Öneriler:**
- Aynı savunmasız `r.ok`-kontrolsüz fetch deseninin taşındığı diğer sayfalar (`admin/users`, `admin/listings`, `dashboard/projects`, `marketplace`, `listing/[id]`) için ayrı, odaklı bir sertleştirme geçişi planlanmalıdır.
- Docker/Postgres bu geliştirme ortamında kalıcı olarak ayağa kaldırılmalı veya CI'da authenticated-sayfa görsel regresyonu için ayrı bir doğrulama adımı eklenmelidir.
- Design-token mimarisinde canvas/PDF/vektör-API render bağlamları için "bilinçli istisna" deseni, proje içi bir mimari kılavuz olarak belgelenmelidir (bu vaka çalışmasının kendisi bir başlangıç noktası olabilir).

---

## AI Kullanım Beyanı (AI Disclosure)

Bu makale, Claude Code (Anthropic) ile "Academic Research Skills" (ARS) v3.13.0 `academic-pipeline` orkestrasyonu kullanılarak üretilmiştir. Araştırma sorusu formülasyonu, metodoloji tasarımı, literatür taraması (WebSearch ile gerçek zamanlı, doğrulanmış kaynaklar), sentez ve taslak yazımı AI tarafından gerçekleştirilmiş; proje sahibi her aşama checkpoint'inde (Phase 1-3 onayı, outline onayı) süreci gözden geçirip onaylamıştır. Hiçbir atıf uydurulmamış; her kaynağın varlığı WebSearch/WebFetch ile ayrıca doğrulanmış, doğrulanamayan veya konu-uyumsuz olan adaylar (örn. Shi ve ark., 2025 CHI makalesi) atıf listesinden çıkarılmıştır.

**Çıkar çatışması (COI) — kabul ve azaltma:** Bu, yazarın (AI ajanı) kendi mühendislik çalışmasını belgelediği bir öz-vaka-çalışmasıdır (self-case-study): aynı ajan sistemi (a) mühendislik işini yaptı, (b) birincil kanıt olarak kullanılan reviewer verdictlerini üretti, (c) hangi kanıtın rapora gireceğini seçti, (d) bu makaleyi yazdı ve (e) Stage 2.5 bütünlük kontrolünü de aynı ajan mimarisi çalıştırdı — neredeyse kapalı bir döngü. Bunu yalnızca "belirtmek" yeterli bir azaltma değildir; okuyucu için hangi iddiaların hangi kanıt katmanına dayandığı açıkça ayrıştırılmalıdır:
- **Bağımsız, öz-yanlılığa dirençli kanıt katmanı** (yüksek güven): git commit SHA'ları ve mesajları, `npx tsc`/`npx eslint`/`npx jest`/`npm run build` komut çıktıları, dosya diff'leri — bunlar nesnel, harici olarak doğrulanabilir kayıtlardır.
- **Öz-üretilmiş, öz-seçilmiş kanıt katmanı** (dikkatli okunmalı): reviewer subagent verdictleri (§4.1), "review gerçek hata yakaladı" anlatısı, hangi bulguların rapora dahil edildiği seçimi — bunlar aynı AI-ajan sistemi tarafından üretilmiş ve olumlu seçime (favorable selection) açıktır; bağımsız bir insan ya da üçüncü-taraf doğrulaması bu katman için mevcut değildir.
Okuyucu, makalenin ikinci katmana dayanan iddialarını (özellikle §4.1, §5.1) birinci katmana dayananlardan (§4.3'ün git-log/reprodüksiyon-doğrulamalı zinciri) daha az bağımsız-doğrulanmış olarak değerlendirmelidir.

---

## Kaynakça (APA 7.0)

ESEC/FSE 2021. (2021). *Improving the effectiveness of peer code review in identifying security defects.* Proceedings of the 29th ACM Joint Meeting on European Software Engineering Conference and Symposium on the Foundations of Software Engineering. https://doi.org/10.1145/3468264.3473107

Jureczko, M., Kajda, Ł., & Górecki, P. (2020). Code review effectiveness: An empirical study on selected factors influence. *IET Software*. https://doi.org/10.1049/iet-sen.2020.0134

Li, H., & Coblenz, M. (2026). A grounded theory of debugging in professional software engineering practice. *Journal of the ACM, 3*(FSE), Article 139. (FSE'26; preprint: arXiv:2602.11435)

Yang, Z., Gao, C., Guo, Z., Li, Z., Liu, K., Xia, X., & Zhou, Y. (2024). *A roadmap on modern code review: Challenges and opportunities.* arXiv:2405.18216.

ACM SIGSOFT Software Engineering Notes. *Empirical study of root cause analysis of software failure.* https://doi.org/10.1145/2492248.2492263

Contentful. (n.d.). *Design tokens explained (and how to build a design token system).* https://www.contentful.com/blog/design-token-system/

Telerik. (n.d.). *Design tokens—Fundamental building blocks of design systems.* https://www.telerik.com/blogs/design-tokens-fundamental-building-blocks-design-systems

Southleft. (n.d.). *The value of design tokens in modern web development.* https://southleft.com/insights/design-systems/the-value-of-design-tokens/

*Not (dürüst atıf sınırlaması):* Jureczko (2020), ESEC/FSE (2021) ve ACM SIGSOFT SEN kaynaklarının tam metnine paywall nedeniyle erişilememiştir; varlıkları ve temel künyeleri yayıncının kendi indeksli metadata'sı (DOI, başlık, venue) üzerinden doğrulanmıştır. Li & Coblenz (2026) tam metin özeti üzerinden doğrulanmıştır.

---

## Ek: İlgili Oturum Kaynakları

- Plan: `docs/superpowers/plans/2026-07-01-renk-token-konsolidasyonu.md`
- Spec: `docs/superpowers/specs/2026-07-01-renk-token-konsolidasyonu-design.md`
- İlerleme kaydı (ledger): `.superpowers/sdd/progress.md`
- Emsal vaka çalışması (format referansı): `docs/case-study-tema-restorasyonu-2026-06-30.md`
- Commit aralığı: `dfc2dd9`..`5ecdddf` (15 commit, branch: `feature/production-readiness`)
