export const STORAGE_KEYS = {
  study: "afp.study.v1",
  variant: "afp.variant.v1"
} as const;

export const THEME_VARIANTS = {
  agro: "agro-premium",
  copilot: "copilot-sleek"
} as const;

export type ThemeVariant = (typeof THEME_VARIANTS)[keyof typeof THEME_VARIANTS];
