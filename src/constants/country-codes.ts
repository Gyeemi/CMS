export type CountryDialInfo = {
  iso2: string;
  name: string;
  dialCode: string;
  localMin: number;
  localMax: number;
  placeholder: string;
};

export const DEFAULT_COUNTRY_ISO2 = 'BT';

const OTHER_COUNTRIES: CountryDialInfo[] = [
  { iso2: 'AU', name: 'Australia', dialCode: '61', localMin: 9, localMax: 9, placeholder: 'XXX XXX XXX' },
  { iso2: 'BD', name: 'Bangladesh', dialCode: '880', localMin: 10, localMax: 10, placeholder: 'XXXX XXXXXX' },
  { iso2: 'CA', name: 'Canada', dialCode: '1', localMin: 10, localMax: 10, placeholder: 'XXX XXX XXXX' },
  { iso2: 'CN', name: 'China', dialCode: '86', localMin: 11, localMax: 11, placeholder: 'XXX XXXX XXXX' },
  { iso2: 'FR', name: 'France', dialCode: '33', localMin: 9, localMax: 9, placeholder: 'X XX XX XX XX' },
  { iso2: 'DE', name: 'Germany', dialCode: '49', localMin: 10, localMax: 11, placeholder: 'XXX XXXXXXX' },
  { iso2: 'IN', name: 'India', dialCode: '91', localMin: 10, localMax: 10, placeholder: 'XXXXX XXXXX' },
  { iso2: 'JP', name: 'Japan', dialCode: '81', localMin: 10, localMax: 10, placeholder: 'XX XXXX XXXX' },
  { iso2: 'MY', name: 'Malaysia', dialCode: '60', localMin: 9, localMax: 10, placeholder: 'XX XXXX XXXX' },
  { iso2: 'NP', name: 'Nepal', dialCode: '977', localMin: 10, localMax: 10, placeholder: 'XXX XXX XXXX' },
  { iso2: 'PH', name: 'Philippines', dialCode: '63', localMin: 10, localMax: 10, placeholder: 'XXX XXX XXXX' },
  { iso2: 'SA', name: 'Saudi Arabia', dialCode: '966', localMin: 9, localMax: 9, placeholder: 'XX XXX XXXX' },
  { iso2: 'SG', name: 'Singapore', dialCode: '65', localMin: 8, localMax: 8, placeholder: 'XXXX XXXX' },
  { iso2: 'KR', name: 'South Korea', dialCode: '82', localMin: 9, localMax: 10, placeholder: 'XX XXXX XXXX' },
  { iso2: 'TH', name: 'Thailand', dialCode: '66', localMin: 9, localMax: 9, placeholder: 'XX XXX XXXX' },
  { iso2: 'AE', name: 'United Arab Emirates', dialCode: '971', localMin: 9, localMax: 9, placeholder: 'XX XXX XXXX' },
  { iso2: 'GB', name: 'United Kingdom', dialCode: '44', localMin: 10, localMax: 10, placeholder: 'XXXX XXX XXX' },
  { iso2: 'US', name: 'United States', dialCode: '1', localMin: 10, localMax: 10, placeholder: 'XXX XXX XXXX' },
].sort((a, b) => a.name.localeCompare(b.name));

const BHUTAN: CountryDialInfo = {
  iso2: 'BT',
  name: 'Bhutan',
  dialCode: '975',
  localMin: 8,
  localMax: 8,
  placeholder: 'XXX XX XXX',
};

/** Bhutan first (default), remaining countries A–Z. */
export const COUNTRY_DIAL_CODES: CountryDialInfo[] = [BHUTAN, ...OTHER_COUNTRIES];

export function findCountryByIso2(iso2: string): CountryDialInfo {
  return (
    COUNTRY_DIAL_CODES.find((country) => country.iso2 === iso2) ??
    COUNTRY_DIAL_CODES.find((country) => country.iso2 === DEFAULT_COUNTRY_ISO2)!
  );
}

export function findCountryByDialCode(dialCode: string): CountryDialInfo | undefined {
  const normalized = dialCode.replace(/\D/g, '');
  return [...COUNTRY_DIAL_CODES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => normalized.startsWith(country.dialCode));
}

export function countrySelectLabel(country: CountryDialInfo) {
  return `${country.name} (+${country.dialCode})`;
}
