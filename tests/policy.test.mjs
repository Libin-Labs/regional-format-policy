import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegionalFormatPolicy } from '../dist/esm/index.js';

test('formats a number using only the explicitly selected locale', () => {
  const policy = createRegionalFormatPolicy({
    locale: 'de-DE',
    timeZone: 'Europe/Berlin',
  });
  assert.equal(policy.locale, 'de-DE');
  assert.equal(policy.formatNumber(1234.5), '1.234,5');
});

test('formats currency with configured currency and locale', () => {
  const policy = createRegionalFormatPolicy({
    locale: 'en-US',
    timeZone: 'America/New_York',
    currency: 'USD',
  });
  assert.equal(policy.formatCurrency(12), '$12.00');
});

test('requires a currency if no default was configured', () => {
  const policy = createRegionalFormatPolicy({
    locale: 'en-US',
    timeZone: 'UTC',
  });
  assert.throws(() => policy.formatCurrency(1), /currency/i);
  assert.match(policy.formatCurrency(1, 'EUR'), /€|EUR/);
});

test('formats the calendar day in the configured time zone', () => {
  const policy = createRegionalFormatPolicy({
    locale: 'en-US',
    timeZone: 'America/Los_Angeles',
  });
  assert.equal(policy.formatDate('2026-01-01T01:00:00Z'), 'Dec 31, 2025');
});

test('date-time formatting is deterministic for the selected zone and style', () => {
  const policy = createRegionalFormatPolicy({
    locale: 'en-GB',
    timeZone: 'Asia/Tokyo',
  });
  assert.match(policy.formatDateTime('2026-01-01T01:00:00Z', 'short'), /10:00/);
});

test('rejects missing, invalid, and unsupported locales rather than defaulting', () => {
  assert.throws(() => createRegionalFormatPolicy({ timeZone: 'UTC' }), TypeError);
  assert.throws(
    () => createRegionalFormatPolicy({ locale: 'not_a_locale', timeZone: 'UTC' }),
    RangeError,
  );
  assert.throws(
    () => createRegionalFormatPolicy({ locale: 'zz-ZZ', timeZone: 'UTC' }),
    /not supported without fallback/,
  );
  assert.throws(
    () => createRegionalFormatPolicy({ locale: 'en-XX', timeZone: 'UTC' }),
    /not supported without fallback/,
  );
});

test('rejects missing and invalid time zones', () => {
  assert.throws(() => createRegionalFormatPolicy({ locale: 'en-US' }), TypeError);
  assert.throws(
    () => createRegionalFormatPolicy({ locale: 'en-US', timeZone: 'Mars/Olympus' }),
    /Unsupported time zone/,
  );
});

test('rejects numbering systems and calendars that Intl would otherwise silently replace', () => {
  assert.throws(
    () =>
      createRegionalFormatPolicy({
        locale: 'en-US',
        timeZone: 'UTC',
        numberingSystem: 'notreal',
      }),
    /Numbering system is not supported without fallback/,
  );
  assert.throws(
    () =>
      createRegionalFormatPolicy({
        locale: 'en-US',
        timeZone: 'UTC',
        calendar: 'notreal',
      }),
    /Calendar is not supported without fallback/,
  );
});

test('rejects implicit local date strings and malformed instants', () => {
  const policy = createRegionalFormatPolicy({
    locale: 'en-US',
    timeZone: 'UTC',
  });
  assert.throws(() => policy.formatDate('2026-01-01'), /ISO strings with an offset/);
  assert.throws(() => policy.formatDate('2026-02-30T12:00:00Z'), /outside the supported range/);
  assert.throws(() => policy.formatDate(Number.NaN), /ISO strings with an offset/);
});

test('rejects non-finite amounts and invalid currency codes', () => {
  const policy = createRegionalFormatPolicy({
    locale: 'en-US',
    timeZone: 'UTC',
  });
  assert.throws(() => policy.formatNumber(Infinity), /finite/);
  assert.throws(() => policy.formatCurrency(1, 'usd'), /uppercase/);
  assert.throws(() => policy.formatCurrency(1, 'FOO'), /not supported/);
});

test('applies explicit number customization and bounds fraction digits', () => {
  const policy = createRegionalFormatPolicy({
    locale: 'en-US',
    timeZone: 'UTC',
    maximumFractionDigits: 0,
    useGrouping: false,
  });
  assert.equal(policy.formatNumber(1234.5), '1235');
  assert.throws(
    () =>
      createRegionalFormatPolicy({
        locale: 'en-US',
        timeZone: 'UTC',
        maximumFractionDigits: 21,
      }),
    /0 to 20/,
  );
  const noDecimals = createRegionalFormatPolicy({
    locale: 'en-US',
    timeZone: 'UTC',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  assert.equal(noDecimals.formatCurrency(12.5), '$13');
});

test('rejects unknown, accessor, and inherited configuration properties', () => {
  const withUnknown = { locale: 'en-US', timeZone: 'UTC', fallback: 'en' };
  assert.throws(() => createRegionalFormatPolicy(withUnknown), /unsupported/);
  const withGetter = { locale: 'en-US', timeZone: 'UTC' };
  Object.defineProperty(withGetter, 'currency', {
    enumerable: true,
    get: () => 'USD',
  });
  assert.throws(() => createRegionalFormatPolicy(withGetter), /non-data/);
  assert.throws(
    () =>
      createRegionalFormatPolicy(
        Object.assign(Object.create({ locale: 'en-US' }), { timeZone: 'UTC' }),
      ),
    /plain object/,
  );
});
