'use client'
import { useEffect, useState } from 'react'
import { mergeScenarios, type ScenarioItem } from '@/lib/akif/chat/scenarios'

async function getList(url: string): Promise<unknown[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as { projects?: unknown }
    return Array.isArray(data.projects) ? data.projects : []
  } catch {
    return []
  }
}

export function useScenarios(enabled: boolean): { items: ScenarioItem[]; loading: boolean } {
  const [items, setItems] = useState<ScenarioItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setItems([])
      return
    }
    let alive = true
    setLoading(true)
    Promise.all([getList('/api/projects'), getList('/api/akif/projeler')]).then(([site, kart]) => {
      if (!alive) return
      setItems(mergeScenarios({ site, kart }))
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [enabled])

  return { items, loading }
}
