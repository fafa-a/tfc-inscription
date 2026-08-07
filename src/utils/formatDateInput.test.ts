import { describe, expect, test } from 'bun:test';
import { formatDateInput } from './formatDateInput';

describe('formatDateInput', () => {
  test('should format date input with slashes', () => {
    expect(formatDateInput('15', '1')).toBe('15/');
    expect(formatDateInput('151', '15/')).toBe('15/1');
    expect(formatDateInput('1512', '15/1')).toBe('15/12/');
    expect(formatDateInput('15122', '15/12/')).toBe('15/12/2');
    expect(formatDateInput('15122024', '15/12/2')).toBe('15/12/2024');
  });

  test('should handle non-numeric characters', () => {
    expect(formatDateInput('1a5', '1')).toBe('15/');
    expect(formatDateInput('15/12', '15/')).toBe('15/12/');
  });

  test('should limit to 8 digits', () => {
    expect(formatDateInput('151220241234', '15/12/2024')).toBe('15/12/2024');
  });

  test('should handle deletion', () => {
    expect(formatDateInput('15/1', '15/12')).toBe('151');
    expect(formatDateInput('15', '15/1')).toBe('15');
  });

  test('should handle empty input', () => {
    expect(formatDateInput('', '')).toBe('');
  });

  test('should add slash immediately after 2nd digit when not deleting', () => {
    expect(formatDateInput('15', '1')).toBe('15/');
  });

  test('should add second slash immediately after 4th digit', () => {
    expect(formatDateInput('1512', '15/1')).toBe('15/12/');
  });

  test('should handle single digit', () => {
    expect(formatDateInput('1', '')).toBe('1');
  });
});
