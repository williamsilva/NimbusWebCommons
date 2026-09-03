import { computed, signal } from '@angular/core';

import { StatefulListPage } from './stateful-list-page';

export interface SelectableListRow {
  id: string;
}

export interface ListSelectionPolicy<TRow, TStatus> {
  selectableStatus(row: TRow): TStatus | null;
  canSelectForStatus(row: TRow, status: TStatus | null): boolean;
}

export abstract class SelectableStatefulListPage<
  TRow extends SelectableListRow,
  TStatus,
  TState extends object,
  TAdvancedFilter extends object,
> extends StatefulListPage<TState, TAdvancedFilter> {
  protected abstract readonly secPolicy: ListSelectionPolicy<TRow, TStatus>;

  protected abstract currentRows(): TRow[];

  readonly selectedRows = signal<TRow[]>([]);

  readonly selectionStatus = computed<TStatus | null>(() => {
    const selected = this.selectedRows();

    if (!selected.length) {
      return null;
    }

    return this.secPolicy.selectableStatus(selected[0]);
  });

  readonly headerEligibleRows = computed(() => {
    const selectedStatus = this.selectionStatus();

    if (!selectedStatus) {
      return [];
    }

    return this.currentRows().filter((row) =>
      this.secPolicy.canSelectForStatus(row, selectedStatus),
    );
  });

  readonly headerChecked = computed(() => {
    const eligible = this.headerEligibleRows();

    return !!eligible.length && eligible.every((row) => this.isRowSelected(row));
  });

  readonly headerIndeterminate = computed(() => {
    const eligible = this.headerEligibleRows();

    if (!eligible.length) {
      return false;
    }

    const selectedCount = eligible.filter((row) => this.isRowSelected(row)).length;

    return selectedCount > 0 && selectedCount < eligible.length;
  });

  clearSelection(): void {
    this.selectedRows.set([]);
  }

  isRowSelected(row: TRow): boolean {
    return this.selectedRows().some((item) => item.id === row.id);
  }

  isRowCheckboxDisabled(row: TRow): boolean {
    if (this.isRowSelected(row)) {
      return false;
    }

    return !this.secPolicy.canSelectForStatus(row, this.selectionStatus());
  }

  toggleRowSelection(row: TRow, checked: boolean): void {
    const current = this.selectedRows();

    if (!checked) {
      this.selectedRows.set(current.filter((item) => item.id !== row.id));
      return;
    }

    const rowStatus = this.secPolicy.selectableStatus(row);

    if (!rowStatus) {
      return;
    }

    if (!current.length) {
      this.selectedRows.set([row]);
      return;
    }

    if (rowStatus !== this.selectionStatus()) {
      return;
    }

    if (this.isRowSelected(row)) {
      return;
    }

    this.selectedRows.set([...current, row]);
  }

  toggleHeaderSelection(checked: boolean): void {
    const eligible = this.headerEligibleRows();

    if (!eligible.length) {
      return;
    }

    if (!checked) {
      this.clearSelection();
      return;
    }

    this.selectedRows.set([...eligible]);
  }
}
