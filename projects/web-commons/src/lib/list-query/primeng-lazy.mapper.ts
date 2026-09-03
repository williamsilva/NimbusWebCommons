import {
  SortDto,
  FilterRuleDto,
  TableQueryDto,
  FilterOperator,
  ColumnFilterDto,
} from './list-query.types';

type PrimeConstraint = {
  value?: any;
  matchMode?: string;
  operator?: string; // em geral vem no array
};

type PrimeFilters = Record<string, PrimeConstraint | PrimeConstraint[]>;

function isEmptyValue(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function normalizePrimeFilters(
  filters: PrimeFilters | undefined,
): Record<string, ColumnFilterDto> | undefined {
  if (!filters) return undefined;

  const out: Record<string, ColumnFilterDto> = {};

  for (const [field, raw] of Object.entries(filters)) {
    const arr = Array.isArray(raw) ? raw : [raw];

    const constraints: FilterRuleDto[] = arr
      .map((c) => ({
        matchMode: (c.matchMode ?? 'contains') as any,
        value: (c.value ?? null) as any,
      }))
      .filter((c) => !isEmptyValue(c.value));

    if (constraints.length === 0) continue;

    const operator: FilterOperator = ((arr[0] as any)?.operator ?? 'and') as FilterOperator;

    out[field] = { operator, constraints };
  }

  return Object.keys(out).length ? out : undefined;
}

function buildSort(event: any): SortDto[] | undefined {
  // multi-sort
  if (event?.multiSortMeta?.length) {
    const s = event.multiSortMeta
      .filter((m: any) => !!m.field && (m.order === 1 || m.order === -1))
      .map((m: any) => ({ field: m.field, order: m.order as 1 | -1 }));
    return s.length ? s : undefined;
  }

  // single-sort
  if (event?.sortField && (event.sortOrder === 1 || event.sortOrder === -1)) {
    const field = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
    if (field) return [{ field, order: event.sortOrder as 1 | -1 }];
  }

  return undefined;
}

/** Converte LazyLoadEvent do PrimeNG -> TableQueryDto */
export function mapPrimeLazyToTableQuery(event: any, fallbackRows = 10): TableQueryDto {
  const size = event?.rows ?? fallbackRows;
  const first = event?.first ?? 0;
  const page = Math.floor(first / size);

  return {
    page,
    size,
    sort: buildSort(event),
    tableFilters: normalizePrimeFilters(event?.filters as any),
    globalFilter: (event?.globalFilter ?? null) as any,
  };
}
