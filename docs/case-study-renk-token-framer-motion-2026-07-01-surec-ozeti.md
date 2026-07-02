# Süreç Kaydı: "AI-Ajan Orkestrasyonlu Yazılım Bakımında..." Vaka Çalışmasının Üretim Süreci

**İlgili makale:** `docs/case-study-renk-token-framer-motion-2026-07-01.md`
**Pipeline:** Academic Research Skills (ARS) v3.13.0 `academic-pipeline`, tam (10 aşamalı) mod
**Tarih:** 2026-07-01

---

## 1. Makale Bilgisi

**Başlık:** AI-Ajan Orkestrasyonlu Yazılım Bakımında Görev-Parçalı Review ve Kök-Neden-Öncelikli Hata Ayıklama: ArsaBil Projesinden Bir Vaka Çalışması
**Nihai teslim edilenler:** Tek bir Markdown dosyası (`docs/case-study-renk-token-framer-motion-2026-07-01.md`), APA 7.0 atıf formatında, bilingual özet (TR+EN), 8 kaynaklı Kaynakça, AI Kullanım Beyanı. DOCX/PDF üretilmedi (bu ortamda pandoc/tectonic kurulu değil — kullanıcı bilgilendirilip Markdown-only'e onay verdi).

---

## 2. Aşama Aşama Süreç

| Aşama | Girdi | Çıktı | Kilit Karar |
|---|---|---|---|
| Kullanıcı isteği | "yaptığımız çalışmayı asr becerisi inceleyip makale olarak kaydet" | Hangi ARS modunun kullanılacağı belirsizdi | Kullanıcıya 3 seçenek sunuldu (ars-full / doğrudan+ars-reviewer / ars-outline); **kullanıcı ars-full'ü seçti** |
| Stage 1.0 (bütçe onayı) | ~$4-6 tahmini maliyet, round-trip bütçesi sunuldu | Onay | **Kullanıcı Stage 1'i (literatür araştırması) atlamak yerine çalıştırmayı seçti** — bu, daha ucuz/hızlı alternatif sunulmasına rağmen daha yüksek titizlik gerektiren yolu seçme kararıydı |
| Stage 1 Phase 1 (Scoping) | — | RQ, FINER değerlendirmesi, metodoloji taslağı | Kullanıcı onayladı (değişiklik istemedi) |
| Stage 1 Phase 2 (Investigation) | WebSearch ile 3 temada arama | 8 kaynaklı bibliyografya, tier'larıyla işaretli | Kullanıcı onayladı; tasarım-token temasında hakemli kaynak bulunamadığı açıkça raporlandı |
| Stage 1 Phase 3 (Sentez) | Bibliyografya + oturum kanıtları | Sentez + gap analizi + DA checkpoint (PASS) | Kullanıcı onayladı |
| Stage 2 (Write) | Config + outline önerisi | Tam taslak (10 bölüm) | Kullanıcı outline'ı onayladı, sonra "tam taslağı yaz" dedi |
| Stage 2.5 (Integrity, round 1) | Taslak + tüm atıflar | PASS (2 küçük kozmetik not) | Kozmetik notlar (Jureczko parafrazı) düzeltildi |
| Stage 3 (Review) | Tam taslak | 5 hakemli panel → **MAJOR REVISION**, 10 maddelik yol haritası (4 kritik + 3 önemli + 3 minor) | **Kullanıcı "sadece kritik" yerine "tüm maddeleri uygula" seçeneğini seçti** — bu, sürecin en kalite-belirleyici kararıydı |
| Stage 4 (Revise) | 10 madde | Tüm maddeler uygulandı (COI ayrıştırması, "güçlü yakınsama"→"tutarlı", boşluk-bulgu düzeltmesi, vb.) | Otomatik uygulandı (kullanıcı önceden yetkilendirmişti) |
| Stage 3' (Re-review) | Revize taslak | 10/10 madde RESOLVED; 1 kozmetik kalıntı ("(revizyon)" etiketleri) | Kozmetik kalıntı temizlendi |
| Stage 4.5 (Final Integrity, round 1) | Temizlenmiş taslak | **FAIL** — gerçek bir atıf hatası bulundu: arXiv:2405.18216 yanlışlıkla "Wang ve ark."ya atfedilmiş (gerçek ilk yazar: Zezhou Yang) | Düzeltildi (2 yerde + Jureczko'nun eksik yazar listesi de tamamlandı) |
| Stage 4.5 (Final Integrity, round 2) | Düzeltilmiş taslak | **PASS** (sıfır sorun) | — |
| Stage 5 (Finalize) | Nihai taslak | Markdown (DOCX/PDF ortam kısıtı nedeniyle üretilmedi) | **Kullanıcı "sadece Markdown" seçeneğini seçti** (ortamda pandoc/tectonic yok) |
| Stage 6 (bu belge) | Tüm oturum | Süreç kaydı | — |

---

## 3. Etkileşim Deseni Özeti

| Metrik | Değer |
|---|---|
| Toplam checkpoint sayısı | 9 |
| Atlanmış checkpoint | 0/9 |
| Kullanıcı override'ı (AI önerisini geçersiz kılma) | 0 |
| Kullanıcının daha yüksek titizlik seçtiği ikili karar noktası | 2 (Stage 1 dahil etme; tüm revizyon maddelerini uygulama) |
| Review turu | 1 (Stage 3, MAJOR REVISION) |
| Re-review turu | 1 (Stage 3', 10/10 resolved) |
| Bütünlük doğrulama turu | 2 (Stage 4.5 round 1: FAIL, round 2: PASS) — ayrıca Stage 2.5: 1 tur, PASS |
| Bulunan ve düzeltilen gerçek hata sayısı | 1 (atıf yanlış-yazarlandırması, Stage 4.5'te yakalandı) |

---

## 4. Kullanıcının Kilit Kararları (kronolojik)

1. ARS modu seçimi olarak "ars-full (tam pipeline)"yi seçti — daha hafif/ucuz alternatifler sunulmasına rağmen.
2. Bütçe onayından sonra, Stage 1'i (dış literatür araştırması) atlamak yerine çalıştırmayı seçti — çalışmayı salt bir mühendislik günlüğünden gerçek bir literatür-temellendirilmiş vaka çalışmasına taşıyan karar.
3. Phase 1-3 checkpoint'lerinde ve outline onayında hızlı, değişiklik istemeyen onaylar verdi.
4. **Stage 3'ün MAJOR REVISION verdiğinde, "sadece kritik maddeleri uygula" (daha az iş) yerine "tüm maddeleri uygulayarak revize et" seçeneğini seçti** — bu karar, COI ayrıştırması, overclaim düzeltmeleri ve survivorship-bias açıklaması gibi makalenin dürüstlük kalitesini asıl yükselten değişikliklerin hepsinin uygulanmasını sağladı.
5. Stage 5'te ortam kısıtını (pandoc/tectonic yok) kabul edip "sadece Markdown" ile bitirmeyi seçti — gerçekçi bir kapsam kararı.

---

## 5. Ana Dersler

- **Bağımsız, sıfırdan doğrulama gerçekten iş yaptı:** Stage 4.5'in ilk turunun "FAIL" vermesi kozmetik değildi — gerçek bir atıf hatasını (yanlış yazar adı) yakaladı. Bu, pipeline'ın "her turda sıfırdan doğrula, önceki turun sonucuna güvenme" IRON RULE'unun neden var olduğunun somut kanıtıdır.
- **"Tüm maddeleri uygula" kararı, tek bir kullanıcı seçiminin makale kalitesine etkisinin ölçülebilir olduğunu gösterdi:** Sadece kritik maddeler uygulanmış olsaydı, COI ayrıştırması, survivorship-bias açıklaması ve kapsam-netliği notları gibi "önemli/minor" kategorisindeki ama okuyucu güveni açısından önemli iyileştirmeler makalede yer almayacaktı.
- **Çevre kısıtları (Docker/Postgres kapalı, pandoc/tectonic yok) hem makalenin konusu hem de üretim sürecinin kendisi için sınırlayıcı oldu** — bu, ayrı ayrı ama tutarlı biçimde her iki düzeyde de raporlandı.

---

## 6. AI Öz-Yansıma Raporu

> **Not:** Bu öz-değerlendirme, sürecin kendisini yürüten aynı AI tarafından yazılmıştır. Okuyucu bunu bu farkındalıkla okumalıdır — kendi kendini değerlendiren bir sistemin öz-eleştirisi, bağımsız bir dış değerlendirmenin yerini tutmaz.

```
+--------------------------------------------------+
|  AI Öz-Yansıma Raporu                             |
+--------------------------------------------------+
|  Checkpoint atlama:        0/9                    |
|  Kullanıcı override'ı:      0                      |
|  Diyalog sağlık uyarısı:    0                      |
|  Bütünlük FAIL sayısı:      1 (Stage 4.5, round 1) |
|  Bütünlük FAIL'in niteliği: Gerçek atıf hatası     |
|                             (uydurma değil,        |
|                             yanlış yazar ismi)     |
+--------------------------------------------------+
```

**Davranışsal özet:** Bu pipeline çalışması boyunca AI, kullanıcıdan gelen doğrudan bir itiraz veya geri çekilme baskısı yaşamadı (kullanıcı her checkpoint'te önerilen yolu onayladı). Bu, "DA Concession Rate" gibi çekişmeli-diyalog metriklerinin bu özel oturum için anlamlı biçimde ölçülemediği anlamına gelir — çünkü ölçülecek bir itiraz/taviz döngüsü hiç oluşmadı. Bunun yerine, kalite güvencesi kullanıcı-AI çekişmesinden değil, AI'nin kendi dispatch ettiği bağımsız reviewer/integrity subagent'larından geldi.

**Sycophancy Risk Değerlendirmesi:** **Ölçülemez / N/A** (standart LOW/MEDIUM/HIGH eşikleri, kullanıcı itirazına AI'nin nasıl tepki verdiğini ölçer; bu oturumda kullanıcı hiç itiraz etmedi). Dolaylı bir karşı-kanıt: dispatch edilen review/integrity ajanları, ana yazar-AI'nin kendi taslağına gerçek eleştiriler yöneltti (MAJOR REVISION, FAIL) ve bu eleştiriler yumuşatılmadan rapor edildi — bu, en azından ajanlar-arası katmanda sycophancy olmadığının kanıtıdır, ancak kullanıcı-AI ekseninde bu oturum bir test sağlamamıştır.

**Frame-Lock Olayları:** Tespit edilmedi. Aksine, Stage 4.5'in ilk turu, ana yazar-AI'nin kendi yazdığı bir atfı sorguladı ve yanlış bulup düzeltti — bu, pipeline'ın kendi çıktısını sorgusuzca kabul etmediğinin somut bir örneğidir.

**AI'nin Yanlış Yaptığı Şeyler (dürüst liste):**
1. İlk taslakta arXiv:2405.18216'nın yazarını "Wang" olarak yanlış attfetti (gerçek ilk yazar: Zezhou Yang) — bunu kendim yakalamadım, bağımsız Stage 4.5 turu yakaladı.
2. İlk taslakta "literatür boşluğu = bulgu" ve "güçlü yakınsama" gibi iki ayrı overclaim yazdım — ikisi de dürüstlük standartlarına aykırıydı ve ben kendim yakalamadım; Stage 3'ün bağımsız 5-hakemli paneli yakaladı.
3. İlk revizyon turunda metne "(revizyon notu)" gibi kendine-referanslı etiketler bıraktım — nihai bir akademik belgede bu tür süreç-izi kalıntılarının okuyucu için gereksiz/dikkat dağıtıcı olacağını öngörmedim; bunu da Stage 3' re-review yakaladı, ben değil.
4. Bu üç madde ortak bir örüntü gösteriyor: **kendi ürettiğim içerikteki sorunları kendim proaktif olarak yakalamadım — hepsi ayrı, bağımsız dispatch edilmiş subagent'lar tarafından yakalandı.** Bu, çok-katmanlı bağımsız doğrulama mimarisinin (tek bir AI'nin öz-değerlendirmesine güvenmemenin) neden gerekli olduğunun en somut kanıtıdır.

**Hata Modu Denetim Kaydı (7 mod, Stage 4.5 nihai durumu):**
1. **Atıf halüsinasyonu:** Stage 4.5 round 1'de SUSPECTED (gerçek, doğrulanmış bir örnek — yanlış alarm değil); round 2'de CLEAR (düzeltildi).
2. **Halüsinasyonlu sonuç/veri:** CLEAR (hiç işaretlenmedi — her git/test iddiası canlı olarak iki kez bağımsız doğrulandı).
3. **Kısayol güvenme:** CLEAR (jest gerçekten çalıştırıldı, sadece iddia edilmedi).
4. **Bug-as-insight:** CLEAR.
5. **Metodoloji uydurma:** CLEAR (makalenin kendisi "pattern-matching" etiketleme sorununu Stage 3'te tespit edip düzeltti — bu bir uydurma değil, bir isimlendirme hassasiyeti sorunuydu).
6. **Pipeline seviyesinde frame-lock:** CLEAR (yukarıda açıklandı).
7. **Öz-intihal:** CLEAR (emsal belgeyle örtüşme yalnızca standart şablon/boilerplate düzeyinde).

---

## 7. İşbirliği Kalitesi Değerlendirmesi (kullanıcı performansı, dürüstçe)

> **Dürüstlük ilkesi:** Bu bölüm şişirilmemiştir. Kullanıcının bu oturumdaki rolü büyük ölçüde "önerilen, zaten titiz olan yolu onaylamak" şeklindeydi; bu meşru ve etkili bir işbirliği tarzıdır, ama bu, kullanıcının özgün fikri katkısını abartmadan raporlanmalıdır.

```
+--------------------------------------------------+
|  İşbirliği Kalitesi Skoru: 58/100                 |
+--------------------------------------------------+
|  Yön Belirleme            [------      ] 65       |
|  Fikri Katkı               [---         ] 35       |
|  Kalite Kapı Bekçiliği     [------      ] 58       |
|  Yineleme Disiplini        [-------     ] 75       |
|  Delegasyon Verimliliği    [--------    ] 80       |
|  Meta-Öğrenme              [---         ] 30       |
+--------------------------------------------------+
```

**Genel değerlendirme:** "Basic-to-Good" sınırında. Kullanıcı, süreç boyunca istikrarlı biçimde daha titiz seçeneği tercih etti (tam pipeline, Stage 1 dahil, tüm revizyon maddeleri) — bu gerçek ve ölçülebilir bir kalite-kapı-bekçiliği katkısıdır. Ancak kullanıcı hiçbir noktada özgün bir araştırma sorusu önermedi, bir bulguyu sorgulamadı, ya da AI'nin sunduğu bir iddiaya bağımsız olarak itiraz etmedi — tüm somut eleştiri (10 maddelik revizyon yol haritası, atıf hatası) AI'nin kendi dispatch ettiği ajanlardan geldi, kullanıcıdan değil.

**İyi Yapılanlar:**
- "Stage 1'i de çalıştır" kararı (literatür temelini atlamadı).
- "Tüm maddeleri uygulayarak revize et" kararı (minimum uyumla yetinmedi) — doğrudan alıntı: *"Evet, tüm maddeleri uygulayarak revize et."*
- Ortam kısıtını (pandoc/tectonic yok) gerçekçi biçimde kabul edip kapsamı buna göre ayarlaması.

**Kaçırılan Fırsatlar:**
1. Hiçbir checkpoint'te makalenin taslağını bizzat okuyup belirli bir cümle/iddiaya itiraz etmedi — tüm onaylar hızlı ve içerik-spesifik olmayan "evet" yanıtlarıydı.
2. Review'ın MAJOR REVISION vermesi üzerine, hangi maddelerin kendisi için en kritik olduğuna dair bir görüş belirtmedi (örn. "COI kısmını özellikle güçlendir" gibi) — "tüm maddeleri uygula" kararı doğru bir yön kararıydı ama içerik-spesifik değildi.
3. Süreç sonunda hiçbir ders/gözlemi kalıcı hafızaya (memory/CLAUDE.md) kaydetmeyi talep etmedi.

**Bir Sonraki Sefer İçin Öneriler:**
1. Review verdictleri geldiğinde, en az bir maddeye dair kendi görüşünü (katılıyorum/katılmıyorum + neden) belirtmek, işbirliğini gerçek bir diyaloğa dönüştürebilir.
2. Taslağı checkpoint'lerde bizzat okuyup en az bir spesifik geri bildirim vermek (Kalite Kapı Bekçiliği skorunu yükseltir).
3. Süreç sonunda "bu oturumdan çıkarılacak ders neydi" sorusunu sorup memory'ye kaydettirmek (Meta-Öğrenme skorunu yükseltir).

**İnsan vs. AI Katma Değeri:** Bu makalenin nihai kalitesindeki en somut insan-katkılı iyileştirme, kullanıcının "tüm maddeleri uygula" kararıdır — bu karar olmasaydı, COI ayrıştırması, "güçlü yakınsama" düzeltmesi ve survivorship-bias açıklaması gibi makalenin dürüstlük standardını asıl yükselten unsurlar muhtemelen "kabul edilmiş sınırlama" olarak bırakılacaktı. Geri kalan her şey — araştırma sorusu formülasyonu, literatür taraması, taslak yazımı, öz-eleştiri, hata yakalama — AI tarafından yürütülmüştür.

---

*Bu süreç kaydı, ARS v3.13.0 `academic-pipeline` Stage 6 protokolüne göre üretilmiştir. İngilizce versiyon istek üzerine üretilebilir.*
