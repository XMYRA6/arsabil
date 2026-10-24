// alpers/Turkey-Maps-GeoJSON (Apache-2.0) -> sadelestirilmis SVG yollari (src/data/tr-il-harita.json)
// Kullanim: node design/map/build-tr-map.cjs <tr-cities.json>
const fs = require('fs')
const path = require('path')
const src = process.argv[2]
const gj = JSON.parse(fs.readFileSync(src, 'utf8'))
const K = Math.cos((39 * Math.PI) / 180)
const W = 1000
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
const proj = ([lon, lat]) => [lon * K, -lat]
for (const f of gj.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  for (const p of polys) for (const [lon, lat] of p[0]) {
    const [x, y] = proj([lon, lat])
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
}
const s = W / (maxX - minX)
const H = Math.round((maxY - minY) * s)
const tr = (pt) => { const [x, y] = proj(pt); return [(x - minX) * s, (y - minY) * s] }
function rdp(pts, eps) {
  if (pts.length < 3) return pts
  let dmax = 0, idx = 0
  const [a, b] = [pts[0], pts[pts.length - 1]]
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len
    if (d > dmax) { dmax = d; idx = i }
  }
  if (dmax > eps) return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)]
  return [a, b]
}
const slugify = (t) => t.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const out = []
for (const f of gj.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  let d = '', bestArea = 0, cx = 0, cy = 0
  for (const p of polys) {
    const raw = p[0].map(tr)
    // kapali halkada baslangic=bitis oldugu icin RDP dejenere olur: halkayi ortadan ikiye bol
    const mid = Math.floor(raw.length / 2)
    const ring = [...rdp(raw.slice(0, mid + 1), 0.6).slice(0, -1), ...rdp(raw.slice(mid), 0.6)]
    if (ring.length < 4) continue
    d += 'M' + ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z'
    let a = 0, sx = 0, sy = 0
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[i + 1], c = x0 * y1 - x1 * y0
      a += c; sx += (x0 + x1) * c; sy += (y0 + y1) * c
    }
    a /= 2
    if (Math.abs(a) > bestArea) { bestArea = Math.abs(a); cx = sx / (6 * a); cy = sy / (6 * a) }
  }
  const ADLAR = { Afyon: 'Afyonkarahisar' } // kaynak veride kisa ad; fiyat sayfasi slug'i afyonkarahisar
  const ad = ADLAR[f.properties.name] || f.properties.name
  out.push({ ad, plaka: f.properties.number, slug: slugify(ad), d, cx: +cx.toFixed(1), cy: +cy.toFixed(1) })
}
fs.writeFileSync(path.join('src/data/tr-il-harita.json'), JSON.stringify({ w: W, h: H, iller: out }))
console.log('ok', out.length, W, H, fs.statSync('src/data/tr-il-harita.json').size)
