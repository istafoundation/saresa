// Consolidated date utilities for client-side
// Single source of truth for IST timezone handling
// CRITICAL: All daily resets happen at IST 00:00 (UTC+5:30)

/**
 * Get current date in IST timezone (UTC+5:30)
 * Returns ISO date string format: "YYYY-MM-DD"
 * 
 * Logic:
 * 1. Get current UTC timestamp (Date.now())
 * 2. Add IST offset (+5.5 hours)
 * 3. Convert to ISO string. The "UTC" string representation will now match IST time.
 */
export function getISTDate(): string {
  const utcNow = Date.now();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(utcNow + istOffset);
  return istTime.toISOString().split('T')[0];
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
  return yesterdayIST.toISOString().split('T')[0];
}

/**
 * Check if a date string represents today in IST
 */
export function isToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  return dateString === getISTDate();
}

/**
 * Check if a date string represents yesterday in IST
 */
export function isYesterday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  return dateString === getYesterdayIST();
}
