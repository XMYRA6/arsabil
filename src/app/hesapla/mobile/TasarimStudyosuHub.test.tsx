/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TasarimStudyosuHub } from './TasarimStudyosuHub'

function props(patch = {}) {
    return {
        onKapat: jest.fn(),
        onYerlesimAc: jest.fn(),
        onProgramAc: jest.fn(),
        on3DAc: jest.fn(),
        onSenaryolarAc: jest.fn(),
        ...patch,
    }
}

describe('TasarimStudyosuHub', () => {
    it('basligi ve Kapat butonunu render eder, Kapat tiklaninca onKapat cagirir', async () => {
        const onKapat = jest.fn()
        render(<TasarimStudyosuHub {...props({ onKapat })} />)
        expect(screen.getByRole('heading', { name: 'Tasarım Stüdyosu' })).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })

    it('Yerlesim satiri onYerlesimAc i cagirir', async () => {
        const onYerlesimAc = jest.fn()
        render(<TasarimStudyosuHub {...props({ onYerlesimAc })} />)
        await userEvent.click(screen.getByRole('button', { name: /Yerleşim/ }))
        expect(onYerlesimAc).toHaveBeenCalledTimes(1)
    })

    it('Program satiri onProgramAc i cagirir', async () => {
        const onProgramAc = jest.fn()
        render(<TasarimStudyosuHub {...props({ onProgramAc })} />)
        await userEvent.click(screen.getByRole('button', { name: /Program/ }))
        expect(onProgramAc).toHaveBeenCalledTimes(1)
    })

    it('3D Gorunum satiri on3DAc i cagirir', async () => {
        const on3DAc = jest.fn()
        render(<TasarimStudyosuHub {...props({ on3DAc })} />)
        await userEvent.click(screen.getByRole('button', { name: /3D Görünüm/ }))
        expect(on3DAc).toHaveBeenCalledTimes(1)
    })

    it('Tasarim Senaryolari satiri onSenaryolarAc i cagirir', async () => {
        const onSenaryolarAc = jest.fn()
        render(<TasarimStudyosuHub {...props({ onSenaryolarAc })} />)
        await userEvent.click(screen.getByRole('button', { name: /Tasarım Senaryoları/ }))
        expect(onSenaryolarAc).toHaveBeenCalledTimes(1)
    })
})
