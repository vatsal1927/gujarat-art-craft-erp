import {
  unwrapOptionalNumber,
  unwrapOptionalText,
  unwrapOptionalBoolean,
} from './candidMappers';

export function getOptionalNumber(
  value: any,
  fallback: any = 0,
  fieldName: string = "value"
): number {
  if (import.meta.env?.DEV && Array.isArray(value)) {
    console.warn("[Candid Optional]", fieldName, value);
  }
  return unwrapOptionalNumber(value, fallback);
}

export function getOptionalText(
  value: any,
  fallback = "",
  fieldName: string = "value"
): string {
  if (import.meta.env?.DEV && Array.isArray(value)) {
    console.warn("[Candid Optional]", fieldName, value);
  }
  return unwrapOptionalText(value, fallback);
}

export function getOptionalBoolean(
  value: any,
  fallback = false,
  fieldName: string = "value"
): boolean {
  if (import.meta.env?.DEV && Array.isArray(value)) {
    console.warn("[Candid Optional]", fieldName, value);
  }
  return unwrapOptionalBoolean(value, fallback);
}
