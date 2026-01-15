// Consolidated date utilities for Convex backend
// Single source of truth for IST timezone handling

/**
 * Get current date in IST timezone (UTC+5:30)
 * Returns ISO date string format: "YYYY-MM-DD"
 */
export function getISTDate(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset).toISOString().split("T")[0];
}

/**
 * Get yesterday's date in IST timezone
 * Returns ISO date string format: "YYYY-MM-DD"
 */
export function getYesterdayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const yesterday = new Date(now.getTime() + istOffset - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().split("T")[0];
}

/**
 * Check if a date string is today in IST
 */
export function isToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  return dateString === getISTDate();
}

/**
 * Check if a date string is yesterday in IST
 */
export function isYesterday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  return dateString === getYesterdayIST();
}
