import fs from 'fs';
import path from 'path';

/**
 * tree-02.glb (Poly Haven "wild_rooibos_bush") kaynak varyanti BOZUK gelir:
 * yaprak/dal materyalleri `alphaMode: BLEND` ama base-color dokusu alfa
 * kanali TASIMAYAN bir JPEG — seffaflik maskesi kaybolmus, kartlar atlasin
 * siyah arka planiyla opak duzlemler olarak render oluyordu ("siyah blob"
 * bug, gercek GPU + Playwright ile dogrulandi).
 *
 * scripts/rebuild-tree-02-alpha.cjs bu GLB'yi yeniden uretir: diffuse'un
 * luminance'indan alfa maskesi turetir, RGBA PNG gomer, twigs/leaves
 * materyallerini `alphaMode: MASK` yapar. Bu test o cikti sozlesmesini kilitler.
 */

interface GLBJson {
  images?: Array<{ name?: string; mimeType?: string; bufferView?: number }>;
  textures?: Array<{ source?: number }>;
  materials?: Array<{
    name?: string;
    alphaMode?: string;
    alphaCutoff?: number;
    pbrMetallicRoughness?: { baseColorTexture?: { index?: number } };
  }>;
}

function readGlbJson(glbPath: string): GLBJson {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as GLBJson;
}

function baseColorMimeType(json: GLBJson, materialName: string): string | undefined {
  const mat = (json.materials ?? []).find((m) => m.name === materialName);
  const texIndex = mat?.pbrMetallicRoughness?.baseColorTexture?.index;
  if (texIndex == null) return undefined;
  const source = json.textures?.[texIndex]?.source;
  if (source == null) return undefined;
  return json.images?.[source]?.mimeType;
}

describe('Studio Vitrin agac GLB varliklari', () => {
  const treesDir = path.join(process.cwd(), 'public', 'studio-assets', 'trees');

  it('tree-02.glb yaprak/dal materyalleri alpha-cutout (MASK), BLEND degil', () => {
    const json = readGlbJson(path.join(treesDir, 'tree-02.glb'));
    const cutoutMats = ['wild_rooibos_bush_twigs', 'wild_rooibos_bush_leaves'];

    for (const name of cutoutMats) {
      const mat = (json.materials ?? []).find((m) => m.name === name);
      expect(mat).toBeDefined();
      expect(mat!.alphaMode).toBe('MASK');
    }
  });

  it('tree-02.glb yaprak/dal base-color dokusu alfa tasiyan PNG', () => {
    const json = readGlbJson(path.join(treesDir, 'tree-02.glb'));

    expect(baseColorMimeType(json, 'wild_rooibos_bush_twigs')).toBe('image/png');
    expect(baseColorMimeType(json, 'wild_rooibos_bush_leaves')).toBe('image/png');
  });
});
