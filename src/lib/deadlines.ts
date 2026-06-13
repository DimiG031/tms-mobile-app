export const ROK_WARN_DAYS = 30;

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function rokStatus(days: number | null, isDark: boolean): { label: string; bg: string; text: string } {
  if (days === null) return { label: "Nije uneto", bg: isDark ? "#1e293b" : "#f1f5f9", text: isDark ? "#94a3b8" : "#64748b" };
  if (days < 0) return { label: "Istekao", bg: "#fee2e2", text: "#b91c1c" };
  if (days === 0) return { label: "Ističe danas", bg: "#fee2e2", text: "#b91c1c" };
  if (days <= ROK_WARN_DAYS) return { label: `Ističe za ${days} d.`, bg: "#fef3c7", text: "#92400e" };
  return { label: `Još ${days} d.`, bg: "#d1fae5", text: "#065f46" };
}

// Number of deadlines that are already expired or expiring within ROK_WARN_DAYS.
export function countUrgentDeadlines(dates: Array<string | null | undefined>): number {
  return dates.reduce((count, date) => {
    const days = daysUntil(date);
    return days !== null && days <= ROK_WARN_DAYS ? count + 1 : count;
  }, 0);
}
