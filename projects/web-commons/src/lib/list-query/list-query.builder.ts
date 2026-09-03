import { ListQueryDto, TableQueryDto } from './list-query.types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function cleanValue(value: unknown): unknown | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim() ? value : undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    const cleanedArray = value.map((item) => cleanValue(item)).filter((item) => item !== undefined);

    return cleanedArray.length ? cleanedArray : undefined;
  }

  if (isPlainObject(value)) {
    const cleanedObject = Object.entries(value).reduce<Record<string, unknown>>(
      (acc, [key, item]) => {
        const cleanedItem = cleanValue(item);

        if (cleanedItem !== undefined) {
          acc[key] = cleanedItem;
        }

        return acc;
      },
      {},
    );

    return Object.keys(cleanedObject).length ? cleanedObject : undefined;
  }

  return value;
}

function cleanObject<T extends object>(value: T): Partial<T> {
  return (cleanValue(value) ?? {}) as Partial<T>;
}

export function buildListQuery<TAdvanced extends object>(
  table: TableQueryDto,
  advanced: Partial<TAdvanced> | undefined,
): ListQueryDto<TAdvanced> {
  const cleanedTable = cleanObject(table) as TableQueryDto;
  const cleanedAdvanced = advanced ? cleanObject(advanced) : undefined;

  return {
    ...cleanedTable,
    ...(cleanedAdvanced && Object.keys(cleanedAdvanced).length
      ? { advanced: cleanedAdvanced }
      : {}),
  };
}
