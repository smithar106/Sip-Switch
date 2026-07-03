import { ARCHETYPES } from '../constants/archetypes';
import type { ArchetypeId } from '../types';

interface Recommendation {
  drink: string;
  brand: string;
  reason: string;
}

const MOMENT_RECOMMENDATIONS: Record<string, Record<string, Recommendation>> = {
  saturday_lunch: {
    carbonated: { drink: 'Surely Sparkling Rosé', brand: 'Surely', reason: 'Bright, celebratory, perfect for a sunny afternoon' },
    light: { drink: 'Waterloo Sparkling', brand: 'Waterloo', reason: 'Light and refreshing — exactly what a Saturday needs' },
    complex: { drink: 'Leitz Eins Zwei Zero', brand: 'Leitz', reason: 'Crisp and food-friendly for a leisurely lunch' },
    bitter: { drink: 'Ghia', brand: 'Ghia', reason: 'Aperitivo hour without the alcohol — perfect timing' },
    bold: { drink: 'Curious Elixirs No. 1', brand: 'Curious Elixirs', reason: 'Complex enough to feel like a real drink occasion' },
    dry: { drink: 'Thomson & Scott Noughty', brand: 'Thomson & Scott', reason: 'Dry and refined — elevated casual' },
  },
  sunday_dinner: {
    complex: { drink: 'Leitz Eins Zwei Zero Cabernet', brand: 'Leitz', reason: 'Real structure and tannins — pairs like a proper red' },
    dry: { drink: 'Thomson & Scott Noughty', brand: 'Thomson & Scott', reason: 'Clean acidity that cuts through food beautifully' },
    bitter: { drink: 'Curious Elixirs No. 1', brand: 'Curious Elixirs', reason: 'Sophisticated and food-forward, like a real aperitif' },
    bold: { drink: "Lyre's American Malt", brand: "Lyre's", reason: 'Rich enough to stand up to a proper Sunday roast' },
    carbonated: { drink: 'Surely Sparkling Rosé', brand: 'Surely', reason: 'Light bubbles that pair without overpowering' },
    light: { drink: 'Wild Tonic', brand: 'Wild Tonic', reason: 'Fermented complexity that works beautifully with food' },
  },
  friday_night: {
    bold: { drink: "Lyre's Negroni Kit", brand: "Lyre's", reason: 'The full cocktail ritual — nobody will know the difference' },
    carbonated: { drink: 'Surely Sparkling Rosé', brand: 'Surely', reason: 'Pops like prosecco, feels like a celebration' },
    complex: { drink: 'Seedlip Spice 94', brand: 'Seedlip', reason: 'Sophisticated enough for any bar setting' },
    bitter: { drink: 'Ghia', brand: 'Ghia', reason: 'The aperitivo hour drink that actually impresses people' },
    light: { drink: 'Athletic Brewing Run Wild', brand: 'Athletic Brewing', reason: 'Sessionable enough for a full night out' },
    dry: { drink: 'Monday Gin + Tonic', brand: 'Monday', reason: 'Looks and tastes like a real G&T — nobody will guess' },
  },
  after_work: {
    bold: { drink: 'Kin Euphorics', brand: 'Kin', reason: 'Adaptogens that actually help you unwind — better than a drink' },
    complex: { drink: "Lyre's American Malt", brand: "Lyre's", reason: 'Sip it like a whisky — the ritual is all there' },
    bitter: { drink: 'Ghia', brand: 'Ghia', reason: 'Bitter and calming — the perfect decompression drink' },
    carbonated: { drink: 'Waterloo Sparkling', brand: 'Waterloo', reason: 'The pop of a can signals the end of the workday' },
    light: { drink: 'Partake Brewing', brand: 'Partake', reason: 'Cold, refreshing, and signals you\'re officially off the clock' },
    dry: { drink: 'Rowdy Mermaid', brand: 'Rowdy Mermaid', reason: 'Functional and calming — made for exactly this moment' },
  },
  summer_bbq: {
    light: { drink: 'Athletic Brewing Run Wild IPA', brand: 'Athletic Brewing', reason: 'The BBQ beer that nobody can tell is NA' },
    carbonated: { drink: 'Waterloo Sparkling', brand: 'Waterloo', reason: 'Sessionable bubbles for a long afternoon' },
    bold: { drink: 'Bravus Raspberry Gose', brand: 'Bravus', reason: 'Tart and refreshing — made for outdoor drinking' },
    complex: { drink: 'Partake Brewing IPA', brand: 'Partake', reason: 'Complex enough to impress, light enough to session' },
    bitter: { drink: 'Pentire Adrift', brand: 'Pentire', reason: 'Herbal and coastal — pairs perfectly with grilled food' },
    dry: { drink: 'Thomson & Scott Noughty', brand: 'Thomson & Scott', reason: 'Dry bubbles that work as well outside as in' },
  },
  dry_january: {
    complex: { drink: 'Curious Elixirs No. 3', brand: 'Curious Elixirs', reason: 'Makes Dry January feel like a choice, not a sacrifice' },
    bitter: { drink: 'Ghia', brand: 'Ghia', reason: 'Sophisticated enough that you\'ll forget you\'re doing Dry Jan' },
    bold: { drink: 'Seedlip Garden 108', brand: 'Seedlip', reason: 'Craft and complex — this is what sober tastes like now' },
    carbonated: { drink: 'Surely Sparkling Rosé', brand: 'Surely', reason: 'Still feels celebratory — Dry Jan doesn\'t have to be boring' },
    light: { drink: 'Partake Brewing', brand: 'Partake', reason: 'Light and satisfying — you won\'t miss the alcohol' },
    dry: { drink: 'Leitz Eins Zwei Zero', brand: 'Leitz', reason: 'Real wine complexity, zero compromise' },
  },
  post_workout: {
    light: { drink: 'Athletic Brewing Cerveza Athletica', brand: 'Athletic Brewing', reason: 'The post-run beer that actually makes sense' },
    carbonated: { drink: 'Waterloo Sparkling', brand: 'Waterloo', reason: 'Hydrating bubbles with zero sugar guilt' },
    clean: { drink: 'Rowdy Mermaid', brand: 'Rowdy Mermaid', reason: 'Clean functional ingredients — made for recovery' },
    bold: { drink: 'Kin Euphorics', brand: 'Kin', reason: 'Adaptogens + electrolytes — smarter than a sports drink' },
    complex: { drink: 'Wild Tonic Kombucha', brand: 'Wild Tonic', reason: 'Probiotics and complexity — your gut will thank you' },
    bitter: { drink: 'Pentire Adrift', brand: 'Pentire', reason: 'Botanical and refreshing — the recovery drink for adults' },
  },
  holiday_gathering: {
    carbonated: { drink: 'Surely Sparkling Rosé', brand: 'Surely', reason: 'Pours like champagne, nobody asks questions' },
    bold: { drink: "Lyre's Classico", brand: "Lyre's", reason: 'Festive and impressive — the bottle looks the part' },
    complex: { drink: 'Curious Elixirs No. 1', brand: 'Curious Elixirs', reason: 'A cocktail in a bottle — elegant and conversation-starting' },
    bitter: { drink: 'Ghia', brand: 'Ghia', reason: 'The aperitivo that makes holiday parties feel sophisticated' },
    light: { drink: 'Waterloo Sparkling', brand: 'Waterloo', reason: 'Light and festive — crowd pleasing without being boring' },
    dry: { drink: 'Leitz Eins Zwei Zero Riesling', brand: 'Leitz', reason: 'Genuine wine at the table — nobody compromises' },
  },
  casual_night: {
    light: { drink: 'Partake Brewing', brand: 'Partake', reason: 'Low key and delicious — just grab one from the fridge' },
    dry: { drink: 'Alder', brand: 'Alder', reason: 'Clean and easy — perfect companion for a quiet evening' },
    carbonated: { drink: 'Waterloo Sparkling', brand: 'Waterloo', reason: 'Satisfying fizz without any occasion required' },
    bold: { drink: 'Bravus Oatmeal Stout', brand: 'Bravus', reason: 'Rich and comforting — built for the couch' },
    complex: { drink: 'Wild Tonic', brand: 'Wild Tonic', reason: 'Interesting enough to sip slowly, easy enough to reach for' },
    bitter: { drink: 'Curious Elixirs No. 4', brand: 'Curious Elixirs', reason: 'Something to sip and think about — better than TV beer' },
  },
  work_lunch: {
    dry: { drink: 'Alder', brand: 'Alder', reason: 'Sharp and clean — you\'ll be focused all afternoon' },
    light: { drink: 'Partake Brewing', brand: 'Partake', reason: 'Professional, light, zero afternoon fog' },
    carbonated: { drink: 'Waterloo Sparkling', brand: 'Waterloo', reason: 'Looks like sparkling water, tastes like a treat' },
    complex: { drink: 'Seedlip Spice 94', brand: 'Seedlip', reason: 'Sophisticated at any business table' },
    bitter: { drink: 'Pentire Adrift + Tonic', brand: 'Pentire', reason: 'Botanical and impressive — the smart lunch order' },
    bold: { drink: 'Monday Gin + Tonic', brand: 'Monday', reason: 'Looks like a cocktail, keeps you sharp' },
  },
};

export function getRecommendation(
  momentId: string,
  archetypeId: ArchetypeId | null
): Recommendation {
  const momentRecs = MOMENT_RECOMMENDATIONS[momentId];
  if (!momentRecs) {
    return {
      drink: 'Athletic Brewing Run Wild IPA',
      brand: 'Athletic Brewing',
      reason: 'A great all-occasion NA choice',
    };
  }

  if (archetypeId) {
    const archetype = ARCHETYPES[archetypeId];
    for (const flavour of archetype.primaryFlavours) {
      if (momentRecs[flavour]) return momentRecs[flavour];
    }
  }

  return Object.values(momentRecs)[0];
}
