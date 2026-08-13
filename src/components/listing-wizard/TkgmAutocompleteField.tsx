'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import styles from './TkgmAutocompleteField.module.css'

export type IdariYapiItem = { id: number; text: string }

interface Props {
    id: string
    label: string
    required?: boolean
    items: IdariYapiItem[]
    value: string
    onInputChange: (text: string) => void
    onSelect: (item: IdariYapiItem) => void
    disabled?: boolean
    placeholder?: string
}

function turkishIncludes(haystack: string, needle: string): boolean {
    return haystack.toLocaleLowerCase('tr').includes(needle.toLocaleLowerCase('tr'))
}

export function TkgmAutocompleteField({
    id, label, required, items, value, onInputChange, onSelect, disabled, placeholder,
}: Props) {
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    // Son commit edilen ogenin id'si. `handleBlur` her blur'da (yalnizca
    // deger degistiginde degil) tetiklenir — bu ref olmadan, kullanici zaten
    // secili bir alandan sadece bir SONRAKI alana TAB/tiklama ile gecince
    // bile ayni oge yeniden "secilircesine" onSelect'i tetikliyordu; ebeveyn
    // bunu YENI bir secim saniyor, asagi akan (ilce/mahalle) state'i sessizce
    // sifirliyor ve gereksiz bir fetch'i tekrarliyordu (canli Playwright ile
    // yakalandi — jsdom testleri bu "zaten secili alani terk etme" akisini
    // hic zincirlemedigi icin gormemisti).
    const lastCommittedIdRef = useRef<number | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    // Listbox artik `document.body`ye portallaniyor (asagida) — `.field`
    // icinde `position:absolute` iken sheet'in `overflow-y:auto` govdesi
    // onu KIRPIYORDU (kullanici bulgusu, canli ekran goruntusu). Konum,
    // input'un GERCEK ekran koordinatlarindan (`getBoundingClientRect`)
    // hesaplanir; boylece hicbir ata `overflow:hidden/auto` onu kesemez.
    const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)

    const matches = value.trim() === ''
        ? items.slice(0, 8)
        : items.filter(item => turkishIncludes(item.text, value)).slice(0, 8)

    const gorunuyor = open && matches.length > 0

    useLayoutEffect(() => {
        if (!gorunuyor || !inputRef.current) return
        const r = inputRef.current.getBoundingClientRect()
        setRect({ top: r.bottom + 4, left: r.left, width: r.width })
    }, [gorunuyor]);

    // Surekli yeniden konumlandirmak (scroll takibi) yerine BILEREK basit
    // ve saglam bir cozum: kullanici kaydirinca dropdown kapanir. Surekli
    // takip, scroll sirasinda "yapiskan" bir dropdown'in yanlis yerde
    // asili kalmasi gibi kendi hata siniflarini acardi.
    useEffect(() => {
        if (!gorunuyor) return
        const kapat = () => setOpen(false)
        window.addEventListener('scroll', kapat, true)
        return () => window.removeEventListener('scroll', kapat, true)
    }, [gorunuyor]);

    const commit = (item: IdariYapiItem) => {
        lastCommittedIdRef.current = item.id
        onSelect(item)
        setOpen(false)
        setActiveIndex(-1)
    }

    const handleBlur = () => {
        // Tam metin eslesmesi varsa otomatik sec — serbest metin asla
        // TKGM'ye ulasmadan disariya sizmaz (spec ilkesi). Ama eslesen oge
        // zaten en son commit edilen oge ise (kullanici hicbir sey
        // degistirmeden alani terk etti) yeniden commit ETMEYIZ — bkz.
        // yukaridaki lastCommittedIdRef yorumu.
        const trimmed = value.trim().toLocaleLowerCase('tr')
        const exact = items.find(item => item.text.toLocaleLowerCase('tr') === trimmed)
        if (exact && exact.id !== lastCommittedIdRef.current) commit(exact)
        setOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true)
            return
        }
        if (!open) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, matches.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && matches[activeIndex]) {
                e.preventDefault()
                commit(matches[activeIndex])
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    return (
        <div className={styles.field}>
            <label className={styles.label} htmlFor={id}>{label}{required ? ' *' : ''}</label>
            <input
                ref={inputRef}
                id={id}
                className={styles.input}
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                autoComplete="off"
                role="combobox"
                aria-expanded={gorunuyor}
                aria-activedescendant={activeIndex >= 0 && matches[activeIndex] ? `${id}-option-${matches[activeIndex].id}` : undefined}
                aria-controls={`${id}-listbox`}
                onChange={e => {
                    // Kullanici gercekten yazdiginda "son commit" gecersiz
                    // sayilir — aksi halde silip AYNI metni yeniden yazmak
                    // (ornegin ebeveyn araya girip secimi sifirlamissa) bir
                    // daha asla commit tetiklemezdi.
                    lastCommittedIdRef.current = null
                    onInputChange(e.target.value)
                    setOpen(true)
                    setActiveIndex(-1)
                }}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
            {gorunuyor && rect && typeof document !== 'undefined' && createPortal(
                <ul
                    className={styles.listbox}
                    id={`${id}-listbox`}
                    role="listbox"
                    style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
                >
                    {matches.map((item, idx) => (
                        <li
                            key={item.id}
                            id={`${id}-option-${item.id}`}
                            role="option"
                            aria-selected={idx === activeIndex}
                            className={idx === activeIndex ? `${styles.option} ${styles.optionActive}` : styles.option}
                            // onMouseDown SADECE preventDefault yapar (input'un onBlur'unun
                            // ONCE tetiklenmesini engeller); gercek secim onClick'te olur —
                            // boylece hem gercek kullanici tiklamasi hem testing-library'nin
                            // fireEvent.click'i (yalnizca 'click' dispatch eder) dogru calisir.
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => commit(item)}
                        >
                            {item.text}
                        </li>
                    ))}
                </ul>,
                document.body,
            )}
        </div>
    )
}
