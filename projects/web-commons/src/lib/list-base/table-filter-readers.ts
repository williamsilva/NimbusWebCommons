import { PeriodEnum } from '../enums/period.enum';

export function readFilterValues(filters: any, field: string): any[] {
  const metadata = filters?.[field];
  if (!metadata) return [];

  const constraints = Array.isArray(metadata)
    ? metadata
    : Array.isArray(metadata.constraints)
      ? metadata.constraints
      : [metadata];

  return constraints
    .map((constraint: any) => constraint?.value)
    .filter((value: any) => {
      if (value == null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
}

export function readSingleFilterValue(filters: any, field: string): string | null {
  const values = readFilterValues(filters, field)
    .map((value) => `${value}`.trim())
    .filter(Boolean);

  return values.length ? values.join(', ') : null;
}

export function readArrayFilterValues(filters: any, field: string): string[] {
  return readFilterValues(filters, field)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => `${value}`.trim())
    .filter(Boolean);
}

export function readDateRangeFilterValue(
  filters: any,
  field: string,
  formatDate: (value: Date | string) => string,
): string | null {
  const range = readFilterValues(filters, field).find(
    (value) => Array.isArray(value) && value[0] && value[1],
  );

  if (!range) return null;

  return `${formatDate(range[0])} – ${formatDate(range[1])}`;
}

export function readPeriodFilterValue(
  filters: any,
  field: string,
): { period?: PeriodEnum; value?: string | string[] } | null {
  const raw = filters?.[field];

  if (!raw) {
    return null;
  }

  const constraint = Array.isArray(raw) ? raw[0] : raw;
  const value = constraint?.value;

  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as { period?: PeriodEnum; value?: string | string[] };
}
