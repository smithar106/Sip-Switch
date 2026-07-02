export interface DrinkProfile {
  id: string;
  name: string;
  brand: string;
  category: DrinkCategory;
  imageUrl: string;
  description: string;
  flavourTags: FlavourTag[];
  alcoholic: boolean;
  naEquivalentOf?: string;
  gemScore: number;
  productUrl?: string;
  price?: number;
  currency?: string;
}

export type DrinkCategory =
  | 'na_beer'
  | 'na_wine'
  | 'na_spirits'
  | 'na_sparkling'
  | 'na_aperitif'
  | 'na_cocktail_kit'
  | 'na_kombucha'
  | 'na_adaptogen'
  | 'na_soda'
  | 'na_cider';

export type FlavourTag =
  | 'bitter'
  | 'carbonated'
  | 'complex'
  | 'dry'
  | 'bold'
  | 'light'
  | 'herbal'
  | 'citrus'
  | 'dark_fruit'
  | 'clean';

export type ArchetypeId =
  | 'bitter'
  | 'carbonated'
  | 'complex'
  | 'dry'
  | 'bold'
  | 'light';

export interface Archetype {
  id: ArchetypeId;
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  categories: string[];
  primaryFlavours: FlavourTag[];
  examples: string[];
}

export interface TasteProfile {
  archetypeId: ArchetypeId | null;
  scores: Record<FlavourTag, number>;
  dominantFlavours: FlavourTag[];
  totalRatings: number;
  lastUpdated: string | null;
}

export interface DrinkRating {
  drinkId: string;
  rating: 'love' | 'like' | 'skip' | 'save';
  timestamp: string;
  flavourTags?: FlavourTag[];
}

export interface SwapEntry {
  from: string;
  to: string;
  reason: string;
}

export interface OnboardingAnswers {
  drink?: string;
  moment?: string;
  flavour?: string;
  texture?: string;
  goal?: string;
}
