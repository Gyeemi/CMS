import {
  deleteInvoiceForProjectSupabase,
  getInvoiceByProjectIdSupabase,
  saveInvoiceForProjectSupabase,
} from '@/lib/supabase/invoices';
import type { Invoice } from '@/types/invoice';
import type { Project } from '@/types/project';

export async function saveInvoiceForProject(project: Project): Promise<Invoice> {
  return saveInvoiceForProjectSupabase(project);
}

export async function getInvoiceByProjectId(projectId: string): Promise<Invoice | undefined> {
  return getInvoiceByProjectIdSupabase(projectId);
}

export async function deleteInvoiceForProject(projectId: string): Promise<void> {
  await deleteInvoiceForProjectSupabase(projectId);
}
