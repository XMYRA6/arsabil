const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function downloadFile(url, destPath) {
  console.log(`Downloading ${url} -> ${destPath}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const tempDir = path.join(root, 'temp-assets');
  const publicDir = path.join(root, 'public', 'studio-assets');

  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'trees'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'materials', 'road-asphalt'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'hdri'), { recursive: true });

  console.log('--- Step 1: Downloading and converting Tree 01 (quiver_tree_01) ---');
  const tree1Meta = await fetch('https://api.polyhaven.com/files/quiver_tree_01').then(r => r.json());
  const tree1GltfInfo = tree1Meta.gltf['1k'].gltf;
  const tree1Dir = path.join(tempDir, 'tree-01');
  fs.mkdirSync(tree1Dir, { recursive: true });

  await downloadFile(tree1GltfInfo.url, path.join(tree1Dir, 'model.gltf'));
  for (const [relPath, info] of Object.entries(tree1GltfInfo.include)) {
    await downloadFile(info.url, path.join(tree1Dir, relPath));
  }
  const tree1Out = path.join(publicDir, 'trees', 'tree-01.glb');
  execSync(`npx -y gltf-pipeline -i "${path.join(tree1Dir, 'model.gltf')}" -o "${tree1Out}" -b -d`, { stdio: 'inherit' });

  console.log('--- Step 2: Downloading and converting Tree 02 (wild_rooibos_bush) ---');
  const tree2Meta = await fetch('https://api.polyhaven.com/files/wild_rooibos_bush').then(r => r.json());
  const tree2GltfInfo = tree2Meta.gltf['1k'].gltf;
  const tree2Dir = path.join(tempDir, 'tree-02');
  fs.mkdirSync(tree2Dir, { recursive: true });

  await downloadFile(tree2GltfInfo.url, path.join(tree2Dir, 'model.gltf'));
  for (const [relPath, info] of Object.entries(tree2GltfInfo.include)) {
    await downloadFile(info.url, path.join(tree2Dir, relPath));
  }
  const tree2Out = path.join(publicDir, 'trees', 'tree-02.glb');
  execSync(`npx -y gltf-pipeline -i "${path.join(tree2Dir, 'model.gltf')}" -o "${tree2Out}" -b -d`, { stdio: 'inherit' });

  // Poly Haven'in 1k glTF varyanti wild_rooibos_bush icin BOZUK: yaprak/dal
  // materyalleri alphaMode:BLEND ama base-color dokusu alfasiz JPEG -> kartlar
  // opak siyah render olur. Alfa maskesini luminance'tan yeniden uretip
  // materyalleri MASK'e cevir. Detay: scripts/rebuild-tree-02-alpha.cjs
  console.log('--- Step 2b: Repairing tree-02 alpha (Poly Haven 1k glTF bug) ---');
  execSync(`node "${path.join(__dirname, 'rebuild-tree-02-alpha.cjs')}"`, { stdio: 'inherit' });

  console.log('--- Step 3: Downloading Road Asphalt PBR Textures (asphalt_01) ---');
  const asphaltDir = path.join(publicDir, 'materials', 'road-asphalt');
  await downloadFile('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_01/asphalt_01_diff_1k.jpg', path.join(asphaltDir, 'diffuse.jpg'));
  await downloadFile('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_01/asphalt_01_nor_gl_1k.jpg', path.join(asphaltDir, 'normal.jpg'));
  await downloadFile('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_01/asphalt_01_rough_1k.jpg', path.join(asphaltDir, 'roughness.jpg'));

  console.log('--- Step 4: Downloading HDRI (kloofendal_48d_partly_cloudy) ---');
  const hdriOut = path.join(publicDir, 'hdri', 'outdoor-env.hdr');
  await downloadFile('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_1k.hdr', hdriOut);

  console.log('--- Step 5: Writing LICENSE.md ---');
  const licenseContent = `# Studio Asset Licenses

All assets below are sourced from polyhaven.com and licensed CC0 1.0 (Public Domain) — no attribution required, safe for commercial use.

| Asset | Local Path | Source URL |
|---|---|---|
| Quiver Tree 01 | trees/tree-01.glb | https://polyhaven.com/a/quiver_tree_01 |
| Wild Rooibos Bush | trees/tree-02.glb | https://polyhaven.com/a/wild_rooibos_bush |
| Asphalt 01 | materials/road-asphalt/ | https://polyhaven.com/a/asphalt_01 |
| Kloofendal 48d Partly Cloudy | hdri/outdoor-env.hdr | https://polyhaven.com/a/kloofendal_48d_partly_cloudy |
`;
  fs.writeFileSync(path.join(publicDir, 'LICENSE.md'), licenseContent, 'utf-8');

  // Clean temp
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✅ Poly Haven assets successfully downloaded and self-hosted!');
}

main().catch(err => {
  console.error('Download error:', err);
  process.exit(1);
});
