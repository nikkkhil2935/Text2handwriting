import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let hasErrors = false;
let warningCount = 0;
let errorCount = 0;

function logSuccess(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function logWarning(msg) {
  console.log(`${YELLOW}⚠ WARNING:${RESET} ${msg}`);
  warningCount++;
}

function logError(msg) {
  console.log(`${RED}✗ ERROR:${RESET} ${msg}`);
  hasErrors = true;
  errorCount++;
}

// Recursively find all files in a directory
function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFilesRecursively(name, fileList);
    } else {
      fileList.push(name);
    }
  }
  return fileList;
}

// Resolve a relative/absolute URL to a physical file path in dist/
function resolveUrlToFilePath(currentFile, targetUrl) {
  // Strip query params and hashes
  const cleanUrl = targetUrl.split('?')[0].split('#')[0];

  if (!cleanUrl) {
    return null;
  }

  // Handle absolute paths starting with /
  if (cleanUrl.startsWith('/')) {
    const absolutePath = path.join(DIST_DIR, cleanUrl);
    
    // Check if it matches a direct file (e.g. /favicon.ico)
    if (fs.existsSync(absolutePath) && !fs.statSync(absolutePath).isDirectory()) {
      return absolutePath;
    }

    // Check if it is a directory routing (e.g. /about-us -> /about-us/index.html)
    const indexHtmlPath = path.join(absolutePath, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      return indexHtmlPath;
    }

    // Check if it is a .html file without extension (e.g. /about-us -> /about-us.html)
    const htmlFilePath = absolutePath + '.html';
    if (fs.existsSync(htmlFilePath)) {
      return htmlFilePath;
    }

    return absolutePath; // return the best guess so we can report file not found
  }

  // Handle relative paths
  const currentDir = path.dirname(currentFile);
  const resolvedPath = path.resolve(currentDir, cleanUrl);

  if (fs.existsSync(resolvedPath) && !fs.statSync(resolvedPath).isDirectory()) {
    return resolvedPath;
  }

  const indexHtmlPath = path.join(resolvedPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    return indexHtmlPath;
  }

  const htmlFilePath = resolvedPath + '.html';
  if (fs.existsSync(htmlFilePath)) {
    return htmlFilePath;
  }

  return resolvedPath;
}

function verifyHtmlFile(filePath) {
  const relativeFilePath = path.relative(DIST_DIR, filePath);
  console.log(`\n${BOLD}Verifying: ${relativeFilePath}${RESET}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let fileHasError = false;

  // 1. Verify Lang attribute
  const langMatch = content.match(/<html[^>]*lang=["']([^"']+)["']/i);
  if (!langMatch) {
    logWarning('Missing `lang` attribute in `<html>` tag.');
  }

  // 2. Verify Title tag
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  if (!titleMatch) {
    logError('Missing `<title>` tag.');
    fileHasError = true;
  } else if (!titleMatch[1].trim()) {
    logError('Empty `<title>` tag.');
    fileHasError = true;
  } else {
    logSuccess(`Title: "${titleMatch[1]}"`);
  }

  // 3. Verify Meta Description tag
  const metaDescMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                        content.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  if (!metaDescMatch) {
    logWarning('Missing `<meta name="description">` SEO tag.');
  } else if (!metaDescMatch[1].trim()) {
    logWarning('Empty `<meta name="description">` SEO content.');
  } else {
    logSuccess(`Description: "${metaDescMatch[1]}"`);
  }

  // 4. Verify Heading Hierarchy (At least one H1, warn if multiple)
  const h1Matches = content.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
  if (h1Matches.length === 0) {
    logWarning('Missing `<h1>` main heading.');
  } else if (h1Matches.length > 1) {
    logWarning(`Multiple <h1> tags found (${h1Matches.length}). Best practice is exactly one per page.`);
  } else {
    logSuccess('Exactly one <h1> heading present.');
  }

  // 5. Verify Image alt tags
  const imgRegex = /<img[^>]*>/gi;
  let imgMatch;
  let imagesChecked = 0;
  let imagesMissingAlt = 0;

  while ((imgMatch = imgRegex.exec(content)) !== null) {
    const imgTag = imgMatch[0];
    // Skip if it is a decorative or spacer image that has alt="", but check if alt exists at all
    const hasAlt = /alt=["']/i.test(imgTag);
    imagesChecked++;
    if (!hasAlt) {
      imagesMissingAlt++;
    }
  }

  if (imagesMissingAlt > 0) {
    logWarning(`${imagesMissingAlt}/${imagesChecked} ` + (imagesMissingAlt === 1 ? 'image is' : 'images are') + ' missing `alt` attributes.');
  } else if (imagesChecked > 0) {
    logSuccess(`All ${imagesChecked} images have alt attributes.`);
  }

  // 6. Verify Links
  const linkRegex = /<a[^>]*href=["']([^"']+)["']/gi;
  let linkMatch;
  let linksChecked = 0;
  let brokenLinks = 0;

  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const url = linkMatch[1];
    linksChecked++;

    // Skip external links, phone numbers, emails, and anchor placeholders
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      continue;
    }

    const resolvedPath = resolveUrlToFilePath(filePath, url);
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      logError(`Broken local link: "${url}"`);
      brokenLinks++;
      fileHasError = true;
    }
  }

  if (linksChecked > 0 && brokenLinks === 0) {
    logSuccess(`All ${linksChecked} local/relative links resolved successfully.`);
  }
}

function main() {
  console.log(`\n${BOLD}=== Astro Build Verification & SEO Audit ===${RESET}`);
  
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`${RED}dist/ directory not found! Run npm run build first.${RESET}`);
    process.exit(1);
  }

  const allFiles = getFilesRecursively(DIST_DIR);
  const htmlFiles = allFiles.filter(f => f.endsWith('.html'));

  console.log(`Found ${htmlFiles.length} HTML pages to verify.`);

  for (const htmlFile of htmlFiles) {
    verifyHtmlFile(htmlFile);
  }

  console.log(`\n${BOLD}=== Verification Summary ===${RESET}`);
  console.log(`Total HTML Pages Audited: ${htmlFiles.length}`);
  console.log(`Total Errors Found: ${errorCount}`);
  console.log(`Total Warnings Found: ${warningCount}`);

  if (hasErrors) {
    console.log(`\n${RED}${BOLD}Verification Failed! Please fix the errors before deploying.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}Verification Successful! Build is ready for deployment.${RESET}\n`);
  }
}

main();
