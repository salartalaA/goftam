import "./env";
import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import {
  cleanupExpiredRateLimits,
  createRateLimitStorage,
} from "@/lib/rate-limit";

// ── Environment ─────────────────────────────────────────────────────

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const DB_PATH_PATTERN = /\/[^/?]+(?<suffix>\?.*)?$/u;
const SESSION_COOKIE_PATTERN = /better-auth\.session_token=[^;]+/u;
const FLIGHT_ROW_PATTERN = /^\d+$/u;
const UNAUTHORIZED_PATTERN = /وارد حساب/u;
const ONE_PAGE_PATTERN = /فقط می‌تواند یک صفحه/u;
const DB_UNAVAILABLE_PATTERN = /db unavailable/u;
const CLEANUP_SECRET = "test-cleanup-secret";

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Tests run against an isolated Neon database, never the dev/prod one.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  DATABASE_URL.replace(DB_PATH_PATTERN, "/goftam_test$<suffix>");

const prisma = new PrismaClient({
  adapter: new PrismaNeonHttp(TEST_DATABASE_URL, {}),
});

// ── Server lifecycle ────────────────────────────────────────────────

async function getFreePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
}

let port = 0;
let baseUrl = "";
let serverProcess: ChildProcess | undefined;

const actionIds = new Map<string, string>();

function loadActionIds() {
  const manifestPath = join(
    process.cwd(),
    ".next/server/server-reference-manifest.json"
  );
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    node: Record<string, { exportedName?: string }>;
  };
  for (const [id, entry] of Object.entries(manifest.node)) {
    if (entry.exportedName) {
      actionIds.set(entry.exportedName, id);
    }
  }
}

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: readiness must be polled sequentially
      const res = await fetch(`${baseUrl}/`);
      if (res.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("test server did not become ready in time");
}

before(async () => {
  loadActionIds();
  assert.ok(
    actionIds.size > 0,
    "server action manifest not found — run pnpm build first"
  );

  port = await getFreePort();
  baseUrl = `http://localhost:${port}`;

  const nextBin = join(process.cwd(), "node_modules/next/dist/bin/next");
  serverProcess = spawn(
    process.execPath,
    [nextBin, "start", "-p", String(port)],
    {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        DIRECT_URL: TEST_DATABASE_URL,
        BETTER_AUTH_URL: baseUrl,
        NEXT_PUBLIC_APP_URL: baseUrl,
        RATE_LIMIT_CLEANUP_SECRET: CLEANUP_SECRET,
      },
      stdio: "ignore",
    }
  );

  await waitForServer();

  // Isolate rate-limit state for deterministic tests.
  await prisma.rateLimit.deleteMany({});

  await setupFixture();
});

after(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    await once(serverProcess, "exit").catch(() => undefined);
  }
  await prisma.$disconnect();
});

// ── HTTP helpers ────────────────────────────────────────────────────

interface ActionResult {
  data?: unknown;
  error?: string;
  ok: boolean;
}

async function callAction(
  name: string,
  options: { args?: unknown[]; cookie?: string } = {}
): Promise<ActionResult> {
  const id = actionIds.get(name);
  assert.ok(id, `unknown server action: ${name}`);

  const headers: Record<string, string> = {
    "Content-Type": "text/plain;charset=UTF-8",
    "Next-Action": id,
    Origin: baseUrl,
  };
  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  const res = await fetch(`${baseUrl}/dashboard`, {
    method: "POST",
    headers,
    body: JSON.stringify(options.args ?? []),
  });
  const text = await res.text();

  // The action result is the last flight row: "N:{...json...}"
  const lines = text.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] ?? "";
    const idx = line.indexOf(":");
    if (idx > 0 && FLIGHT_ROW_PATTERN.test(line.slice(0, idx))) {
      const parsed = parseJsonOrNull(line.slice(idx + 1));
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as ActionResult;
      }
    }
  }
  throw new Error(
    `could not parse action result for ${name}: ${text.slice(-300)}`
  );
}

