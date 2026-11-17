import type { FaqPage, FaqQuestion } from "@/types/faq";

export const RESERVED_SLUGS = new Set([
  "login",
  "register",
  "signup",
  "signin",
  "dashboard",
  "app",
  "questions",
  "categories",
  "template",
  "settings",
  "api",
  "admin",
  "auth",
  "public",
]);

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

export function validateSlug(
  slug: string,
  existingPages: Pick<FaqPage, "id" | "slug">[],
  ignorePageId?: string
): string | null {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return "شناسه نشانی عمومی الزامی است.";
  }
  if (normalized.length < 3) {
    return "شناسه نشانی باید حداقل ۳ کاراکتر باشد.";
  }
  if (normalized.length > 48) {
    return "شناسه نشانی نباید بیش از ۴۸ کاراکتر باشد.";
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return `شناسه «${normalized}» رزرو شده است. نام دیگری انتخاب کنید.`;
  }
  const taken = existingPages.some(
    (page) => page.slug.toLowerCase() === normalized && page.id !== ignorePageId
  );
  if (taken) {
    return "این نشانی عمومی قبلاً ثبت شده است.";
  }
  return null;
}

export function filterQuestions(
  questions: FaqQuestion[],
  searchQuery: string,
  categoryFilter: string // 'all' | 'uncategorized' | categoryId
): FaqQuestion[] {
  const query = searchQuery.trim().toLowerCase();

  return questions.filter((q) => {
    if (categoryFilter === "uncategorized") {
      if (q.categoryId !== null) {
        return false;
      }
    } else if (categoryFilter !== "all" && q.categoryId !== categoryFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    return (
      q.question.toLowerCase().includes(query) ||
      q.answer.toLowerCase().includes(query)
    );
  });
}
