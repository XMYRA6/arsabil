'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import {
  resolveScene,
  type SceneValue,
} from '@/lib/dioramas/scene'
import {
  getFx,
  type SceneFx,
  type Tree,
  type Point,
  type Glow,
} from '@/lib/dioramas/fx/fx'
import {
  createRng,
  windAt,
  rainBand,
  createRain,
  stepRain,
  createSnow,
  snowKind,
  stepSnow,
  easeIntensity,
  type Drop,
  type Flake,
} from '@/lib/dioramas/fx/particles'
import styles from './DioramaStage.module.css'

type Weather = 'gunesli' | 'bulutlu' | 'yagmurlu' | 'karli'
type Motion = 'auto' | 'off'

interface DioramaStageProps {
  scene: SceneValue
  weather: Weather
  motion?: Motion
  className?: string
}

const WEATHER_WEIGHT: Record<Weather, number> = {
  gunesli: 0.8,
  bulutlu: 1,
  yagmurlu: 1.5,
  karli: 0.45,
}

const WEATHER_SPEED: Record<Weather, number> = {
  gunesli: 1,
  bulutlu: 1,
  yagmurlu: 1.5,
  karli: 0.7,
}

const VARIANT_SRC: Record<Weather, 'wet' | 'snow' | ''> = {
  gunesli: '',
  bulutlu: '',
  yagmurlu: 'wet',
  karli: 'snow',
}

const SURFACE_OPACITY: Record<Weather, number> = {
  gunesli: 0,
  bulutlu: 0.55,
  yagmurlu: 0.95,
  karli: 0.3,
}

const RM_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReduced(cb: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(RM_QUERY)
  mq.addEventListener?.('change', cb)
  return () => mq.removeEventListener?.('change', cb)
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(RM_QUERY).matches : false),
    () => false,
  )
}

function useVisibilityAndHidden(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    let visible = true
    const update = () => {
      const nextPaused = document.hidden || !visible
      setPaused(nextPaused)
    }

    // IntersectionObserver yoksa (eski tarayıcı/test ortamı) görünür varsayılır.
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            visible = entries[0]?.isIntersecting ?? true
            update()
          })
    io?.observe(el)

    const onVis = () => update()
    document.addEventListener('visibilitychange', onVis)

    return () => {
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [rootRef])
  return paused
}

/** Hava varyantı görseli: bağlandıktan bir kare sonra açılır (opacity geçişi için). */
function WeatherVariant({ src }: { src: string }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 16)
    return () => clearTimeout(t)
  }, [])
  return <img data-layer="weather-variant" className={styles.weatherVariant} src={src} data-on={on ? '' : undefined} alt="" />
}

interface Splash {
  x: number
  y: number
  t: number
  r: number
  dx: number[]
}

