import {
  DEFAULT_STUDIO_COMPANY_DETAILS,
  type StudioCompanyDetails,
} from '@/constants/studio-company';
import { supabase } from '@/lib/supabase';

type StudioSettingsRow = {
  licence_no: string;
  tpn_no: string;
  contact_no: string;
  location: string;
  updated_at: string;
};

function rowToDetails(row: StudioSettingsRow): StudioCompanyDetails {
  return {
    licenceNo: row.licence_no,
    tpnNo: row.tpn_no,
    contactNo: row.contact_no,
    location: row.location,
  };
}

export async function loadStudioSettings(): Promise<StudioCompanyDetails> {
  const { data, error } = await supabase
    .from('studio_settings')
    .select('licence_no, tpn_no, contact_no, location, updated_at')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ...DEFAULT_STUDIO_COMPANY_DETAILS };
  return rowToDetails(data);
}

export async function saveStudioSettings(details: StudioCompanyDetails): Promise<StudioCompanyDetails> {
  const { data, error } = await supabase
    .from('studio_settings')
    .update({
      licence_no: details.licenceNo.trim(),
      tpn_no: details.tpnNo.trim(),
      contact_no: details.contactNo.trim(),
      location: details.location.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')
    .select('licence_no, tpn_no, contact_no, location, updated_at')
    .single();

  if (error) throw error;
  return rowToDetails(data);
}
