/** @jest-environment jsdom */
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TkgmAutocompleteField, type IdariYapiItem } from './TkgmAutocompleteField'

const ITEMS: IdariYapiItem[] = [
    { id: 1, text: 'İstanbul' },
    { id: 2, text: 'Isparta' },
    { id: 3, text: 'İzmir' },
]

function Wrapper({
    items = ITEMS, disabled = false, onSelectSpy,
}: { items?: IdariYapiItem[]; disabled?: boolean; onSelectSpy?: (item: IdariYapiItem) => void }) {
    const [value, setValue] = useState('')
    const [selected, setSelected] = useState<IdariYapiItem | null>(null)
    return (
        <div>
            <TkgmAutocompleteField
                id="test-field"
                label="İl"
                required
                items={items}
                value={value}
                onInputChange={setValue}
                onSelect={item => { setSelected(item); setValue(item.text); onSelectSpy?.(item) }}
                disabled={disabled}
            />
            {selected && <span data-testid="selected">{selected.text}-{selected.id}</span>}
        </div>
    )
}

describe('TkgmAutocompleteField', () => {
    it('etiket ve input render eder', () => {
        render(<Wrapper />)
        expect(screen.getByLabelText('İl *')).toBeInTheDocument()
    })

    it('yazinca eslesen ogeler listelenir', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'ist' } })
        expect(screen.getByText('İstanbul')).toBeInTheDocument()
        expect(screen.queryByText('Isparta')).not.toBeInTheDocument()
    })

    it('Turkce buyuk/kucuk harf farkini dogru uygular — "ı" İstanbul ile eslesmez', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'ı' } })
        expect(screen.queryByText('İstanbul')).not.toBeInTheDocument()
        expect(screen.getByText('Isparta')).toBeInTheDocument()
    })

    it('bir ogeye tiklamak onSelect cagirir ve inputu doldurur', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'izm' } })
        fireEvent.click(screen.getByText('İzmir'))
        expect(screen.getByTestId('selected')).toHaveTextContent('İzmir-3')
        expect(screen.getByLabelText('İl *')).toHaveValue('İzmir')
    })

    it('klavyeyle asagi ok + Enter secim yapar', () => {
        render(<Wrapper />)
        const input = screen.getByLabelText('İl *')
        fireEvent.change(input, { target: { value: 'i' } })
        fireEvent.keyDown(input, { key: 'ArrowDown' })
        fireEvent.keyDown(input, { key: 'ArrowDown' })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(screen.getByTestId('selected')).toBeInTheDocument()
    })

    it('blur olurken tam metin eslesmesi varsa otomatik secilir', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'İzmir' } })
        fireEvent.blur(screen.getByLabelText('İl *'))
        expect(screen.getByTestId('selected')).toHaveTextContent('İzmir-3')
    })

    it('disabled iken input devre disidir', () => {
        render(<Wrapper disabled />)
        expect(screen.getByLabelText('İl *')).toBeDisabled()
    })

    // Canli Playwright ile yakalanan gercek bug: zaten secili (commit edilmis)
    // bir alandan, deger DEGISTIRILMEDEN blur olununca (ornegin kullanici
    // sadece bir SONRAKI alana tiklar/Tab basar) onSelect gereksiz yere
    // TEKRAR tetikleniyordu. Tuketici tarafinda (ManualParcelEntryForm) her
    // onSelect cagrisi "yeni bir secim" sayildigindan bu, asagi akan
    // ilce/mahalle state'ini sessizce sifirliyor ve gereksiz bir fetch'i
    // tekrarliyordu — kullanici sadece bir sonraki alana gecmeye
    // calisirken form kendi kendini resetliyordu.
    it('zaten secili alan deger degismeden tekrar blur olursa onSelect TEKRAR tetiklenmez', () => {
        const onSelectSpy = jest.fn()
        render(<Wrapper onSelectSpy={onSelectSpy} />)
        const input = screen.getByLabelText('İl *')

        fireEvent.change(input, { target: { value: 'İzmir' } })
        fireEvent.click(screen.getByText('İzmir'))
        expect(onSelectSpy).toHaveBeenCalledTimes(1)

        // odak baska bir yere gidip (ornekte dogrudan blur), deger HIC
        // degismeden geri gelmis gibi ikinci bir blur — gercek kullanicinin
        // "sonraki alana tiklamasi" senaryosu.
        fireEvent.blur(input)
        expect(onSelectSpy).toHaveBeenCalledTimes(1)

        fireEvent.focus(input)
        fireEvent.blur(input)
        expect(onSelectSpy).toHaveBeenCalledTimes(1)
    })

    // Regresyon: dropdown eskiden `.field` icinde `position:absolute` idi —
    // `ParcelVerificationSheet`in `overflow-y:auto` govdesi icine yerlestigi
    // icin sheet'in ust kenarina yakin acilinca KIRPILIYORDU (kullanici
    // bulgusu: "asagiya dogru acilan secenekler oldukca kotu bir tasarim
    // gosteriyor"). Artik `document.body`ye portallanip input'un gercek
    // ekran konumuna (`getBoundingClientRect`) gore `position:fixed` ile
    // yerlesiyor — hicbir overflow:hidden/auto atasi onu kirpamiyor.
    it('listbox document.body altina portallanir, .field wrapper icine DEGIL', () => {
        const { container } = render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'ist' } })
        const listbox = screen.getByRole('listbox')
        expect(container.contains(listbox)).toBe(false)
        expect(document.body.contains(listbox)).toBe(true)
    })

    it('listbox konumu input\'un gercek ekran konumuna (getBoundingClientRect) gore hesaplanir', () => {
        render(<Wrapper />)
        const input = screen.getByLabelText('İl *')
        input.getBoundingClientRect = () => ({
            top: 200, bottom: 234, left: 40, right: 340, width: 300, height: 34,
            x: 40, y: 200, toJSON: () => {},
        })
        fireEvent.change(input, { target: { value: 'ist' } })
        const listbox = screen.getByRole('listbox')
        expect(listbox.style.position).toBe('fixed')
        expect(listbox.style.top).toBe('238px')  // bottom (234) + 4px bosluk
        expect(listbox.style.left).toBe('40px')
        expect(listbox.style.width).toBe('300px')
    })

    it('sayfa kaydirilinca dropdown kapanir (yeniden konumlandirmak yerine basit/saglam cozum)', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'ist' } })
        expect(screen.getByRole('listbox')).toBeInTheDocument()
        fireEvent.scroll(window)
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('secim sonrasi metin degistirilip AYNI degere geri donulurse onSelect yeniden tetiklenir', () => {
        const onSelectSpy = jest.fn()
        render(<Wrapper onSelectSpy={onSelectSpy} />)
        const input = screen.getByLabelText('İl *')

        fireEvent.change(input, { target: { value: 'İzmir' } })
        fireEvent.click(screen.getByText('İzmir'))
        expect(onSelectSpy).toHaveBeenCalledTimes(1)

        // kullanici gercekten baska bir seye yazip sonra AYNI degere geri
        // donerse (ornegin ebeveyn secimi araya girip sifirlamissa), bu
        // gercek bir yeniden-secim sayilmali — onSelect tekrar tetiklenmeli.
        fireEvent.change(input, { target: { value: 'İzmi' } })
        fireEvent.change(input, { target: { value: 'İzmir' } })
        fireEvent.blur(input)
        expect(onSelectSpy).toHaveBeenCalledTimes(2)
    })
})
