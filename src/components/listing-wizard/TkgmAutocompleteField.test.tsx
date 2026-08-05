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
