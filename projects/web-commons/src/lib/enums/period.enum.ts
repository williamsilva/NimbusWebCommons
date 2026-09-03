import { CsTagTone } from '../ui/tag-tone.type';
import type { I18nLike } from '../i18n/i18n-like';

export enum PeriodEnum {
  NULL = 'NULL',
  DAY = 'DAY',
  END = 'END',
  YEAR = 'YEAR',
  MONTH = 'MONTH',
  START = 'START',
  INTERVAL = 'INTERVAL',
}

export type PeriodInput = PeriodEnum | string | number | null | undefined;

export const STATUS_CODE_MAP: Record<number, PeriodEnum> = {
  0: PeriodEnum.NULL,
  1: PeriodEnum.DAY,
  2: PeriodEnum.END,
  3: PeriodEnum.YEAR,
  4: PeriodEnum.MONTH,
  5: PeriodEnum.START,
  6: PeriodEnum.INTERVAL,
};

export function normalizePeriodEnum(status: PeriodInput): PeriodEnum | null {
  if (status == null) return null;

  if (typeof status === 'number') {
    return STATUS_CODE_MAP[status] ?? null;
  }

  const normalized = String(status).trim().toUpperCase();

  switch (normalized) {
    case PeriodEnum.NULL:
      return PeriodEnum.NULL;
    case PeriodEnum.DAY:
      return PeriodEnum.DAY;
    case PeriodEnum.END:
      return PeriodEnum.END;
    case PeriodEnum.YEAR:
      return PeriodEnum.YEAR;
    case PeriodEnum.MONTH:
      return PeriodEnum.MONTH;
    case PeriodEnum.START:
      return PeriodEnum.START;
    case PeriodEnum.INTERVAL:
      return PeriodEnum.INTERVAL;

    default:
      return null;
  }
}

export function periodEnumSeverity(status: PeriodInput): CsTagTone {
  switch (normalizePeriodEnum(status)) {
    case PeriodEnum.DAY:
      return 'success';

    case PeriodEnum.START:
      return 'warn';

    case PeriodEnum.END:
      return 'danger';

    case PeriodEnum.NULL:
    default:
      return 'contrast';
  }
}

export function periodEnumLabel(status: PeriodInput, i18n: I18nLike): string {
  switch (normalizePeriodEnum(status)) {
    case PeriodEnum.DAY:
      return i18n.tUi('enum.periodEnum.day');

    case PeriodEnum.END:
      return i18n.tUi('enum.periodEnum.end');

    case PeriodEnum.YEAR:
      return i18n.tUi('enum.periodEnum.year');

    case PeriodEnum.START:
      return i18n.tUi('enum.periodEnum.start');

    case PeriodEnum.MONTH:
      return i18n.tUi('enum.periodEnum.month');

    case PeriodEnum.INTERVAL:
      return i18n.tUi('enum.periodEnum.interval');

    case PeriodEnum.NULL:
      return i18n.tUi('enum.periodEnum.null', 'N/A');

    default:
      return i18n.tUi('enum.periodEnum.unknown', 'Desconhecido');
  }
}

export function allPeriodEnum(): PeriodEnum[] {
  return [
    PeriodEnum.DAY,
    PeriodEnum.MONTH,
    PeriodEnum.YEAR,
    PeriodEnum.START,
    PeriodEnum.END,
    PeriodEnum.INTERVAL,
  ];
}
