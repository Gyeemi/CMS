import { clientNamesMatch } from '@/lib/client-name-match';
import { normalizeBhutanPhoneDigits } from '@/lib/phone-format';
import { fetchRegisteredClients } from '@/lib/supabase/profiles';
import {
  fetchWalkInClientExclusions,
  fetchWalkInClientsDirectory,
  type WalkInClientRow,
} from '@/lib/supabase/walk-in-clients-directory';
import { supabase } from '@/lib/supabase';

export const WALK_IN_CUSTOMER_LABEL = 'Walk-In Customer';
export const MANUAL_CLIENT_PICKER_ID = '__manual_client__';

export function formatManageClientPickerLabel(client: ManageClientRow) {
  const type = client.source === 'account' ? 'Account' : 'Walk-In';
  const phone = client.phone?.trim();
  if (phone) {
    return `${client.fullName} · ${type} · ${phone}`;
  }
  return `${client.fullName} · ${type}`;
}

export type ManageClientRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  source: 'account' | 'project';
};

export function canDeleteManageClient(client: ManageClientRow) {
  return client.source === 'project';
}

type ProjectClientRow = {
  id: string;
  artist_name: string;
  artist_phone: string | null;
  created_at: string;
  booking_id: string | null;
};

type BookingClientRow = {
  id: string;
  client_id: string;
  client_email: string;
  client_name: string;
};

function walkInDedupeKey(fullName: string, phone: string, email: string) {
  const phoneDigits = normalizeBhutanPhoneDigits(phone);
  if (phoneDigits.length === 8) return `phone:${phoneDigits}`;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail) return `email:${normalizedEmail}`;
  return `name:${fullName.trim().toLowerCase()}`;
}

type RegisteredProfile = Awaited<ReturnType<typeof fetchRegisteredClients>>[number];

function isRegisteredWalkIn(
  fullName: string,
  phone: string,
  email: string,
  registered: RegisteredProfile[],
) {
  const phoneDigits = normalizeBhutanPhoneDigits(phone);
  const normalizedEmail = email.trim().toLowerCase();

  const nameMatches = registered.filter((profile) =>
    clientNamesMatch(fullName, profile.full_name ?? ''),
  );

  for (const profile of nameMatches) {
    const profileEmail = (profile.email ?? '').trim().toLowerCase();
    if (normalizedEmail && profileEmail && normalizedEmail === profileEmail) {
      return true;
    }

    const profilePhone = normalizeBhutanPhoneDigits(profile.phone ?? '');
    const phoneMatch =
      phoneDigits.length === 8 && profilePhone.length === 8 && phoneDigits === profilePhone;
    if (phoneMatch) {
      return true;
    }
  }

  if (nameMatches.length !== 1) {
    return false;
  }

  const onlyMatch = nameMatches[0];
  const onlyEmail = (onlyMatch.email ?? '').trim().toLowerCase();
  if (normalizedEmail && onlyEmail && normalizedEmail !== onlyEmail) {
    return false;
  }

  if (phoneDigits.length === 8) {
    const phoneOwnedByOther = registered.some((profile) => {
      if (profile.id === onlyMatch.id) return false;
      return normalizeBhutanPhoneDigits(profile.phone ?? '') === phoneDigits;
    });
    if (phoneOwnedByOther) {
      return false;
    }
  }

  return true;
}

type StaffProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
};

function matchesStudioStaff(
  fullName: string,
  phone: string,
  email: string,
  staffProfiles: StaffProfileRow[],
) {
  const normalizedEmail = email.trim().toLowerCase();
  const phoneDigits = normalizeBhutanPhoneDigits(phone);

  return staffProfiles.some((staff) => {
    const staffEmail = (staff.email ?? '').trim().toLowerCase();
    if (normalizedEmail && staffEmail && normalizedEmail === staffEmail) {
      return true;
    }

    const staffPhone = normalizeBhutanPhoneDigits(staff.phone ?? '');
    const staffName = staff.full_name?.trim() ?? '';
    if (
      staffName &&
      phoneDigits.length === 8 &&
      staffPhone.length === 8 &&
      phoneDigits === staffPhone &&
      clientNamesMatch(fullName, staffName)
    ) {
      return true;
    }

    return false;
  });
}

