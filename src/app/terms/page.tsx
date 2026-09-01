import type { Metadata } from 'next'
import { ProsePage } from '@/components/layout/ProsePage'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | ArsaBil',
  description: 'ArsaBil kullanım koşulları ve sorumluluk sınırları.',
}

export default function TermsPage() {
  return (
    <ProsePage
      title="Kullanım Koşulları"
      updated="1 Eylül 2026"
      draftNotice="Bu metin bilgilendirme amaçlıdır. Nihai sözleşme koşulları hukuki inceleme sonrası güncellenecektir."
    >
      <h2>Hizmetin niteliği</h2>
      <p>
        ArsaBil; arsa payı, kat karşılığı fizibilite, tahmini değer ve risk göstergeleri sunan
        bir hesaplama ve bilgilendirme aracıdır. Sağlanan sonuçlar tahmine dayalıdır ve
        bağlayıcı teklif, resmî ekspertiz, yatırım tavsiyesi veya hukuki görüş yerine geçmez.
        Nihai kararlarınızdan önce yetkili meslek mensuplarına (mimar, inşaat mühendisi, SPK
        lisanslı değerleme uzmanı, avukat) danışın.
      </p>
      <h2>Kullanıcı sorumluluğu</h2>
      <ul>
        <li>Girdiğiniz alan, emsal, maliyet ve pay değerlerinin doğruluğundan siz sorumlusunuz.</li>
        <li>Paylaştığınız ilan içeriğinin doğru ve hukuka uygun olduğunu taahhüt edersiniz.</li>
        <li>Hesabınızın güvenliğinden ve hesabınız üzerinden yapılan işlemlerden sorumlusunuz.</li>
      </ul>
      <h2>Üçüncü taraf verileri</h2>
      <p>
        Parsel, idari sınır ve harita bilgileri TKGM ve harita servisleri gibi dış kaynaklardan
        sorgu anında alınır; bu kaynaklardaki eksiklik veya hatalardan ArsaBil sorumlu değildir.
      </p>
      <h2>Sorumluluğun sınırı</h2>
      <p>
        ArsaBil, hizmetin kesintisiz veya hatasız olacağını garanti etmez. Aracın kullanımından
        doğan dolaylı zararlardan sorumlu tutulamaz.
      </p>
      <h2>İletişim</h2>
      <p>
        Sorularınız için <a href="/contact">İletişim</a> sayfasını kullanın.
      </p>
    </ProsePage>
  )
}
