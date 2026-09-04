/**
 * tree-02.glb ("wild_rooibos_bush", Poly Haven) onarim scripti.
 *
 * SORUN: Poly Haven'in 1k glTF varyanti bu asset icin bozuk gelir —
 * `wild_rooibos_bush_twigs` ve `wild_rooibos_bush_leaves` materyalleri
 * `alphaMode: BLEND` ama base-color dokusu alfa kanali TASIMAYAN bir JPEG.
 * Seffaflik maskesi kaybolmus; yaprak/dal kartlari atlasin siyah arka
 * planiyla opak duzlemler olarak render oluyor ("siyah blob" bug,
 * gercek GPU + Playwright ile dogrulandi).
 *
 * COZUM: diffuse atlasinin luminance'indan bir alfa maskesi turet
 * (saf siyah arka plan -> seffaf), RGBA PNG olarak gom, iki cutout
 * materyalini `alphaMode: MASK` yap. Geometri/Draco'ya DOKUNULMAZ —
 * yalnizca bir bufferView'in icerigi + JSON'daki 3 alan degisir.
 *
 * Calistir:  node scripts/rebuild-tree-02-alpha.cjs
 * Idempotent: PNG + MASK zaten varsa hicbir sey yapmaz.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GLB_PATH = path.join(__dirname, '..', 'public', 'studio-assets', 'trees', 'tree-02.glb');
const ATLAS_SIZE = 512; // arka plan propu — 1k gereksiz
const LUMA_CUTOFF = 18; // 0-255; saf siyah arka plan ~0, en koyu dal ~45+
const ALPHA_CUTOFF = 0.5;
const CUTOUT_MATERIALS = ['wild_rooibos_bush_twigs', 'wild_rooibos_bush_leaves'];

function parseGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('glTF magic degil');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binHeaderOff = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binHeaderOff);
  const bin = buf.subarray(binHeaderOff + 8, binHeaderOff + 8 + binLen);
  return { json, bin };
}

function pad4(n) {
  return (4 - (n % 4)) % 4;
}

function serializeGlb(json, bin) {
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = pad4(jsonBuf.length);
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = pad4(bin.length);
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad, 0x00)]);

  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"

  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

async function buildRgbaPng(jpegBuf) {
  // 1) RGB'yi hedef boyuta indir
  const { data: rgb, info } = await sharp(jpegBuf)
    .resize(ATLAS_SIZE, ATLAS_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2) luminance esiginden alfa uret
  const px = info.width * info.height;
  const alpha = Buffer.alloc(px);
  for (let i = 0; i < px; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    alpha[i] = luma < LUMA_CUTOFF ? 0 : 255;
  }

  // 3) RGB + alfa -> palette PNG (boyut icin)
  return sharp(rgb, { raw: { width: info.width, height: info.height, channels: 3 } })
    .joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png({ palette: true, quality: 90, effort: 10 })
    .toBuffer();
}

async function main() {
  const original = fs.readFileSync(GLB_PATH);
  const { json, bin } = parseGlb(original);

  const twigs = json.materials.find((m) => m.name === CUTOUT_MATERIALS[0]);
  const leaves = json.materials.find((m) => m.name === CUTOUT_MATERIALS[1]);
  if (!twigs || !leaves) throw new Error('Beklenen cutout materyalleri bulunamadi');

  const diffuseImage = json.images.find((im) => /_diff/.test(im.name || ''));
  if (!diffuseImage || diffuseImage.bufferView == null) {
    throw new Error('diffuse image / bufferView bulunamadi');
  }
  const diffBvIndex = diffuseImage.bufferView;

  if (twigs.alphaMode === 'MASK' && leaves.alphaMode === 'MASK') {
    console.log('tree-02.glb zaten onarilmis — atlaniyor.');
    return;
  }

  const diffBv = json.bufferViews[diffBvIndex];
  const jpegBuf = bin.subarray(diffBv.byteOffset || 0, (diffBv.byteOffset || 0) + diffBv.byteLength);
  const pngBuf = await buildRgbaPng(jpegBuf);

  // --- BIN'i yeniden kur: bufferView'lari offset sirasinda birlestir,
  //     diffuse'unkini yeni PNG ile degistir, offsetleri yeniden ata ---
  const order = json.bufferViews
    .map((bv, index) => ({ index, offset: bv.byteOffset || 0 }))
    .sort((a, b) => a.offset - b.offset);

  const chunks = [];
  let cursor = 0;
  for (const { index } of order) {
    const bv = json.bufferViews[index];
    const isDiff = index === diffBvIndex;
    const data = isDiff
      ? pngBuf
      : bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    bv.byteOffset = cursor;
    bv.byteLength = data.length;
    chunks.push(data);
    cursor += data.length;
  }
  const newBin = Buffer.concat(chunks);
  json.buffers[0].byteLength = newBin.length;

  // --- JSON alanlari ---
  for (const im of json.images) {
    if (im.bufferView === diffBvIndex) im.mimeType = 'image/png';
  }
  for (const mat of [twigs, leaves]) {
    mat.alphaMode = 'MASK';
    mat.alphaCutoff = ALPHA_CUTOFF;
  }

  const out = serializeGlb(json, newBin);
  fs.writeFileSync(GLB_PATH, out);

  console.log(`tree-02.glb onarildi:`);
  console.log(`  diffuse: ${jpegBuf.length} B JPEG -> ${pngBuf.length} B RGBA PNG (${ATLAS_SIZE}px)`);
  console.log(`  ${CUTOUT_MATERIALS.join(' + ')}: alphaMode BLEND -> MASK (cutoff ${ALPHA_CUTOFF})`);
  console.log(`  GLB: ${original.length} B -> ${out.length} B`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
