import type { BetterAuthRateLimitStorage } from "better-auth";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { rateLimitStorage } from "@/lib/rate-limit";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  // better-auth's built-in "database" storage wraps counter updates in a
  // transaction, which the Neon HTTP driver does not support. This custom
  // storage performs the same atomic check-and-increment in a single SQL
  // statement against the RateLimit table, so limits hold across instances.
  // Built-in rules already apply stricter limits to sign-in/sign-up
  // (3 requests / 10s) and password/email endpoints (3 / 60s).
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    customStorage: rateLimitStorage satisfies BetterAuthRateLimitStorage,
  },
  advanced: {
    ipAddress: {
      // Walk configured headers in order; x-real-ip covers proxies that do
      // not append X-Forwarded-For. Without trustedProxies only a
      // single-value header is trusted (see deployment notes).
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
});
