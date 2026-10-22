# Görev 5a — Parçacık motoru (saf fonksiyonlar)

Sen bir kıdemli TypeScript geliştiricisisin. Aşağıdaki testlerin TAMAMI geçmeli. Testleri değiştirme. Saf TypeScript, React/DOM yok, bağımlılık yok.

## Yazılacak dosya
1. `src/lib/dioramas/fx/particles.ts` — saf fonksiyonlar (React/DOM yok). Export'lar ve imzalar:
   - `createRng(seed: number): () => number` (mulberry32; [0,1) döner).
   - `windAt(t: number): number` = `sin(t*.35)*.5 + sin(t*.91+1.3)*.25` (prototipteki).
   - `rainBand(z: number): {len:number; speed:number; width:number; alpha:number}` : `len = 9 + 38*z`, `speed = 620 + 950*z` (piksel/sn), `width = .6 + 1.05*z`, `alpha = .16 + .40*z`.
   - `type Drop = {x:number;y:number;z:number}`; `createRain(n, rng): Drop[]` (x∈[-0.1,1.1], y∈[0,1], z∈[0,1)).
   - `stepRain(drops: Drop[], dt: number, height: number, width: number, tilt: number, rng): void` — yerinde günceller: `band = rainBand(z)`; `y += band.speed*dt/height`; `x += band.speed*tilt*dt/width`. `y > 1.05` ise `y = -0.05 - rng()*0.1` ve `x = -0.2 + rng()*1.3`. (`tilt=0` iken x değişmez.)
   - `type Flake = {x:number;y:number;z:number;p:number;f:number;s:number}`; `createSnow(n, rng): Flake[]` (p∈[0,2π), f∈[.6,1.4), s∈[0,1)).
   - `snowKind(z): 'far'|'mid'|'near'` : z<.34 far, z>.78 near, aksi mid.
   - `stepSnow(flakes, dt, clock, wind, height, width, rng): void`: `vy = (far?26:near?96:52)*(.8+.4*f)/height*(1+.25*sin(clock*1.3+p))`; `y += vy*dt`; `x += ((wind*38 + sin(clock*.9*f+p)*15)*(.4+z))*dt/width`; `y>1.04` → `y=-.04, x=rng()`; x>1.05 → -0.05, x<-0.05 → 1.05 (sarma).
   - `easeIntensity(cur, target, dt): number` = `cur + (target-cur)*min(1, dt*3)`.

## Çıktı biçimi
Tek dosya, bloğun üstünde tek satır: `// FILE: src/lib/dioramas/fx/particles.ts`. Açıklama yazma.

