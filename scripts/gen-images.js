/*
  Image generation script (Branding Edition)
  - Generates branded PNG/JPG assets into `miniprogram/images/`
  - Creates a backup folder before writing: `miniprogram/images_backup_YYYYMMDD_HHmmss`
  - Theme: warm community style (orange/yellow with soft contrast blue)
*/

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const OUTPUT_DIR = path.join(__dirname, '..', 'miniprogram', 'images');
const BACKUP_ROOT = path.join(__dirname, '..', 'miniprogram');

// Brand Theme
const THEME = {
  colors: {
    primary: { r: 246, g: 166, b: 35, a: 255 }, // #F6A623
    secondary: { r: 255, g: 138, b: 52, a: 255 }, // #FF8A34
    accent: { r: 255, g: 209, b: 102, a: 255 }, // #FFD166
    contrastBlue: { r: 77, g: 163, b: 255, a: 255 }, // #4DA3FF
    black: { r: 17, g: 17, b: 17, a: 255 },
    gray50: { r: 245, g: 245, b: 245, a: 255 },
    gray200: { r: 204, g: 204, b: 204, a: 255 },
    white: { r: 255, g: 255, b: 255, a: 255 }
  },
  radii: {
    banner: 24,
    iconLarge: 20,
    iconSmall: 16
  },
  qualities: {
    bannerJpg: 82,
    shareJpg: 86
  },
  sizes: {
    banner: { w: 750, h: 300 },
    share: { w: 1200, h: 960 },
    empty: { w: 750, h: 500 },
    iconLarge: 96,
    iconSmall: 64
  }
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function backupImagesDir() {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const backupDir = path.join(BACKUP_ROOT, `images_backup_${timestamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });
  const items = fs.readdirSync(OUTPUT_DIR);
  for (const name of items) {
    const src = path.join(OUTPUT_DIR, name);
    const dest = path.join(backupDir, name);
    if (fs.lstatSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    }
  }
  return backupDir;
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function colorLerp(c1, c2, t) {
  return { r: lerp(c1.r, c2.r, t), g: lerp(c1.g, c2.g, t), b: lerp(c1.b, c2.b, t), a: lerp(c1.a, c2.a, t) };
}

function rgbaToInt({ r, g, b, a }) {
  return Jimp.rgbaToInt(r, g, b, a);
}

async function makeLinearGradient(width, height, startColor, endColor, vertical = true) {
  const image = new Jimp(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = vertical ? y / (height - 1) : x / (width - 1);
      const c = colorLerp(startColor, endColor, t);
      image.setPixelColor(rgbaToInt(c), x, y);
    }
  }
  return image;
}

function createRoundedMask(width, height, radius) {
  const mask = new Jimp(width, height, rgbaToInt({ r: 0, g: 0, b: 0, a: 255 })); // black = transparent area after mask
  const white = rgbaToInt({ r: 255, g: 255, b: 255, a: 255 }); // white = keep
  const r = Math.max(0, Math.min(radius, Math.floor(Math.min(width, height) / 2)));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inLeft = x >= r;
      const inRight = x < width - r;
      const inTop = y >= r;
      const inBottom = y < height - r;
      let keep = inLeft && inRight && inTop && inBottom;
      if (!keep) {
        // Corner checks
        const dx = (x < r) ? (x - r) : (x - (width - 1 - r));
        const dy = (y < r) ? (y - r) : (y - (height - 1 - r));
        keep = (dx * dx + dy * dy) <= (r * r);
      }
      if (keep) mask.setPixelColor(white, x, y);
    }
  }
  return mask;
}

async function applyRoundedCorners(image, radius) {
  const mask = createRoundedMask(image.bitmap.width, image.bitmap.height, radius);
  image.mask(mask, 0, 0);
  return image;
}

async function drawDecorativeDots(image, count = 24, opacity = 24) {
  const white = { ...THEME.colors.white, a: opacity };
  for (let i = 0; i < count; i++) {
    const r = 2 + Math.round(Math.random() * 4);
    const x = Math.round(Math.random() * (image.bitmap.width - 1));
    const y = Math.round(Math.random() * (image.bitmap.height - 1));
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const dx = xx;
        const dy = yy;
        if (dx * dx + dy * dy <= r * r) {
          const px = x + xx;
          const py = y + yy;
          if (px >= 0 && py >= 0 && px < image.bitmap.width && py < image.bitmap.height) {
            image.setPixelColor(rgbaToInt(white), px, py);
          }
        }
      }
    }
  }
}

async function drawRingIcon(image, color, thickness = 3) {
  const { width, height } = image.bitmap;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const radius = Math.floor(Math.min(width, height) * 0.32);
  const inner = radius - thickness;
  const col = rgbaToInt(color);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= radius * radius && d2 >= inner * inner) {
        image.setPixelColor(col, x, y);
      }
    }
  }
}

async function createBanner(filename) {
  const { w, h } = THEME.sizes.banner;
  const bg = await makeLinearGradient(w, h, THEME.colors.secondary, THEME.colors.primary, false);
  await drawDecorativeDots(bg, 36, 22);
  await bg.quality(THEME.qualities.bannerJpg).writeAsync(path.join(OUTPUT_DIR, filename));
}

async function createIcon(filename, size, radius) {
  const bg = await makeLinearGradient(size, size, THEME.colors.primary, THEME.colors.accent, true);
  await applyRoundedCorners(bg, radius);
  const iconLayer = new Jimp(size, size, 0x00000000);
  await drawRingIcon(iconLayer, THEME.colors.white, size >= 96 ? 4 : 3);
  bg.composite(iconLayer, 0, 0);
  await bg.writeAsync(path.join(OUTPUT_DIR, filename));
}

async function createEmptyState(filename, text = 'No Data') {
  const { w, h } = THEME.sizes.empty;
  const base = new Jimp(w, h, rgbaToInt(THEME.colors.gray50));
  const deco = await makeLinearGradient(w, h, THEME.colors.accent, THEME.colors.primary, false);
  deco.opacity(0.08);
  base.composite(deco, 0, 0);
  // Simple badge circle
  const circle = new Jimp(160, 160, 0x00000000);
  const cx = 80, cy = 80, r = 72;
  const cc = rgbaToInt(THEME.colors.secondary);
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 160; x++) {
      const dx = x - cx; const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) circle.setPixelColor(cc, x, y);
    }
  }
  base.composite(circle, Math.floor(w / 2) - 80, Math.floor(h / 2) - 110, { opacitySource: 0.15 });
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const textWidth = Jimp.measureText(font, text);
  base.print(font, Math.floor((w - textWidth) / 2), Math.floor(h / 2) + 10, text);
  await base.writeAsync(path.join(OUTPUT_DIR, filename));
}

async function createStatusImage(filename, text) {
  const width = 320;
  const height = 200;
  const bg = await makeLinearGradient(width, height, THEME.colors.gray50, THEME.colors.gray200, true);
  const borderColor = rgbaToInt(THEME.colors.primary);
  for (let x = 0; x < width; x++) { bg.setPixelColor(borderColor, x, 0); bg.setPixelColor(borderColor, x, height - 1); }
  for (let y = 0; y < height; y++) { bg.setPixelColor(borderColor, 0, y); bg.setPixelColor(borderColor, width - 1, y); }
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const tw = Jimp.measureText(font, text);
  bg.print(font, Math.floor((width - tw) / 2), Math.floor((height - 32) / 2), text);
  await bg.writeAsync(path.join(OUTPUT_DIR, filename));
}

async function createShareImage(filename) {
  const { w, h } = THEME.sizes.share;
  const bg = await makeLinearGradient(w, h, THEME.colors.secondary, THEME.colors.primary, false);
  // Subtle waves (horizontal light stripes)
  const stripe = new Jimp(w, 6, rgbaToInt({ ...THEME.colors.white, a: 16 }));
  for (let y = 40; y < h; y += 72) bg.composite(stripe, 0, y);
  await bg.quality(THEME.qualities.shareJpg).writeAsync(path.join(OUTPUT_DIR, filename));
}

async function main() {
  ensureDir(OUTPUT_DIR);
  const backupDir = backupImagesDir();
  if (backupDir) console.log(`Backed up images to: ${backupDir}`);

  // Banners (3)
  await createBanner('banner1.jpg');
  await createBanner('banner2.jpg');
  await createBanner('banner3.jpg');

  // Category entry icons (large 96x96)
  const large = THEME.sizes.iconLarge;
  const rLarge = THEME.radii.iconLarge;
  await createIcon('category-life.png', large, rLarge);
  await createIcon('category-errand.png', large, rLarge);
  await createIcon('category-second.png', large, rLarge);
  await createIcon('category-pet.png', large, rLarge);
  await createIcon('category-neighbor.png', large, rLarge);

  // Sub-categories (representative) as 96x96
  const subCats = [
    'category-all.png', 'category-furniture.png', 'category-electronics.png', 'category-clothing.png', 'category-books.png', 'category-sports.png', 'category-other.png',
    'category-repair.png', 'category-cleaning.png', 'category-moving.png', 'category-decoration.png',
    'pet-all.png', 'pet-boarding.png', 'pet-walking.png', 'pet-grooming.png', 'pet-training.png', 'pet-medical.png', 'pet-other.png',
    'help-all.png', 'help-tools.png', 'help-delivery.png', 'help-care.png', 'help-repair.png', 'help-education.png', 'help-other.png'
  ];
  for (const name of subCats) {
    await createIcon(name, large, rLarge);
  }

  // UI icons
  const uiIcons = [
    'upload.png', 'location.png', 'arrow-right.png', 'arrow-down.png',
    'menu-service.png', 'menu-order.png', 'menu-member.png', 'menu-settings.png', 'menu-help.png', 'menu-about.png',
    'action-publish.png', 'action-scan.png', 'action-invite.png'
  ];
  for (const name of uiIcons) {
    const isMenu = name.startsWith('menu-');
    const size = isMenu ? THEME.sizes.iconSmall : 48; // menu=64, others ~48
    const radius = isMenu ? THEME.radii.iconSmall : Math.round(size * 0.25);
    await createIcon(name, size, radius);
  }

  // Empty states
  await createEmptyState('empty.png', 'No Data');
  await createEmptyState('empty-order.png', 'No Orders');
  await createEmptyState('empty-review.png', 'No Reviews');

  // Status images (keep names; updated style)
  await createStatusImage('status-待接单.png', '待接单');
  await createStatusImage('status-已接单.png', '已接单');
  await createStatusImage('status-进行中.png', '进行中');
  await createStatusImage('status-已完成.png', '已完成');

  // Share images
  await createShareImage('share.jpg');
  await createShareImage('share-default.jpg');

  console.log('Images generated at:', OUTPUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 