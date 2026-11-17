// Side-effect module: must be imported before any module that reads env vars
// (e.g. @/lib/prisma via @/lib/rate-limit). ES module evaluation order follows
// import statement order, so keeping this first in the test file is required.
try {
  process.loadEnvFile(".env");
} catch {
  // .env may already be loaded or absent in CI
}
