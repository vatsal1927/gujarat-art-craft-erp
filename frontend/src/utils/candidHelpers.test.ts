import { describe, it, expect } from 'vitest';
import {
  getOptionalNumber,
  getOptionalText,
  getOptionalBoolean,
} from './candidHelpers';

describe('candidHelpers.ts unit tests', () => {
  describe('getOptionalNumber', () => {
    it('unwraps array optional value [number]', () => {
      expect(getOptionalNumber([42])).toBe(42);
      expect(getOptionalNumber(['100'])).toBe(100);
    });

    it('returns fallback for empty optional array []', () => {
      expect(getOptionalNumber([], 10)).toBe(10);
      expect(getOptionalNumber([])).toBe(0);
    });

    it('handles direct number or string input', () => {
      expect(getOptionalNumber(50)).toBe(50);
      expect(getOptionalNumber('25')).toBe(25);
    });

    it('returns fallback for null or undefined input', () => {
      expect(getOptionalNumber(null, 5)).toBe(5);
      expect(getOptionalNumber(undefined, 15)).toBe(15);
    });
  });

  describe('getOptionalText', () => {
    it('unwraps array optional value [string]', () => {
      expect(getOptionalText(['hello'])).toBe('hello');
    });

    it('returns fallback for empty optional array []', () => {
      expect(getOptionalText([], 'default')).toBe('default');
      expect(getOptionalText([])).toBe('');
    });

    it('handles direct string input', () => {
      expect(getOptionalText('direct text')).toBe('direct text');
    });

    it('returns fallback for null or undefined input', () => {
      expect(getOptionalText(null, 'fallback')).toBe('fallback');
      expect(getOptionalText(undefined, 'fallback')).toBe('fallback');
    });
  });

  describe('getOptionalBoolean', () => {
    it('unwraps array optional value [boolean]', () => {
      expect(getOptionalBoolean([true])).toBe(true);
      expect(getOptionalBoolean([false])).toBe(false);
    });

    it('returns fallback for empty optional array []', () => {
      expect(getOptionalBoolean([], true)).toBe(true);
      expect(getOptionalBoolean([])).toBe(false);
    });

    it('handles direct boolean input', () => {
      expect(getOptionalBoolean(true)).toBe(true);
      expect(getOptionalBoolean(false)).toBe(false);
    });

    it('returns fallback for null or undefined input', () => {
      expect(getOptionalBoolean(null, true)).toBe(true);
      expect(getOptionalBoolean(undefined, false)).toBe(false);
    });
  });
});
