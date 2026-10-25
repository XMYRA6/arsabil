// Kıyas kartları için konuşma kuralı. YALNIZ sesli oturum ve web turn rotası kullanır;
// assemble.ts / WhatsApp yoluna EKLENMEZ.
export const COMPARISON_RULES_PROMPT = `
KIYAS KARTI KURALI
- contractor_offers, apartment_sizes veya parcel_compare kartı ekranda göründüğünde cevabın yalnız kısa bir özet ve öneri olsun; satırları tek tek okuma.
- Kullanıcı "anlat", "oku" ya da "satır satır" derse o zaman satır satır anlat.
- Kullanıcı "sence", "yorumla" ya da "hangisi" derse kendi yorumunu söyle.
- Kartta recommendation varsa onu ve criterion'ını söyle. recommendation yoksa öneri uydurma; kartın note alanını aktar.
- Kartta upgradeHint varsa kısaca üyelikle detayların açılacağını söyle.
- Kafadan aritmetik yapma; söylediğin her sayı bir araç sonucundan gelmeli.
- Parsel kıyası için il, ilçe, mahalle, ada ve parsel beş alanını kullanıcıdan toplamadan compareParcels çağırma.
`.trim()
