export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRateLimitCleanup } = await import("@/lib/rate-limit");
    startRateLimitCleanup();
  }
}
