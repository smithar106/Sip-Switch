import type { DrinkProfile, DrinkCategory, FlavourTag } from '../types';
import type { SupabaseDrink } from '../types/supabase';

const CATEGORY_MAP: Record<string, DrinkCategory> = {
  'na_beer': 'na_beer', 'na_wine': 'na_wine', 'na_spirits': 'na_spirits',
  'na_sparkling': 'na_sparkling', 'na_aperitif': 'na_aperitif',
  'na_cocktail_kit': 'na_cocktail_kit', 'na_kombucha': 'na_kombucha',
  'na_adaptogen': 'na_adaptogen', 'na_soda': 'na_soda', 'na_cider': 'na_cider',
  'beer': 'na_beer', 'wine': 'na_wine', 'spirits': 'na_spirits',
  'sparkling': 'na_sparkling', 'aperitif': 'na_aperitif',
  'cocktail_kit': 'na_cocktail_kit', 'kombucha': 'na_kombucha',
  'adaptogen': 'na_adaptogen', 'soda': 'na_soda', 'cider': 'na_cider',
};

const VALID_FLAVOURS: Set<string> = new Set([
  'bitter', 'carbonated', 'complex', 'dry', 'bold', 'light',
  'herbal', 'citrus', 'dark_fruit', 'clean',
]);

function mapCategory(cat: string | null): DrinkCategory {
  if (!cat) return 'na_soda';
  const lower = cat.toLowerCase().replace(/\s+/g, '_');
  return CATEGORY_MAP[lower] ?? 'na_soda';
}

function mapFlavourTags(tags: string[] | null): FlavourTag[] {
  if (!tags || tags.length === 0) return [];
  return tags.filter((t) => VALID_FLAVOURS.has(t)) as FlavourTag[];
}

export function supabaseDrinkToDrinkProfile(
  row: SupabaseDrink,
  score?: number,
  reason?: string,
): DrinkProfile {
  const dbName = row.name ?? 'Unknown Drink';
  const dbBrand = row.brand ?? dbName;
  const category = mapCategory(row.category);
  const description = row.description ?? `${dbBrand} — a premium non-alcoholic option.`;

  return {
    id: row.id,
    name: dbName,
    brand: dbBrand,
    category,
    imageUrl: row.image_url ?? '',
    description,
    flavourTags: mapFlavourTags(row.flavor_tags),
    alcoholic: false,
    gemScore: score ?? 50,
    productUrl: row.product_url ?? undefined,
    price: row.price_range ? undefined : undefined,
    displayScore: score,
    recommendationReason: reason,
  };
}

export function supabaseDrinksToDrinkProfiles(
  rows: SupabaseDrink[],
  scores?: Map<string, { score: number; reason: string }>,
): DrinkProfile[] {
  return rows.map((row) => {
    const scored = scores?.get(row.id);
    return supabaseDrinkToDrinkProfile(row, scored?.score, scored?.reason);
  });
}
