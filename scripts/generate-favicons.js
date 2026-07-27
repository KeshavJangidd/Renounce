const { createJimp, HorizontalAlign, VerticalAlign } = require('@jimp/core');
const jpeg = require('@jimp/js-jpeg').default;
const png = require('@jimp/js-png').default;
const coverPlugin = require('@jimp/plugin-cover');
const resizePlugin = require('@jimp/plugin-resize');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const Jimp = createJimp({
  plugins: [coverPlugin.methods, resizePlugin.methods],
  formats: [jpeg, png]
});

async function main() {
  const source = path.join(process.cwd(), 'public', 'images', 'renounce-avatar.png');
  const outputDir = path.join(process.cwd(), 'public');

  await fs.promises.mkdir(outputDir, { recursive: true });

  const image = await Jimp.read(source);
  const square = image.cover({
    w: 256,
    h: 256,
    align: HorizontalAlign.CENTER | VerticalAlign.MIDDLE
  });

  const appleIconPath = path.join(outputDir, 'apple-touch-icon.png');
  const icon32Path = path.join(outputDir, 'favicon-32x32.png');
  const icon16Path = path.join(outputDir, 'favicon-16x16.png');
  const faviconIcoPath = path.join(outputDir, 'favicon.ico');

  await square.clone().resize({ w: 180, h: 180 }).write(appleIconPath);
  await square.clone().resize({ w: 32, h: 32 }).write(icon32Path);
  await square.clone().resize({ w: 16, h: 16 }).write(icon16Path);

  const icoBuffer = await pngToIco([icon16Path, icon32Path]);
  await fs.promises.writeFile(faviconIcoPath, icoBuffer);

  console.log('Favicons generated from', source);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
