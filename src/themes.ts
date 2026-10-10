import definitions from '../shared/themes.json';
import type { ThemeId } from './types';

export interface Theme {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  artwork: string;
  eyebrow: string;
  signature: string;
  palette: string[];
}

export const themes = definitions as Theme[];
export function normalizeTheme(value: unknown): ThemeId {
  const migrated = value === 'arctic' ? 'abyss' : value;
  return themes.find((theme) => theme.id === migrated)?.id ?? 'anime';
}
export function getTheme(value: unknown): Theme {
  return themes.find((theme) => theme.id === normalizeTheme(value))!;
}
