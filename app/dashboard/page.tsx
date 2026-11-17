import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { faqPageInclude, serializePage } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/");
  }

  const page = await prisma.faqPage.findUnique({
    where: { userId: session.user.id },
    include: faqPageInclude,
  });

  return (
    <DashboardClient
      page={page ? serializePage(page) : null}
      userEmail={session.user.email}
      userName={session.user.name}
    />
  );
}
