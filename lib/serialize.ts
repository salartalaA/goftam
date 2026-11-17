import type { Prisma } from "@prisma/client";
import type { FaqPage, FaqTemplate, PublicFaqPageData } from "@/types/faq";

const pageWithRelations = {
  categories: { orderBy: { createdAt: "asc" } },
  questions: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.FaqPageInclude;

export type FaqPageWithRelations = Prisma.FaqPageGetPayload<{
  include: typeof pageWithRelations;
}>;

export const faqPageInclude = pageWithRelations;

export function serializePage(page: FaqPageWithRelations): FaqPage {
  return {
    id: page.id,
    userId: page.userId,
    title: page.title,
    slug: page.slug,
    template: page.template as FaqTemplate,
    categories: page.categories.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt.toISOString(),
    })),
    questions: page.questions.map((q) => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      categoryId: q.categoryId,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    })),
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

// Public visitors must not receive the owner's user id.
export function serializePublicPage(
  page: FaqPageWithRelations
): PublicFaqPageData {
  const { userId: _userId, ...publicPage } = serializePage(page);
  return publicPage;
}
