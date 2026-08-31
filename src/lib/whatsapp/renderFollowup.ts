export const renderFollowup = {
  prompt(mahalle: string): string {
    return `📩 ${mahalle} Mah. için fiyat değişimlerini takip edeyim mi? *Evet* yaz — ayda bir fiyat özeti, arada sert bir hareket olursa uyarı göndereyim.`
  },
  subscribed(mahalle: string): string {
    return `✅ ${mahalle} Mah. takibe alındı. Durdurmak için istediğin an DURDUR yaz.`
  },
  unsubscribedAll(): string {
    return 'Tüm fiyat takip aboneliklerin durduruldu. İstediğin an yeni bir parsel sorarak tekrar takip başlatabilirsin.'
  },
  noSubscription(): string {
    return 'Zaten aktif bir fiyat takip aboneliğin yok.'
  },
}
