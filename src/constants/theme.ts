export const COLORS = {
  background: '#0A0A0A',
  surface: '#141414',
  surfaceAlt: '#1A1A1A',
  border: 'rgba(255,255,255,0.08)',
  borderActive: '#C8A96E',
  gold: '#C8A96E',
  goldDim: '#A67A3A',
  goldSoft: 'rgba(200,169,110,0.08)',
  text: '#FFFFFF',
  textSecondary: '#EEEEEE',
  textMuted: '#888888',
  textDisabled: '#444444',
  success: '#00AB4E',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  card: 14,
  pill: 100,
};

export const LETTER_SPACING = {
  tight: -1,
  normal: -0.5,
  relaxed: -0.2,
  body: 0,
  wide: 1.5,
  wider: 2.5,
};

export const EYEBROW = {
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 2.5,
  textTransform: 'uppercase' as const,
  color: COLORS.gold,
};
