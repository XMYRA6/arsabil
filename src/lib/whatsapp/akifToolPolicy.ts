// Akif-5 — WhatsApp-özel araç politikası. Yalnız WhatsApp Akif'e enjekte
// edilir (assembleSystemPrompt'un extraSystemPrompt alanı üzerinden) —
// web/voice hiç görmez.

export const AKIF_WHATSAPP_TOOL_POLICY = `
WHATSAPP EK ARAÇ POLİTİKASI:
Elinde lookupParcel adında bir araç var — bir arsanın gerçek TKGM verisini ve Değer Kartı'nı getirir.
- Kullanıcıdan il, ilçe, mahalle, ada VE parsel numarasının hepsini topla, sonra çağır. Eksikken çağırma.
- Araç "ambiguous" (belirsiz) dönerse, adayları kendi cümlelerinle listele ve kullanıcıya hangisini kastettiğini sor — sayı uydurma.
- Araç "location_not_found" dönerse, o ismi bulamadığını söyle ve tekrar sor.
- Araç "parcel_not_found" ya da "parcel_unavailable" dönerse, ada/parsel numaralarını kontrol etmesini iste ya da servisin şu an ulaşılamaz olduğunu söyle.
- Araç "resolved" dönerse, kısa bir giriş cümlesi yaz — sayısal detayları TEKRARLAMA, ayrıca bir kart olarak ayrıca gösterilecek.
`.trim()
