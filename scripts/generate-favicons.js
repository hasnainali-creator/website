import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const LIGHT_SVG = path.join(PUBLIC_DIR, 'favicon-light.svg');

async function generate() {
  if (!fs.existsSync(LIGHT_SVG)) {
    console.error('❌ favicon-light.svg not found!');
    return;
  }

  console.log('🚀 Generating professional favicons from real SVG...');

  // 1. Generate favicon-96x96.png (Standard for many browsers and Google)
  // We use the light version (black logo) as the base for the generic PNG
  await sharp(LIGHT_SVG)
    .resize(96, 96)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-96x96.png'));
  console.log('✅ Generated favicon-96x96.png');

  // 2. Generate apple-touch-icon.png (180x180)
  await sharp(LIGHT_SVG)
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('✅ Generated apple-touch-icon.png');

  // 3. Generate Manifest Icons
  await sharp(LIGHT_SVG)
    .resize(192, 192)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'web-app-manifest-192x192.png'));
  await sharp(LIGHT_SVG)
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'web-app-manifest-512x512.png'));
  console.log('✅ Generated manifest icons');

  // 4. Cleanup dummy/unwanted files
  const toDelete = [
    'favicon-red-circle.svg',
    // add any other dummy files identified here
  ];

  for (const file of toDelete) {
    const p = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`🗑️ Deleted dummy file: ${file}`);
    }
  }

  console.log('✨ Favicon system updated successfully!');
}

generate().catch(err => {
  console.error('❌ Error generating favicons:', err);
});
