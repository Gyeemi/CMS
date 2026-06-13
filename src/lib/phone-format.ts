import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_ISO2,
  findCountryByDialCode,
  findCountryByIso2,
  type CountryDialInfo,
} from '@/constants/country-codes';

const BHUTAN_PREFIX = '+975 ';

export type ParsedPhone = {
  country: CountryDialInfo;
  localDigits: string;
};

function formatBhutanLocalDigits(digits: string) {
  const trimmed = digits.slice(0, 8);
  let formatted = '';
  if (trimmed.length > 0) formatted += trimmed.slice(0, 3);
  if (trimmed.length > 3) formatted += ` ${trimmed.slice(3, 5)}`;
  if (trimmed.length > 5) formatted += ` ${trimmed.slice(5, 8)}`;
  return formatted;
}

function formatGroupedLocalDigits(digits: string, maxLength: number) {
  const trimmed = digits.slice(0, maxLength);
  const parts: string[] = [];
  for (let index = 0; index < trimmed.length; index += 3) {
    parts.push(trimmed.slice(index, index + 3));
  }
  return parts.join(' ');
}

export function formatLocalPhoneDigits(country: CountryDialInfo, localDigits: string) {
  if (country.iso2 === DEFAULT_COUNTRY_ISO2) {
    return formatBhutanLocalDigits(localDigits);
  }
  return formatGroupedLocalDigits(localDigits, country.localMax);
}

export function composePhoneNumber(country: CountryDialInfo, localDigits: string) {
  const formattedLocal = formatLocalPhoneDigits(country, localDigits);
  if (!formattedLocal) {
    return `+${country.dialCode}`;
  }
  return `+${country.dialCode} ${formattedLocal}`;
}

export function parsePhoneNumber(value: string | null | undefined): ParsedPhone {
  const input = (value ?? '').trim();
  const allDigits = input.replace(/\D/g, '');

  if (!allDigits) {
    return {
      country: findCountryByIso2(DEFAULT_COUNTRY_ISO2),
      localDigits: '',
    };
  }

  const matchedCountry = findCountryByDialCode(allDigits);
  if (matchedCountry) {
    return {
      country: matchedCountry,
      localDigits: allDigits.slice(matchedCountry.dialCode.length),
    };
  }

  if (allDigits.startsWith('975')) {
    return {
      country: findCountryByIso2(DEFAULT_COUNTRY_ISO2),
      localDigits: allDigits.slice(3),
    };
  }

  return {
    country: findCountryByIso2(DEFAULT_COUNTRY_ISO2),
    localDigits: allDigits,
  };
}

export function formatPhoneDisplay(value: string | null | undefined) {
  const input = value ?? '';
  if (!input.trim()) return '';

  const { country, localDigits } = parsePhoneNumber(input);
  return composePhoneNumber(country, localDigits);
}

export function formatBhutanPhone(value: string | null | undefined) {
  const input = value ?? '';
  if (!input.trim()) return BHUTAN_PREFIX;

  const { country, localDigits } = parsePhoneNumber(input);
  if (country.iso2 === DEFAULT_COUNTRY_ISO2) {
    return composePhoneNumber(country, localDigits);
  }

  return formatPhoneDisplay(input);
}

export function getDefaultPhoneValue() {
  return BHUTAN_PREFIX;
}

export function resolveArtistPhone(artistPhone: string, clientPhone?: string | null) {
  if (artistPhone.trim()) return formatPhoneDisplay(artistPhone);
  if (!clientPhone?.trim()) return '';
  return formatPhoneDisplay(clientPhone);
}

export function normalizeBhutanPhoneDigits(value: string | null | undefined) {
  const { country, localDigits } = parsePhoneNumber(value);
  if (country.dialCode === '975') {
    return localDigits;
  }

  const digits = (value ?? '').replace(/\D/g, '');
  return digits.startsWith('975') ? digits.slice(3) : digits;
}

export function isValidPhone(value: string) {
  const { country, localDigits } = parsePhoneNumber(value);
  if (!localDigits) return false;
  return localDigits.length >= country.localMin && localDigits.length <= country.localMax;
}

export function isValidBhutanPhone(value: string) {
  const { country, localDigits } = parsePhoneNumber(value);
  return country.dialCode === '975' && localDigits.length === 8;
}

export function getPhoneValidationError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Enter a phone number.';
  }

  const { country, localDigits } = parsePhoneNumber(trimmed);
  if (!localDigits) {
    return 'Enter a phone number.';
  }

  if (localDigits.length < country.localMin || localDigits.length > country.localMax) {
    if (country.iso2 === DEFAULT_COUNTRY_ISO2) {
      return 'Enter a valid Bhutan number (+975 XXX XX XXX).';
    }
    return `Enter a valid ${country.name} number (+${country.dialCode} ${country.placeholder}).`;
  }

  return null;
}

export { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_ISO2 };
