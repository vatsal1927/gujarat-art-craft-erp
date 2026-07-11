export function getOptionalNumber(
  value: any,
  fallback: any = 0,
  fieldName: string = "value"
): number {
  if (
    import.meta.env.DEV &&
    Array.isArray(value)
  ) {
    console.warn(
      "[Candid Optional]",
      fieldName,
      value
    );
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? Number(value[0]) || 0
      : Number(fallback) || 0;
  }

  return Number(value ?? fallback) || 0;
}

export function getOptionalText(
  value: any,
  fallback = "",
  fieldName: string = "value"
): string {
  if (
    import.meta.env.DEV &&
    Array.isArray(value)
  ) {
    console.warn(
      "[Candid Optional]",
      fieldName,
      value
    );
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? String(value[0])
      : fallback;
  }

  return value ?? fallback;
}

export function getOptionalBoolean(
  value: any,
  fallback = false,
  fieldName: string = "value"
): boolean {
  if (
    import.meta.env.DEV &&
    Array.isArray(value)
  ) {
    console.warn(
      "[Candid Optional]",
      fieldName,
      value
    );
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? Boolean(value[0])
      : fallback;
  }

  return value ?? fallback;
}
