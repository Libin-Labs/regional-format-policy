import {
  createRegionalFormatPolicy,
  type RegionalFormatPolicyOptions,
} from '@lp-labs/regional-format-policy';
const options: RegionalFormatPolicyOptions = {
  locale: 'en-GB',
  timeZone: 'Europe/London',
};
const policy = createRegionalFormatPolicy(options);
const formatted: string = policy.formatDateTime(0, 'short');
void formatted;
