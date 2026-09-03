import { FormsModule } from '@angular/forms';

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { SelectModule } from 'primeng/select';
import { FloatLabel } from 'primeng/floatlabel';
import { DatePickerModule } from 'primeng/datepicker';

import { DateInputMaskDirective } from '../directives/date-input-mask.directive';

@Component({
  standalone: true,
  selector: 'cs-advanced-period-date-filter',
  imports: [FormsModule, SelectModule, FloatLabel, DatePickerModule, DateInputMaskDirective],
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  template: `
    <div [class]="periodColClass">
      <p-floatLabel variant="on" class="w-full">
        <p-select
          size="small"
          class="w-full"
          appendTo="body"
          [showClear]="true"
          [ngModel]="period"
          optionValue="value"
          optionLabel="label"
          [inputId]="periodInputId"
          [options]="periodOptions"
          [disabled]="disabledPeriod"
          (ngModelChange)="periodChange.emit($event ?? null)"
        ></p-select>

        <label [for]="periodInputId">{{ periodLabel }}</label>
      </p-floatLabel>
    </div>

    <div [class]="dateColClass">
      <p-floatLabel variant="on" class="w-full">
        <p-datepicker
          size="small"
          [view]="view"
          class="w-full"
          csDateInputMask
          appendTo="body"
          dataType="string"
          [showIcon]="true"
          [ngModel]="pickerValue"
          [disabled]="disabled"
          [readonlyInput]="selectionMode === 'range'"
          [inputId]="dateInputId"
          [dateFormat]="dateFormat"
          [selectionMode]="selectionMode"
          [csDateInputMaskFormat]="dateFormat"
          [csDateInputMaskRange]="selectionMode === 'range'"
          (ngModelChange)="valueChange.emit($event ?? null)"
        ></p-datepicker>

        <label [for]="dateInputId">{{ dateLabel }}</label>
      </p-floatLabel>
    </div>
  `,
})
export class CsAdvancedPeriodDateFilterComponent implements OnChanges {
  @Input() dateInputId = '';
  @Input() periodInputId = '';

  @Input() dateLabel = '';
  @Input() periodLabel = '';

  @Input() period: any | null = null;
  @Input() value: string | string[] | null = null;

  @Input() periodOptions: any[] = [];

  @Input() disabled = false;
  @Input() view: any = 'date';
  @Input() disabledPeriod = false;
  @Input() dateFormat = 'dd/mm/yy';
  @Input() selectionMode: any = 'single';

  @Input() colClass = 'col-12 md:col-2 p-1';

  private _dateColClass?: string;
  @Input() set dateColClass(v: string) { this._dateColClass = v; }
  get dateColClass(): string { return this._dateColClass ?? this.colClass; }

  private _periodColClass?: string;
  @Input() set periodColClass(v: string) { this._periodColClass = v; }
  get periodColClass(): string { return this._periodColClass ?? this.colClass; }

  @Output() periodChange = new EventEmitter<any | null>();
  @Output() valueChange = new EventEmitter<string | string[] | null>();

  /**
   * PrimeNG's DatePicker only parses a STRING value into a Date on write (dataType="string") —
   * for range selection the value is an array of strings, and its writeControlValue only checks
   * `typeof value === 'string'` (an array fails that check), so the array elements are never
   * converted. Any internal code path that later calls `.getFullYear()` on them (e.g. clicking
   * the header to jump into year-selection view) then throws "value.getFullYear is not a
   * function". Pre-parsing the range array ourselves keeps single-value binding (already handled
   * correctly by PrimeNG) untouched and only works around the array case.
   *
   * Computed in ngOnChanges (not a getter): a getter re-evaluated on every change-detection pass
   * would return a brand-new array/Date instances each time even when nothing actually changed,
   * which PrimeNG's own OnChanges sees as "a new value" on every single tick — each one
   * re-triggering writeControlValue (and its markForCheck), scheduling another change-detection
   * pass forever. That tight loop is what was freezing the whole tab (confirmed: page became
   * unresponsive even to devtools, the signature of a synchronous infinite loop, not just a
   * one-off crash).
   */
  protected pickerValue: string | Date[] | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['dateFormat']) {
      this.pickerValue = Array.isArray(this.value)
        ? (this.value.map((v) => (v ? this.parseDateByFormat(v, this.dateFormat) : null)) as Date[])
        : this.value;
    }
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
}
