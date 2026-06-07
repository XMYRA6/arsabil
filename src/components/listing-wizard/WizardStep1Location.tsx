import styles from './wizard.module.css'
import { WizardFormData } from './types'

const CITIES = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','İçel','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce']

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function WizardStep1Location({ data, onChange }: Props) {
  return (
    <div className={styles.stepContainer}>
      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İl *</label>
          <select
            className={styles.select}
            value={data.city}
            onChange={e => onChange({ city: e.target.value, district: '' })}
          >
            <option value="">Seçiniz</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İlçe</label>
          <input
            className={styles.input}
            placeholder="İlçe adı"
            value={data.district}
            onChange={e => onChange({ district: e.target.value })}
          />
        </div>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Tam Adres</label>
        <input
          className={styles.input}
          placeholder="Mahalle, cadde, sokak..."
          value={data.address}
          onChange={e => onChange({ address: e.target.value })}
        />
      </div>
    </div>
  )
}
