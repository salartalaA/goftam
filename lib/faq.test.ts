import assert from "node:assert/strict";
import test from "node:test";
import type { FaqQuestion } from "@/types/faq";
import {
  filterQuestions,
  normalizeSlug,
  RESERVED_SLUGS,
  validateSlug,
} from "./faq";

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

test("validateSlug enforces length and reserved names", () => {
  assert.ok(validateSlug("")?.includes("الزامی"));
  assert.ok(validateSlug("ab")?.includes("حداقل"));
  assert.ok(validateSlug("a".repeat(60))?.includes("۴۸"));
  assert.ok(validateSlug("dashboard")?.includes("رزرو شده"));
  assert.equal(validateSlug("brand-new-slug"), null);
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
