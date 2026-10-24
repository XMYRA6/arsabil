// Akif sohbet arayüzü — çalışma paneli (sunum bileşeni, veri çekmez).
import type { diffWorkspace, WorkspaceState } from '@/lib/akif/chat/workspace'
import styles from './WorkspacePanel.module.css'

type Changes = ReturnType<typeof diffWorkspace>

const nf = new Intl.NumberFormat('tr-TR')
const dash = '—'
const fmtM2 = (v: unknown) => (typeof v === 'number' ? `${nf.format(v)} m²` : dash)
const fmtTl = (v: unknown) => (typeof v === 'number' ? `₺${nf.format(v)}` : dash)
const fmtPct = (v: unknown) => (typeof v === 'number' ? `%${nf.format(v)}` : dash)
const fmtText = (v: unknown) => (typeof v === 'string' && v ? v : dash)

function Row({
  label,
  value,
  change,
  fmt,
}: {
  label: string
  value: unknown
  change?: { from: unknown; to: unknown }
  fmt: (v: unknown) => string
}) {
  return (
    <div className={styles.kv} data-changed={change ? '' : undefined}>
      <span className={styles.k}>{label}</span>
      <b className={styles.v}>{change ? `${fmt(change.from)} → ${fmt(change.to)}` : fmt(value)}</b>
    </div>
  )
}

export function WorkspacePanel({
  state,
  changes,
  onReport,
  reportDisabled,
}: {
  state: WorkspaceState
  changes: Changes
  onReport(): void
  reportDisabled?: boolean
}) {
  const hasPay = state.arsaSahibiPct !== null
  return (
    <aside className={styles.panel} aria-label="Çalışma paneli">
      {!state.dolu ? (
        <>
          <p className={styles.empty}>Bir arsa söyle, burada değerleri göreceksin</p>
          <div className={styles.placeholders} aria-hidden="true">
            <div className={styles.ph} />
            <div className={styles.ph} />
            <div className={styles.ph} />
          </div>
        </>
      ) : (
        <div className={styles.values} aria-live="polite">
          <h3 className={styles.heading}>Senaryo</h3>
          <Row label="Konum" value={state.konum} change={changes.konum} fmt={fmtText} />
          <Row label="Alan" value={state.alanM2} change={changes.alanM2} fmt={fmtM2} />
          <Row label="m² fiyatı" value={state.m2Fiyat} change={changes.m2Fiyat} fmt={fmtTl} />
          {state.emsalNotu && <p className={styles.note}>{state.emsalNotu}</p>}

          <h3 className={`${styles.heading} ${styles.headingGap}`}>Arsa payı</h3>
          <div className={styles.bar}>
            {hasPay && (
              <>
                <i
                  className={styles.segArsa}
                  data-testid="pay-arsa"
                  style={{ width: `${state.arsaSahibiPct}%` }}
                />
                <i className={styles.segMuteahhit} />
              </>
            )}
          </div>
          <Row label="Arsa sahibi" value={state.arsaSahibiPct} change={changes.arsaSahibiPct} fmt={fmtPct} />
          <Row label="Müteahhit" value={state.muteahhitPct} change={changes.muteahhitPct} fmt={fmtPct} />

          {state.varsayimlar.length > 0 && (
            <>
              <h3 className={`${styles.heading} ${styles.headingGap}`}>Varsayımlar</h3>
              <ul className={styles.list}>
                {state.varsayimlar.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <button type="button" className={styles.report} onClick={onReport} disabled={reportDisabled}>
        Rapor oluştur
      </button>
    </aside>
  )
}