function ParticlesCanvas({
  weather,
  fx,
  paused,
  isNight,
}: {
  weather: Weather
  fx: SceneFx
  paused: boolean
  isNight: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const intenRef = useRef({ rain: 0, snow: 0 })
  const lastRef = useRef(0)
  const clockRef = useRef(0)

  const dropsRef = useRef<Drop[]>([])
  const flakesRef = useRef<Flake[]>([])
  const splashesRef = useRef<Splash[]>([])
  const spritesRef = useRef<Partial<Record<'dayS' | 'dayB' | 'nightS' | 'nightB', HTMLCanvasElement>>>({})

  useEffect(() => {
    const rng = createRng(42)
    dropsRef.current = createRain(360, rng)
    flakesRef.current = createSnow(340, rng)
  }, [])

  useEffect(() => {
    const makeSprite = (blur: boolean, day: boolean) => {
      const c = document.createElement('canvas')
      c.width = 64
      c.height = 64
      const g = c.getContext('2d')
      if (!g) return c
      if (day) {
        const h = g.createRadialGradient(32, 34, 2, 32, 34, 30)
        h.addColorStop(0, 'rgba(95,120,155,.30)')
        h.addColorStop(1, 'rgba(95,120,155,0)')
        g.fillStyle = h
        g.fillRect(0, 0, 64, 64)
      }
      const r = g.createRadialGradient(32, 32, 0, 32, 32, blur ? 30 : 20)
      r.addColorStop(0, 'rgba(255,255,255,1)')
      r.addColorStop(blur ? 0.15 : 0.55, `rgba(255,255,255,${blur ? 0.55 : 0.95})`)
      r.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = r
      g.fillRect(0, 0, 64, 64)
      return c
    }
    spritesRef.current = {
      dayS: makeSprite(false, true),
      dayB: makeSprite(true, true),
      nightS: makeSprite(false, false),
      nightB: makeSprite(true, false),
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let CW = 0
    let CH = 0
    let DPR = 1
    const rng = createRng(137)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      DPR = Math.min(2, window.devicePixelRatio || 1)
      CW = r.width
      CH = r.height
      canvas.width = Math.round(CW * DPR)
      canvas.height = Math.round(CH * DPR)
    }

    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    ro?.observe(canvas)
    resize()

    const surfaceXY = (): [number, number] | null => {
      const pts = fx.surface
      if (!pts || pts.length === 0) return null
      const p = pts[(rng() * pts.length) | 0]
      return [p[0] * CW, p[1] * CH]
    }

    const frame = (ts: number) => {
      rafRef.current = 0
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000 || 0.016)
      lastRef.current = ts
      clockRef.current += dt

      const tgt = {
        rain: weather === 'yagmurlu' ? 1 : 0,
        snow: weather === 'karli' ? 1 : 0,
      }
      intenRef.current.rain = easeIntensity(intenRef.current.rain, tgt.rain, dt)
      intenRef.current.snow = easeIntensity(intenRef.current.snow, tgt.snow, dt)

      const w = windAt(clockRef.current)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      ctx.clearRect(0, 0, CW, CH)

      if (intenRef.current.rain > 0.01) {
        const col = isNight ? '200,218,245' : '92,114,140'
        const tilt = 0.2 + 0.3 * w
        for (let band = 0; band < 3; band++) {
          const lo = band / 3
          const hi = (band + 1) / 3
          const zc = (lo + hi) / 2
          const b = rainBand(zc)
          const al = b.alpha * intenRef.current.rain
          ctx.lineWidth = b.width
          ctx.lineCap = 'round'
          ctx.strokeStyle = `rgba(${col},${al.toFixed(3)})`
          ctx.beginPath()
          for (const d of dropsRef.current) {
            if (d.z < lo || d.z >= hi) continue
            stepRain([d], dt, CH, CW, tilt, rng)
            if (d.y > 1.05) {
              d.y = -0.05 - rng() * 0.1
              d.x = -0.2 + rng() * 1.3
            }
            const x = d.x * CW
            const y = d.y * CH
            ctx.moveTo(x, y)
            ctx.lineTo(x - b.len * tilt, y - b.len)
          }
          ctx.stroke()
        }

        if (rng() < dt * 46 * intenRef.current.rain) {
          const p = surfaceXY()
          if (p) {
            splashesRef.current.push({
              x: p[0],
              y: p[1],
              t: 0,
              r: 4 + rng() * 6,
              dx: [-5 + rng() * 10, -5 + rng() * 10],
            })
          }
        }

        for (let i = splashesRef.current.length - 1; i >= 0; i--) {
          const s = splashesRef.current[i]
          s.t += dt
          const u = s.t / 0.42
          if (u >= 1) {
            splashesRef.current.splice(i, 1)
            continue
          }
          const e = 1 - Math.pow(1 - u, 2)
          const a = (1 - u) * 0.55 * intenRef.current.rain
          ctx.lineWidth = 1
          ctx.strokeStyle = isNight
            ? `rgba(210,225,250,${a.toFixed(3)})`
            : `rgba(255,255,255,${(a * 1.2).toFixed(3)})`
          ctx.beginPath()
          ctx.ellipse(s.x, s.y, s.r * e, s.r * e * 0.42, 0, 0, 6.283)
          ctx.stroke()
          ctx.fillStyle = ctx.strokeStyle
          for (const dx of s.dx) {
            const h = Math.sin(u * Math.PI) * 9
            ctx.fillRect(s.x + dx * e * 2, s.y - h, 1.4, 1.4)
          }
        }
      } else {
        splashesRef.current.length = 0
      }

      if (intenRef.current.snow > 0.01) {
        const S = isNight
          ? { s: spritesRef.current.nightS, b: spritesRef.current.nightB }
          : { s: spritesRef.current.dayS, b: spritesRef.current.dayB }
        for (const f of flakesRef.current) {
          stepSnow([f], dt, clockRef.current, w, CH, CW, rng)
          if (f.y > 1.04) {
            f.y = -0.04
            f.x = rng()
          }
          if (f.x > 1.05) f.x = -0.05
          if (f.x < -0.05) f.x = 1.05
          const z = f.z
          const kind = snowKind(z)
          const far = kind === 'far'
          const near = kind === 'near'
          const r = far ? 1.3 + f.s * 0.5 : near ? 4.2 + z * 2 : 2.1 + z * 1.6
          const a = (far ? 0.55 : near ? 0.5 : 0.8) * intenRef.current.snow
          ctx.globalAlpha = a
          const sprite = near ? S.b : S.s
          if (sprite) ctx.drawImage(sprite, f.x * CW - r * 2, f.y * CH - r * 2, r * 4, r * 4)
        }
        ctx.globalAlpha = 1
      }

      if (
        !paused &&
        (tgt.rain > 0 || tgt.snow > 0 || intenRef.current.rain > 0.01 || intenRef.current.snow > 0.01)
      ) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        ctx.clearRect(0, 0, CW, CH)
      }
    }

    const start = () => {
      if (!rafRef.current) {
        lastRef.current = performance.now()
        rafRef.current = requestAnimationFrame(frame)
      }
    }
    const stop = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }

    if (!paused) start()
    else stop()

    return () => {
      stop()
      ro?.disconnect()
    }
  }, [weather, paused, isNight, fx])

  return <canvas ref={canvasRef} data-layer="particles" className={styles.particles} />
}

