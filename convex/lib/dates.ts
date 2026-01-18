// Consolidated date utilities for Convex backend
// Single source of truth for IST timezone handling
// CRITICAL: All daily resets happen at IST 00:00 (UTC+5:30)
// NOTE: Convex backend runs in UTC, so Date.now() is already UTC

/**
 * Get current date in IST timezone (UTC+5:30)
 * Returns ISO date string format: "YYYY-MM-DD"
 * 
 * Convex servers run in UTC, so we simply add the IST offset.
 * No local timezone adjustment needed on server.
 */
export function getISTDate(): string {
  // Date.now() returns UTC timestamp on Convex servers
  const utcNow = Date.now();
  // Add IST offset (UTC+5:30 = 5.5 hours)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(utcNow + istOffset);
  return istTime.toISOString().split("T")[0];
}

/**
 * Get yesterday's date in IST timezone
 * Returns ISO date string format: "YYYY-MM-DD"
 */
export function getYesterdayIST(): string {
  const utcNow = Date.now();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterdayIST = new Date(utcNow + istOffset - oneDayMs);
  return yesterdayIST.toISOString().split("T")[0];
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
