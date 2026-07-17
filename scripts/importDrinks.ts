/**
 * Sip Switch — Drink CSV Import Pipeline
 *
 * Usage:
 *   npx tsx scripts/importDrinks.ts /path/to/na_rtd_products.csv
 *
 * Output:
 *   - Validates and normalizes CSV
 *   - Prints JSON array for Supabase import
 *   - Saves import-ready JSON to scripts/import-ready.json
 *   - Prints validation report
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
  'spritz': 'Aperitif',
  'bitter aperitif': 'Aperitif',
  'cbd seltzer': 'Functional Drink',
  'botanical soda': 'Soda',
  'margarita': 'RTD Mocktail',
  'aperitivo': 'Aperitif',
  'espresso cocktail': 'RTD Mocktail',
  'tonic': 'Mixer',
  'negroni': 'RTD Mocktail',
};

// Infer carbonation from category
function inferCarbonation(category: string): number {
  const high = ['RTD Mocktail', 'Soda', 'Sparkling', 'Kombucha', 'Hop Water'];
  const medium = ['Beer', 'Mixer'];
  const low = ['Aperitif', 'Wine', 'Spirit', 'Functional Drink'];
  if (high.includes(category)) return 7;
  if (medium.includes(category)) return 5;
  if (low.includes(category)) return 2;
  return 5;
}

function normalizeScore(raw: string, field: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === 'none' || trimmed === 'none ' || trimmed === '-') return null;
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

function normalizeCategory(raw: string): string {
  const key = raw.trim().toLowerCase();
  return CATEGORY_MAP[key] ?? 'RTD Mocktail';
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
  const drinks: Record<string, any>[] = [];
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

    // Required fields
    if (!brand) { errors.push(`Row ${row}: Missing brand`); continue; }
    if (!name) { errors.push(`Row ${row}: Missing name`); continue; }
    const dupKey = productUrl ? `${brand}|${name}|${productUrl}` : `${brand}|${name}|row-${row}`;
    if (seen.has(dupKey)) { errors.push(`Row ${row}: Exact duplicate "${name}" by "${brand}"`); continue; }
    seen.add(dupKey);

    // Normalize category
    const category = normalizeCategory(categoryRaw);
    catCount[category] = (catCount[category] || 0) + 1;

    // Normalize scores
    const sweetness = normalizeScore(sweetnessRaw, 'sweetness_score');
    const bitterness = normalizeScore(bitternessRaw, 'bitterness_score');
    const acidity = normalizeScore(acidityRaw, 'acidity_score');
    const body = normalizeScore(bodyRaw, 'body_score');
    const complexity = normalizeScore(complexityRaw, 'complexity_score');
    const carbonation = inferCarbonation(category);

    // Warn about missing scores (defaulted to 5)
    for (const [field, val] of Object.entries({ sweetness, bitterness, acidity, body, complexity })) {
      if (val === null) {
        warnings.push(`Row ${row}: ${field} missing, defaulted to 5`);
      }
    }

    // Parse arrays
    const flavorTags = splitTags(flavorTagsRaw);
    const occasionTags = splitTags(occasionTagsRaw);
    const foodPairingTags = splitTags(foodPairingTagsRaw);
    const availabilityRegions = splitTags(availabilityRaw);

    // Tag counts
    flavorTags.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; });
    occasionTags.forEach((t) => { occCount[t] = (occCount[t] || 0) + 1; });

    // Validate URL
    if (productUrl && !validateUrl(productUrl)) {
      warnings.push(`Row ${row}: Invalid URL "${productUrl}"`);
    }

    // Description
    if (!description) {
      warnings.push(`Row ${row}: Missing description`);
    }

    drinks.push({
      name,
      brand,
      category,
      subcategory: null,
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
      flavor_tags: flavorTags,
      occasion_tags: occasionTags,
      food_pairing_tags: foodPairingTags,
      is_active: true,
    });
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

  const outPath = path.resolve(__dirname, 'import-ready.json');
  fs.writeFileSync(outPath, JSON.stringify(drinks, null, 2));
  console.log(`\n✅ Import-ready JSON written to ${outPath}`);

  if (errors.length > 0) process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: npx tsx scripts/importDrinks.ts <path-to-csv>');
  process.exit(1);
}
importDrinks(csvPath);
