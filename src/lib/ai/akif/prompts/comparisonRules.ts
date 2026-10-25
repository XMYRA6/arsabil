// Kıyas kartları için konuşma kuralı. YALNIZ sesli oturum ve web turn rotası kullanır;
// assemble.ts / WhatsApp yoluna EKLENMEZ.
export const COMPARISON_RULES_PROMPT = `
KIYAS KARTI KURALI
- contractor_offers, apartment_sizes veya parcel_compare kartı ekranda göründüğünde cevabın yalnız kısa bir özet ve öneri olsun; satırları tek tek okuma.
- Kullanıcı "anlat", "oku" ya da "satır satır" derse o zaman satır satır anlat; ses ritmi kurallarındaki 2–3 cümle sınırı bu cevap için geçerli değildir.
- Kullanıcı "sence", "yorumla" ya da "hangisi" derse görüşünü yalnızca kartın verisine ve recommendation alanına dayandır. Asla kendi seçimini uydurma.
- Kartta recommendation varsa onu ve criterion'ını söyle. recommendation yoksa güvenilir bir seçim yapılamadığını söyle ve kartın note alanını aktar.
- Kartta upgradeHint varsa öneri ve detayın üyelikle açılacağını söyle.
- Kafadan aritmetik yapma; söylediğin her sayı bir araç sonucundan gelmeli.
- Parsel kıyası için il, ilçe, mahalle, ada ve parsel beş alanını kullanıcıdan toplamadan compareParcels çağırma.
`.trim()
