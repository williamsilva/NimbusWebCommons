export type FilterOperator = 'and' | 'or';

export type FilterMatchMode =
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'equals'
  | 'notEquals'
  | 'in'
  | 'is'
  | 'lt'
  | 'gt'
  | 'lte'
  | 'gte'
  | 'isNot'
  | 'after'
  | 'dateIs'
  | 'before'
  | 'dateIsNot'
  | 'dateBefore'
  | 'notContains'
  | 'dateAfter';

export interface FilterRuleDto {
  matchMode: FilterMatchMode;
  value: string | number | boolean | null;
}

export interface ColumnFilterDto {
  operator: FilterOperator;
  constraints: FilterRuleDto[];
}

export interface SortDto {
  field: string;
  order: 1 | -1;
}

export interface TableQueryDto {
  page: number;
  size: number;
  sort?: SortDto[];
  tableFilters?: Record<string, ColumnFilterDto>;
  globalFilter?: string | null;
}

/** Payload final (table + advanced/panel) */
export interface ListQueryDto<TAdvanced extends object> extends TableQueryDto {
  advanced?: Partial<TAdvanced>;
}
