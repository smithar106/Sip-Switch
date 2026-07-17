#!/usr/bin/env node
/**
 * Sip Switch — Drink Ingestion Pipeline
 *
 * Usage:
 *   node process_drinks.mjs <input.csv> [options]
 *
 * Options:
 *   --existing <file.json>  Path to previous import-ready.json for cross-file dedup
 *   --out-dir <path>        Output directory (default: same as input file)
 *
 * Examples:
 *   node process_drinks.mjs beer_catalog.csv
 *   node process_drinks.mjs wine_catalog.csv --existing import-ready.json
 *   node process_drinks.mjs spirits_catalog.csv --out-dir ./output
 *
 * Output (all prefixed by input filename):
 *   cleaned_<input>.csv            — Supabase-ready CSV
 *   validation_<input>.md          — Validation report
 *   duplicates_<input>.csv         — Duplicate rows log
 *   category_summary_<input>.csv   — Category distribution
 *   flavor_summary_<input>.csv     — Flavor tag distribution
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';

// ─── Configuration ────────────────────────────────────────────────

const ALLOWED_CATEGORIES = new Set([
  'Beer', 'Wine', 'Spirit', 'Aperitif', 'RTD Mocktail',
  'Kombucha', 'Hop Water', 'Functional Drink', 'Mixer', 'Soda', 'Sparkling',
]);

const CARBONATION_MAP = {
  'Beer': 7, 'Hop Water': 8, 'Kombucha': 8, 'RTD Mocktail': 6,
  'Sparkling': 9, 'Soda': 8, 'Wine': 2, 'Spirit': 0,
  'Aperitif': 2, 'Functional Drink': 5, 'Mixer': 7,
};

const TASTE_QUALITATIVE = {
  'none': 0, 'None': 0,
  'very low': 1, 'Very Low': 1,
  'low': 3, 'Low': 3, 'low-': 2, 'Low-': 2,
  'light': 3, 'Light': 3,
  'medium': 5, 'Medium': 5, 'medium-low': 4, 'Medium-Low': 4,
  'medium-high': 7, 'Medium-High': 7,
  'full': 8, 'Full': 8,
  'high': 9, 'High': 9,
  'very high': 10, 'Very High': 10,
};

const CATEGORY_RULES = [
  [/^Aperitivo|^Aperitif Alternative|^Bitter Aperitif|^Amaro/i, 'Aperitif'],
  [/Negroni|^Canned Cocktail|^Espresso Cocktail|^Margarita|^RTD Mocktail|^Mule/i, 'RTD Mocktail'],
  [/Spritz|^Sparkling/i, 'Sparkling'],
  [/^Functional Beverage|^Adaptogenic Seltzer|^CBD Seltzer|^THC Seltzer/i, 'Functional Drink'],
  [/^Botanical Soda|^Tonic Water|^Tonic$/i, 'Mixer'],
  [/^Kombucha/i, 'Kombucha'],
  [/^Hop Water/i, 'Hop Water'],
  [/^Soda/i, 'Soda'],
  [/Beer|IPA|Lager|Pilsner|Stout|Ale|Porter|Kölsch|Kolsch|Gose|Sour|Hefeweizen|Amber|Blonde|Radler|Witbier|Hazy|^Pale/i, 'Beer'],
  [/^Wine|^Rosé|^Sauvignon Blanc|^Chardonnay|^Cabernet|^Merlot|^Pinot|^Zinfandel|^Malbec|^Riesling|^Sparkling Wine|^Champagne/i, 'Wine'],
  [/^Spirit|^Gin Alternative|^Whiskey Alternative|^Whisky|^Tequila Alternative|^Rum Alternative|^Vodka Alternative|^Brandy|^Mezcal Alternative|^Bourbon Alternative|^Dark Spirit Alternative|^Coffee Liqueur Alternative|^Vermouth Alternative|^Spiced Rum|^Functional Spirit|^Adaptogenic|^Garden \d+|^Grove \d+|^Spice \d+/i, 'Spirit'],
];

const FAMILY_RULES = [
  [/IPA/i, 'IPA'], [/Lager/i, 'Lager'], [/Pilsner/i, 'Pilsner'],
  [/Stout/i, 'Stout'], [/Ale/i, 'Ale'],
  [/Rosé|Rose/i, 'Rosé'],
  [/Sauvignon\s*Blanc/i, 'Sauvignon Blanc'],
  [/Sparkling\s*Wine/i, 'Sparkling Wine'],
  [/Gin Alternative|Gin/i, 'Gin Alternative'],
  [/Whiskey Alternative|Whiskey|Whisky/i, 'Whiskey Alternative'],
  [/Tequila Alternative|Tequila|Agave/i, 'Tequila Alternative'],
  [/Rum Alternative|Rum/i, 'Rum Alternative'],
  [/Negroni/i, 'Negroni'], [/Spritz/i, 'Spritz'],
  [/Margarita/i, 'Margarita'], [/Paloma/i, 'Paloma'],
  [/Mule/i, 'Mule'], [/Mojito/i, 'Mojito'],
  [/Kombucha/i, 'Kombucha'],
  [/Hop Water|Hop/i, 'Hop Water'],
  [/Botanical Soda|Botanical/i, 'Botanical Soda'],
  [/Aperitivo|Aperitif|Amaro/i, 'Aperitif'],
  [/Espresso|Coffee/i, 'Coffee Cocktail'],
  [/Functional Beverage|Adaptogenic|Adaptogen/i, 'Adaptogenic'],
  [/CBD|THC|Cannabis/i, 'Cannabis Beverage'],
  [/Tonic/i, 'Tonic'],
  [/Lemonade/i, 'Lemonade'],
  [/Seltzer/i, 'Seltzer'],
  [/Cider/i, 'Cider'],
];

const EXPECTED_COLUMNS = 14;

const CSV_HEADERS = [
  'name', 'brand', 'category', 'subcategory', 'drink_family', 'description',
  'image_url', 'product_url', 'price_range', 'availability_regions',
  'sweetness_score', 'bitterness_score', 'acidity_score', 'body_score',
  'complexity_score', 'carbonation_score', 'intensity_score',
  'flavor_tags', 'occasion_tags', 'food_pairing_tags', 'is_active',
];

// ─── Helpers ──────────────────────────────────────────────────────

function detectDelimiter(sample) {
  const line = sample.split('\n')[0];
  const pipe = line.split('|').length;
  const comma = line.split(',').length;
  const tab = line.split('\t').length;

  const candidates = [
    { delim: '|', diff: Math.abs(pipe - EXPECTED_COLUMNS) },
    { delim: ',', diff: Math.abs(comma - EXPECTED_COLUMNS) },
    { delim: '\t', diff: Math.abs(tab - EXPECTED_COLUMNS) },
  ].sort((a, b) => a.diff - b.diff);

  const best = candidates[0];
  const minDiff = best.diff;

  if (minDiff > 3) {
    console.warn(`⚠  Could not confidently detect delimiter. Pipe:${pipe} Comma:${comma} Tab:${tab}. Falling back to pipe.`);
    return '|';
  }
  return best.delim;
}

function inferCategory(subcategory) {
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(subcategory)) return cat;
  }
  return 'RTD Mocktail';
}

function inferFamily(name, subcategory) {
  for (const [re, family] of FAMILY_RULES) {
    if (re.test(name)) return family;
    if (re.test(subcategory)) return family;
  }
  return subcategory;
}

function toPgArray(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === 'N/A' || raw.trim() === '-') return null;
  const items = raw.split(',').map(s => s.trim().replace(/"/g, '\\"')).filter(Boolean);
  if (items.length === 0) return null;
  return '{' + items.map(i => `"${i}"`).join(',') + '}';
}

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function validatePgArray(arr) {
  if (arr === null) return true;
  return /^\{"[^"]*"(,"[^"]*")*\}$/.test(arr);
}

function computeIntensity(scores) {
  const [sweetness, bitterness, acidity, body, complexity, carbonation] = scores;
  const numerator = sweetness + bitterness + acidity + body * 1.2 + complexity * 1.2 + carbonation;
  return Math.round(Math.max(0, Math.min(10, numerator / 6.4)));
}

function loadExistingDrinks(filePath) {
  if (!filePath || !existsSync(filePath)) return new Set();
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const keys = new Set();
    for (const d of data) {
      if (d.brand && d.name) keys.add(`${d.brand}||${d.name}`);
    }
    console.log(`📦 Loaded ${keys.size} existing drinks from ${filePath}`);
    return keys;
  } catch (err) {
    console.warn(`⚠  Could not load existing drinks from ${filePath}: ${err.message}`);
    return new Set();
  }
}

// ─── Main Pipeline ────────────────────────────────────────────────

function run(inputPath, existingPath, outDir) {
  if (!existsSync(inputPath)) {
    console.error(`✗ File not found: ${inputPath}`);
    process.exit(1);
  }

  const inputBase = basename(inputPath, extname(inputPath));
  const inputDir = outDir || dirname(inputPath);
  if (!existsSync(inputDir)) mkdirSync(inputDir, { recursive: true });

  // Detect delimiter
  const sample = readFileSync(inputPath, 'utf-8').slice(0, 4096);
  const delim = detectDelimiter(sample);
  console.log(`🔍 Detected delimiter: ${delim === '\t' ? 'tab' : delim}`);

  // Read and parse
  const raw = readFileSync(inputPath, 'utf-8').trim();
  const lines = raw.split('\n').filter(l => l.trim());
  const rows = lines.map(l => l.split(delim).map(c => c.trim()));

  // Load existing drinks for cross-file dedup
  const existingKeys = loadExistingDrinks(existingPath);

  // Process rows
  const rowErrors = [];
  const duplicatesInFile = [];
  const inFileSeen = new Map();
  const existingDuplicates = [];
  const allErrors = [];
  const allWarnings = [];
  const output = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const cols = rows[idx];
    const lineNum = idx + 1;
    const rowErrors = [];

    if (cols.length !== EXPECTED_COLUMNS) {
      rowErrors.push(`Expected ${EXPECTED_COLUMNS} columns, got ${cols.length}`);
      allErrors.push({ line: lineNum, brand: '', name: '', issue: rowErrors.join('; ') });
      continue;
    }

    const [brand, name, subcategory, description, product_url,
      flavor_tags_raw, sweetness_raw, bitterness_raw, acidity_raw, body_raw, complexity_raw,
      occasion_tags_raw, food_tags_raw, availability_raw] = cols;

    // Required fields
    if (!brand) rowErrors.push('Missing brand');
    if (!name) rowErrors.push('Missing name');

    // Category
    const category = inferCategory(subcategory);
    if (!ALLOWED_CATEGORIES.has(category)) {
      rowErrors.push(`Inferred category "${category}" not in allowed list`);
    }

    // Drink family
    const drink_family = inferFamily(name, subcategory);

    // Taste scores
    const tasteInputs = { sweetness: sweetness_raw, bitterness: bitterness_raw, acidity: acidity_raw, body: body_raw, complexity: complexity_raw };
    const scores = {};
    for (const [key, rawVal] of Object.entries(tasteInputs)) {
      const val = TASTE_QUALITATIVE[rawVal];
      if (val === undefined) {
        rowErrors.push(`Unknown ${key}: "${rawVal}"`);
        scores[key] = 5;
      } else {
        scores[key] = val;
      }
    }

    // Carbonation
    const carbonation_score = CARBONATION_MAP[category] ?? 5;

    // Intensity
    const intensity_score = computeIntensity([
      scores.sweetness, scores.bitterness, scores.acidity,
      scores.body, scores.complexity, carbonation_score,
    ]);

    // Validate scores 0-10
    for (const [key, val] of Object.entries(scores)) {
      if (val < 0 || val > 10) {
        rowErrors.push(`${key}_score ${val} out of range 0-10`);
      }
    }

    // Product URL
    if (product_url && !product_url.startsWith('http')) {
      rowErrors.push(`Invalid product_url: "${product_url}"`);
    }

    // Tags
    const flavor_tags = toPgArray(flavor_tags_raw);
    const occasion_tags = toPgArray(occasion_tags_raw);
    const food_pairing_tags = toPgArray(food_tags_raw);
    const availability_regions = toPgArray(availability_raw);

    // Validate PostgreSQL arrays
    for (const [tagName, arr] of [['flavor_tags', flavor_tags], ['occasion_tags', occasion_tags], ['food_pairing_tags', food_pairing_tags], ['availability_regions', availability_regions]]) {
      if (!validatePgArray(arr)) {
        rowErrors.push(`${tagName} array format invalid: "${arr}"`);
      }
    }

    // In-file duplicate check (brand+name+product_url)
    const descPrefix = (description || '').slice(0, 60);
    const inFileKey = `${brand}||${name}||${product_url}||${descPrefix}`;
    if (inFileSeen.has(inFileKey)) {
      duplicatesInFile.push({ line: lineNum, brand, name, duplicate_of_line: inFileSeen.get(inFileKey) });
      rowErrors.push(`Duplicate within file: line ${inFileSeen.get(inFileKey)}`);

      const err = `Duplicate within file (same brand+name+url)`;
      allErrors.push({ line: lineNum, brand, name, issue: err });
      allErrors.push({ line: inFileSeen.get(inFileKey), brand, name, issue: `First occurrence — duplicate on line ${lineNum}` });
      continue;
    }
    inFileSeen.set(inFileKey, lineNum);

    // Cross-file duplicate check (brand + name, excluding url)
    const crossKey = `${brand}||${name}`;
    if (existingKeys.has(crossKey)) {
      existingDuplicates.push({ line: lineNum, brand, name });
      rowErrors.push(`Already exists in database (same brand+name)`);

      const err = `Already exists in database (brand="${brand}", name="${name}")`;
      allErrors.push({ line: lineNum, brand, name, issue: err });
      continue;
    }

    // Collect warnings for valid rows
    if (!description) allWarnings.push({ line: lineNum, brand, name, issue: 'Missing description' });
    if (!product_url) allWarnings.push({ line: lineNum, brand, name, issue: 'Missing product_url' });
    for (const [key, rawVal] of Object.entries(tasteInputs)) {
      if (!rawVal || rawVal.trim() === '') {
        allWarnings.push({ line: lineNum, brand, name, issue: `${key} missing, defaulted to 5` });
      }
    }

    // Record errors
    if (rowErrors.length > 0) {
      allErrors.push({ line: lineNum, brand, name, issue: rowErrors.join('; ') });
      continue;
    }

    // Valid row
    output.push({
      name,
      brand,
      category,
      subcategory,
      drink_family,
      description: description || '',
      image_url: '',
      product_url: product_url || '',
      price_range: '',
      availability_regions: availability_regions || null,
      sweetness_score: scores.sweetness,
      bitterness_score: scores.bitterness,
      acidity_score: scores.acidity,
      body_score: scores.body,
      complexity_score: scores.complexity,
      carbonation_score,
      intensity_score,
      flavor_tags: flavor_tags || null,
      occasion_tags: occasion_tags || null,
      food_pairing_tags: food_pairing_tags || null,
      is_active: 'true',
    });
  }

  // ─── Compute summaries ─────────────────────────────────────────

  const catCounts = {};
  const tagCounts = {};
  const tagCategoryCounts = {};
  for (const row of output) {
    catCounts[row.category] = (catCounts[row.category] || 0) + 1;
    if (row.flavor_tags) {
      const tags = row.flavor_tags.replace(/[{}"]/g, '').split(',');
      for (const tag of tags) {
        const t = tag.trim();
        if (!t) continue;
        tagCounts[t] = (tagCounts[t] || 0) + 1;
        if (!tagCategoryCounts[t]) tagCategoryCounts[t] = {};
        tagCategoryCounts[t][row.category] = (tagCategoryCounts[t][row.category] || 0) + 1;
      }
    }
  }

  const scoreDims = ['sweetness_score', 'bitterness_score', 'acidity_score', 'body_score', 'complexity_score', 'carbonation_score', 'intensity_score'];
  const scoreRanges = {};
  for (const dim of scoreDims) {
    const vals = output.map(r => r[dim]).filter(v => v !== null && v !== undefined && !isNaN(v));
    scoreRanges[dim] = vals.length > 0 ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 0 };
  }

  // ─── Write cleaned CSV ─────────────────────────────────────────

  const csvLines = [CSV_HEADERS.join(',')];
  for (const row of output) {
    csvLines.push(CSV_HEADERS.map(h => csvEscape(row[h])).join(','));
  }
  writeFileSync(`${inputDir}/cleaned_${inputBase}.csv`,
    '\ufeff' + csvLines.join('\n') + '\n', 'utf-8');

  // ─── Write category summary ────────────────────────────────────

  const catLines = ['category,count'];
  for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
    catLines.push(`${csvEscape(cat)},${count}`);
  }
  writeFileSync(`${inputDir}/category_summary_${inputBase}.csv`, catLines.join('\n') + '\n', 'utf-8');

  // ─── Write flavor tag summary ──────────────────────────────────

  const flvLines = ['flavor_tag,total_count,category_breakdown'];
  for (const [tag, count] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
    const breakdown = Object.entries(tagCategoryCounts[tag] || {})
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c}:${n}`)
      .join('; ');
    flvLines.push(`${csvEscape(tag)},${count},${csvEscape(breakdown)}`);
  }
  writeFileSync(`${inputDir}/flavor_summary_${inputBase}.csv`, flvLines.join('\n') + '\n', 'utf-8');

  // ─── Write duplicates report ───────────────────────────────────

  const dupLines = ['type,line,brand,name,duplicate_of_line'];
  for (const d of duplicatesInFile) {
    dupLines.push(`in-file,${d.line},${csvEscape(d.brand)},${csvEscape(d.name)},Line ${d.duplicate_of_line}`);
  }
  for (const d of existingDuplicates) {
    dupLines.push(`existing-db,${d.line},${csvEscape(d.brand)},${csvEscape(d.name)},—`);
  }
  if (dupLines.length === 1) {
    dupLines.push('# No duplicates found');
  }
  writeFileSync(`${inputDir}/duplicates_${inputBase}.csv`, dupLines.join('\n') + '\n', 'utf-8');

  // ─── Write SQL MERGE report ────────────────────────────────────

  const sqlLines = [
    '-- Sip Switch — SQL MERGE Report',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source: ${inputPath}`,
    `-- New drinks to merge: ${output.length}`,
    '',
    '-- To execute: paste into Supabase SQL Editor and replace :user_id',
    '-- with your Supabase project user.',
    '',
    'BEGIN;',
    '',
    'INSERT INTO public.drinks (name, brand, category, subcategory, drink_family,',
    '  description, image_url, product_url, price_range, availability_regions,',
    '  sweetness_score, bitterness_score, acidity_score, body_score,',
    '  complexity_score, carbonation_score, intensity_score,',
    '  flavor_tags, occasion_tags, food_pairing_tags, is_active)',
    'VALUES',
  ];

  for (let i = 0; i < output.length; i++) {
    const r = output[i];
    const comma = i < output.length - 1 ? ',' : ';';
    sqlLines.push(`  (${csvEscape(r.name)}, ${csvEscape(r.brand)}, ${csvEscape(r.category)}, ${csvEscape(r.subcategory)}, ${csvEscape(r.drink_family)}, ${csvEscape(r.description)}, '', ${csvEscape(r.product_url)}, '', ${r.availability_regions}, ${r.sweetness_score}, ${r.bitterness_score}, ${r.acidity_score}, ${r.body_score}, ${r.complexity_score}, ${r.carbonation_score}, ${r.intensity_score}, ${r.flavor_tags}, ${r.occasion_tags}, ${r.food_pairing_tags}, true)${comma}`);
  }

  sqlLines.push('');
  sqlLines.push('-- Skip duplicate check: INSERT with no ON CONFLICT so any');
  sqlLines.push('-- brand+name duplicates in the database will error out.');
  sqlLines.push('-- Run this after verifying no conflicts in the validation report.');
  sqlLines.push('');
  sqlLines.push('-- Alternatively, to upsert on (brand, name):');
  sqlLines.push('-- ON CONFLICT (brand, name) DO UPDATE SET');
  sqlLines.push('--   updated_at = NOW();');
  sqlLines.push('');
  sqlLines.push('COMMIT;');

  writeFileSync(`${inputDir}/merge_${inputBase}.sql`, sqlLines.join('\n') + '\n', 'utf-8');

  // ─── Write validation report ───────────────────────────────────

  let report = `# Drink Import Validation Report

**Generated:** ${new Date().toISOString().slice(0, 10)}
**Source file:** \`${inputPath}\`
**Input rows:** ${lines.length}
**Valid output:** ${output.length}

---

## Summary

| Metric | Value |
|---|---|
| Input rows | ${lines.length} |
| Valid rows after dedup | ${output.length} |
| In-file duplicates skipped | ${duplicatesInFile.length} |
| Existing-db duplicates skipped | ${existingDuplicates.length} |
| Warnings | ${allWarnings.length} |
| Row errors | ${allErrors.length} |
| Categories | ${Object.keys(catCounts).length} |
| Unique brands | ${new Set(output.map(r => r.brand)).size} |
| Unique flavor tags | ${Object.keys(tagCounts).length} |

## Category Distribution

| Category | Count |
|---|---|
`;

  for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
    report += `| ${cat} | ${count} |\n`;
  }

  report += `
## Score Ranges

| Dimension | Min | Max |
|---|---|---|
`;
  for (const dim of scoreDims) {
    const { min, max } = scoreRanges[dim];
    report += `| ${dim} | ${min} | ${max} |\n`;
  }

  if (allErrors.length > 0) {
    report += `
## Row Errors
| Line | Brand | Name | Issue |
|---|---|---|---|
`;
    for (const e of allErrors.slice(0, 50)) {
      report += `| ${e.line} | ${e.brand || '—'} | ${e.name || '—'} | ${e.issue} |\n`;
    }
    if (allErrors.length > 50) {
      report += `| ... | (${allErrors.length - 50} more) | | |\n`;
    }
  }

  if (allWarnings.length > 0) {
    report += `
## Warnings
| Line | Brand | Name | Issue |
|---|---|---|---|
`;
    for (const w of allWarnings.slice(0, 30)) {
      report += `| ${w.line} | ${w.brand || '—'} | ${w.name || '—'} | ${w.issue} |\n`;
    }
    if (allWarnings.length > 30) {
      report += `| ... | (${allWarnings.length - 30} more warnings) | | |\n`;
    }
  }

  if (duplicatesInFile.length > 0) {
    report += `
## In-File Duplicates Skipped
| Line | Brand | Name | Duplicate Of |
|---|---|---|---|
`;
    for (const d of duplicatesInFile.slice(0, 20)) {
      report += `| ${d.line} | ${d.brand} | ${d.name} | Line ${d.duplicate_of_line} |\n`;
    }
    if (duplicatesInFile.length > 20) {
      report += `| ... | (${duplicatesInFile.length - 20} more) | | |\n`;
    }
  }

  if (existingDuplicates.length > 0) {
    report += `
## Existing-Database Duplicates Skipped
| Line | Brand | Name |
|---|---|---|
`;
    for (const d of existingDuplicates.slice(0, 20)) {
      report += `| ${d.line} | ${d.brand} | ${d.name} |\n`;
    }
    if (existingDuplicates.length > 20) {
      report += `| ... | (${existingDuplicates.length - 20} more) | |\n`;
    }
  }

  report += `
## Validation Notes

- All scores normalized to 0-10 integer scale
- Intensity = weighted avg (body×1.2, complexity×1.2) / 6.4, clamped 0-10
- Carbonation inferred from category when not present in source
- PostgreSQL array format used for all tag/region fields
- All output rows have \`is_active = true\`
- Delimiter auto-detected (pipe / comma / tab)
- Cross-file dedup checks \`brand + name\` against existing JSON
`;

  writeFileSync(`${inputDir}/validation_${inputBase}.md`, report, 'utf-8');

  // ─── Print summary ─────────────────────────────────────────────

  const fullOut = resolve(inputDir);
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  Sip Switch — Ingestion Complete`);
  console.log(`══════════════════════════════════════════════\n`);
  console.log(`Input:     ${inputPath} (${lines.length} rows)`);
  console.log(`Delimiter: ${delim === '\t' ? 'tab' : delim}`);
  console.log(`Existing:  ${existingPath || '(none)'}`);
  console.log(`Output:    ${fullOut}/\n`);
  console.log(`  ✓ cleaned_${inputBase}.csv          (${output.length} rows)`);
  console.log(`  ✓ validation_${inputBase}.md`);
  console.log(`  ✓ duplicates_${inputBase}.csv        (${duplicatesInFile.length} in-file, ${existingDuplicates.length} existing-db)`);
  console.log(`  ✓ category_summary_${inputBase}.csv  (${Object.keys(catCounts).length} categories)`);
  console.log(`  ✓ flavor_summary_${inputBase}.csv    (${Object.keys(tagCounts).length} unique tags)`);
  console.log(`  ✓ merge_${inputBase}.sql             (SQL MERGE script)`);
  console.log(`\nTo import: run against existing.json for dedup, then import cleaned CSV`);
  console.log(`into Supabase Table Editor → public.drinks → Import.\n`);
}

// ─── CLI Entry Point ──────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Sip Switch — Drink Ingestion Pipeline

Usage:
  node process_drinks.mjs <input.csv> [options]

Options:
  --existing <file.json>  Path to previous import-ready.json for dedup
  --out-dir <path>        Output directory (default: same as input file)

Examples:
  node process_drinks.mjs beer_catalog.csv
  node process_drinks.mjs wine_catalog.csv --existing import-ready.json
  node process_drinks.mjs spirits_catalog.csv --out-dir ./output
`);
  process.exit(0);
}

let inputPath = null;
let existingPath = null;
let outDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--existing') {
    existingPath = args[++i];
  } else if (args[i] === '--out-dir') {
    outDir = args[++i];
  } else if (!inputPath) {
    inputPath = args[i];
  }
}

run(inputPath, existingPath, outDir);
