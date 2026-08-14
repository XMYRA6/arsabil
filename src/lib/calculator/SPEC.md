# ArsaBil Motor (Engine) Spesifikasyonu (v2 - Deterministik Model)

Bu doküman, ArsaBil hesaplama motorunun girdilerini, çıktılarını ve deterministik formül sıralamasını tanımlar. Motor, UI bağımlılıklarından arındırılmış, saf bir matematiksel "pure function" olarak çalışmalıdır.

## 1. Değişkenler (Veri Modeli)

### 1.1 Zorunlu Girdiler
*   **`x` (Arsa payı oranı):** 0 ile 1 arasında ondalık (Örn: %33 için 0.33)
*   **`L` (Kalite sınıf katsayısı):** İnşaatın lüks derecesi (Standart=1.0, Orta=1.2, Lüks=1.4 vb.)
*   **`Ad` (Daire brüt alanı):** Bir dairenin ortalama brüt metrekaresi (m²)
*   **`P` (Birim inşaat fiyatı):** 1 m² inşaatın taban maliyeti (Örn: 15.000 TL/m²)
*   **`K` (Müteahhit kâr katsayısı):** Beklenen kâr oranı (Örn: Zarar=0.90, Düşük=1.15, Orta=1.3, Yüksek=1.5, Kafa kafaya=1.0). "Zarar" (K<1.0, maliyetin altında satış) denetim taslağının §1/§13'te tanımladığı 4. kademedir, admin panelinden yönetilir (2026-08-14).

### 1.2 Opsiyonel (Toggle) Girdiler
Motor, bu girdilerin açık (`enabled`) veya kapalı (`disabled`) olma durumuna göre farklı hesaplama yollarına girer veya ilgili çıktıları `null` döndürür.

*   **`Sd` (Toplam daire sayısı):** Açılırsa (adet girilirse) arsa sahibine düşen daire hesapları aktif olur.
*   **`Aa` (Arsa alanı):** Açılırsa (m² girilirse) arsanın m² birim fiyatı (`FAbirim`) aktif olur.
*   **`R` (Risk katsayısı):** Toggle açıksa girilen risk katsayısı kullanılır (Örn: 1.05, 1.10). Kapalıysa formülde `R = 1` kabul edilir.
*   **`Mz` (İksa masrafı):** 
    *   **Mod-1 (Yüzde):** `Z` oranı girilir, nakit değer (`Mz`) geri hesaplanır.
    *   **Mod-2 (Elle):** `Mz` nakit değeri girilir, yüzde değeri (`Z`) taban maliyet üzerinden geri hesaplanır.

### 1.3 Beklenen Çıktılar (Output)
*   **`Mi_base`:** İksa ve Risk öncesi ham inşaat maliyeti.
*   **`Mz`:** İksa masrafı tutarı (TL). (Kapalıysa 0)
*   **`Z`:** İksa masrafı oranı (%). (Kapalıysa 0)
*   **`Mi`:** Toplam İnşaat Maliyeti (Risk ve İksa dahil).
*   **`M`:** Toplam Maliyet (İnşaat + Arsa).
*   **`FD_total`:** Toplam Daire Satış Fiyatı (TL).
*   **`FD_per_m2`:** Daire Satış m² Birim Fiyatı (TL/m²).
*   **`Sdx`:** Arsa Sahibine Düşen Daire Sayısı (Adet). (Eğer `Sd` kapalıysa `null`)
*   **`FA`:** Toplam Arsa Değeri / Arsa Sahibinin Alacağı Payın Değeri (TL). (Eğer `Sd` kapalıysa `null`)
*   **`FAbirim`:** Arsanın m² birim değeri (TL/m²). (Eğer `Aa` veya `Sd` kapalıysa `null`)

---

## 2. Formül Akışı ve Sıralaması (Deterministik)

### Adım A: İnşaat Maliyeti (`Mi`)
1.  **Ham İnşaat Maliyeti:** `Mi_base = L * P * Ad`
2.  **İksa Masrafı (`Mz` ve `Z`):**
    *   İksa *kapalıysa*: `Mz = 0`, `Z = 0`
    *   İksa *yüzde modunda* ise: `Mz = Z * Mi_base`
    *   İksa *elle (nakit) modunda* ise: `Z = Mz / Mi_base` (Not: `Mi_base` 0 ise `Z = 0`)
3.  **Risk Katsayısı (`R`):**
    *   Risk *kapalıysa*: `R = 1`
    *   Risk *açıksa*: Girdi olarak verilen `R` kullanılır.
4.  **Toplam İnşaat Maliyeti:** `Mi = (Mi_base + Mz) * R` — risk katsayısı **kasıtlı olarak** iksa masrafını da kapsar (`Mi_base + Mz` toplamı üzerinden çarpılır), yalnızca ham inşaata değil. Gerekçe: iksa da malzeme/işçilik riskine tabi bir inşaat kalemi (denetim bulgusu, 2026-08-14).

### Adım B: Toplam Maliyet (`M`) ve Daire Fiyatı (`FD`)
*   **Arsa Maliyeti (Ma):** *[TBD - Antigravity tarafından 3 alternatif geliştirilecek]* Şimdilik bir placeholder/stub fonksiyon kullanılacak veya basitçe `Ma = M - Mi` mantığıyla orantısal hesaplanacaktır. 
    * *Geçici Standart Model:* `M = Mi / (1 - x)` 
    * `Ma = M - Mi`
*   **Toplam Daire Fiyatı:** `FD_total = M * K`
*   **Daire M² Birim Fiyatı:** `FD_per_m2 = FD_total / Ad`

### Adım C: Arsa Sahibine Düşen Paylar (Sadece `Sd` açıksa)
Eğer `Sd` toggle'ı açıksa:
*   **Düşen Daire Sayısı:** `Sdx = Sd * x`
*   **Arsa Toplam Değeri:** `FA = Sdx * FD_total`

Eğer `Sd` açık ve aynı zamanda `Aa` (Arsa alanı) toggle'ı açıksa:
*   **Arsa m² Birim Değeri:** `FAbirim = FA / Aa`

Eğer `Sd` kapalıysa: `Sdx`, `FA`, `FAbirim` `null` döner.
Eğer `Aa` kapalıysa: `FAbirim` `null` döner.
