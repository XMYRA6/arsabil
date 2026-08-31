'use client'

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
  const data = {
    labels: points.map((p) => label(p.month)),
    datasets: [
      {
        data: points.map((p) => p.medianPricePerSqm),
        borderColor: '#0a5cff',
        backgroundColor: 'rgba(10,92,255,0.08)',
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
  return (
    <div>
      <Line data={data} options={options} />
      {changePct3m != null && (
        <p style={{ fontSize: '0.85rem', marginTop: 8 }}>
          Son 3 ay:{' '}
          <strong style={{ color: pos ? '#1e7a3c' : '#b3261e' }}>
            {pos ? '+' : '-'}%{Math.abs(changePct3m).toLocaleString('tr-TR')}
          </strong>
        </p>
      )}
      {thinTrend && (
        <p style={{ fontSize: '0.75rem', color: '#8a8a8e', marginTop: 4 }}>
          ⚠︎ sınırlı geçmiş veriye dayanıyor
        </p>
      )}
    </div>
  )
}
