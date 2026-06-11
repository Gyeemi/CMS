import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(
  join(root, 'supabase', 'migrations', '20250606200000_booking_date_proposal.sql'),
  'utf8',
);

console.log('Run this SQL in Supabase Dashboard -> SQL Editor:\n');
console.log(sql);
