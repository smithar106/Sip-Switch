# Drink Catalog Import Guide

## CSV Format

The drinks table accepts CSV import with the following columns in order:

```
name, brand, category, subcategory, description, image_url, product_url,
price_range, availability_regions, sweetness_score, bitterness_score,
acidity_score, body_score, complexity_score, carbonation_score,
flavor_tags, occasion_tags, food_pairing_tags, is_active
```

### Column Details

| Column | Required | Type | Notes |
|--------|----------|------|-------|
| `name` | **Yes** | text | Drink product name |
| `brand` | No | text | Brand/manufacturer name |
| `category` | **Yes** | text | One of: na_beer, na_wine, na_spirits, na_sparkling, na_aperitif, na_cocktail_kit, na_kombucha, na_adaptogen, na_soda, na_cider |
| `subcategory` | No | text | E.g. "IPA", "Cabernet Sauvignon" |
| `description` | No | text | 1-3 sentence description |
| `image_url` | No | text | URL to product image |
| `product_url` | No | text | URL to purchase page |
| `price_range` | No | text | E.g. "$15-$25", "$8/bottle" |
| `availability_regions` | No | text[] | Pipe-separated: "US|UK|CA" |
| `sweetness_score` | No | int (0-10) | 0 = dry, 10 = very sweet |
| `bitterness_score` | No | int (0-10) | 0 = none, 10 = very bitter |
| `acidity_score` | No | int (0-10) | 0 = none, 10 = very acidic |
| `body_score` | No | int (0-10) | 0 = watery, 10 = full body |
| `complexity_score` | No | int (0-10) | 0 = simple, 10 = complex |
| `carbonation_score` | No | int (0-10) | 0 = still, 10 = highly carbonated |
| `flavor_tags` | No | text[] | Pipe-separated. Valid: bitter, carbonated, complex, dry, bold, light, herbal, citrus, dark_fruit, clean |
| `occasion_tags` | No | text[] | Pipe-separated. Examples: saturday_lunch, sunday_dinner, friday_night, after_work, summer_bbq, dry_january, post_workout, holiday_gathering, casual_night, work_lunch |
| `food_pairing_tags` | No | text[] | Pipe-separated. Examples: red_meat, fish, pasta, cheese, dessert, spicy, salad |
| `is_active` | No | boolean | Default true. Set to false to hide from recommends |

### Example Row

```
name,brand,category,subcategory,description,image_url,product_url,price_range,availability_regions,sweetness_score,bitterness_score,acidity_score,body_score,complexity_score,carbonation_score,flavor_tags,occasion_tags,food_pairing_tags,is_active
"Run Wild IPA","Athletic Brewing",na_beer,"IPA","A perfectly hopped NA IPA with all the flavor, none of the alcohol.","https://...","https://...","$15-18/6pk","US|CA",2,7,3,5,6,8,"bitter|carbonated|complex","summer_bbq|casual_night|post_workout","spicy|salad",true
```

## Array Column Formatting

For array columns (`flavor_tags`, `occasion_tags`, `food_pairing_tags`, `availability_regions`), use the pipe character `|` as separator:

```
"bitter|herbal|complex"
```

For Supabase CSV import, arrays must be quoted if they contain pipes.

## Validation

Run the validator before importing:

```bash
npx tsx scripts/validateDrinksCsv.ts path/to/drinks.csv
```

The validator checks:
- Required fields (name, category)
- Score fields are integers 0-10
- Category is a valid value
- No duplicate brand + name combinations
- Array columns parse correctly
- CSV has correct column count

## Import Steps

1. **Run migration** — Open Supabase Dashboard → SQL Editor → paste and run `supabase/migrations/001_initial_schema.sql`

2. **Import CSV** — Supabase Dashboard → Table Editor → `drinks` → Import → select CSV file
   - Set "Header row" = Yes
   - Set delimiter = `,`
   - Arrays will be auto-converted from pipe-separated to Postgres arrays

3. **Verify** — Run: `SELECT COUNT(*) FROM drinks WHERE is_active = true;`

## Production Ready Checklist

- [ ] Run migration on production Supabase
- [ ] Validate CSV with script (0 errors)
- [ ] Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
- [ ] Test fetchActiveDrinks() returns drinks
- [ ] Test Feed shows ranked drinks
- [ ] Test Live tab shows ranked drinks per moment
