import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { isStudioRole } from '@/lib/roles';
import {
    deleteProjectRecord,
    insertProject,
    loadProjectsFromSupabase,
    recordProjectBalancePayment,
    updateProjectProductionStatus,
    updateProjectRecord,
    type RecordBalancePaymentInput,
    type RecordBalancePaymentResult,
} from '@/lib/supabase/projects';
import { syncProjectAdvancesFromBookings } from '@/lib/sync-project-advance';
import type { ProductionStatus, Project, ProjectFormData } from '@/types/project';

type ProjectsContextValue = {
  projects: Project[];
  isLoading: boolean;
  loadError: string | null;
  addProject: (data: ProjectFormData, bookingId?: string | null) => Promise<Project>;
  updateProject: (id: string, data: ProjectFormData) => Promise<void>;
  updateProductionStatus: (id: string, status: ProductionStatus) => Promise<Project>;
  recordBalancePayment: (
    id: string,
    payment: RecordBalancePaymentInput,
  ) => Promise<RecordBalancePaymentResult>;
  deleteProject: (id: string) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  refreshProjects: () => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoadError(null);
      return;
    }

    try {
      const data = await loadProjectsFromSupabase();
      const synced = await syncProjectAdvancesFromBookings(data, {
        persistUpdates: isStudioRole(user.role),
      });
      setProjects(synced.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setLoadError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load projects. Check your connection.';
      setLoadError(message);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setIsLoading(true);
    void refreshProjects().finally(() => setIsLoading(false));
  }, [refreshProjects, authLoading]);

  const addProject = useCallback(
    async (data: ProjectFormData, bookingId?: string | null) => {
      const project = await insertProject(data, bookingId);
      setProjects((prev) =>
        [project, ...prev.filter((item) => item.id !== project.id)].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      );
      void refreshProjects();
      return project;
    },
    [refreshProjects],
  );

  const updateProject = useCallback(
    async (id: string, data: ProjectFormData) => {
      await updateProjectRecord(id, data);
      await refreshProjects();
    },
    [refreshProjects],
  );

  const updateProductionStatus = useCallback(
    async (id: string, status: ProductionStatus) => {
      const project = await updateProjectProductionStatus(id, status);
      setProjects((prev) =>
        [project, ...prev.filter((item) => item.id !== project.id)].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      );
      void refreshProjects();
      return project;
    },
    [refreshProjects],
  );

  const recordBalancePayment = useCallback(
    async (id: string, payment: RecordBalancePaymentInput) => {
      const result = await recordProjectBalancePayment(id, payment);
      await refreshProjects();
      return result;
    },
    [refreshProjects],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      setProjects((prev) => prev.filter((project) => project.id !== id));
      try {
        await deleteProjectRecord(id);
        await refreshProjects();
      } catch (error) {
        await refreshProjects();
        throw error;
      }
    },
    [refreshProjects],
  );

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const value = useMemo(
    () => ({
      projects,
      isLoading,
      loadError,
      addProject,
      updateProject,
      updateProductionStatus,
      recordBalancePayment,
      deleteProject,
      getProject,
      refreshProjects,
    }),
    [
      projects,
      isLoading,
      loadError,
      addProject,
      updateProject,
      updateProductionStatus,
      recordBalancePayment,
      deleteProject,
      getProject,
      refreshProjects,
    ],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider');
  return ctx;
}
