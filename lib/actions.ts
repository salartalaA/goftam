"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { normalizeSlug } from "@/lib/faq";
import { prisma } from "@/lib/prisma";
import {
  categorySchema,
  faqPageSchema,
  faqTemplateSchema,
  idSchema,
  questionSchema,
} from "@/lib/validations";
import type { FaqTemplate } from "@/types/faq";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const UNAUTHORIZED_ERROR = "ابتدا وارد حساب کاربری شوید.";
const GENERIC_ERROR = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
const UNIQUE_CONSTRAINT_PATTERN = /unique constraint "(?<name>[^"]+)"/u;

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

function getUserPage(userId: string) {
  return prisma.faqPage.findUnique({ where: { userId } });
}

// Slug uniqueness is enforced against the database directly; the client
// never receives a list of other users' slugs.
function isSlugTaken(slug: string, excludePageId?: string) {
  return prisma.faqPage.findFirst({
    where: {
      slug: { equals: slug, mode: "insensitive" },
      ...(excludePageId ? { id: { not: excludePageId } } : {}),
    },
    select: { id: true },
  });
}

function getUniqueViolationDetails(
  error: unknown
): { code: string; target: string } | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    (error.code !== "P2002" && error.code !== "23505")
  ) {
    return null;
  }
  const metaTarget = error.meta?.target;
  if (Array.isArray(metaTarget)) {
    return { code: error.code, target: metaTarget.join(",") };
  }
  if (typeof metaTarget === "string") {
    return { code: error.code, target: metaTarget };
  }
  // The Neon HTTP adapter surfaces the raw Postgres code (23505) and omits
  // meta.target; the constraint name only appears in the error message.
  const constraintMatch = UNIQUE_CONSTRAINT_PATTERN.exec(error.message);
  return {
    code: error.code,
    target: constraintMatch?.groups?.name ?? "",
  };
}

function uniqueViolationTarget(error: unknown): string {
  return getUniqueViolationDetails(error)?.target ?? "";
}

