import { computed, signal, WritableSignal } from '@angular/core';

import { Table } from 'primeng/table';
import { DatePickerTypeView } from 'primeng/datepicker';

import type { I18nLike } from '../i18n/i18n-like';
import { readFilterValues } from './table-filter-readers';
import { PeriodEnum, periodEnumLabel } from '../enums/period.enum';
import { BaseListPage } from './base-list-page';
import { buildListQuery } from '../list-query/list-query.builder';
import { mapPrimeLazyToTableQuery } from '../list-query/primeng-lazy.mapper';
import {
  ActiveFilterItem,
  ActiveFilterGroup,
} from '../filters-panel/filters-panel.component';

export abstract class StatefulListPage<
  TState extends object,
  TAdvancedFilter extends object,
> extends BaseListPage<TState> {
  protected abstract readonly i18n: I18nLike;

  protected static readonly DEFAULT_ROWS = 20;

  protected searchedOnce = false;
  protected skipNextLazy = false;
  protected lastLazyEvent: any | null = null;

  readonly tableFiltersState = signal<any | null>(null);

  readonly tableActiveFilters = computed<ActiveFilterItem[]>(() =>
    this.mapTableFiltersToActiveItems(this.tableFiltersState()),
  );

  abstract rows: number;
  public rowsPerPageOptions: number[] = [13, 20, 30, 50, 100, 300, 500, 1000];

  protected abstract loadFirstPage(): void;
  protected abstract tableRowsKey(): string;
  protected abstract tableStateKey(): string;

  protected abstract advancedActiveFilters: () => ActiveFilterItem[];
  protected abstract buildAdvancedFilters(): Partial<TAdvancedFilter>;
  protected abstract mapTableFiltersToActiveItems(filters: any): ActiveFilterItem[];
  protected abstract loadPage(query: ReturnType<typeof buildListQuery<TAdvancedFilter>>): void;

  protected onAfterClear(): void {}
  protected clearCustomTableState(_defaultRows: number): void {}

  /** Override to (re)apply screen-specific default advanced-filter values. No-op by default —
   *  most screens have no defaults and should leave the panel empty after "Limpar". */
  protected applyDefaultAdvancedFilters(): void {}

  /**
   * Reapplies the screen's defaults (via applyDefaultAdvancedFilters) only when the advanced panel
   * is currently completely empty — checked as a whole, not field by field, so a default never
   * overrides a filter the user set or one restored from the persisted cache. Call this at the end
   * of resetFilters() (after zeroing the signals) and at the end of applyFiltersState() (after
   * applying the cached/restored values) — see the cs-filters-panel skill for the full pattern.
   */
  protected applyDefaultAdvancedFiltersIfEmpty(): void {
    if (this.advancedActiveFilters().length > 0) return;
    this.applyDefaultAdvancedFilters();
  }

  readonly activeFilterGroups = computed<ActiveFilterGroup[]>(() => {
    const groups: ActiveFilterGroup[] = [];
    const advanced = this.advancedActiveFilters();
    const table = this.tableActiveFilters();

    if (advanced.length) {
      groups.push({ title: this.i18n.tUi('common.advancedFilters'), filters: advanced });
    }

    if (table.length) {
      groups.push({ title: this.i18n.tUi('common.tableFilters'), filters: table });
    }

    return groups;
  });

  readonly activeFiltersCount = computed(
    () => this.advancedActiveFilters().length + this.tableActiveFilters().length,
  );

  search(): void {
    this.persistFilters();
    this.searchedOnce = true;

    if (this.lastLazyEvent) {
      this.lastLazyEvent = { ...this.lastLazyEvent, first: 0 };
    }

    this.reloadWithCurrentState();
  }

  clearTableAndReload(dt?: Table): void {
    this.clearAndPersist();
    this.searchedOnce = true;

    this.rows = StatefulListPage.DEFAULT_ROWS;
    localStorage.setItem(this.tableRowsKey(), String(this.rows));

    if (dt) {
      dt.first = 0;
      dt.rows = this.rows;

      if (typeof dt.reset === 'function') {
        dt.reset();
      } else {
        dt.clear();
      }

      const tableAny = dt as any;
      if (typeof tableAny.clearState === 'function') {
        tableAny.clearState();
      }
    } else {
      this.clearCustomTableState(this.rows);
    }

    localStorage.removeItem(this.tableStateKey());

    this.tableFiltersState.set(null);

    this.lastLazyEvent = {
      first: 0,
      rows: this.rows,
      filters: undefined,
      globalFilter: null,
      sortField: undefined,
      sortOrder: undefined,
      multiSortMeta: undefined,
    };

    this.onAfterClear();
    this.reloadWithCurrentState();
  }

  onPageChange(event: any): void {
    this.rows = event.rows;
    localStorage.setItem(this.tableRowsKey(), String(this.rows));
  }

  onLazyLoad(e: any): void {
    this.lastLazyEvent = e;
    this.tableFiltersState.set(this.cloneTableFilters(e?.filters));

    if (this.skipNextLazy) {
      this.skipNextLazy = false;
      return;
    }

    const hasTableInteraction =
      !!e?.filters ||
      e?.sortField != null ||
      (Array.isArray(e?.multiSortMeta) && e.multiSortMeta.length > 0) ||
      e?.globalFilter != null;

    if (!this.searchedOnce && this.activeFiltersCount() > 0 && !hasTableInteraction) {
      return;
    }

    this.reloadWithCurrentState();
  }

  setViewFormat(period: PeriodEnum | null): DatePickerTypeView {
    switch (period) {
      case PeriodEnum.MONTH:
        return 'month';
      case PeriodEnum.YEAR:
        return 'year';
      default:
        return 'date';
    }
  }

  setDateFormat(period: PeriodEnum | null, _lang?: unknown): string {
    return this.i18n.getDateFormatByPeriod(period);
  }

  setSelectionMode(period: PeriodEnum | null): 'single' | 'range' {
    return period === PeriodEnum.INTERVAL ? 'range' : 'single';
  }

  /**
   * PrimeNG's DatePicker (dataType="string") only parses an incoming value into a Date when it's
   * a plain string — for range selection (period INTERVAL) the value is an array of strings, and
   * its writeControlValue's `typeof value === 'string'` check skips arrays entirely, leaving raw
   * strings inside the component. Any internal code path that later calls `.getFullYear()` on
   * them (e.g. clicking the calendar header to jump into year-selection view, available
   * regardless of the configured view) then throws mid-render. Column-filter datepickers bind
   * this directly (not through cs-advanced-period-date-filter, which already guards against this)
   * — call from a `computed()` in the component, never a getter recomputed every change-detection
   * pass: a getter would return new array/Date instances every tick, which PrimeNG's own
   * OnChanges reads as a real change every time, re-triggering writeControlValue (and its
   * markForCheck) forever — the exact infinite loop that froze the whole tab the first time this
   * was patched only as a getter.
   */
  toDatepickerValue(value: string | string[] | null, format: string): string | Date[] | null {
    if (!Array.isArray(value)) {
      return value;
    }
    return value.map((v) => (v ? this.parseDateByFormat(v, format) : null)) as Date[];
  }

  private parseDateByFormat(text: string, format: string): Date | null {
    const formatParts = format.split('/');
    const valueParts = text.split('/');
    if (formatParts.length !== valueParts.length) {
      return null;
    }

    let day = 1;
    let month = 0;
    let year = new Date().getFullYear();

    formatParts.forEach((token, i) => {
      const num = Number(valueParts[i]);
      if (Number.isNaN(num)) return;
      if (token.startsWith('d')) day = num;
      else if (token.startsWith('m')) month = num - 1;
      else if (token.startsWith('y')) year = num;
    });

    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  setArrayColumnDraft(
    draft: WritableSignal<string[] | null>,
    value: string[] | null | undefined,
  ): void {
    draft.set(value?.length ? value : null);
  }

  applyArrayColumnFilter(
    draft: WritableSignal<string[] | null>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    const value = draft();

    filter(value?.length ? value : null);

    this.closeColumnFilter(columnFilter);
  }

  clearArrayColumnFilter(
    draft: WritableSignal<string[] | null>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    draft.set(null);

    filter(null);

    this.closeColumnFilter(columnFilter);
  }

  applyDecimalColumnFilter(
    draft: WritableSignal<string | null>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    const value = this.normalizeMoneyText(draft());

    draft.set(value);
    filter(value || null);

    this.closeColumnFilter(columnFilter);
  }

  clearDecimalColumnFilter(
    draft: WritableSignal<string | null>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    draft.set('');
    filter(null);

    this.closeColumnFilter(columnFilter);
  }

  setIntegerColumnDraft(draft: WritableSignal<string>, value: string | null | undefined): void {
    draft.set(this.normalizeIntegerText(value));
  }

  applyIntegerColumnFilter(
    draft: WritableSignal<string>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    const value = this.normalizeIntegerText(draft());

    draft.set(value);
    filter(value || null);

    this.closeColumnFilter(columnFilter);
  }

  clearIntegerColumnFilter(
    draft: WritableSignal<string>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    draft.set('');
    filter(null);

    this.closeColumnFilter(columnFilter);
  }

  syncArrayColumnDraftFromTableState(
    filters: any,
    field: string,
    draft: WritableSignal<string[] | null>,
    reader: (filters: any, field: string) => string[],
  ): void {
    const values = reader(filters, field);
    draft.set(values.length ? values : null);
  }

  onPeriodColumnChange(
    periodDraft: WritableSignal<PeriodEnum | null>,
    valueDraft: WritableSignal<string | string[] | null>,
    period: PeriodEnum | null,
  ): void {
    periodDraft.set(period);
    valueDraft.set(null);
  }

  onPeriodColumnDraftChange(
    valueDraft: WritableSignal<string | string[] | null>,
    value: string | string[] | null,
  ): void {
    valueDraft.set(value);
  }

  canApplyPeriodColumnFilter(
    periodDraft: WritableSignal<PeriodEnum | null>,
    valueDraft: WritableSignal<string | string[] | null>,
  ): boolean {
    const period = periodDraft();
    const value = valueDraft();

    if (!period || !value) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.filter(Boolean).length === 2;
    }

    return true;
  }

  applyPeriodColumnFilter(
    periodDraft: WritableSignal<PeriodEnum | null>,
    valueDraft: WritableSignal<string | string[] | null>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    const period = periodDraft();
    const value = valueDraft();

    if (!period || !value) {
      filter(null);
      this.closeColumnFilter(columnFilter);
      return;
    }

    if (Array.isArray(value)) {
      const normalized = value.filter(Boolean);

      if (normalized.length !== 2) {
        return;
      }

      filter({
        period,
        value: normalized,
      });

      this.closeColumnFilter(columnFilter);
      return;
    }

    filter({
      period,
      value,
    });

    this.closeColumnFilter(columnFilter);
  }

  clearPeriodColumnFilter(
    periodDraft: WritableSignal<PeriodEnum | null>,
    valueDraft: WritableSignal<string | string[] | null>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    periodDraft.set(null);
    valueDraft.set(null);

    filter(null);

    this.closeColumnFilter(columnFilter);
  }

  syncPeriodColumnDraftFromTableState(
    filters: any,
    field: string,
    periodDraft: WritableSignal<PeriodEnum | null>,
    valueDraft: WritableSignal<string | string[] | null>,
    reader: (
      filters: any,
      field: string,
    ) => { period?: PeriodEnum; value?: string | string[] } | null,
  ): void {
    const value = reader(filters, field);

    periodDraft.set(value?.period ?? null);
    valueDraft.set(value?.value ?? null);
  }

  setTextColumnDraft(draft: WritableSignal<string>, value: string | null | undefined): void {
    draft.set((value ?? '').toString());
  }

  applyTextColumnFilter(
    draft: WritableSignal<string>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    const value = draft().trim();

    filter(value || null);

    this.closeColumnFilter(columnFilter);
  }

  clearTextColumnFilter(
    draft: WritableSignal<string>,
    filter: (value: unknown) => void,
    columnFilter: unknown,
  ): void {
    draft.set('');

    filter(null);

    this.closeColumnFilter(columnFilter);
  }

  syncTextColumnDraftFromTableState(
    filters: any,
    field: string,
    draft: WritableSignal<string>,
    reader: (filters: any, field: string) => string | null,
  ): void {
    draft.set(reader(filters, field) ?? '');
  }

  dateFilterLabel(value: unknown): string {
    const filterValue = value as { period?: PeriodEnum; value?: string | string[] } | null;

    if (!filterValue?.period || !filterValue.value) {
      return '';
    }

    const periodLabel = periodEnumLabel(filterValue.period, this.i18n);
    const dateLabel = this.formatDateFilterValue(filterValue.value, filterValue.period);

    return `${periodLabel}: ${dateLabel}`;
  }

  formatActiveFilterDateValue(date: string | string[] | null | undefined): string | null {
    if (!date) {
      return null;
    }

    return Array.isArray(date) ? date.join(' - ') : date;
  }

  formatActiveFilterPeriodDateValue(
    period: PeriodEnum | null | undefined,
    date: string | string[] | null | undefined,
    i18n: I18nLike,
  ): string | null {
    const periodLabel = period ? periodEnumLabel(period, i18n) : null;
    const dateLabel = this.formatActiveFilterDateValue(date);

    if (periodLabel && dateLabel) {
      return `${periodLabel} - ${dateLabel}`;
    }

    return periodLabel ?? dateLabel;
  }

  protected formatDateFilterValue(value: string | string[], period: PeriodEnum): string {
    if (Array.isArray(value)) {
      return value
        .filter(Boolean)
        .map((item) => this.formatSingleDateFilterValue(item, period))
        .join(' - ');
    }

    return this.formatSingleDateFilterValue(value, period);
  }

  protected formatSingleDateFilterValue(value: string, period: PeriodEnum): string {
    const raw = `${value ?? ''}`.trim();

    if (!raw) {
      return '';
    }

    const parsed = this.parseDateFilterValue(raw);

    if (!parsed) {
      return raw;
    }

    const locale = this.i18n.getDateLocale();

    if (period === PeriodEnum.YEAR) {
      return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(parsed);
    }

    if (period === PeriodEnum.MONTH) {
      return new Intl.DateTimeFormat(locale, {
        month: '2-digit',
        year: 'numeric',
      }).format(parsed);
    }

    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);
  }

  protected parseDateFilterValue(value: string): Date | null {
    const raw = value.trim();

    const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) {
      return this.safeDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
    }

    const isoMonth = raw.match(/^(\d{4})-(\d{2})$/);
    if (isoMonth) {
      return this.safeDate(Number(isoMonth[1]), Number(isoMonth[2]), 1);
    }

    const yearOnly = raw.match(/^(\d{4})$/);
    if (yearOnly) {
      return this.safeDate(Number(yearOnly[1]), 1, 1);
    }

    const separated = raw.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2}|\d{4}))?$/);
    if (separated) {
      const first = Number(separated[1]);
      const second = Number(separated[2]);
      const year = this.normalizeYear(separated[3]);
      const locale = this.i18n.getDateLocale();

      if (locale === 'en-US') {
        return this.safeDate(year, first, second);
      }

      return this.safeDate(year, second, first);
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  protected normalizeYear(value: string | undefined): number {
    if (!value) {
      return new Date().getFullYear();
    }

    if (value.length === 2) {
      return 2000 + Number(value);
    }

    return Number(value);
  }

  protected normalizeMoneyText(value: string | null | undefined): string {
    const raw = (value ?? '').toString().trim();

    if (!raw) {
      return '';
    }

    let normalized = raw.replace(/R\$/gi, '').replace(/\s/g, '').trim();

    if (normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    }

    return normalized.replace(/[^0-9.+-]/g, '');
  }

  protected normalizeIntegerText(value: string | null | undefined): string {
    const raw = (value ?? '').toString().trim();

    if (!raw) {
      return '';
    }

    return raw.replace(/\D/g, '');
  }

  protected safeDate(year: number, month: number, day: number): Date | null {
    const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  protected moneyFilterLabel(filters: any, field: string): string | null {
    const constraint = this.firstFilterConstraint(filters, field);
    const rawValue = constraint?.value;

    if (rawValue == null || rawValue === '') {
      return null;
    }

    const values = readFilterValues(filters, field)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => this.formatMoneyFilterValue(value))
      .filter(Boolean);

    if (!values.length) {
      return null;
    }

    const matchMode = this.filterMatchModeLabel(constraint?.matchMode);

    return matchMode ? `${matchMode}: ${values.join(', ')}` : values.join(', ');
  }

  protected integerFilterLabel(filters: any, field: string): string | null {
    const constraint = this.firstFilterConstraint(filters, field);
    const rawValue = constraint?.value;

    if (rawValue == null || rawValue === '') {
      return null;
    }

    const values = readFilterValues(filters, field)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => this.formatIntegerFilterValue(value))
      .filter(Boolean);

    if (!values.length) {
      return null;
    }

    const matchMode = this.filterMatchModeLabel(constraint?.matchMode);

    return matchMode ? `${matchMode}: ${values.join(', ')}` : values.join(', ');
  }

  protected formatIntegerFilterValue(value: unknown): string {
    const raw = `${value ?? ''}`.trim();

    if (!raw) {
      return '';
    }

    const normalized = this.normalizeIntegerText(raw);

    if (!normalized) {
      return raw;
    }

    const parsed = Number(normalized);

    if (!Number.isSafeInteger(parsed)) {
      return normalized;
    }

    return new Intl.NumberFormat(this.i18n.getLocale(), {
      maximumFractionDigits: 0,
      useGrouping: false,
    }).format(parsed);
  }

  protected formatMoneyFilterValue(value: unknown): string {
    const raw = `${value ?? ''}`.trim();

    if (!raw) {
      return '';
    }

    const amount = this.parseMoneyFilterValue(raw);

    if (amount == null) {
      return raw;
    }

    return new Intl.NumberFormat(this.i18n.getLocale(), {
      style: 'currency',
      currency: this.i18n.getCurrency(),
      currencyDisplay: 'symbol',
    }).format(amount);
  }

  protected parseMoneyFilterValue(value: string): number | null {
    let normalized = value
      .replace(/R\$/gi, '')
      .replace(/US\$/gi, '')
      .replace(/€/g, '')
      .replace(/\s/g, '')
      .trim();

    if (!normalized) {
      return null;
    }

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    if (hasComma && hasDot) {
      const lastComma = normalized.lastIndexOf(',');
      const lastDot = normalized.lastIndexOf('.');

      normalized =
        lastComma > lastDot
          ? normalized.replace(/\./g, '').replace(',', '.')
          : normalized.replace(/,/g, '');
    } else if (hasComma) {
      normalized = normalized.replace(',', '.');
    }

    normalized = normalized.replace(/[^0-9.+-]/g, '');

    if (!normalized || normalized === '-' || normalized === '+') {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  protected firstFilterConstraint(
    filters: any,
    field: string,
  ): { matchMode?: string; value?: unknown } | null {
    const metadata = filters?.[field];

    if (!metadata) {
      return null;
    }

    if (Array.isArray(metadata)) {
      return metadata[0] ?? null;
    }

    if (Array.isArray(metadata.constraints)) {
      return metadata.constraints[0] ?? null;
    }

    return metadata;
  }

  protected filterMatchModeLabel(matchMode: string | null | undefined): string {
    return this.i18n.tPrimeNg(matchMode, matchMode ?? '');
  }

  protected closeColumnFilter(columnFilter: unknown): void {
    const filter = columnFilter as {
      hide?: () => void;
      overlayVisible?: boolean;
    };

    filter.hide?.();
    filter.overlayVisible = false;
  }

  protected cloneTableFilters(filters: any): any | null {
    if (!filters) return null;

    try {
      return structuredClone(filters);
    } catch {
      return JSON.parse(JSON.stringify(filters));
    }
  }

  protected initStatefulList(): void {
    this.restoreTableStateFromStorage();
    this.loadOnInit();

    if (this.advancedActiveFilters().length > 0 || this.hasRestoredTableState()) {
      this.searchedOnce = true;
    }

    this.skipNextLazy = true;
  }

  protected hasRestoredTableState(): boolean {
    return (
      !!this.lastLazyEvent?.filters ||
      this.lastLazyEvent?.sortField != null ||
      (Array.isArray(this.lastLazyEvent?.multiSortMeta) &&
        this.lastLazyEvent.multiSortMeta.length > 0) ||
      this.lastLazyEvent?.globalFilter != null ||
      (this.lastLazyEvent?.first ?? 0) > 0
    );
  }

  protected restoreTableStateFromStorage(): void {
    const raw = localStorage.getItem(this.tableStateKey());
    if (!raw) return;

    const dateFormat = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;

    try {
      const restored = JSON.parse(raw, (_key, value) => {
        if (typeof value === 'string' && dateFormat.test(value)) {
          return new Date(value);
        }
        return value;
      });

      this.lastLazyEvent = {
        first: restored?.first ?? 0,
        rows: restored?.rows ?? this.rows,
        sortField: restored?.sortField,
        sortOrder: restored?.sortOrder,
        multiSortMeta: restored?.multiSortMeta,
        filters: restored?.filters,
        globalFilter: restored?.globalFilter ?? null,
      };

      this.rows = this.lastLazyEvent.rows ?? this.rows;
      localStorage.setItem(this.tableRowsKey(), String(this.rows));
      this.tableFiltersState.set(this.cloneTableFilters(this.lastLazyEvent?.filters));
    } catch {
      this.lastLazyEvent = null;
      this.tableFiltersState.set(null);
    }
  }

  /**
   * Chamada via `(onStateSave)` nas telas com seleção de linha por checkbox (dataKey + [selection])
   * - o PrimeNG Table (stateStorage="local") inclui `selection` automaticamente no state
   * persistido sempre que o input [selection] estiver definido (mesmo `[]`, que é truthy em JS -
   * ver `saveState()` em node_modules/primeng/fesm2022/primeng-table.mjs). O problema real (achado
   * via teste real, não hipotético): `restoreState()` só marca `stateRestored = true` quando
   * ENCONTRA algo salvo no localStorage; até lá, TODO recarregamento do `[value]` da tabela chama
   * `restoreState()` de novo (`onChanges`: `if (simpleChange.value) { if (isStateful() &&
   * !stateRestored) restoreState(); ... }`). Resultado: a PRIMEIRA seleção feita numa sessão nova
   * (localStorage ainda sem state algum) é salva, e se LOGO DEPOIS a tabela recarregar por
   * qualquer motivo (ex.: reloadLast() após uma ação em lote) - antes de qualquer outra interação
   * ter "consumido" o stateRestored -, `restoreState()` reaplica essa seleção recém-salva via
   * `selectionChange.emit(state.selection)`, sobrescrevendo um `selection.set([])` que a própria
   * tela já tinha acabado de fazer. Seleção nunca deveria sobreviver a um reload/nova sessão nestas
   * telas, então ela é removida do state assim que o PrimeNG termina de salvá-lo.
   */
  protected stripSelectionFromPersistedTableState(): void {
    try {
      const raw = localStorage.getItem(this.tableStateKey());
      if (!raw) return;

      const state = JSON.parse(raw);
      if (state && typeof state === 'object' && 'selection' in state) {
        delete state.selection;
        localStorage.setItem(this.tableStateKey(), JSON.stringify(state));
      }
    } catch {
      // localStorage indisponível/JSON corrompido - não crítico, só deixa de prevenir a
      // restauração de uma seleção obsoleta (o pior caso é o bug acima voltar a acontecer).
    }
  }

  protected reloadWithCurrentState(): void {
    const tableQuery = mapPrimeLazyToTableQuery(
      this.lastLazyEvent ?? { first: 0, rows: this.rows },
      this.rows,
    );

    const query = buildListQuery<TAdvancedFilter>(tableQuery, this.buildAdvancedFilters());

    this.rows = tableQuery.size;
    localStorage.setItem(this.tableRowsKey(), String(this.rows));
    this.loadPage(query);
  }
}
