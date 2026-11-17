import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { BetterAuthRateLimitStorage } from "better-auth";
import { prisma } from "@/lib/prisma";

interface RateLimitRow {
  count: number;
  denied: boolean;
  lastRequest: bigint;
}

interface RateLimitStorageOptions {
  db?: PrismaClient;
  now?: () => number;
}

// Atomic sliding-window counter backed by the "RateLimit" table. A single
// INSERT ... ON CONFLICT statement performs check-and-increment, so it is
// safe under concurrent requests and works with Neon HTTP (no transactions).
// Semantics mirror better-auth's built-in storage: the window slides from
// the last allowed request; denied requests do not extend the window.
export function createRateLimitStorage({
  db = prisma,
  now = Date.now,
}: RateLimitStorageOptions = {}): BetterAuthRateLimitStorage {
  return {
    consume: async (key, rule) => {
      const nowMs = now();
      const windowMs = rule.window * 1000;

      const rows = await db.$queryRaw<RateLimitRow[]>`
        WITH old AS (
          SELECT "count", "lastRequest"
          FROM "RateLimit"
          WHERE "key" = ${key}
        ),
        upd AS (
          INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest")
          VALUES (${randomUUID()}, ${key}, 1, ${nowMs})
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE
              WHEN "RateLimit"."lastRequest" + ${windowMs} <= ${nowMs} THEN 1
              WHEN "RateLimit"."count" >= ${rule.max} THEN "RateLimit"."count"
              ELSE "RateLimit"."count" + 1
            END,
            "lastRequest" = CASE
              WHEN "RateLimit"."lastRequest" + ${windowMs} <= ${nowMs} THEN ${nowMs}
              WHEN "RateLimit"."count" >= ${rule.max} THEN "RateLimit"."lastRequest"
              ELSE ${nowMs}
            END
          RETURNING "count", "lastRequest"
        )
        SELECT
          upd."count",
          upd."lastRequest",
          COALESCE((
            SELECT "count" >= ${rule.max}
              AND "lastRequest" + ${windowMs} > ${nowMs}
            FROM old
          ), false) AS "denied"
        FROM upd
      `;

      const [row] = rows;
      if (row?.denied) {
        const retryAfter = Math.max(
          1,
          Math.ceil((Number(row.lastRequest) + windowMs - nowMs) / 1000)
        );
        return { allowed: false, retryAfter };
      }
      return { allowed: true, retryAfter: null };
    },
  };
}

export const rateLimitStorage = createRateLimitStorage();

// Longest window configured for better-auth rate limiting (built-in special
// rules use 60s; the general rule uses 10s). Any row whose lastRequest is
// older than this cannot belong to an active window and is safe to delete.
const MAX_RATE_LIMIT_WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 15 * 60_000;

// Deletes only expired rate-limit rows. Idempotent and safe to run on a
// schedule or concurrently; rows inside an active window are never removed.
// Concurrent runs are safe: deleteMany is a single atomic statement and
// re-deleting an already-removed row simply matches nothing.
export async function cleanupExpiredRateLimits(
  db: PrismaClient = prisma,
  now: () => number = Date.now
): Promise<number> {
  const cutoff = now() - MAX_RATE_LIMIT_WINDOW_MS;
  const result = await db.rateLimit.deleteMany({
    where: { lastRequest: { lt: BigInt(cutoff) } },
  });
  return result.count;
}

// Runs the cleanup with structured logging. Used by the internal endpoint
// and the in-process interval; never logs keys, IPs, or secrets.
export async function runRateLimitCleanup(
  db: PrismaClient = prisma
): Promise<number> {
  console.info("[rate-limit] cleanup started");
  try {
    const deleted = await cleanupExpiredRateLimits(db);
    console.info(`[rate-limit] cleanup completed: ${deleted} rows deleted`);
    return deleted;
  } catch (error) {
    console.error("[rate-limit] cleanup failed", error);
    throw error;
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | undefined;

// Best-effort in-process cleanup for long-running Node hosts (VPS, Docker,
// Railway, `next start`). On serverless platforms this interval is not
// guaranteed to fire — the reliable trigger is the authenticated
// /api/internal/cleanup-rate-limits endpoint driven by an external scheduler.
export function startRateLimitCleanup(): void {
  if (cleanupTimer) {
    return;
  }
  const run = () => {
    runRateLimitCleanup().catch(() => {
      // already logged inside runRateLimitCleanup
    });
  };
  run();
  cleanupTimer = setInterval(run, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}
