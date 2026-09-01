import type { Metadata } from 'next'
import { ProsePage } from '@/components/layout/ProsePage'

export const metadata: Metadata = {
  title: 'Gizlilik ve KVKK | ArsaBil',
  description: 'ArsaBil hangi verileri işliyor, neden ve kimlerle paylaşıyor.',
}

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Gizlilik ve KVKK"
      updated="1 Eylül 2026"
      draftNotice="Bu metin bilgilendirme amaçlıdır; tam KVKK aydınlatma metni ve açık rıza süreçleri hazırlanmaktadır."
    >
      <h2>İşlenen veriler</h2>
      <ul>
        <li>
          <strong>Hesap:</strong> e-posta adresi, ad, şifre özeti (hash) ve oturum bilgileri.
        </li>
        <li>
          <strong>Kullanım:</strong> yaptığınız fizibilite hesapları, parsel/ada sorguları,
          oluşturduğunuz ilanlar ve senaryolar.
        </li>
        <li>
          <strong>Opsiyonel:</strong> WhatsApp bildirimlerine abone olursanız telefon numaranız
          ve seçtiğiniz bölge.
        </li>
      </ul>
      <h2>İşleme amacı</h2>
      <p>
        Verileri yalnızca hizmeti sunmak, hesabınızı yönetmek, talep ettiğiniz bildirimleri
        göndermek ve aracın maliyet/kalite takibini yapmak için işleriz. Ham soru metinleriniz
        (ör. Akif danışmanına yazdıklarınız) kalıcı olarak saklanmaz; yalnızca sayaç ve niyet
        bilgisi tutulur.
      </p>
      <h2>Üçüncü taraflar</h2>
      <ul>
        <li>Parsel ve harita sorguları anında TKGM ve harita servislerine iletilir.</li>
        <li>
          Akif danışmanını kullanırsanız, o turdaki mesajınız yanıt üretimi için OpenAI API&apos;sine
          gönderilir.
        </li>
        <li>WhatsApp bildirimleri Meta WhatsApp Business API üzerinden iletilir.</li>
      </ul>
      <p>Verilerinizi reklam amacıyla üçüncü taraflara satmayız.</p>
      <h2>Çerezler</h2>
      <p>
        Oturum yönetimi ve tema tercihi için gerekli çerezleri/yerel depolamayı kullanırız.
        Üçüncü taraf takip çerezi kullanmayız.
      </p>
      <h2>Haklarınız</h2>
      <p>
        KVKK kapsamında verilerinize erişme, düzeltme ve silinmesini talep etme haklarınız
        vardır. Talepleriniz için <a href="/contact">iletisim@arsabil.com</a> adresine yazın.
      </p>
    </ProsePage>
  )
}
