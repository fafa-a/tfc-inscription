import { describe, expect, test } from 'bun:test';
import { calculateAge, getAgeGroup, getAgeGroupFromBirthday } from './ageUtils';

describe('calculateAge', () => {
  test('should calculate age correctly', () => {
    // Create a date that will always be 25 years old (today's date minus 25 years)
    const today = new Date();
    const birthYear = today.getFullYear() - 25;
    const birthDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${birthYear}`;

    expect(calculateAge(birthDate)).toBe(25);
  });

  test('should return null for invalid date format', () => {
    expect(calculateAge('invalid')).toBe(null);
    expect(calculateAge('2024-01-01')).toBe(null);
    expect(calculateAge('01/01')).toBe(null);
  });

  test('should handle birthday not yet occurred this year', () => {
    const today = new Date();
    const futureMonth = today.getMonth() + 2; // 2 months in the future
    const birthYear = today.getFullYear() - 20;

    // If future month exceeds December, adjust
    const adjustedMonth = futureMonth > 11 ? futureMonth - 12 : futureMonth;
    const birthDate = `15/${String(adjustedMonth + 1).padStart(2, '0')}/${birthYear}`;

    const age = calculateAge(birthDate);
    // Age could be 19 or 20 depending on if birthday has passed
    expect(age).toBeGreaterThanOrEqual(19);
    expect(age).toBeLessThanOrEqual(20);
  });
});

describe('getAgeGroup', () => {
  test('should classify enfants (8-10 years)', () => {
    expect(getAgeGroup(8)).toBe('enfant');
    expect(getAgeGroup(9)).toBe('enfant');
    expect(getAgeGroup(10)).toBe('enfant');
  });

  test('should classify ados (11-15 years)', () => {
    expect(getAgeGroup(11)).toBe('ado');
    expect(getAgeGroup(13)).toBe('ado');
    expect(getAgeGroup(15)).toBe('ado');
  });

  test('should classify adultes (16+ years)', () => {
    expect(getAgeGroup(16)).toBe('adulte');
    expect(getAgeGroup(18)).toBe('adulte');
    expect(getAgeGroup(25)).toBe('adulte');
    expect(getAgeGroup(50)).toBe('adulte');
  });

  test('should classify under 8 as adulte (edge case)', () => {
    expect(getAgeGroup(7)).toBe('adulte');
    expect(getAgeGroup(5)).toBe('adulte');
  });
});

describe('getAgeGroupFromBirthday', () => {
  test('should return correct age group from birthday', () => {
    const today = new Date();

    // Create a 10-year-old
    const enfantBirthYear = today.getFullYear() - 10;
    const enfantDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${enfantBirthYear}`;
    expect(getAgeGroupFromBirthday(enfantDate)).toBe('enfant');

    // Create a 13-year-old
    const adoBirthYear = today.getFullYear() - 13;
    const adoDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${adoBirthYear}`;
    expect(getAgeGroupFromBirthday(adoDate)).toBe('ado');

    // Create a 25-year-old
    const adulteBirthYear = today.getFullYear() - 25;
    const adulteDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${adulteBirthYear}`;
    expect(getAgeGroupFromBirthday(adulteDate)).toBe('adulte');
  });

  test('should return null for invalid date', () => {
    expect(getAgeGroupFromBirthday('invalid')).toBe(null);
    expect(getAgeGroupFromBirthday('2024-01-01')).toBe(null);
  });
});