export function DioramaStage({
  scene,
  weather,
  motion = 'auto',
  className,
}: DioramaStageProps) {
  const reduced = useReducedMotion()
  const motionOff = motion === 'off' || reduced
  const isNight = scene.zaman === 'gece'

  const resolved = useMemo(() => resolveScene(scene), [scene])
  const fx = useMemo(() => getFx(resolved.id), [resolved.id])

  const variant = VARIANT_SRC[weather]
  const hasVariant = variant !== '' && fx.weather !== null

  const rootRef = useRef<HTMLDivElement>(null)
  const paused = useVisibilityAndHidden(rootRef)

  const w = WEATHER_WEIGHT[weather]
  const spd = WEATHER_SPEED[weather]

  const hasCloud = !isNight
  const hasGlint = !isNight && (weather === 'gunesli' || weather === 'bulutlu') && fx.water.length > 0
  const hasLamp = isNight && fx.glow.length > 0
  const hasCrop = fx.crop !== null && weather !== 'karli'
  const hasParticles = (weather === 'yagmurlu' || weather === 'karli') && !motionOff

  return (
    <div
      ref={rootRef}
      data-testid="diorama-stage"
      data-scene-id={resolved.id}
      data-weather={weather}
      data-motion={motionOff ? 'off' : 'on'}
      data-paused={paused ? '' : undefined}
      className={[styles.root, className].filter(Boolean).join(' ')}
    >
      <div className={styles.stage}>
        <div className={styles.pic} style={{ aspectRatio: String(resolved.aspect) }}>
          <img
            className={styles.poster}
            src={resolved.src1600}
            srcSet={`${resolved.src800} 800w, ${resolved.src1600} 1600w`}
            alt={`${resolved.etiket} · ${resolved.egim === 'yamac' ? 'yamaç' : 'düz'} · ${isNight ? 'gece' : 'gündüz'}`}
          />

          {hasVariant && (
            <WeatherVariant key={`${resolved.id}-${variant}`} src={`/dioramas/weather/${resolved.id}-${variant}.webp`} />
          )}

          {!motionOff &&
            fx.trees.map((t: Tree, i: number) => {
              const [cx, cy] = t.c
              const [rx, ry] = t.r
              const mask = `radial-gradient(ellipse ${rx * 100}% ${ry * 100}% at ${cx * 100}% ${cy * 100}%, #000 58%, transparent 100%)`
              const bg = hasVariant
                ? `/dioramas/weather/${resolved.id}-${variant}.webp`
                : resolved.src1600
              return (
                <div
                  key={i}
                  data-layer="sway"
                  className={styles.sway}
                  style={{
                    transformOrigin: `${t.b[0] * 100}% ${t.b[1] * 100}%`,
                    WebkitMaskImage: mask,
                    maskImage: mask,
                    backgroundImage: `url(${bg})`,
                    '--a': t.a,
                    '--w': w,
                    '--spd': spd,
                    '--dl': -t.d,
                  } as CSSProperties}
                />
              )
            })}

          {!motionOff && hasCloud && (
            <div
              data-layer="cloud"
              className={styles.cloud}
              style={{
                WebkitMaskImage: `url(${resolved.src1600})`,
                maskImage: `url(${resolved.src1600})`,
              }}
            >
              <i className={styles.cloudInner} />
              <div
                className={styles.cloudCover}
                style={{ opacity: SURFACE_OPACITY[weather] }}
              />
            </div>
          )}

          {!motionOff && hasGlint &&
            fx.water.map((p: Point, i: number) => (
              <i
                key={i}
                data-layer="glint"
                className={styles.glint}
                style={{
                  left: `${p[0] * 100}%`,
                  top: `${p[1] * 100}%`,
                  animationDelay: `${(i * 0.53) % 3.2}s`,
                }}
              />
            ))}

          {!motionOff && hasLamp &&
            fx.glow.map((g: Glow, i: number) => {
              const [x, y, size] = g
              const d = Math.min(4.2, Math.max(1.4, Math.sqrt(size) * 0.2))
              return (
                <i
                  key={i}
                  data-layer="lamp"
                  className={styles.lamp}
                  style={{
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: `${d}%`,
                    animationDelay: `${(i * 0.7) % 4.6}s`,
                  }}
                />
              )
            })}

          {!motionOff && hasCrop && (
            <div
              data-layer="crop-wave"
              className={styles.wave}
              style={{
                WebkitMaskImage: `url(${fx.crop})`,
                maskImage: `url(${fx.crop})`,
              }}
            >
              <i className={styles.waveA} />
              <i className={styles.waveB} />
            </div>
          )}

          {hasParticles && (
            <ParticlesCanvas weather={weather} fx={fx} paused={paused} isNight={isNight} />
          )}
        </div>
      </div>
    </div>
  )
}
