import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_STUDIO_COMPANY_DETAILS,
  setStudioCompanyDetails,
  type StudioCompanyDetails,
} from '@/constants/studio-company';
import { useAuth } from '@/context/auth-context';
import { isStudioRole } from '@/lib/roles';
import { loadStudioSettings, saveStudioSettings } from '@/lib/supabase/studio-settings';

type StudioSettingsContextValue = {
  details: StudioCompanyDetails;
  isLoading: boolean;
  updateDetails: (details: StudioCompanyDetails) => Promise<void>;
};

const StudioSettingsContext = createContext<StudioSettingsContextValue | null>(null);

export function StudioSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [details, setDetails] = useState<StudioCompanyDetails>(DEFAULT_STUDIO_COMPANY_DETAILS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isStudioRole(user?.role)) {
      setDetails(DEFAULT_STUDIO_COMPANY_DETAILS);
      setStudioCompanyDetails(DEFAULT_STUDIO_COMPANY_DETAILS);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void loadStudioSettings()
      .then((loaded) => {
        if (cancelled) return;
        setDetails(loaded);
        setStudioCompanyDetails(loaded);
      })
      .catch(() => {
        if (cancelled) return;
        setDetails(DEFAULT_STUDIO_COMPANY_DETAILS);
        setStudioCompanyDetails(DEFAULT_STUDIO_COMPANY_DETAILS);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.id]);

  const updateDetails = useCallback(async (next: StudioCompanyDetails) => {
    const saved = await saveStudioSettings(next);
    setDetails(saved);
    setStudioCompanyDetails(saved);
  }, []);

  const value = useMemo(
    () => ({ details, isLoading, updateDetails }),
    [details, isLoading, updateDetails],
  );

  return (
    <StudioSettingsContext.Provider value={value}>{children}</StudioSettingsContext.Provider>
  );
}

export function useStudioSettings() {
  const ctx = useContext(StudioSettingsContext);
  if (!ctx) throw new Error('useStudioSettings must be used within StudioSettingsProvider');
  return ctx;
}
