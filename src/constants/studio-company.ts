export type StudioCompanyDetails = {
  licenceNo: string;
  tpnNo: string;
  contactNo: string;
  location: string;
};

export const DEFAULT_STUDIO_COMPANY_DETAILS: StudioCompanyDetails = {
  licenceNo: 'XXXX',
  tpnNo: 'XXXX',
  contactNo: '+975 176 06 130',
  location: 'Toribari (Pekherzing), Phuentsholing, Chukha 21101',
};

let activeStudioCompanyDetails: StudioCompanyDetails = { ...DEFAULT_STUDIO_COMPANY_DETAILS };

export function setStudioCompanyDetails(details: StudioCompanyDetails) {
  activeStudioCompanyDetails = { ...details };
}

export function getStudioCompanyDetails(): StudioCompanyDetails {
  return activeStudioCompanyDetails;
}

export function getStudioCompanyDetailLines(details = getStudioCompanyDetails()): string[] {
  const line = (label: string, value: string) => `${label}: ${value.trim() || '—'}`;

  return [
    line('Licence No.', details.licenceNo),
    line('TPN No.', details.tpnNo),
    line('Contact No.', details.contactNo),
    line('Location', details.location),
  ];
}
