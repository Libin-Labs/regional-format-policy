export interface RegionalFormatPolicyOptions {
  locale: string;
  timeZone: string;
  numberingSystem?: string;
  calendar?: string;
  currency?: string;
  useGrouping?: boolean;
  maximumFractionDigits?: number;
}

export interface RegionalFormatPolicy {
  readonly locale: string;
  readonly timeZone: string;
  formatNumber(value: number): string;
  formatCurrency(value: number, currency?: string): string;
  formatDate(value: Date | number | string, style?: 'full' | 'long' | 'medium' | 'short'): string;
  formatDateTime(
    value: Date | number | string,
    style?: 'full' | 'long' | 'medium' | 'short',
  ): string;
}

function plainOptions(value: unknown): asserts value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError('Options must be a plain object.');
  }
}

function ownDataOptions(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  plainOptions(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor =
      typeof key === 'string' ? Object.getOwnPropertyDescriptor(value, key) : undefined;
    if (
      typeof key !== 'string' ||
      !allowed.includes(key) ||
      !descriptor?.enumerable ||
      !('value' in descriptor)
    ) {
      throw new TypeError('Options contain an unsupported or non-data property.');
    }
  }
  return value;
}

function explicitLocale(value: unknown): string {
  if (typeof value !== 'string' || value.length < 2 || value.length > 128) {
    throw new TypeError('locale must be an explicit BCP 47 locale string.');
  }
  let canonical: string | undefined;
  try {
    canonical = Intl.getCanonicalLocales(value)[0];
  } catch {
    throw new RangeError(`Invalid locale: ${value}`);
  }
  if (!canonical) throw new RangeError(`Invalid locale: ${value}`);
  const supported = Intl.NumberFormat.supportedLocalesOf([canonical], {
    localeMatcher: 'lookup',
  });
  const resolved = new Intl.NumberFormat(canonical).resolvedOptions().locale;
  if (supported.length !== 1 || supported[0] !== canonical || resolved !== canonical) {
    throw new RangeError(`Locale is not supported without fallback: ${canonical}`);
  }
  return canonical;
}

function explicitTimeZone(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128) {
    throw new TypeError('timeZone must be an explicit IANA time-zone identifier.');
  }
  try {
    return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    throw new RangeError(`Unsupported time zone: ${value}`);
  }
}

function instant(value: Date | number | string): Date {
  let date: Date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === 'number' && Number.isSafeInteger(value)) {
    date = new Date(value);
  } else if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    date = new Date(value);
    const components = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(value);
    if (components) {
      const [, year, month, day, hour, minute, second] = components;
      const calendarDate = new Date(0);
      calendarDate.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
      calendarDate.setUTCHours(Number(hour), Number(minute), Number(second), 0);
      if (
        calendarDate.getUTCFullYear() !== Number(year) ||
        calendarDate.getUTCMonth() !== Number(month) - 1 ||
        calendarDate.getUTCDate() !== Number(day) ||
        Number(hour) > 23 ||
        Number(minute) > 59 ||
        Number(second) > 59
      ) {
        throw new RangeError('Date input is outside the supported range.');
      }
    }
  } else {
    throw new TypeError(
      'Date inputs must be valid Date values, epoch milliseconds, or ISO strings with an offset.',
    );
  }
  if (!Number.isFinite(date.getTime()))
    throw new RangeError('Date input is outside the supported range.');
  return date;
}

function currencyCode(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
    throw new TypeError('Currency must be an explicit uppercase three-letter ISO 4217 code.');
  }
  return value;
}

