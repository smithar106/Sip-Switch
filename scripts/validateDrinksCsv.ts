/**
 * Sip Switch — Drink CSV Validator
 *
 * Usage:
 *   npx tsx scripts/validateDrinksCsv.ts <path-to-csv>
 *
 * Expected CSV columns (order matters):
 *   name, brand, category, subcategory, description, image_url, product_url,
 *   price_range, availability_regions, sweetness_score, bitterness_score,
 *   acidity_score, body_score, complexity_score, carbonation_score,
 *   flavor_tags, occasion_tags, food_pairing_tags, is_active
 *
 * Arrays (flavor_tags, occasion_tags, food_pairing_tags, availability_regions)
 * should be pipe-separated inside the cell, e.g. "bitter|herbal|complex"
 */

import * as fs from 'fs';
import * as path from 'path';

const VALID_CATEGORIES = new Set([
  'na_beer', 'na_wine', 'na_spirits', 'na_sparkling',
  'na_aperitif', 'na_cocktail_kit', 'na_kombucha',
  'na_adaptogen', 'na_soda', 'na_cider', 'beer', 'wine',
  'spirits', 'sparkling', 'aperitif', 'cocktail_kit',
  'kombucha', 'adaptogen', 'soda', 'cider',
]);

const REQUIRED_COLUMNS = ['name', 'category'];

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parsePipeArray(value: string): string[] {
  if (!value) return [];
  return value.split('|').map((s) => s.trim()).filter(Boolean);
}

function validateScore(value: string, field: string, row: number): ValidationError | null {
  if (!value) return null;
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > 10 || num !== Math.floor(num)) {
    return { row, field, message: `Must be integer 0–10, got "${value}"` };
  }
  return null;
}

function validate() {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error('Usage: npx tsx scripts/validateDrinksCsv.ts <path-to-csv>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length < 2) {
    console.error('CSV must have a header row and at least one data row.');
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  const errors: ValidationError[] = [];
  let validCount = 0;
  const seen: Set<string> = new Set();

  // Check required columns
  for (const req of REQUIRED_COLUMNS) {
    if (!headers.includes(req)) {
      console.error(`Missing required column: "${req}"`);
      process.exit(1);
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = i + 1;

    if (values.length !== headers.length) {
      errors.push({
        row, field: 'ALL',
        message: `Expected ${headers.length} columns, got ${values.length}`,
      });
      continue;
    }

    const rowData: Record<string, string> = {};
    headers.forEach((h, idx) => { rowData[h] = values[idx] ?? ''; });

    // Required fields
    if (!rowData.name) {
      errors.push({ row, field: 'name', message: 'Name is required' });
    }
    if (!rowData.category) {
      errors.push({ row, field: 'category', message: 'Category is required' });
    } else if (!VALID_CATEGORIES.has(rowData.category.trim())) {
      errors.push({ row, field: 'category', message: `Invalid category "${rowData.category}"` });
    }

    // Duplicate check
    const key = `${rowData.name}|${rowData.brand}`;
    if (seen.has(key)) {
      errors.push({ row, field: 'name', message: `Duplicate: "${rowData.name}" by "${rowData.brand}"` });
    }
    seen.add(key);

    // Score fields
    const scoreFields = [
      'sweetness_score', 'bitterness_score', 'acidity_score',
      'body_score', 'complexity_score', 'carbonation_score',
    ];
    for (const field of scoreFields) {
      const err = validateScore(rowData[field], field, row);
      if (err) errors.push(err);
    }

    // Parse array columns to verify format
    for (const field of ['flavor_tags', 'occasion_tags', 'food_pairing_tags', 'availability_regions']) {
      if (rowData[field]) {
        const parsed = parsePipeArray(rowData[field]);
        if (parsed.length === 0 && rowData[field].length > 0) {
          errors.push({ row, field, message: 'Array column seems empty after parsing' });
        }
      }
    }

    if (errors.length === 0 || errors[errors.length - 1]?.row !== row) {
      validCount++;
    }
  }

  // Report
  console.log(`\n📋 Drink CSV Validation Report\n`);
  console.log(`File:     ${resolvedPath}`);
  console.log(`Rows:     ${lines.length - 1}`);
  console.log(`Valid:    ${validCount}`);
  console.log(`Errors:   ${errors.length}\n`);

  if (errors.length > 0) {
    console.log('Errors:');
    for (const err of errors.slice(0, 20)) {
      console.log(`  Row ${err.row} | ${err.field}: ${err.message}`);
    }
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more errors`);
    }
    process.exit(1);
  }

  console.log('✅ All rows valid. Ready for Supabase import.\n');
  console.log('Import command:');
  console.log('  1. Open Supabase Dashboard → SQL Editor');
  console.log('  2. Run the migration from supabase/migrations/001_initial_schema.sql');
  console.log('  3. Use Table Editor → drinks → Import → select CSV');
  console.log('  Or use: psql <connection-string> -c "\\copy drinks from <csv> delimiter \',\' csv header"');
}

validate();
