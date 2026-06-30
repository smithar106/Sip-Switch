export interface Moment {
  id: string;
  emoji: string;
  label: string;
  description: string;
  tags: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  season: 'summer' | 'winter' | 'anytime';
  social: 'solo' | 'social' | 'anytime';
}

export interface LiveEntry {
  id: string;
  momentId: string;
  momentLabel: string;
  momentEmoji: string;
  recommendedDrink: string;
  recommendedBrand: string;
  reason: string;
  timestamp: string;
  rating?: 'loved' | 'liked' | 'skipped';
}