export function createRegionalFormatPolicy(
  input: RegionalFormatPolicyOptions,
): RegionalFormatPolicy {
  const options = ownDataOptions(input, [
    'locale',
    'timeZone',
    'numberingSystem',
    'calendar',
    'currency',
    'useGrouping',
    'maximumFractionDigits',
  ]);
  const locale = explicitLocale(options.locale);
  const timeZone = explicitTimeZone(options.timeZone);
  for (const key of ['numberingSystem', 'calendar'] as const) {
    const value = options[key];
    if (value !== undefined && (typeof value !== 'string' || !/^[A-Za-z0-9-]{3,32}$/.test(value))) {
      throw new TypeError(`${key} must be an explicit short identifier.`);
    }
  }
  const numberingSystem = options.numberingSystem as string | undefined;
  const calendar = options.calendar as string | undefined;
  if (
    numberingSystem !== undefined &&
    (!Intl.supportedValuesOf('numberingSystem').includes(numberingSystem) ||
      new Intl.NumberFormat(locale, { numberingSystem }).resolvedOptions().numberingSystem !==
        numberingSystem)
  ) {
    throw new RangeError(`Numbering system is not supported without fallback: ${numberingSystem}`);
  }
  if (
    calendar !== undefined &&
    (!Intl.supportedValuesOf('calendar').includes(calendar) ||
      new Intl.DateTimeFormat(locale, { timeZone, calendar }).resolvedOptions().calendar !==
        calendar)
  ) {
    throw new RangeError(`Calendar is not supported without fallback: ${calendar}`);
  }
  if (options.useGrouping !== undefined && typeof options.useGrouping !== 'boolean') {
    throw new TypeError('useGrouping must be boolean.');
  }
  if (
    options.maximumFractionDigits !== undefined &&
    (typeof options.maximumFractionDigits !== 'number' ||
      !Number.isInteger(options.maximumFractionDigits) ||
      options.maximumFractionDigits < 0 ||
      options.maximumFractionDigits > 20)
  ) {
    throw new RangeError('maximumFractionDigits must be an integer from 0 to 20.');
  }
  const defaultCurrency =
    options.currency === undefined ? undefined : currencyCode(options.currency);
  const supportedCurrencies = new Set(Intl.supportedValuesOf('currency'));
  if (defaultCurrency !== undefined && !supportedCurrencies.has(defaultCurrency)) {
    throw new RangeError(`Currency is not supported by this runtime: ${defaultCurrency}`);
  }
  const numberLocaleOptions = { numberingSystem };
  const dateLocaleOptions = { calendar };
  const numberOptions = {
    ...numberLocaleOptions,
    useGrouping: options.useGrouping as boolean | undefined,
    maximumFractionDigits: options.maximumFractionDigits as number | undefined,
  };
  const numberFormatter = new Intl.NumberFormat(locale, numberOptions);
  const currencyFormatters = new Map<string, Intl.NumberFormat>();
  const dateFormatter = (dateStyle: 'full' | 'long' | 'medium' | 'short', dateTime = false) =>
    new Intl.DateTimeFormat(locale, {
      ...dateLocaleOptions,
      timeZone,
      ...(dateTime ? { dateStyle, timeStyle: dateStyle } : { dateStyle }),
    });

  return Object.freeze({
    locale,
    timeZone,
    formatNumber(value: number) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError('Number to format must be finite.');
      }
      return numberFormatter.format(value);
    },
    formatCurrency(value: number, currency?: string) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError('Amount to format must be finite.');
      }
      const code = currencyCode(currency ?? defaultCurrency);
      if (!supportedCurrencies.has(code)) {
        throw new RangeError(`Currency is not supported by this runtime: ${code}`);
      }
      let formatter = currencyFormatters.get(code);
      if (!formatter) {
        const maximumFractionDigits = options.maximumFractionDigits as number | undefined;
        const minimumFractionDigits =
          maximumFractionDigits === undefined
            ? undefined
            : Math.min(
                new Intl.NumberFormat(locale, {
                  ...numberLocaleOptions,
                  style: 'currency',
                  currency: code,
                }).resolvedOptions().minimumFractionDigits!,
                maximumFractionDigits,
              );
        formatter = new Intl.NumberFormat(locale, {
          ...numberLocaleOptions,
          style: 'currency',
          currency: code,
          minimumFractionDigits,
          maximumFractionDigits,
        });
        currencyFormatters.set(code, formatter);
      }
      return formatter.format(value);
    },
    formatDate(
      value: Date | number | string,
      style: 'full' | 'long' | 'medium' | 'short' = 'medium',
    ) {
      return dateFormatter(style).format(instant(value));
    },
    formatDateTime(
      value: Date | number | string,
      style: 'full' | 'long' | 'medium' | 'short' = 'medium',
    ) {
      return dateFormatter(style, true).format(instant(value));
    },
  });
}
