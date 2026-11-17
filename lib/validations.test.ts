import assert from "node:assert/strict";
import test from "node:test";
import {
  categorySchema,
  credentialsSchema,
  faqPageSchema,
  faqTemplateSchema,
  idSchema,
  questionSchema,
} from "./validations";

test("registration requires a 12-character password, login does not", () => {
  const register = credentialsSchema(true);
  const login = credentialsSchema(false);

  assert.equal(
    register.safeParse({
      email: "user@example.com",
      password: "short-pass1",
    }).success,
    false
  );
  assert.equal(
    register.safeParse({
      email: "user@example.com",
      password: "a-long-enough-password",
    }).success,
    true
  );
  assert.equal(
    login.safeParse({ email: "user@example.com", password: "x" }).success,
    true
  );
});

test("credentials schema validates email format and length", () => {
  const schema = credentialsSchema(false);
  assert.equal(
    schema.safeParse({ email: "not-an-email", password: "x" }).success,
    false
  );
  assert.equal(
    schema.safeParse({ email: `a@b.co${"x".repeat(400)}`, password: "x" })
      .success,
    false
  );
  assert.equal(
    schema.safeParse({ email: "  user@example.com  ", password: "x" }).success,
    true
  );
});

test("faqPageSchema enforces title/slug limits and reserved slugs", () => {
  const schema = faqPageSchema();
  assert.equal(
    schema.safeParse({ title: "t".repeat(121), slug: "valid-slug" }).success,
    false
  );
  assert.equal(
    schema.safeParse({ title: "Title", slug: "s".repeat(101) }).success,
    false
  );
  assert.equal(
    schema.safeParse({ title: "Title", slug: "dashboard" }).success,
    false
  );
  assert.equal(schema.safeParse({ title: "Title", slug: "ab" }).success, false);
  assert.equal(
    schema.safeParse({ title: "  My Page  ", slug: "  my-page  " }).success,
    true
  );
});

test("questionSchema enforces maximum lengths", () => {
  const schema = questionSchema;
  assert.equal(
    schema.safeParse({
      question: "q".repeat(301),
      answer: "a",
      categoryId: null,
    }).success,
    false
  );
  assert.equal(
    schema.safeParse({
      question: "q",
      answer: "a".repeat(5001),
      categoryId: null,
    }).success,
    false
  );
  assert.equal(
    schema.safeParse({
      question: "q",
      answer: "a",
      categoryId: "c".repeat(65),
    }).success,
    false
  );
  assert.equal(
    schema.safeParse({ question: "q", answer: "a", categoryId: null }).success,
    true
  );
});

test("categorySchema enforces maximum name length", () => {
  assert.equal(
    categorySchema.safeParse({ name: "c".repeat(61) }).success,
    false
  );
  assert.equal(categorySchema.safeParse({ name: "  support  " }).success, true);
});

test("idSchema rejects empty and oversized ids", () => {
  assert.equal(idSchema.safeParse("").success, false);
  assert.equal(idSchema.safeParse("x".repeat(65)).success, false);
  assert.equal(idSchema.safeParse("clx123abc").success, true);
});

test("faqTemplateSchema only accepts known templates", () => {
  assert.equal(faqTemplateSchema.safeParse("accordion").success, true);
  assert.equal(faqTemplateSchema.safeParse("grid").success, false);
});
