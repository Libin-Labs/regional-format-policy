# @lp-labs/regional-format-policy

Explicit locale and time-zone formatting policies for numbers, currencies, dates, and date-times.
The package never chooses a locale or time zone from the host environment and rejects an
unsupported locale rather than silently switching to a fallback.

```js
import { createRegionalFormatPolicy } from '@lp-labs/regional-format-policy';

const format = createRegionalFormatPolicy({
  locale: 'en-GB',
  timeZone: 'Europe/London',
  currency: 'GBP',
});
console.log(format.formatCurrency(1250.5));
console.log(format.formatDateTime('2026-11-05T12:00:00Z', 'short'));
```

## Install

```sh
npm install @lp-labs/regional-format-policy
```

## API

- `createRegionalFormatPolicy(options: RegionalFormatPolicyOptions): RegionalFormatPolicy`
- `RegionalFormatPolicyOptions`: required `locale` (BCP 47) and `timeZone` (Intl time-zone ID);
  optional `numberingSystem`, `calendar`, `currency` (uppercase ISO 4217), `useGrouping`, and
  `maximumFractionDigits` (0–20).
- `RegionalFormatPolicy`: readonly canonical `locale` and resolved `timeZone`, plus
  `formatNumber(value)`, `formatCurrency(value, currency?)`, `formatDate(value, style?)`, and
  `formatDateTime(value, style?)`. Date styles are `full`, `long`, `medium`, or `short`; the
  default is `medium`. A currency must be supplied per call or in the policy.
- `value` for date methods is a valid `Date`, safe-integer epoch milliseconds, or an ISO timestamp
  with `Z` or an explicit numeric offset. Date-only and local-time strings are rejected.

All types are exported from the package root. The implementation uses the Node.js `Intl`
internationalization data; supported locale coverage depends on the Node build. Locale negotiation
must resolve to the requested canonical locale, and unsupported locales or time zones throw rather
than falling back. Currency codes must also occur in the runtime's supported currency list;
unsupported codes, numbering systems, calendars, or styles throw instead of being silently
substituted. Invalid shapes/types throw `TypeError`; out-of-range options or invalid
locale/time-zone/date values throw `RangeError`.

## Customization and limits

Create one policy per locale, time zone, currency, and display configuration. Override the currency
for an individual call when formatting a multi-currency report. Locale patterns and timezone
transitions follow the runtime's ICU data; this package does not provide a locale database, exchange
rates, or timezone rules of its own.

Package scripts: `npm run build`, `npm run typecheck`, `npm test`, `npm run format`, and
`npm run format:check`. Requires Node.js 18 or newer. There are no runtime or peer dependencies.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
