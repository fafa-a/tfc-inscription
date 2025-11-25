import { describe, expect, test } from 'vitest';
import { validateImageFile } from './uploadPhoto';

describe('validateImageFile', () => {
  test('should reject files larger than 1MB', () => {
    const largeFile = new File(['x'.repeat(1024 * 1024 + 1)], 'large.jpg', {
      type: 'image/jpeg',
    });

    const result = validateImageFile(largeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('trop volumineux');
  });

  test('should reject invalid file types', () => {
    const invalidFile = new File(['test'], 'test.pdf', {
      type: 'application/pdf',
    });

    const result = validateImageFile(invalidFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Format de fichier invalide');
  });

  test('should accept valid JPEG files', () => {
    const validFile = new File(['x'.repeat(100 * 1024)], 'photo.jpg', {
      type: 'image/jpeg',
    });

    const result = validateImageFile(validFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should accept valid PNG files', () => {
    const validFile = new File(['x'.repeat(500 * 1024)], 'photo.png', {
      type: 'image/png',
    });

    const result = validateImageFile(validFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should accept files exactly at 1MB limit', () => {
    const maxFile = new File(['x'.repeat(1024 * 1024)], 'max.jpg', {
      type: 'image/jpeg',
    });

    const result = validateImageFile(maxFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
