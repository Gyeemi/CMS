import { invoiceFromRow } from '@/lib/supabase/mappers';
import { supabase } from '@/lib/supabase';
import { generateInvoiceNumber } from '@/types/invoice';
import type { Invoice } from '@/types/invoice';
import type { Project } from '@/types/project';

export async function saveInvoiceForProjectSupabase(project: Project): Promise<Invoice> {
  const existing = await getInvoiceByProjectIdSupabase(project.id);
  if (existing) return existing;

  const row = {
    project_id: project.id,
    invoice_number: generateInvoiceNumber(project),
  };

  const { data, error } = await supabase.from('invoices').insert(row).select('*').single();
  if (error) throw error;
  return invoiceFromRow(data);
}

export async function getInvoiceByProjectIdSupabase(projectId: string): Promise<Invoice | undefined> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  return data ? invoiceFromRow(data) : undefined;
}

export async function deleteInvoiceForProjectSupabase(projectId: string) {
  const { error } = await supabase.from('invoices').delete().eq('project_id', projectId);
  if (error) throw error;
}
