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

function Wrapper({ items = ITEMS, disabled = false }: { items?: IdariYapiItem[]; disabled?: boolean }) {
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
                onSelect={item => { setSelected(item); setValue(item.text) }}
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
})
