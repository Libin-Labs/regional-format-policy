import {
  createRegionalFormatPolicy,
  type RegionalFormatPolicy,
} from '@lp-labs/regional-format-policy';
const policy: RegionalFormatPolicy = createRegionalFormatPolicy({
  locale: 'fr-FR',
  timeZone: 'UTC',
});
const formatted: string = policy.formatNumber(1.5);
void formatted;
