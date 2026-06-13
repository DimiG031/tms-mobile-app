import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type MobileStatsContract = {
  type: string | null;
  endDate: string | null;
  daysLeft: number | null;
};

export type MobileStatsEmployee = {
  position: string | null;
  hireDate: string | null;
  yearsOfService: number | null;
  contract: MobileStatsContract | null;
};

export type MobileStatsLeave = {
  year: number | null;
  totalDays: number | null;
  carriedOver: number | null;
  usedDays: number | null;
  remainingDays: number | null;
};

export type MobileStatsDocuments = {
  licenseCategory: string | null;
  licenseValidTo: string | null;
  licenseDaysLeft: number | null;
  driverCardValid: string | null;
  driverCardDaysLeft: number | null;
  medicalValidTo: string | null;
  medicalDaysLeft: number | null;
};

export type MobileStatsDriving = {
  month: { tours: number; km: number } | null;
  total: { tours: number; km: number; completed: number } | null;
};

export type MobileStats = {
  employee: MobileStatsEmployee | null;
  leave: MobileStatsLeave | null;
  documents: MobileStatsDocuments | null;
  driving: MobileStatsDriving | null;
};

export function useMobileStats(enabled = true) {
  return useQuery({
    queryKey: ["mobile-stats"],
    queryFn: async () => {
      const result = await api.get<{ ok?: boolean; data?: MobileStats }>("/api/mobile/me/stats");
      return (result.data ?? null) as MobileStats | null;
    },
    enabled,
    staleTime: 5 * 60 * 1000
  });
}
