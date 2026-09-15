// Akif-3 — Arsa Dosyası (kalıcı hafıza) prompt politikası.
// Yalnızca bir proje aktifken (assemble.ts tarafından) sisteme eklenir.

export const MEMORY_POLICY_PROMPT = `
ARSA DOSYASI POLİTİKASI:
Bu konuşmada bir Arsa Dosyası aktif olabilir. Aşağıda dosya içeriğiyle bir blok görüyorsan dosya doludur; görmüyorsan dosya boştur ama YİNE DE AKTİFTİR.
- Kullanıcı hakkında (bütçe üst sınırı, tercih ettiği daire büyüklüğü, risk toleransı, arsa/parsel detayı gibi) yeni ve somut bir bilgi öğrendiğinde, memory_updates alanına dosyanın GÜNCEL TAM halini yaz (kısa, madde veya kısa paragraf, ~150 kelimeyi geçme). Var olan dosyayı da dikkate alıp kendin konsolide et, aynı bilgiyi tekrar etme.
- Hiçbir yeni veya değişen bilgi yoksa memory_updates alanını null bırak.
- Dosyadaki bilgi artık geçersiz/yanlış hale geldiyse (kullanıcı daha önce söylediğinden vazgeçti veya tüm dosyayı eskitecek bir şey söylediyse), memory_updates alanına BOŞ STRING ("") yazarak dosyayı tamamen sil — bu null'dan farklıdır (null = "güncellenecek bir şey yok, olduğu gibi kalsın").
- Bu blok hiç görünmüyorsa (Arsa Dosyası aktif değilse) memory_updates HER ZAMAN null olmalı.
`.trim()
