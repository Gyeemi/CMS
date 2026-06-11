/**
 * Creates (or resets) the admin user with a confirmed email.
 *
 * Usage:
 *   1. Supabase Dashboard → Project Settings → API → copy "service_role" key
 *   2. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 *   3. Run: npm run create-admin
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ADMIN_EMAIL = 'admin@groovx.com';
const ADMIN_PASSWORD = 'groovx';

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.\n' +
      'Add your service_role key from Supabase Dashboard → Project Settings → API.',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAdminUser() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL) ?? null;
}

async function main() {
  const existing = await findAdminUser();

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: existing.user_metadata?.full_name ?? 'Admin',
      },
    });
    if (error) throw error;
    console.log(`Updated admin user: ${ADMIN_EMAIL}`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Admin' },
  });
  if (error) throw error;
  console.log(`Created admin user: ${ADMIN_EMAIL}`);
}

main()
  .then(() => {
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('The handle_new_user trigger should assign role = super_admin automatically.');
  })
  .catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
