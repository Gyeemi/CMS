import { AdminPasswordConfirmModal } from '@/components/admin-password-confirm-modal';
import { ThemedText } from '@/components/themed-text';
import { getRoleLabel } from '@/lib/roles';
import type { ProfileRow } from '@/types/database';

type RemoveStaffModalProps = {
  visible: boolean;
  staff: ProfileRow | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function RemoveStaffModal({ visible, staff, onClose, onConfirm }: RemoveStaffModalProps) {
  const staffLabel = staff?.full_name?.trim() || staff?.email || 'this staff member';

  return (
    <AdminPasswordConfirmModal
      visible={visible}
      title="Remove Staff Member"
      confirmLabel="Remove Staff"
      submittingLabel="Removing…"
      confirmVariant="danger"
      onClose={onClose}
      onConfirm={onConfirm}
      description={
        <ThemedText type="small" themeColor="textSecondary">
          You are about to remove <ThemedText type="smallBold">{staffLabel}</ThemedText>
          {staff ? ` (${getRoleLabel(staff.role)})` : ''}. They will lose studio access immediately.
        </ThemedText>
      }
    />
  );
}
