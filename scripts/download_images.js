const https = require('https');
const fs = require('fs');
const path = require('path');

const downloads = [
  { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', dest: 'public/images/steps/step1-input.jpg' },
  { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', dest: 'public/images/steps/step2-report.jpg' },
  { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', dest: 'public/images/steps/step3-match.jpg' },
  { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80', dest: 'public/images/vision/vision-future.jpg' },
  { url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80', dest: 'public/images/vision/mission-trust.jpg' },
  { url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80', dest: 'public/images/blog/trends-2026.jpg' },
  { url: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80', dest: 'public/images/blog/valuation-methods.jpg' },
  { url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&q=80', dest: 'public/images/blog/transparency-trust.jpg' },
  { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', dest: 'public/images/bento/engine-v2-bg.jpg' },
  { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', dest: 'public/images/bento/cost-analysis-bg.jpg' },
  { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', dest: 'public/images/bento/marketplace-bg.jpg' },
  { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80', dest: 'public/images/bento/security-pdf-bg.jpg' }
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${destPath}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const item of downloads) {
    try {
      await downloadFile(item.url, item.dest);
    } catch (e) {
      console.error(e.message);
    }
  }
}

run();
