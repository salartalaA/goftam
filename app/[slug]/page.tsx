import type { Metadata } from "next";
import { headers } from "next/headers";
import { PublicFaqPage } from "@/components/public/public-faq-page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { faqPageInclude, serializePublicPage } from "@/lib/serialize";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPage(slug: string) {
  return prisma.faqPage.findFirst({
    where: { slug: slug.toLowerCase() },
    include: faqPageInclude,
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) {
    return { title: "صفحه پیدا نشد — گفتم" };
  }
  return {
    title: `${page.title} — گفتم`,
    description: `${page.questions.length} پرسش متداول در ${page.title}`,
  };
}

export default async function PublicSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const [page, session] = await Promise.all([
    getPage(slug),
    auth.api.getSession({ headers: await headers() }),
  ]);

  return (
    <PublicFaqPage
      isLoggedIn={Boolean(session)}
      isOwner={Boolean(session && page && page.userId === session.user.id)}
      page={page ? serializePublicPage(page) : null}
      slug={slug}
    />
  );
}
