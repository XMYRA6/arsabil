import type { Metadata } from 'next'
import { ProsePage } from '@/components/layout/ProsePage'

export const metadata: Metadata = {
  title: 'İletişim | ArsaBil',
  description: 'ArsaBil ile iletişim: genel sorular, iş birliği ve veri talepleri.',
}

export default function ContactPage() {
  return (
    <ProsePage title="İletişim">
      <p>
        Genel sorular, iş birliği önerileri, hata bildirimleri ve KVKK kapsamındaki veri
        talepleriniz için bize e-posta ile ulaşabilirsiniz.
      </p>
      <p>
        <strong>E-posta:</strong> <a href="mailto:iletisim@arsabil.com">iletisim@arsabil.com</a>
      </p>
      <h2>Hesabınız varsa</h2>
      <p>
        Kayıtlı kullanıcılar, ilanlarla ilgili yazışmaları uygulama içindeki{' '}
        <a href="/inbox">Gelen Kutusu</a> üzerinden yürütebilir.
      </p>
      <h2>İlan ve değerleme sorumluluğu</h2>
      <p>
        ArsaBil bir fizibilite ve tahmin aracıdır; ürettiği değerler bağlayıcı teklif veya
        resmî ekspertiz yerine geçmez. Ayrıntı için{' '}
        <a href="/terms">Kullanım Koşulları</a> sayfasına bakın.
      </p>
    </ProsePage>
  )
}