let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`; // TEST-NET-2, unique per user
}

interface TestUser {
  cookie: string;
  email: string;
  id: string;
}

async function signUpUser(tag: string): Promise<TestUser> {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
      "x-forwarded-for": nextIp(),
    },
    body: JSON.stringify({
      email,
      password: "test-password-12345",
      name: tag,
    }),
  });
  assert.equal(res.status, 200, `sign-up failed for ${email}`);

  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(SESSION_COOKIE_PATTERN);
  assert.ok(match, "session cookie missing from sign-up response");
  const [sessionCookie] = match;

  const body = (await res.json()) as { user: { id: string } };
  return { cookie: sessionCookie, email, id: body.user.id };
}

function getUserPage(userId: string) {
  return prisma.faqPage.findUnique({
    where: { userId },
    include: { categories: true, questions: true },
  });
}

// ── Fixtures ────────────────────────────────────────────────────────

interface Fixture {
  categoryBId: string;
  pageAId: string;
  pageBId: string;
  questionBId: string;
  userA: TestUser;
  userB: TestUser;
}

let fixture: Fixture;

async function setupFixture() {
  const [userA, userB] = await Promise.all([
    signUpUser("alice"),
    signUpUser("bob"),
  ]);

  const createA = await callAction("createFaqPageAction", {
    cookie: userA.cookie,
    args: [{ title: "Alice Help", slug: `alice-${Date.now()}` }],
  });
  const createB = await callAction("createFaqPageAction", {
    cookie: userB.cookie,
    args: [{ title: "Bob Help", slug: `bob-${Date.now()}` }],
  });
  assert.equal(createA.ok, true);
  assert.equal(createB.ok, true);

  const pageA = await getUserPage(userA.id);
  const pageB = await getUserPage(userB.id);
  assert.ok(pageA && pageB);

  const addQ = await callAction("addQuestionAction", {
    cookie: userB.cookie,
    args: [
      {
        question: "B secret question?",
        answer: "B secret answer",
        categoryId: null,
      },
    ],
  });
  assert.equal(addQ.ok, true);

  const addC = await callAction("createCategoryAction", {
    cookie: userB.cookie,
    args: ["B-private-category"],
  });
  assert.equal(addC.ok, true);

  const pageBAfter = await getUserPage(userB.id);
  assert.ok(pageBAfter);
  const [questionB] = pageBAfter.questions;
  const [categoryB] = pageBAfter.categories;
  assert.ok(questionB && categoryB);

  fixture = {
    userA,
    userB,
    pageAId: pageA.id,
    pageBId: pageB.id,
    questionBId: questionB.id,
    categoryBId: categoryB.id,
  };
}

// ── IDOR ────────────────────────────────────────────────────────────

test("unauthenticated requests cannot call protected actions", async () => {
  const result = await callAction("createFaqPageAction", {
    args: [{ title: "No Auth", slug: `noauth-${Date.now()}` }],
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", UNAUTHORIZED_PATTERN);
});

test("user A cannot update user B's question by id", async () => {
  const questionBefore = await prisma.faqQuestion.findUnique({
    where: { id: fixture.questionBId },
  });
  assert.ok(questionBefore);

  const result = await callAction("updateQuestionAction", {
    cookie: fixture.userA.cookie,
    args: [
      fixture.questionBId,
      { question: "hijacked", answer: "hijacked", categoryId: null },
    ],
  });
  assert.equal(result.ok, false);

  const questionAfter = await prisma.faqQuestion.findUnique({
    where: { id: fixture.questionBId },
  });
  assert.equal(questionAfter?.question, questionBefore.question);
  assert.equal(questionAfter?.answer, questionBefore.answer);
});

test("user A cannot delete user B's question by id", async () => {
  const result = await callAction("deleteQuestionAction", {
    cookie: fixture.userA.cookie,
    args: [fixture.questionBId],
  });
  assert.equal(result.ok, false);
  const stillThere = await prisma.faqQuestion.findUnique({
    where: { id: fixture.questionBId },
  });
  assert.ok(stillThere);
});

test("user A cannot rename user B's category by id", async () => {
  const result = await callAction("renameCategoryAction", {
    cookie: fixture.userA.cookie,
    args: [fixture.categoryBId, "stolen-name"],
  });
  assert.equal(result.ok, false);
  const category = await prisma.faqCategory.findUnique({
    where: { id: fixture.categoryBId },
  });
  assert.equal(category?.name, "B-private-category");
});

test("user A cannot delete user B's category by id", async () => {
  const result = await callAction("deleteCategoryAction", {
    cookie: fixture.userA.cookie,
    args: [fixture.categoryBId],
  });
  assert.equal(result.ok, false);
  const stillThere = await prisma.faqCategory.findUnique({
    where: { id: fixture.categoryBId },
  });
  assert.ok(stillThere);
});

test("user A cannot attach a question to user B's category", async () => {
  const result = await callAction("addQuestionAction", {
    cookie: fixture.userA.cookie,
    args: [
      {
        question: "A question",
        answer: "A answer",
        categoryId: fixture.categoryBId,
      },
    ],
  });
  assert.equal(result.ok, true);

  const pageA = await getUserPage(fixture.userA.id);
  const question = pageA?.questions.find((q) => q.question === "A question");
  assert.ok(question);
  // Cross-page category ids are discarded, not trusted.
  assert.equal(question.categoryId, null);
});

test("public FAQ page is reachable and does not leak the owner id", async () => {
  const pageB = await prisma.faqPage.findUnique({
    where: { id: fixture.pageBId },
  });
  assert.ok(pageB);

  const res = await fetch(`${baseUrl}/${pageB.slug}`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("Bob Help"));
  assert.ok(html.includes("B secret question?"));
  assert.ok(
    !html.includes(fixture.userB.id),
    "owner userId leaked in public HTML"
  );
});

// ── Concurrency ─────────────────────────────────────────────────────

test("concurrent page creation for one user yields exactly one page", async () => {
  const user = await signUpUser("carol");
  const suffix = Date.now();

  const [r1, r2] = await Promise.all([
    callAction("createFaqPageAction", {
      cookie: user.cookie,
      args: [{ title: "Carol One", slug: `carol-one-${suffix}` }],
    }),
    callAction("createFaqPageAction", {
      cookie: user.cookie,
      args: [{ title: "Carol Two", slug: `carol-two-${suffix}` }],
    }),
  ]);

  const successes = [r1, r2].filter((r) => r.ok).length;
  assert.equal(
    successes,
    1,
    `expected exactly one success, got ${JSON.stringify([r1, r2])}`
  );
  const loser = r1.ok ? r2 : r1;
  assert.equal(loser.ok, false);
  assert.match(loser.error ?? "", ONE_PAGE_PATTERN);

  const count = await prisma.faqPage.count({ where: { userId: user.id } });
  assert.equal(count, 1);
});

test("concurrent duplicate slugs across users cannot both succeed", async () => {
  const [userD, userE] = await Promise.all([
    signUpUser("dave"),
    signUpUser("erin"),
  ]);
  const slug = `race-${Date.now()}`;

  const [r1, r2] = await Promise.all([
    callAction("createFaqPageAction", {
      cookie: userD.cookie,
      args: [{ title: "Dave", slug }],
    }),
    callAction("createFaqPageAction", {
      cookie: userE.cookie,
      args: [{ title: "Erin", slug }],
    }),
  ]);

  const successes = [r1, r2].filter((r) => r.ok).length;
  assert.equal(
    successes,
    1,
    `expected exactly one success, got ${JSON.stringify([r1, r2])}`
  );

  const slugCount = await prisma.faqPage.count({ where: { slug } });
  assert.equal(slugCount, 1);
});

test("editing a page while keeping its existing slug still works", async () => {
  const pageA = await prisma.faqPage.findUnique({
    where: { id: fixture.pageAId },
  });
  assert.ok(pageA);

  const result = await callAction("updateFaqPageAction", {
    cookie: fixture.userA.cookie,
    args: [{ title: "Alice Help Updated", slug: pageA.slug }],
  });
  assert.equal(result.ok, true);

  const updated = await prisma.faqPage.findUnique({
    where: { id: fixture.pageAId },
  });
  assert.equal(updated?.title, "Alice Help Updated");
  assert.equal(updated?.slug, pageA.slug);
});

test("concurrent duplicate category names cannot both succeed", async () => {
  const name = `raced-${Date.now()}`;
  const [r1, r2] = await Promise.all([
    callAction("createCategoryAction", {
      cookie: fixture.userA.cookie,
      args: [name],
    }),
    callAction("createCategoryAction", {
      cookie: fixture.userA.cookie,
      args: [name],
    }),
  ]);

  const successes = [r1, r2].filter((r) => r.ok).length;
  assert.equal(
    successes,
    1,
    `expected exactly one success, got ${JSON.stringify([r1, r2])}`
  );

  const count = await prisma.faqCategory.count({
    where: { pageId: fixture.pageAId, name },
  });
  assert.equal(count, 1);
});

// ── Rate limit storage ──────────────────────────────────────────────

test("rate-limit storage allows up to max then denies with retryAfter", async () => {
  let now = 1_000_000;
  const storage = createRateLimitStorage({ db: prisma, now: () => now });
  const rule = { window: 10, max: 3 };

  for (let i = 0; i < 3; i += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: consume calls must be sequential to test ordering
    const res = await storage.consume("unit|key-a", rule);
    assert.equal(res.allowed, true);
  }
  const denied = await storage.consume("unit|key-a", rule);
  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfter !== null && denied.retryAfter > 0);

  // Window slides from last allowed request; advance past it.
  now += 11_000;
  const afterWindow = await storage.consume("unit|key-a", rule);
  assert.equal(afterWindow.allowed, true);
});

test("rate-limit storage keeps separate buckets per key", async () => {
  const now = 2_000_000;
  const storage = createRateLimitStorage({ db: prisma, now: () => now });
  const rule = { window: 10, max: 2 };

  await storage.consume("unit|ip-1|/sign-in/email", rule);
  await storage.consume("unit|ip-1|/sign-in/email", rule);
  const denied = await storage.consume("unit|ip-1|/sign-in/email", rule);
  assert.equal(denied.allowed, false);

  const otherIp = await storage.consume("unit|ip-2|/sign-in/email", rule);
  assert.equal(otherIp.allowed, true);

  const otherPath = await storage.consume("unit|ip-1|/sign-up/email", rule);
  assert.equal(otherPath.allowed, true);
});

test("concurrent consumes cannot exceed the configured limit", async () => {
  const now = 3_000_000;
  const storage = createRateLimitStorage({ db: prisma, now: () => now });
  const rule = { window: 10, max: 5 };

  const results = await Promise.all(
    Array.from({ length: 20 }, () => storage.consume("unit|race", rule))
  );
  const allowed = results.filter((r) => r.allowed).length;
  assert.equal(allowed, 5);
});

test("cleanup removes only expired rate-limit rows", async () => {
  const realNow = Date.now();
  // Expired row: lastRequest 10 minutes ago (> 60s max window).
  await prisma.rateLimit.create({
    data: {
      id: crypto.randomUUID(),
      key: "unit|expired",
      count: 3,
      lastRequest: BigInt(realNow - 10 * 60_000),
    },
  });
  // Active row: within the window.
  await prisma.rateLimit.create({
    data: {
      id: crypto.randomUUID(),
      key: "unit|active",
      count: 1,
      lastRequest: BigInt(realNow - 5000),
    },
  });

  const removed = await cleanupExpiredRateLimits(prisma, () => realNow);
  assert.ok(removed >= 1);

  const expired = await prisma.rateLimit.findUnique({
    where: { key: "unit|expired" },
  });
  const active = await prisma.rateLimit.findUnique({
    where: { key: "unit|active" },
  });
  assert.equal(expired, null);
  assert.ok(active, "active rate-limit row was deleted");

  // Idempotent: second run removes nothing new.
  const removedAgain = await cleanupExpiredRateLimits(prisma, () => realNow);
  assert.equal(removedAgain, 0);
});

test("rate-limit storage failures propagate instead of silently allowing", async () => {
  const failingDb = {
    $queryRaw: () => Promise.reject(new Error("db unavailable")),
  } as unknown as PrismaClient;
  const storage = createRateLimitStorage({ db: failingDb });

  await assert.rejects(
    storage.consume("unit|fail", { window: 10, max: 3 }),
    DB_UNAVAILABLE_PATTERN
  );
});

// ── HTTP-level rate limiting ────────────────────────────────────────

test("sign-in endpoint rate limits per client IP", async () => {
  const ipA = "203.0.113.10";
  const ipB = "203.0.113.11";
  const attempt = (ip: string) =>
    fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({
        email: "nobody@test.dev",
        password: "wrong-password-123",
      }),
    });

  const codesA: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: attempts must be sequential to observe 429 ordering
    codesA.push((await attempt(ipA)).status);
  }
  assert.deepEqual(codesA.slice(0, 3), [401, 401, 401]);
  assert.equal(codesA[3], 429, "4th sign-in attempt should be rate limited");

  // A different client IP gets its own bucket.
  const resB = await attempt(ipB);
  assert.equal(resB.status, 401);
});

// ── Internal cleanup endpoint ───────────────────────────────────────

const CLEANUP_PATH = "/api/internal/cleanup-rate-limits";

function cleanupRequest(headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}${CLEANUP_PATH}`, { headers });
}

