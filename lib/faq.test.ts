import assert from "node:assert/strict";
import test from "node:test";
import type { FaqPage, FaqQuestion } from "@/types/faq";
import {
  filterQuestions,
  normalizeSlug,
  RESERVED_SLUGS,
  validateSlug,
} from "./faq";

function makePage(overrides: Partial<FaqPage> = {}): FaqPage {
  return {
    id: "p1",
    userId: "u1",
    title: "Support",
    slug: "support-hub",
    template: "accordion",
    categories: [],
    questions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeQuestion(overrides: Partial<FaqQuestion> = {}): FaqQuestion {
  return {
    id: "q1",
    question: "How do refunds work?",
    answer: "Within 14 days.",
    categoryId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("normalizeSlug sanitizes titles into URL-safe slugs", () => {
  assert.equal(normalizeSlug("  Acme Cloud Help! "), "acme-cloud-help");
  assert.equal(normalizeSlug("My---Product__FAQ"), "my-product-faq");
});

test("validateSlug enforces length, reserved names and uniqueness", () => {
  const pages = [makePage({ id: "p1", slug: "linear-faq" })];

  assert.ok(validateSlug("", pages)?.includes("الزامی"));
  assert.ok(validateSlug("ab", pages)?.includes("حداقل"));
  assert.ok(validateSlug("dashboard", pages)?.includes("رزرو شده"));
  assert.ok(validateSlug("linear-faq", pages)?.includes("قبلاً ثبت شده"));
  assert.equal(validateSlug("linear-faq", pages, "p1"), null);
  assert.equal(validateSlug("brand-new-slug", pages), null);
  assert.ok(RESERVED_SLUGS.has("api"));
});

test("filterQuestions filters by search text and category", () => {
  const questions = [
    makeQuestion({ id: "q1", categoryId: "c1" }),
    makeQuestion({
      id: "q2",
      question: "How fast is setup?",
      answer: "Under five minutes.",
      categoryId: null,
    }),
  ];

  assert.equal(filterQuestions(questions, "refunds", "all").length, 1);
  assert.equal(filterQuestions(questions, "", "c1").length, 1);
  assert.equal(filterQuestions(questions, "", "uncategorized").length, 1);
  assert.equal(
    filterQuestions(questions, "setup", "uncategorized")[0]?.id,
    "q2"
  );
  assert.equal(filterQuestions(questions, "", "all").length, 2);
});
