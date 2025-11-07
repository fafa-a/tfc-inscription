import type { AgeGroup } from '../lib/supabase';

/**
 * Calculate age from a date in DD/MM/YYYY format
 */
export function calculateAge(dateString: string): number | null {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(dateRegex);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get age group based on age
 * - Enfants: 8-10 years (inclusive)
 * - Ados: 11-15 years (inclusive)
 * - Adultes: 16+ years
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age >= 8 && age <= 10) {
    return 'enfant';
  }
  if (age >= 11 && age <= 15) {
    return 'ado';
  }
  return 'adulte';
}

/**
 * Get age group from birthday string (DD/MM/YYYY)
 */
export function getAgeGroupFromBirthday(birthday: string): AgeGroup | null {
  const age = calculateAge(birthday);
  if (age === null) {
    return null;
  }
  return getAgeGroup(age);
}
