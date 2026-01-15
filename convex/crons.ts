// Scheduled functions (cron jobs) for Convex
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired child sessions daily at 3:00 AM UTC (8:30 AM IST)
crons.daily(
  "cleanup expired sessions",
  { hourUTC: 3, minuteUTC: 0 },
  internal.childAuth.cleanupExpiredSessions
);

export default crons;
