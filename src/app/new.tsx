import { router, Stack } from 'expo-router';

import { ProjectForm } from '@/components/project-form';
import { useProjects } from '@/context/projects-context';
import { saveInvoiceForProject } from '@/lib/invoice-storage';
import { tryLinkProjectToRegisteredClient } from '@/lib/supabase/link-project-client';

export default function NewProjectScreen() {
  const { addProject } = useProjects();

  return (
    <>
      <Stack.Screen options={{ title: 'New Project' }} />
      <ProjectForm
        submitLabel="Add Record"
        onSubmit={async (data, meta) => {
          const project = await addProject(data);
          await tryLinkProjectToRegisteredClient(project.id, meta?.linkedClientProfileId);
          await saveInvoiceForProject(project);
          if (router.canDismiss()) {
            router.dismiss();
          }
          router.push(`/invoice/${project.id}`);
        }}
      />
    </>
  );
}
