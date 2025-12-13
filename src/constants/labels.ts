/**
 * Shared label mappings for subscription temporality and audience types
 * Used across form components to ensure consistency
 */

export const TEMPORALITY_LABELS: Record<string, string> = {
  season: 'Saison',
  yearly: 'Année',
  semester1: 'Semestre',
  quarter: 'Trimestre',
  month: 'Mois',
} as const;

export const AUDIENCE_LABELS: Record<string, string> = {
  adult: 'Adulte',
  reduced: 'Tarif réduit',
  teen: 'Ado',
  child: 'Enfant',
} as const;
