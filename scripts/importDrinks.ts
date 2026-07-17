/**
 * Sip Switch — Drink CSV Import Pipeline
 *
 * Converts a raw pipe-delimited product CSV into Supabase-ready formats.
 * Works with any catalog size — just point it at a new CSV and import the output.
 *
 * Usage:
 *   npx tsx scripts/importDrinks.ts /path/to/products.csv
 *
 * Output:
 *   scripts/import-ready.json   — normalized JSON array
 *   scripts/import-ready.csv    — Supabase Table Editor-ready CSV (BOM + full schema)
 *   Validation report printed to stdout
 *
 * Adding new products: run the same command on a new CSV, then import the
 * generated import-ready.csv into Supabase Table Editor — no code changes needed.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Normalization maps ───────────────────────────────────────────

const TEXT_SCORE_MAP: Record<string, number> = {
  'very low': 1, 'low': 3, 'medium': 5, 'medium-high': 7, 'high': 9, 'very high': 10,
};
const BODY_MAP: Record<string, number> = {
  'light': 3, 'medium': 5, 'full': 8,
};
const CATEGORY_MAP: Record<string, string> = {
  'canned cocktail': 'RTD Mocktail',
  'functional beverage': 'Functional Drink',
  'adaptogenic seltzer': 'Functional Drink',
  'rtd mocktail': 'RTD Mocktail',
  'thc seltzer': 'Functional Drink',
  'spritz': 'Sparkling',
  'bitter aperitif': 'Aperitif',
  'cbd seltzer': 'Functional Drink',
  'botanical soda': 'Mixer',
  'margarita': 'RTD Mocktail',
  'aperitivo': 'Aperitif',
  'espresso cocktail': 'RTD Mocktail',
  'tonic': 'Mixer',
  'negroni': 'RTD Mocktail',
};
const CARBONATION_MAP: Record<string, number> = {
  'Beer': 7, 'Hop Water': 8, 'Kombucha': 8, 'RTD Mocktail': 6,
  'Sparkling': 9, 'Soda': 8, 'Wine': 2, 'Spirit': 0,
  'Aperitif': 2, 'Functional Drink': 5, 'Mixer': 7,
};

const FAMILY_RULES: [RegExp, string][] = [
  [/IPA/i, 'IPA'], [/Lager/i, 'Lager'], [/Pilsner/i, 'Pilsner'],
  [/Stout/i, 'Stout'], [/Ale/i, 'Ale'],
  [/Rosé|Rose/i, 'Rosé'],
  [/Sauvignon\s*Blanc/i, 'Sauvignon Blanc'],
  [/Sparkling\s*Wine/i, 'Sparkling Wine'],
  [/Gin (Alternative|Alternative)/i, 'Gin Alternative'],
  [/Whiskey|Whisky/i, 'Whiskey Alternative'],
  [/Tequila|Agave/i, 'Tequila Alternative'],
  [/Rum/i, 'Rum Alternative'],
  [/Negroni/i, 'Negroni'], [/Spritz/i, 'Spritz'],
  [/Margarita/i, 'Margarita'], [/Paloma/i, 'Paloma'],
  [/Mule/i, 'Mule'], [/Mojito/i, 'Mojito'],
  [/Kombucha/i, 'Kombucha'],
  [/Hop\s*Water|Hop/i, 'Hop Water'],
  [/Botanical\s*Soda|Botanical/i, 'Botanical Soda'],
  [/Aperitivo|Aperitif|Amaro/i, 'Aperitif'],
  [/Espresso|Coffee/i, 'Coffee Cocktail'],
  [/Functional Beverage|Adaptogenic|Adaptogen/i, 'Adaptogenic'],
  [/CBD|THC|Cannabis/i, 'Cannabis Beverage'],
  [/Tonic/i, 'Tonic'],
  [/Seltzer/i, 'Seltzer'],
  [/Cider/i, 'Cider'],
];

function inferCarbonation(category: string): number {
  return CARBONATION_MAP[category] ?? 5;
}

function normalizeScore(raw: string, field: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === 'none' || trimmed === '-') return null;
  const cleaned = trimmed.replace(/-$/, '').trim();
  if (TEXT_SCORE_MAP[cleaned] !== undefined) return TEXT_SCORE_MAP[cleaned];
  if (BODY_MAP[cleaned] !== undefined && field === 'body_score') return BODY_MAP[cleaned];
  const num = Number(cleaned);
  if (!isNaN(num) && num >= 0 && num <= 10) return Math.round(num);
  return null;
}

function splitTags(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .replace(/\.$/, '')
    .split(',')
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean);
}

function toPgArray(tags: string[]): string | null {
  if (tags.length === 0) return null;
  return '{' + tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',') + '}';
}

function normalizeCategory(raw: string): string {
  const key = raw.trim().toLowerCase();
  return CATEGORY_MAP[key] ?? 'RTD Mocktail';
}

function inferFamily(name: string, subcategory: string): string {
  for (const [re, family] of FAMILY_RULES) {
    if (re.test(name)) return family;
    if (re.test(subcategory)) return family;
  }
  return subcategory;
}

function computeIntensity(scores: number[]): number {
  const [
    sweetness, bitterness, acidity, body, complexity, carbonation,
  ] = scores;
  const numerator = sweetness + bitterness + acidity + body * 1.2 + complexity * 1.2 + carbonation;
  return Math.round(Math.max(0, Math.min(10, numerator / 6.4)));
}

function validateUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ── CSV columns for Supabase Table Editor import ──────────────────

const CSV_HEADERS = [
  'name','brand','category','subcategory','drink_family','description',
  'image_url','product_url','price_range','availability_regions',
  'sweetness_score','bitterness_score','acidity_score','body_score',
  'complexity_score','carbonation_score','intensity_score',
  'flavor_tags','occasion_tags','food_pairing_tags','is_active',
];

// ── Main ─────────────────────────────────────────────────────────

function importDrinks(csvPath: string) {
  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.trim().split('\n');

  const errors: string[] = [];
  const warnings: string[] = [];
  const drinks: Record<string, unknown>[] = [];
  const csvRows: string[] = [];
  const seen = new Set<string>();
  const catCount: Record<string, number> = {};
  const tagCount: Record<string, number> = {};
  const occCount: Record<string, number> = {};

  for (let i = 0; i < lines.length; i++) {
    const row = i + 1;
    const fields = lines[i].split('|');

    if (fields.length !== 14) {
      errors.push(`Row ${row}: Expected 14 columns, got ${fields.length}`);
      continue;
    }

    const [
      brand, name, categoryRaw, description, productUrl,
      flavorTagsRaw, sweetnessRaw, bitternessRaw, acidityRaw,
      bodyRaw, complexityRaw, occasionTagsRaw, foodPairingTagsRaw, availabilityRaw,
    ] = fields.map((f) => f.trim());

    if (!brand) { errors.push(`Row ${row}: Missing brand`); continue; }
    if (!name) { errors.push(`Row ${row}: Missing name`); continue; }

    const dupKey = productUrl ? `${brand}|${name}|${productUrl}` : `${brand}|${name}|row-${row}`;
    if (seen.has(dupKey)) {
      errors.push(`Row ${row}: Exact duplicate "${name}" by "${brand}"`);
      continue;
    }
    seen.add(dupKey);

    const category = normalizeCategory(categoryRaw);
    catCount[category] = (catCount[category] || 0) + 1;

    const sweetness = normalizeScore(sweetnessRaw, 'sweetness_score');
    const bitterness = normalizeScore(bitternessRaw, 'bitterness_score');
    const acidity = normalizeScore(acidityRaw, 'acidity_score');
    const body = normalizeScore(bodyRaw, 'body_score');
    const complexity = normalizeScore(complexityRaw, 'complexity_score');
    const carbonation = inferCarbonation(category);

    for (const [field, val] of Object.entries({ sweetness, bitterness, acidity, body, complexity })) {
      if (val === null) {
        warnings.push(`Row ${row}: ${field} missing, defaulted to 5`);
      }
    }

    const s = [sweetness ?? 5, bitterness ?? 5, acidity ?? 5, body ?? 5, complexity ?? 5, carbonation];
    const intensity = computeIntensity(s);

    const flavorTags = splitTags(flavorTagsRaw);
    const occasionTags = splitTags(occasionTagsRaw);
    const foodPairingTags = splitTags(foodPairingTagsRaw);
    const availabilityRegions = splitTags(availabilityRaw);

    flavorTags.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; });
    occasionTags.forEach((t) => { occCount[t] = (occCount[t] || 0) + 1; });

    if (productUrl && !validateUrl(productUrl)) {
      warnings.push(`Row ${row}: Invalid URL "${productUrl}"`);
    }

    if (!description) {
      warnings.push(`Row ${row}: Missing description`);
    }

    const drink = {
      name,
      brand,
      category,
      subcategory: categoryRaw,
      drink_family: inferFamily(name, categoryRaw),
      description: description || null,
      image_url: null,
      product_url: productUrl || null,
      price_range: null,
      availability_regions: availabilityRegions,
      sweetness_score: sweetness ?? 5,
      bitterness_score: bitterness ?? 5,
      acidity_score: acidity ?? 5,
      body_score: body ?? 5,
      complexity_score: complexity ?? 5,
      carbonation_score: carbonation,
      intensity_score: intensity,
      flavor_tags: flavorTags,
      occasion_tags: occasionTags,
      food_pairing_tags: foodPairingTags,
      is_active: true,
    };

    drinks.push(drink);

    // Build CSV row (PostgreSQL array format for tag fields)
    const rowMap: Record<string, unknown> = {
      ...drink,
      availability_regions: toPgArray(availabilityRegions),
      flavor_tags: toPgArray(flavorTags),
      occasion_tags: toPgArray(occasionTags),
      food_pairing_tags: toPgArray(foodPairingTags),
      is_active: 'true',
    };
    csvRows.push(CSV_HEADERS.map(h => csvEscape(rowMap[h])).join(','));
  }

  // ── Report ─────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════════════');
  console.log('  Sip Switch — Drink Import Report');
  console.log('══════════════════════════════════════════════\n');
  console.log(`File:     ${csvPath}`);
  console.log(`Rows:     ${lines.length}`);
  console.log(`Valid:    ${drinks.length}`);
  console.log(`Errors:   ${errors.length}`);
  console.log(`Warnings: ${warnings.length}\n`);

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.slice(0, 20).forEach((w) => console.log(`  ⚠ ${w}`));
    if (warnings.length > 20) console.log(`  ... and ${warnings.length - 20} more`);
    console.log();
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.slice(0, 20).forEach((e) => console.log(`  ✗ ${e}`));
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
    console.log();
  }

  console.log('── Category Distribution ──');
  Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${count.toString().padStart(3)}  ${cat}`));

  console.log('\n── Top 15 Flavor Tags ──');
  Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([tag, count]) => console.log(`  ${count.toString().padStart(3)}  ${tag}`));

  console.log('\n── Top 15 Occasion Tags ──');
  Object.entries(occCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([occ, count]) => console.log(`  ${count.toString().padStart(3)}  ${occ}`));

  // ── Output ─────────────────────────────────────────────────────

  const outDir = path.resolve(__dirname);
  const jsonPath = path.join(outDir, 'import-ready.json');
  const csvOutPath = path.join(outDir, 'import-ready.csv');

  fs.writeFileSync(jsonPath, JSON.stringify(drinks, null, 2));
  fs.writeFileSync(csvOutPath, '\ufeff' + CSV_HEADERS.join(',') + '\n' + csvRows.join('\n') + '\n');

  console.log(`\n✅ JSON: ${jsonPath}`);
  console.log(`✅ CSV:  ${csvOutPath}`);
  console.log('\nTo import: Supabase Dashboard → Table Editor → drinks → Import → select import-ready.csv');

  if (errors.length > 0) process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: npx tsx scripts/importDrinks.ts <path-to-csv>');
  process.exit(1);
}
importDrinks(csvPath);
