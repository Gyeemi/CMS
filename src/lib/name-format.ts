export type NameParts = {
  firstName: string;
  middleName: string;
  lastName: string;
};

export function joinNameParts({ firstName, middleName, lastName }: NameParts): string {
  return [firstName, middleName, lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

export function splitFullName(fullName: string): NameParts {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: '', middleName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

export function getNamePartsFromMetadata(
  metadata: Record<string, unknown> | undefined,
  fullNameFallback: string,
): NameParts {
  const firstName = metadata?.first_name;
  const middleName = metadata?.middle_name;
  const lastName = metadata?.last_name;

  if (
    (typeof firstName === 'string' && firstName.trim()) ||
    (typeof lastName === 'string' && lastName.trim())
  ) {
    return {
      firstName: typeof firstName === 'string' ? firstName.trim() : '',
      middleName: typeof middleName === 'string' ? middleName.trim() : '',
      lastName: typeof lastName === 'string' ? lastName.trim() : '',
    };
  }

  return splitFullName(fullNameFallback);
}