## Test (değiştirme)
```ts
import { createRng, createRain, createSnow, stepRain, stepSnow, windAt, rainBand, easeIntensity, snowKind } from './particles'

describe('createRng', () => {
  it('aynı tohum aynı dizi, farklı tohum farklı; değerler [0,1)', () => {
    const a = createRng(7), b = createRng(7), c = createRng(8)
    const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()]
    expect(sa).toEqual(sb)
    expect(sa).not.toEqual(sc)
    for (const v of [...sa, ...sc]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('windAt', () => {
  it('zamanla yumuşak değişir, [-1, 1] aralığında', () => {
    let prev = windAt(0)
    for (let t = 0; t < 120; t += 0.25) {
      const w = windAt(t)
      expect(Math.abs(w)).toBeLessThanOrEqual(1)
      expect(Math.abs(w - prev)).toBeLessThan(0.2)
      prev = w
    }
  })
  it('belirlenimci', () => expect(windAt(12.5)).toBe(windAt(12.5)))
})

describe('rainBand', () => {
  it('yakın damla (z büyük) daha uzun, daha hızlı, daha kalın ve daha belirgin', () => {
    const far = rainBand(0.1), near = rainBand(0.9)
    expect(near.len).toBeGreaterThan(far.len)
    expect(near.speed).toBeGreaterThan(far.speed)
    expect(near.width).toBeGreaterThan(far.width)
    expect(near.alpha).toBeGreaterThan(far.alpha)
  })
  it('alpha 0-1, değerler pozitif', () => {
    for (const z of [0, 0.5, 1]) {
      const b = rainBand(z)
      expect(b.alpha).toBeGreaterThan(0)
      expect(b.alpha).toBeLessThanOrEqual(1)
      expect(b.len).toBeGreaterThan(0)
    }
  })
})

describe('yağmur', () => {
  it('createRain: n damla, koordinatlar kutu içinde, z [0,1)', () => {
    const d = createRain(50, createRng(1))
    expect(d).toHaveLength(50)
    for (const p of d) {
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(1)
      expect(p.z).toBeGreaterThanOrEqual(0)
      expect(p.z).toBeLessThan(1)
    }
  })
  it('stepRain: damlalar aşağı iner; yakın olan daha hızlı', () => {
    const d = [{ x: 0.5, y: 0.2, z: 0.1 }, { x: 0.5, y: 0.2, z: 0.9 }]
    stepRain(d, 0.016, 800, 1000, 0, createRng(2))
    expect(d[0].y).toBeGreaterThan(0.2)
    expect(d[1].y - 0.2).toBeGreaterThan(d[0].y - 0.2)
  })
  it('stepRain: tilt pozitifse x sağa kayar, tilt 0 ise x sabit', () => {
    const d = [{ x: 0.5, y: 0.2, z: 0.5 }]
    stepRain(d, 0.05, 800, 1000, 0.3, createRng(2))
    expect(d[0].x).toBeGreaterThan(0.5)
    const e = [{ x: 0.5, y: 0.2, z: 0.5 }]
    stepRain(e, 0.05, 800, 1000, 0, createRng(2))
    expect(e[0].x).toBe(0.5)
  })
  it('stepRain: alttan çıkan damla yukarıdan yeniden başlar (sarma)', () => {
    const d = [{ x: 0.5, y: 1.04, z: 0.9 }]
    stepRain(d, 0.1, 800, 1000, 0, createRng(3))
    expect(d[0].y).toBeLessThan(0)
  })
})

describe('kar', () => {
  it('snowKind: z eşiklerine göre far/mid/near', () => {
    expect(snowKind(0.2)).toBe('far')
    expect(snowKind(0.5)).toBe('mid')
    expect(snowKind(0.9)).toBe('near')
  })
  it('createSnow: n tane, faz ve hız çarpanı tanımlı', () => {
    const f = createSnow(40, createRng(4))
    expect(f).toHaveLength(40)
    for (const p of f) {
      expect(p.f).toBeGreaterThan(0)
      expect(p.p).toBeGreaterThanOrEqual(0)
    }
  })
  it('stepSnow: aşağı iner, rüzgârla yan kayar, sarmalanır', () => {
    const f = [{ x: 0.5, y: 0.5, z: 0.5, p: 0, f: 1, s: 0.5 }]
    stepSnow(f, 0.1, 5, 1, 600, 800, createRng(5))
    expect(f[0].y).toBeGreaterThan(0.5)
    const edge = [{ x: 1.049, y: 1.05, z: 0.5, p: 0, f: 1, s: 0.5 }]
    stepSnow(edge, 0.1, 5, 1, 600, 800, createRng(5))
    expect(edge[0].y).toBeLessThan(0)
  })
  it('stepSnow: x her zaman [-0.05, 1.05] aralığında kalır', () => {
    const f = createSnow(100, createRng(6))
    for (let i = 0; i < 200; i++) stepSnow(f, 0.016, i * 0.016, windAt(i * 0.016), 600, 800, createRng(i))
    for (const p of f) {
      expect(p.x).toBeGreaterThanOrEqual(-0.05)
      expect(p.x).toBeLessThanOrEqual(1.05)
    }
  })
})

describe('easeIntensity', () => {
  it('hedefe yaklaşır, aşmaz, dt=0 değiştirmez', () => {
    expect(easeIntensity(0, 1, 0)).toBe(0)
    let v = 0
    for (let i = 0; i < 60; i++) v = easeIntensity(v, 1, 0.016)
    expect(v).toBeGreaterThan(0.5)
    expect(v).toBeLessThanOrEqual(1)
  })
  it('hedefe sönümler (azalan yön)', () => {
    let v = 1
    for (let i = 0; i < 60; i++) v = easeIntensity(v, 0, 0.016)
    expect(v).toBeLessThan(0.5)
    expect(v).toBeGreaterThanOrEqual(0)
  })
})

```
