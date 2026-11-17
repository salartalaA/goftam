import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runRateLimitCleanup } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Accepts either `x-cleanup-secret: <secret>` (generic schedulers) or
// `Authorization: Bearer <secret>` (e.g. Vercel Cron). Fails closed when
// RATE_LIMIT_CLEANUP_SECRET is not configured.
function isAuthorized(request: Request): boolean {
  const secret = process.env.RATE_LIMIT_CLEANUP_SECRET;
  if (!secret) {
    return false;
  }
  const headerSecret = request.headers.get("x-cleanup-secret") ?? "";
  if (headerSecret && secretsMatch(headerSecret, secret)) {
    return true;
  }
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") && secretsMatch(auth.slice(7), secret);
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const deleted = await runRateLimitCleanup();
    return NextResponse.json({ ok: true, deleted });
  } catch {
    return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  }
}

export { handle as GET, handle as POST };
