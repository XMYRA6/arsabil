// Akif sohbet arayüzü — sohbetleri yerel gün sınırına göre gruplar.
export type DateLabel = 'Bugün' | 'Dün' | 'Son 7 gün' | 'Daha eski'
const ORDER: DateLabel[] = ['Bugün', 'Dün', 'Son 7 gün', 'Daha eski']

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export function groupByDate<T extends { lastMessageAt: string }>(
  items: T[],
  now: Date,
): { label: DateLabel; items: T[] }[] {
  const today = dayStart(now)
  const buckets = new Map<DateLabel, T[]>()
  for (const it of items) {
    const diff = Math.round((today - dayStart(new Date(it.lastMessageAt))) / 86_400_000)
    const label: DateLabel = diff <= 0 ? 'Bugün' : diff === 1 ? 'Dün' : diff < 7 ? 'Son 7 gün' : 'Daha eski'
    const arr = buckets.get(label) ?? []
    arr.push(it)
    buckets.set(label, arr)
  }
  return ORDER.filter((l) => buckets.has(l)).map((label) => ({ label, items: buckets.get(label)! }))
}
