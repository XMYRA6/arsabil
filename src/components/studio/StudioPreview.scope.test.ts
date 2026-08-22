import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'StudioPreview.module.css'), 'utf8')
const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))

// Faz 1B Task 4 bullet 4: 360px/768px genisliklerinde container boyutu ve
// bilgi hiyerarsisi kontrolu — canli tarayici QA'ye kadar statik CSS
// denetimiyle kilitlenir.
describe('StudioPreview — 360px/768px duyarli yerlesim (Faz 1B Task 4)', () => {
  it('mobilde ozet kart tek sutuna duser (uc metrik yan yana sikismaz)', () => {
    expect(mobile).toMatch(/\.summaryGrid\s*\{[^}]*grid-template-columns:\s*1fr/)
  })

  it('mobilde baslik/toolbar dikeye kirilir, dar genislikte yan yana sikismaz', () => {
    expect(mobile).toMatch(/\.studioHeader\s*\{[^}]*flex-direction:\s*column/)
  })

  it('kontrol grubu (toolbar) satir kirabilir — dar genislikte tasmaz', () => {
    expect(css).toMatch(/\.toolbar\s*\{[^}]*flex-wrap:\s*wrap/)
  })

  it('canvasShell mobilde sabit, tasmaya karsi guvenli bir yukseklik alir', () => {
    expect(mobile).toMatch(/\.canvasShell\s*\{[^}]*height:\s*340px/)
  })
})