test("cleanup endpoint rejects unauthorized requests", async () => {
  const noAuth = await cleanupRequest();
  assert.equal(noAuth.status, 401);

  const wrongSecret = await cleanupRequest({
    "x-cleanup-secret": "wrong-secret",
  });
  assert.equal(wrongSecret.status, 401);

  const wrongBearer = await cleanupRequest({
    authorization: "Bearer wrong-secret",
  });
  assert.equal(wrongBearer.status, 401);
});

test("cleanup endpoint deletes only expired rows when authorized", async () => {
  const realNow = Date.now();
  await prisma.rateLimit.create({
    data: {
      id: crypto.randomUUID(),
      key: "endpoint|expired",
      count: 2,
      lastRequest: BigInt(realNow - 10 * 60_000),
    },
  });
  await prisma.rateLimit.create({
    data: {
      id: crypto.randomUUID(),
      key: "endpoint|active",
      count: 1,
      lastRequest: BigInt(realNow - 2000),
    },
  });

  const res = await cleanupRequest({ "x-cleanup-secret": CLEANUP_SECRET });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean; deleted: number };
  assert.equal(body.ok, true);
  assert.ok(body.deleted >= 1);

  const expired = await prisma.rateLimit.findUnique({
    where: { key: "endpoint|expired" },
  });
  const active = await prisma.rateLimit.findUnique({
    where: { key: "endpoint|active" },
  });
  assert.equal(expired, null);
  assert.ok(active, "active rate-limit row was deleted by endpoint");

  // Bearer auth variant (Vercel Cron style) also works.
  const bearer = await cleanupRequest({
    authorization: `Bearer ${CLEANUP_SECRET}`,
  });
  assert.equal(bearer.status, 200);
});

test("concurrent cleanup executions are safe", async () => {
  const realNow = Date.now();
  await prisma.rateLimit.create({
    data: {
      id: crypto.randomUUID(),
      key: "endpoint|race-expired",
      count: 1,
      lastRequest: BigInt(realNow - 10 * 60_000),
    },
  });
  await prisma.rateLimit.create({
    data: {
      id: crypto.randomUUID(),
      key: "endpoint|race-active",
      count: 1,
      lastRequest: BigInt(realNow - 1000),
    },
  });

  const headers = { "x-cleanup-secret": CLEANUP_SECRET };
  const results = await Promise.all([
    cleanupRequest(headers),
    cleanupRequest(headers),
    cleanupRequest(headers),
  ]);
  for (const res of results) {
    assert.equal(res.status, 200);
  }

  const expired = await prisma.rateLimit.findUnique({
    where: { key: "endpoint|race-expired" },
  });
  const active = await prisma.rateLimit.findUnique({
    where: { key: "endpoint|race-active" },
  });
  assert.equal(expired, null);
  assert.ok(active, "active row deleted during concurrent cleanup");
});
