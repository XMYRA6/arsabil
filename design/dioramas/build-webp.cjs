// Kesilmiş PNG'lerden (alfa kanallı) WebP üretir ve manifest.json yazar.
// Kullanım: node build-webp.cjs <png-klasoru>
// Ad düzeni: {tur}_{varyant}_{egim}_{zaman}.png → webp/{ad}-{1600|800}.webp
const fs = require('fs');
const path = require('path');
const sharp = require('../../node_modules/sharp');

const src = process.argv[2];
const out = path.join(__dirname, 'webp');
fs.mkdirSync(out, { recursive: true });

const SIZES = [1600, 800];
const TYPE_LABEL = { arsa: 'Arsa', tarla: 'Tarla', villa: 'Villa', ticari: 'Ticari', bag: 'Bağ-Bahçe', kat: 'Kat karşılığı' };

(async () => {
  const items = {};
  for (const f of fs.readdirSync(src).filter((x) => x.endsWith('.png')).sort()) {
    const id = f.replace(/\.png$/, '');
    const [tur, varyant, egim, zaman] = id.split('_');
    const meta = await sharp(path.join(src, f)).metadata();
    const files = {};
    for (const w of SIZES) {
      const name = `${id}-${w}.webp`;
      const info = await sharp(path.join(src, f))
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 72, alphaQuality: 85, effort: 6 })
        .toFile(path.join(out, name));
      files[w] = { file: name, width: info.width, height: info.height, bytes: info.size };
    }
    (items[tur] ||= []).push({ id, varyant, egim, zaman, aspect: +(meta.width / meta.height).toFixed(4), files });
  }
  const manifest = {
    generated: new Date().toISOString().slice(0, 10),
    sizes: SIZES,
    types: Object.fromEntries(
      Object.entries(items).map(([tur, list]) => [
        tur,
        {
          label: TYPE_LABEL[tur] || tur,
          variants: [...new Set(list.map((i) => i.varyant))],
          items: list,
        },
      ]),
    ),
  };
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const total = Object.values(items).flat().reduce((s, i) => s + Object.values(i.files).reduce((a, b) => a + b.bytes, 0), 0);
  console.log('görsel:', Object.values(items).flat().length, 'webp toplam:', (total / 1048576).toFixed(1), 'MB');
})().catch((e) => { console.error(e); process.exit(1); });
