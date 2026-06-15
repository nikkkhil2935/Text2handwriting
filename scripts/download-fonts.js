import fs from 'fs';
import path from 'path';
import https from 'https';

const FONTS = [
  // Neat
  { name: 'Caveat', category: 'neat', family: 'Caveat' },
  { name: 'ArchitectsDaughter', category: 'neat', family: 'Architects Daughter' },
  { name: 'PatrickHand', category: 'neat', family: 'Patrick Hand' },
  { name: 'IndieFlower', category: 'neat', family: 'Indie Flower' },
  { name: 'Kalam', category: 'neat', family: 'Kalam' },
  
  // Cursive
  { name: 'DancingScript', category: 'cursive', family: 'Dancing Script' },
  { name: 'Pacifico', category: 'cursive', family: 'Pacifico' },
  { name: 'Sacramento', category: 'cursive', family: 'Sacramento' },
  { name: 'Yellowtail', category: 'cursive', family: 'Yellowtail' },
  { name: 'GreatVibes', category: 'cursive', family: 'Great Vibes' },
  
  // Messy
  { name: 'ReenieBeanie', category: 'messy', family: 'Reenie Beanie' },
  { name: 'NothingYouCouldDo', category: 'messy', family: 'Nothing You Could Do' },
  { name: 'ShadowsIntoLight', category: 'messy', family: 'Shadows Into Light' },
  
  // Kids
  { name: 'GochiHand', category: 'kids', family: 'Gochi Hand' },
  { name: 'Pangolin', category: 'kids', family: 'Pangolin' },
  
  // Signature
  { name: 'AlexBrush', category: 'signature', family: 'Alex Brush' },
  { name: 'MrDeHaviland', category: 'signature', family: 'Mr De Haviland' },
  
  // Calligraphy
  { name: 'PinyonScript', category: 'calligraphy', family: 'Pinyon Script' },
  { name: 'Playball', category: 'calligraphy', family: 'Playball' },
  { name: 'MarckScript', category: 'calligraphy', family: 'Marck Script' },
  
  // Devanagari / Multi-language Handwriting
  { name: 'Amita', category: 'cursive', family: 'Amita' },
  { name: 'Tillana', category: 'neat', family: 'Tillana' },
  { name: 'YatraOne', category: 'calligraphy', family: 'Yatra One' },
  { name: 'Laila', category: 'neat', family: 'Laila' },

  // Added requested realistic handwriting fonts
  { name: 'HomemadeApple', category: 'cursive', family: 'Homemade Apple' },
  { name: 'LiuJianMaoCao', category: 'cursive', family: 'Liu Jian Mao Cao' },
  { name: 'JustAnotherHand', category: 'messy', family: 'Just Another Hand' },
  { name: 'CedarvilleCursive', category: 'cursive', family: 'Cedarville Cursive' },
  { name: 'DawningofaNewDay', category: 'messy', family: 'Dawning of a New Day' },
  { name: 'Zeyada', category: 'messy', family: 'Zeyada' },
  { name: 'LaBelleAurore', category: 'cursive', family: 'La Belle Aurore' },
  { name: 'GloriaHallelujah', category: 'kids', family: 'Gloria Hallelujah' },
  { name: 'LovedbytheKing', category: 'messy', family: 'Loved by the King' },
  { name: 'BadScript', category: 'neat', family: 'Bad Script' },
  { name: 'Mynerve', category: 'neat', family: 'Mynerve' },
  { name: 'WaitingfortheSunrise', category: 'neat', family: 'Waiting for the Sunrise' },
  { name: 'CoveredByYourGrace', category: 'neat', family: 'Covered By Your Grace' },
  { name: 'ComingSoon', category: 'neat', family: 'Coming Soon' },
  { name: 'Itim', category: 'neat', family: 'Itim' },
  { name: 'PermanentMarker', category: 'messy', family: 'Permanent Marker' },
  { name: 'CaveatBrush', category: 'neat', family: 'Caveat Brush' },
  { name: 'Lacquer', category: 'messy', family: 'Lacquer' }
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': USER_AGENT,
        ...headers
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, headers));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status Code: ${res.statusCode} for ${url}`));
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

async function downloadFont(font) {
  const queryFamily = encodeURIComponent(font.family);
  const cssUrl = `https://fonts.googleapis.com/css2?family=${queryFamily}&display=swap`;
  
  console.log(`Fetching CSS for ${font.name} (${font.family})...`);
  const cssBuffer = await fetchUrl(cssUrl);
  const cssText = cssBuffer.toString('utf-8');
  
  // Find woff2 source URL for the 'latin' subset if possible
  let woff2Url;
  const latinIndex = cssText.indexOf('/* latin */');
  if (latinIndex !== -1) {
    const restCss = cssText.substring(latinIndex);
    const urlMatch = restCss.match(/url\((https:\/\/fonts\.gstatic\.com\/[^\)]+)\)\s+format\(['"]woff2['"]\)/);
    if (urlMatch) {
      woff2Url = urlMatch[1];
    }
  }
  if (!woff2Url) {
    // Fallback to first match
    const urlMatch = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^\)]+)\)\s+format\(['"]woff2['"]\)/);
    if (urlMatch) {
      woff2Url = urlMatch[1];
    }
  }
  
  if (!woff2Url) {
    throw new Error(`Could not find woff2 URL in CSS for font ${font.name}`);
  }
  
  console.log(`Downloading WOFF2 for ${font.name} from ${woff2Url}...`);
  const fontBuffer = await fetchUrl(woff2Url);
  
  const outputDir = path.join(process.cwd(), 'public', 'fonts', font.category);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, `${font.name}.woff2`);
  fs.writeFileSync(outputFile, fontBuffer);
  console.log(`Successfully saved to ${outputFile}`);
}

async function main() {
  console.log('Starting handwriting fonts download...');
  const registry = [];
  
  for (const font of FONTS) {
    try {
      await downloadFont(font);
      registry.push({
        name: font.name,
        family: font.family,
        category: font.category,
        path: `/fonts/${font.category}/${font.name}.woff2`
      });
    } catch (err) {
      console.error(`Failed to download ${font.name}:`, err.message);
    }
  }
  
  const registryDir = path.join(process.cwd(), 'src', 'lib');
  if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(registryDir, 'font-registry.json'),
    JSON.stringify(registry, null, 2)
  );
  console.log('Font registry updated in src/lib/font-registry.json');
}

main().catch(console.error);
