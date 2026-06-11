export type UserRole = 'super_admin' | 'admin' | 'manager' | 'client';

export type StaffInviteRole = 'admin' | 'manager';

export type BookingStatus =
  | 'pending'
  | 'awaiting_advance'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
};

export type BookingRow = {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  artist_name: string;
  project_type: string;
  project_category: string;
  preferred_date: string;
  proposed_date: string | null;
  proposed_date_status: 'pending' | 'accepted' | 'rejected' | null;
  notes: string;
  status: BookingStatus;
  project_name: string | null;
  producer_name: string | null;
  project_details_submitted_at: string | null;
  project_amount: number | null;
  required_advance: number | null;
  advance_paid: number | null;
  project_id: string | null;
  payment_screenshot_url: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  studio_registered_at: string | null;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  project_name: string;
  artist_name: string;
  artist_phone: string;
  producer: string;
  project_type: string;
  project_category: string;
  project_amount: number;
  audio_amount: number | null;
  video_amount: number | null;
  advance_payment: number;
  discount: number;
  gst_enabled: boolean;
  audio_copyright: string;
  balance_payment_method: string | null;
  balance_payment_platform: string | null;
  balance_payment_ref: string | null;
  balance_paid_amount: number | null;
  balance_paid_at: string | null;
  studio_notes: string;
  production_status?:
    | 'project_registered'
    | 'under_production'
    | 'post_production'
    | 'production_completed'
    | null;
  production_status_updated_at?: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  project_id: string;
  invoice_number: string;
  created_at: string;
};

export type StudioPaymentAccountRow = {
  id: string;
  account_holder: string;
  account_name: string;
  bank_name: string;
  branch: string;
  account_number: string;
  created_at: string;
};

export type OfficeExpenseDbRow = {
  id: string;
  category_group: string;
  category_item: string;
  amount: number;
  expense_date: string;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        {
          id: string;
          email: string;
          full_name?: string;
          phone?: string;
          role?: UserRole;
          created_at?: string;
        },
        Partial<Omit<ProfileRow, 'id' | 'created_at'>>
      >;
      bookings: TableDef<
        BookingRow,
        Omit<BookingRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<Omit<BookingRow, 'id' | 'created_at'>>
      >;
      projects: TableDef<
        ProjectRow,
        Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<ProjectRow, 'id' | 'created_at'>>
      >;
      invoices: TableDef<
        InvoiceRow,
        Omit<InvoiceRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<Omit<InvoiceRow, 'id' | 'created_at'>>
      >;
      pending_managers: TableDef<
        {
          email: string;
          full_name: string;
          phone: string;
          created_by: string;
          created_at: string;
        },
        {
          email: string;
          full_name?: string;
          phone?: string;
          created_by: string;
          created_at?: string;
        },
        Partial<{
          full_name: string;
          phone: string;
        }>
      >;
      studio_payment_accounts: TableDef<
        StudioPaymentAccountRow,
        Omit<StudioPaymentAccountRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<Omit<StudioPaymentAccountRow, 'id' | 'created_at'>>
      >;
      office_expenses: TableDef<
        OfficeExpenseDbRow,
        Omit<OfficeExpenseDbRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<OfficeExpenseDbRow, 'id' | 'created_at'>>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      remove_manager: {
        Args: { target_id: string };
        Returns: undefined;
      };
      change_manager_password: {
        Args: { target_id: string; new_password: string };
        Returns: undefined;
      };
      update_manager_name: {
        Args: { target_id: string; new_full_name: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
