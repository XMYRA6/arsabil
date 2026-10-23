'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

// Chart.js/Canvas hardcoded hex renk bekliyordu, proje token sisteminin
// dışındaydı (Impeccable critique P2, 2026-09-17) — koyu/açık tema arasında
// tutarsızdı. CSS custom property'ler Canvas'a doğrudan geçirilemez
// (`var(--x)` string'i çözümlenmez), bu yüzden mount sonrası
// `getComputedStyle` ile gerçek değer okunuyor.
function useCssVar(name: string, fallback: string): string {
  const [value, setValue] = useState(fallback)
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    if (v) setValue(v)
  }, [name])
  return value
}

export interface PriceTrendChartProps {
  points: Array<{ month: string; medianPricePerSqm: number; sampleCount: number }>
  changePct3m: number | null
  thinTrend?: boolean
}

function label(month: string): string {
  const [y, m] = month.split('-')
  return `${AYLAR[Number(m) - 1]} '${y.slice(2)}`
}

export function PriceTrendChart({ points, changePct3m, thinTrend }: PriceTrendChartProps) {
  const primary = useCssVar('--amber', '#e5a52b')
  const green = useCssVar('--green', '#1e7a3c')
  const red = useCssVar('--red', '#b3261e')
  const muted = useCssVar('--muted', '#8a8a8e')

  const data = {
    labels: points.map((p) => label(p.month)),
    datasets: [
      {
        data: points.map((p) => p.medianPricePerSqm),
        borderColor: primary,
        backgroundColor: `color-mix(in srgb, ${primary} 8%, transparent)`,
        borderWidth: 2,
        tension: 0.2,
        spanGaps: false,
        pointRadius: 3,
        fill: true,
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          footer: (items: Array<{ dataIndex: number }>) =>
            items[0] ? `${points[items[0].dataIndex].sampleCount} ilan` : '',
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (v: string | number) => `${Number(v).toLocaleString('tr-TR')} ₺`,
        },
      },
    },
  }
  const pos = (changePct3m ?? 0) >= 0
  const trendSummary = changePct3m != null
    ? `Son 12 ayda medyan m² fiyatı ${pos ? 'yaklaşık %' : 'yaklaşık -%'}${Math.abs(changePct3m).toLocaleString('tr-TR')} değişti.`
    : 'Fiyat trendi grafiği.'

  return (
    <div>
      {/* Impeccable critique P2 (2026-09-17): canvas ekran okuyucuya hiçbir
          şey söylemiyordu — role="img"+aria-label ile metinsel özet eklendi. */}
      <div role="img" aria-label={trendSummary}>
        <Line data={data} options={options} aria-hidden="true" />
      </div>
      {changePct3m != null && (
        <p style={{ fontSize: '0.85rem', marginTop: 8 }}>
          Son 3 ay:{' '}
          <strong style={{ color: pos ? green : red }}>
            {pos ? '+' : '-'}%{Math.abs(changePct3m).toLocaleString('tr-TR')}
          </strong>
        </p>
      )}
      {thinTrend && (
        <p style={{ fontSize: '0.75rem', color: muted, marginTop: 4 }}>
          ⚠︎ sınırlı geçmiş veriye dayanıyor
        </p>
      )}
    </div>
  )
}
