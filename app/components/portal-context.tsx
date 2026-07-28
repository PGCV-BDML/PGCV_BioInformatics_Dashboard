"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, getRowsFromDB, supabase } from "@/lib/supabase";
import {
  canEnrollParticipants,
  getEffectiveRole,
  getHomePathForRole,
  isLearnerRole,
  isPathAllowedForRole,
  isStaffRole,
  readPortalPreview,
  writePortalPreview,
  type PortalPreviewMode,
} from "@/lib/portal";
import type { ProgramEnrollment, User, UserRole } from "@/types/database";

interface PortalContextValue {
  loading: boolean;
  profile: User | null;
  realRole: UserRole | null;
  effectiveRole: UserRole | null;
  enrollments: ProgramEnrollment[];
  previewMode: PortalPreviewMode;
  setPreviewMode: (mode: PortalPreviewMode) => void;
  isStaff: boolean;
  isLearnerView: boolean;
  canEnroll: boolean;
  refreshEnrollments: () => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [previewMode, setPreviewModeState] = useState<PortalPreviewMode>(null);

  const loadEnrollments = useCallback(async () => {
    try {
      const rows = await getRowsFromDB<ProgramEnrollment>("program_enrollment");
      setEnrollments(
        rows.filter(
          (row) => row.status === "enrolled" || row.status === "completed",
        ),
      );
    } catch (error) {
      console.error("Failed to load enrollments:", error);
      setEnrollments([]);
    }
  }, []);

  useEffect(() => {
    setPreviewModeState(readPortalPreview());

    const load = async () => {
      setLoading(true);
      try {
        const authUser = await getCurrentUser();
        if (!authUser?.id) {
          setProfile(null);
          setEnrollments([]);
          return;
        }

        const { data: userRow, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error("Failed to load user profile:", error);
          setProfile(null);
        } else {
          setProfile((userRow as User | null) ?? null);
        }

        await loadEnrollments();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [loadEnrollments]);

  const setPreviewMode = useCallback((mode: PortalPreviewMode) => {
    writePortalPreview(mode);
    setPreviewModeState(mode);
  }, []);

  const realRole = profile?.role ?? null;
  const effectiveRole = getEffectiveRole(realRole, previewMode);
  const isStaff = isStaffRole(realRole);
  const isLearnerView = isLearnerRole(effectiveRole);
  const canEnroll = canEnrollParticipants(realRole);

  useEffect(() => {
    if (loading) return;

    const home = getHomePathForRole(effectiveRole);
    if (!isPathAllowedForRole(pathname, effectiveRole)) {
      router.replace(home);
    }
  }, [loading, pathname, effectiveRole, router]);

  const value = useMemo<PortalContextValue>(
    () => ({
      loading,
      profile,
      realRole,
      effectiveRole,
      enrollments,
      previewMode,
      setPreviewMode,
      isStaff,
      isLearnerView,
      canEnroll,
      refreshEnrollments: loadEnrollments,
    }),
    [
      loading,
      profile,
      realRole,
      effectiveRole,
      enrollments,
      previewMode,
      setPreviewMode,
      isStaff,
      isLearnerView,
      canEnroll,
      loadEnrollments,
    ],
  );

  return (
    <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return ctx;
}
