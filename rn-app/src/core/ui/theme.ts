export const colors = {
  background: '#f6f7f9',
  surface: '#ffffff',
  border: '#e3e6eb',
  text: '#1c2330',
  textMuted: '#5d6675',
  accent: '#3657d6',
  accentSoft: '#e8edfd',
  success: '#1f8a4c',
  successSoft: '#e3f5ea',
  warning: '#a86200',
  warningSoft: '#fdf1dd',
  danger: '#c4302b',
  dangerSoft: '#fce8e7',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 10, pill: 999 } as const;

export const typography = {
  title: { fontSize: 20, fontWeight: '700' },
  heading: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15 },
  caption: { fontSize: 13 },
} as const;