function revalidateDashboard(slug?: string) {
  revalidatePath("/dashboard");
  if (slug) {
    revalidatePath(`/${slug}`);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return getUniqueViolationDetails(error) !== null;
}

function slugTakenError(): ActionResult {
  return { ok: false, error: "این نشانی عمومی قبلاً ثبت شده است." };
}

function invalidIdError(): ActionResult {
  return { ok: false, error: "شناسه ارسالی معتبر نیست." };
}

export async function createFaqPageAction(input: {
  title: string;
  slug: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }

    const existing = await getUserPage(user.id);
    if (existing) {
      return {
        ok: false,
        error: "هر کاربر فقط می‌تواند یک صفحه پرسش‌های متداول بسازد.",
      };
    }

    const parsed = faqPageSchema().safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? GENERIC_ERROR,
      };
    }

    const slug = normalizeSlug(parsed.data.slug);
    if (await isSlugTaken(slug)) {
      return slugTakenError();
    }

    try {
      await prisma.faqPage.create({
        data: {
          userId: user.id,
          title: parsed.data.title,
          slug,
          template: "accordion",
        },
      });
    } catch (error) {
      const target = uniqueViolationTarget(error);
      if (target.includes("userId")) {
        return {
          ok: false,
          error: "هر کاربر فقط می‌تواند یک صفحه پرسش‌های متداول بسازد.",
        };
      }
      if (isUniqueViolation(error)) {
        return slugTakenError();
      }
      throw error;
    }

    revalidateDashboard(slug);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateFaqPageAction(input: {
  title: string;
  slug: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }

    const page = await getUserPage(user.id);
    if (!page) {
      return { ok: false, error: "صفحه‌ای برای ویرایش یافت نشد." };
    }

    const parsed = faqPageSchema().safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? GENERIC_ERROR,
      };
    }

    const oldSlug = page.slug;
    const newSlug = normalizeSlug(parsed.data.slug);
    if (newSlug !== oldSlug && (await isSlugTaken(newSlug, page.id))) {
      return slugTakenError();
    }

    try {
      await prisma.faqPage.update({
        where: { id: page.id },
        data: { title: parsed.data.title, slug: newSlug },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return slugTakenError();
      }
      throw error;
    }

    revalidateDashboard(oldSlug);
    if (newSlug !== oldSlug) {
      revalidatePath(`/${newSlug}`);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateFaqTemplateAction(
  template: FaqTemplate
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }

    const parsed = faqTemplateSchema.safeParse(template);
    if (!parsed.success) {
      return { ok: false, error: GENERIC_ERROR };
    }

    const page = await getUserPage(user.id);
    if (!page) {
      return { ok: false, error: "صفحه‌ای برای ویرایش یافت نشد." };
    }

    await prisma.faqPage.update({
      where: { id: page.id },
      data: { template: parsed.data },
    });

    revalidateDashboard(page.slug);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function addQuestionAction(input: {
  question: string;
  answer: string;
  categoryId: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }

    const page = await getUserPage(user.id);
    if (!page) {
      return { ok: false, error: "صفحه‌ای یافت نشد." };
    }

    const parsed = questionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? GENERIC_ERROR,
      };
    }

    const { question, answer, categoryId } = parsed.data;
    const validCategoryId =
      categoryId &&
      (await prisma.faqCategory.findFirst({
        where: { id: categoryId, pageId: page.id },
        select: { id: true },
      }))
        ? categoryId
        : null;

    await prisma.faqQuestion.create({
      data: {
        pageId: page.id,
        question,
        answer,
        categoryId: validCategoryId,
      },
    });

    revalidateDashboard(page.slug);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateQuestionAction(
  questionId: string,
  input: { question: string; answer: string; categoryId: string | null }
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }
    if (!idSchema.safeParse(questionId).success) {
      return invalidIdError();
    }

    const page = await getUserPage(user.id);
    if (!page) {
      return { ok: false, error: "صفحه‌ای یافت نشد." };
    }

    const existing = await prisma.faqQuestion.findFirst({
      where: { id: questionId, pageId: page.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "پرسش یافت نشد." };
    }

    const parsed = questionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? GENERIC_ERROR,
      };
    }

    const { question, answer, categoryId } = parsed.data;
    const validCategoryId =
      categoryId &&
      (await prisma.faqCategory.findFirst({
        where: { id: categoryId, pageId: page.id },
        select: { id: true },
      }))
        ? categoryId
        : null;

    await prisma.faqQuestion.update({
      where: { id: questionId },
      data: { question, answer, categoryId: validCategoryId },
    });

    revalidateDashboard(page.slug);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteQuestionAction(
  questionId: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }
    if (!idSchema.safeParse(questionId).success) {
      return invalidIdError();
    }

    const page = await getUserPage(user.id);
    if (!page) {
      return { ok: false, error: "صفحه‌ای یافت نشد." };
    }

    const result = await prisma.faqQuestion.deleteMany({
      where: { id: questionId, pageId: page.id },
    });
    if (result.count === 0) {
      return { ok: false, error: "پرسش یافت نشد." };
    }

    revalidateDashboard(page.slug);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function createCategoryAction(
  name: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }

    const page = await getUserPage(user.id);
    if (!page) {
      return { ok: false, error: "صفحه‌ای یافت نشد." };
    }

    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? GENERIC_ERROR,
      };
    }

    const trimmed = parsed.data.name;
    const duplicate = await prisma.faqCategory.findFirst({
      where: {
        pageId: page.id,
        name: { equals: trimmed, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return { ok: false, error: "دسته‌بندی با این نام از قبل وجود دارد." };
    }

    try {
      await prisma.faqCategory.create({
        data: { pageId: page.id, name: trimmed },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          ok: false,
          error: "دسته‌بندی با این نام از قبل وجود دارد.",
        };
      }
      throw error;
    }

    revalidateDashboard(page.slug);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function renameCategoryAction(
  categoryId: string,
  name: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }
    if (!idSchema.safeParse(categoryId).success) {
      return invalidIdError();
    }

    const page = await getUserPage(user.id);
    if (!page) {
      return { ok: false, error: "صفحه‌ای یافت نشد." };
    }

    const existing = await prisma.faqCategory.findFirst({
      where: { id: categoryId, pageId: page.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "دسته‌بندی یافت نشد." };
    }

    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? GENERIC_ERROR,
      };
    }

    const trimmed = parsed.data.name;
    const duplicate = await prisma.faqCategory.findFirst({
      where: {
        pageId: page.id,
        id: { not: categoryId },
        name: { equals: trimmed, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return { ok: false, error: "دسته‌بندی دیگری از این نام استفاده می‌کند." };
    }

    try {
      await prisma.faqCategory.update({
        where: { id: categoryId },
        data: { name: trimmed },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          ok: false,
          error: "دسته‌بندی دیگری از این نام استفاده می‌کند.",
        };
      }
      throw error;
    }

    revalidateDashboard(page.slug);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteCategoryAction(
  categoryId: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user) {
      return { ok: false, error: UNAUTHORIZED_ERROR };
    }
    if (!idSchema.safeParse(categoryId).success) {
      return invalidIdError();
    }

    const page = await getUserPage(user.id);
    if (!page) {
      return { ok: false, error: "صفحه‌ای یافت نشد." };
    }

    const result = await prisma.faqCategory.deleteMany({
      where: { id: categoryId, pageId: page.id },
    });
    if (result.count === 0) {
      return { ok: false, error: "دسته‌بندی یافت نشد." };
    }

    revalidateDashboard(page.slug);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function logoutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