function mapWalkInDirectoryRow(row: WalkInClientRow): ManageClientRow {
  return {
    id: `walkin:${row.id}`,
    fullName: row.full_name?.trim() ?? '',
    email: row.email?.trim() ?? '',
    phone: row.phone?.trim() ?? '',
    createdAt: row.created_at,
    source: 'project',
  };
}

export async function fetchManageClients(): Promise<ManageClientRow[]> {
  const [registered, staffResult, exclusionsResult, directoryResult, projectsResult] =
    await Promise.all([
      fetchRegisteredClients(),
      supabase
        .from('profiles')
        .select('id, email, phone, full_name')
        .in('role', ['super_admin', 'admin', 'manager']),
      fetchWalkInClientExclusions().catch(() => new Set<string>()),
      fetchWalkInClientsDirectory().catch(() => [] as WalkInClientRow[]),
      supabase
        .from('projects')
        .select('id, artist_name, artist_phone, created_at, booking_id')
        .order('created_at', { ascending: false }),
    ]);

  const staffProfiles = (staffResult.data ?? []) as StaffProfileRow[];

  const rows: ManageClientRow[] = registered
    .filter(
      (profile) =>
        !matchesStudioStaff(
          profile.full_name ?? '',
          profile.phone ?? '',
          profile.email ?? '',
          staffProfiles,
        ),
    )
    .map((profile) => ({
    id: profile.id,
    fullName: profile.full_name?.trim() ?? '',
    email: profile.email?.trim() ?? '',
    phone: profile.phone?.trim() ?? '',
    createdAt: profile.created_at,
    source: 'account',
  }));

  const knownEmails = new Set(
    registered.map((profile) => (profile.email ?? '').trim().toLowerCase()).filter(Boolean),
  );
  const knownKeys = new Set<string>();

  const exclusions = exclusionsResult;
  const directoryWalkIns = directoryResult;

  if (projectsResult.error) throw projectsResult.error;

  for (const walkIn of directoryWalkIns) {
    const fullName = walkIn.full_name?.trim() ?? '';
    if (!fullName) continue;

    const email = walkIn.email?.trim() ?? '';
    if (matchesStudioStaff(fullName, walkIn.phone ?? '', email, staffProfiles)) continue;
    if (email && knownEmails.has(email.toLowerCase())) continue;
    if (isRegisteredWalkIn(fullName, walkIn.phone ?? '', email, registered)) continue;

    const key = walkInDedupeKey(fullName, walkIn.phone ?? '', email);
    if (exclusions.has(key)) continue;
    if (knownKeys.has(key)) continue;
    knownKeys.add(key);

    rows.push(mapWalkInDirectoryRow(walkIn));
  }

  // Fallback: projects not yet in directory (before migration backfill).
  const projectRows = (projectsResult.data ?? []) as ProjectClientRow[];
  const bookingIds = [
    ...new Set(projectRows.map((row) => row.booking_id).filter((id): id is string => Boolean(id))),
  ];

  let bookingsById = new Map<string, BookingClientRow>();
  if (bookingIds.length > 0) {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, client_id, client_email, client_name')
      .in('id', bookingIds);

    if (bookingsError) throw bookingsError;
    bookingsById = new Map((bookings ?? []).map((booking) => [booking.id, booking as BookingClientRow]));
  }

  const knownProfileIds = new Set(registered.map((profile) => profile.id));

  for (const project of projectRows) {
    const name = (project.artist_name ?? '').trim();
    if (!name) continue;

    const booking = project.booking_id ? bookingsById.get(project.booking_id) : undefined;
    if (booking?.client_id && knownProfileIds.has(booking.client_id)) continue;

    const phone = project.artist_phone?.trim() ?? '';
    const email = booking?.client_email?.trim() ?? '';

    if (matchesStudioStaff(name, phone, email, staffProfiles)) continue;
    if (email && knownEmails.has(email)) continue;
    if (isRegisteredWalkIn(name, phone, email, registered)) continue;

    const key = walkInDedupeKey(name, phone, email);
    if (exclusions.has(key)) continue;
    if (knownKeys.has(key)) continue;
    knownKeys.add(key);

    rows.push({
      id: `project:${project.id}`,
      fullName: name,
      email,
      phone,
      createdAt: project.created_at,
      source: 'project',
    });
  }

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
