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
  questionSchema,
} from "@/lib/validations";
import type { FaqTemplate } from "@/types/faq";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const UNAUTHORIZED_ERROR = "ابتدا وارد حساب کاربری شوید.";
const GENERIC_ERROR = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

function getUserPage(userId: string) {
  return prisma.faqPage.findFirst({ where: { userId } });
}

function getAllPageRefs() {
  return prisma.faqPage.findMany({
    select: { id: true, slug: true },
  });
}

function revalidateDashboard(slug?: string) {
  revalidatePath("/dashboard");
  if (slug) {
    revalidatePath(`/${slug}`);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
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

    const parsed = faqPageSchema(await getAllPageRefs()).safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? GENERIC_ERROR,
      };
    }

    const slug = normalizeSlug(parsed.data.slug);
    await prisma.faqPage.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        slug,
        template: "accordion",
      },
    });

    revalidateDashboard(slug);
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "این نشانی عمومی قبلاً ثبت شده است." };
    }
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

    const refs = await getAllPageRefs();
    const parsed = faqPageSchema(refs, page.id).safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? GENERIC_ERROR,
      };
    }

    const oldSlug = page.slug;
    const newSlug = normalizeSlug(parsed.data.slug);
    await prisma.faqPage.update({
      where: { id: page.id },
      data: { title: parsed.data.title, slug: newSlug },
    });

    revalidateDashboard(oldSlug);
    if (newSlug !== oldSlug) {
      revalidatePath(`/${newSlug}`);
    }
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "این نشانی عمومی قبلاً ثبت شده است." };
    }
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

    await prisma.faqCategory.create({
      data: { pageId: page.id, name: trimmed },
    });

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

    await prisma.faqCategory.update({
      where: { id: categoryId },
      data: { name: trimmed },
    });

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
