export function createRng(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function windAt(t: number): number {
  return Math.sin(t * 0.35) * 0.5 + Math.sin(t * 0.91 + 1.3) * 0.25;
}

export function rainBand(z: number): { len: number; speed: number; width: number; alpha: number } {
  return {
    len: 9 + 38 * z,
    speed: 620 + 950 * z,
    width: 0.6 + 1.05 * z,
    alpha: 0.16 + 0.40 * z,
  };
}

export type Drop = { x: number; y: number; z: number };

export function createRain(n: number, rng: () => number): Drop[] {
  const drops: Drop[] = [];
  for (let i = 0; i < n; i++) {
    drops.push({
      x: -0.1 + rng() * 1.2,
      y: rng(),
      z: rng(),
    });
  }
  return drops;
}

export function stepRain(
  drops: Drop[],
  dt: number,
  height: number,
  width: number,
  tilt: number,
  rng: () => number
): void {
  for (const d of drops) {
    const band = rainBand(d.z);
    d.y += (band.speed * dt) / height;
    d.x += (band.speed * tilt * dt) / width;

    if (d.y > 1.05) {
      d.y = -0.05 - rng() * 0.1;
      d.x = -0.2 + rng() * 1.3;
    }
  }
}

export type Flake = { x: number; y: number; z: number; p: number; f: number; s: number };

export function createSnow(n: number, rng: () => number): Flake[] {
  const flakes: Flake[] = [];
  for (let i = 0; i < n; i++) {
    flakes.push({
      x: rng(),
      y: rng(),
      z: rng(),
      p: rng() * Math.PI * 2,
      f: 0.6 + rng() * 0.8,
      s: rng(),
    });
  }
  return flakes;
}

export function snowKind(z: number): 'far' | 'mid' | 'near' {
  if (z < 0.34) return 'far';
  if (z > 0.78) return 'near';
  return 'mid';
}

export function stepSnow(
  flakes: Flake[],
  dt: number,
  clock: number,
  wind: number,
  height: number,
  width: number,
  rng: () => number
): void {
  for (const p of flakes) {
    const kind = snowKind(p.z);
    const baseSpeed = kind === 'far' ? 26 : kind === 'near' ? 96 : 52;
    const vy = (baseSpeed * (0.8 + 0.4 * p.f) / height) * (1 + 0.25 * Math.sin(clock * 1.3 + p.p));
    
    p.y += vy * dt;
    p.x += ((wind * 38 + Math.sin(clock * 0.9 * p.f + p.p) * 15) * (0.4 + p.z)) * dt / width;

    if (p.y > 1.04) {
      p.y = -0.04;
      p.x = rng();
    }
    
    if (p.x > 1.05) p.x = -0.05;
    if (p.x < -0.05) p.x = 1.05;
  }
}

export function easeIntensity(cur: number, target: number, dt: number): number {
  return cur + (target - cur) * Math.min(1, dt * 3);
}
