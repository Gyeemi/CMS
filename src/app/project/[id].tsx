import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ProjectForm } from '@/components/project-form';
import { ThemedView } from '@/components/themed-view';
import { useBookings } from '@/context/bookings-context';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import { goBackOrReplace } from '@/lib/navigation';
import { tryLinkProjectToRegisteredClient } from '@/lib/supabase/link-project-client';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const theme = useTheme();
  const { getProject, updateProject, deleteProject, isLoading } = useProjects();
  const { bookings, refreshBookings } = useBookings();
  const projectId = Array.isArray(id) ? id[0] : id;
  const project = projectId ? getProject(projectId) : undefined;
  const linkedBooking = project
    ? bookings.find((booking) => booking.projectId === project.id)
    : undefined;
  const linkedClientPhone = linkedBooking?.clientPhone;
  const initialLinkedClientProfileId = linkedBooking?.clientId ?? null;

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: project.projectName || 'Edit Project' }} />
      <ProjectForm
        initialData={project}
        linkedClientPhone={linkedClientPhone}
        initialLinkedClientProfileId={initialLinkedClientProfileId}
        projectMeta={{
          id: project.id,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        }}
        submitLabel="Update Project"
        onSubmit={async (data, meta) => {
          await updateProject(project.id, data);
          await tryLinkProjectToRegisteredClient(project.id, meta?.linkedClientProfileId);
          await refreshBookings();
          goBackOrReplace('/(tabs)');
        }}
        onDelete={async () => {
          await deleteProject(project.id);
          await refreshBookings();
          router.replace('/(tabs)');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
