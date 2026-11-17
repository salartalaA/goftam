"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { ActionResult } from "@/lib/actions";
import {
  addQuestionAction,
  createCategoryAction,
  createFaqPageAction,
  deleteCategoryAction,
  deleteQuestionAction,
  logoutAction,
  renameCategoryAction,
  updateFaqPageAction,
  updateFaqTemplateAction,
  updateQuestionAction,
} from "@/lib/actions";
import { copyTextToClipboard } from "@/lib/clipboard";
import type { DashboardSection, FaqPage, FaqTemplate } from "@/types/faq";

interface DashboardClientProps {
  page: FaqPage | null;
  userEmail: string;
  userName: string;
}

export function DashboardClient({
  userEmail,
  userName,
  page,
}: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false);
  const [isEditPageOpen, setIsEditPageOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);

  const runAction = async (
    action: Promise<ActionResult>,
    successMessage: string
  ): Promise<boolean> => {
    const result = await action;
    if (result.ok) {
      toast.success(successMessage);
      router.refresh();
      return true;
    }
    toast.error(result.error);
    return false;
  };

  const handleCreatePage = async (values: { title: string; slug: string }) =>
    runAction(
      createFaqPageAction(values),
      "صفحه پرسش‌ها ساخته شد و هم‌اکنون در دسترس است"
    );

  const handleUpdatePageDetails = async (values: {
    title: string;
    slug: string;
  }) => runAction(updateFaqPageAction(values), "مشخصات صفحه به‌روزرسانی شد");

  const handleSelectTemplate = async (template: FaqTemplate) =>
    runAction(
      updateFaqTemplateAction(template),
      `قالب صفحه عمومی به «${template === "accordion" ? "آکاردئونی" : "پنجره بازشو"}» تغییر یافت`
    );

  const handleAddQuestion = async (input: {
    question: string;
    answer: string;
    categoryId: string | null;
  }) => runAction(addQuestionAction(input), "پرسش جدید اضافه شد");

  const handleUpdateQuestion = async (
    questionId: string,
    updates: {
      question: string;
      answer: string;
      categoryId: string | null;
    }
  ) => runAction(updateQuestionAction(questionId, updates), "پرسش ویرایش شد");

  const handleDeleteQuestion = async (questionId: string) =>
    runAction(deleteQuestionAction(questionId), "پرسش حذف شد");

  const handleCreateCategory = async (name: string) =>
    runAction(createCategoryAction(name), "دسته‌بندی ساخته شد");

  const handleRenameCategory = async (categoryId: string, newName: string) =>
    runAction(
      renameCategoryAction(categoryId, newName),
      "نام دسته‌بندی تغییر یافت"
    );

  const handleDeleteCategory = async (categoryId: string) =>
    runAction(deleteCategoryAction(categoryId), "دسته‌بندی حذف شد");

  const handleCopySlugUrl = async (slug: string) => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/${slug}`;
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopiedUrl(true);
      toast.success("نشانی عمومی در حافظه کپی شد");
      window.setTimeout(() => setCopiedUrl(false), 1800);
    } else {
      toast.error("کپی خودکار نشانی انجام نشد");
    }
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const handleOpenPublicPage = (slug: string) => {
    router.push(`/${slug}`);
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      copiedUrl={copiedUrl}
      isAddQuestionOpen={isAddQuestionOpen}
      isCreatePageOpen={isCreatePageOpen}
      isEditPageOpen={isEditPageOpen}
      isLoggingOut={isPending}
      onAddQuestion={handleAddQuestion}
      onAddQuestionOpenChange={setIsAddQuestionOpen}
      onCopyPublicUrl={() => {
        if (page) {
          void handleCopySlugUrl(page.slug);
        }
      }}
      onCreateCategory={handleCreateCategory}
      onCreatePage={handleCreatePage}
      onCreatePageOpenChange={setIsCreatePageOpen}
      onDeleteCategory={handleDeleteCategory}
      onDeleteQuestion={handleDeleteQuestion}
      onEditPageOpenChange={setIsEditPageOpen}
      onLogout={handleLogout}
      onOpenPublicPage={handleOpenPublicPage}
      onRenameCategory={handleRenameCategory}
      onSelectSection={setActiveSection}
      onSelectTemplate={handleSelectTemplate}
      onUpdatePageDetails={handleUpdatePageDetails}
      onUpdateQuestion={handleUpdateQuestion}
      page={page}
      user={{ email: userEmail, name: userName }}
    />
  );
}
