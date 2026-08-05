'use client'

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
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

    const matches = value.trim() === ''
        ? items.slice(0, 8)
        : items.filter(item => turkishIncludes(item.text, value)).slice(0, 8)

    const commit = (item: IdariYapiItem) => {
        onSelect(item)
        setOpen(false)
        setActiveIndex(-1)
    }

    const handleBlur = () => {
        // Tam metin eslesmesi varsa otomatik sec — serbest metin asla
        // TKGM'ye ulasmadan disariya sizmaz (spec ilkesi).
        const trimmed = value.trim().toLocaleLowerCase('tr')
        const exact = items.find(item => item.text.toLocaleLowerCase('tr') === trimmed)
        if (exact) commit(exact)
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
                id={id}
                className={styles.input}
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls={`${id}-listbox`}
                onChange={e => {
                    onInputChange(e.target.value)
                    setOpen(true)
                    setActiveIndex(-1)
                }}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
            {open && matches.length > 0 && (
                <ul className={styles.listbox} id={`${id}-listbox`} role="listbox">
                    {matches.map((item, idx) => (
                        <li
                            key={item.id}
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
                </ul>
            )}
        </div>
    )
}
