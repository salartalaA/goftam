"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { DashboardSection, FaqPage, FaqTemplate } from "@/types/faq";
import { CategoriesSection } from "./categories-section";
import { FaqPageFormDialog } from "./create-faq-page-dialog";
import { DashboardSidebar } from "./dashboard-sidebar";
import { OverviewSection } from "./overview-section";
import { QuestionsSection } from "./questions-section";
import { TemplateSection } from "./template-section";

export interface DashboardUser {
  email: string;
  name?: string;
}

interface DashboardLayoutProps {
  activeSection: DashboardSection;
  copiedUrl: boolean;
  existingPages: Array<{ id: string; slug: string; title: string }>;
  isAddQuestionOpen: boolean;
  isCreatePageOpen: boolean;
  isEditPageOpen: boolean;
  isLoggingOut?: boolean;
  onAddQuestion: (input: {
    question: string;
    answer: string;
    categoryId: string | null;
  }) => Promise<boolean>;
  onAddQuestionOpenChange: (open: boolean) => void;
  onCopyPublicUrl: () => void;
  onCreateCategory: (name: string) => Promise<boolean>;
  onCreatePage: (values: { title: string; slug: string }) => Promise<boolean>;
  onCreatePageOpenChange: (open: boolean) => void;
  onDeleteCategory: (categoryId: string) => Promise<boolean>;
  onDeleteQuestion: (questionId: string) => Promise<boolean>;
  onEditPageOpenChange: (open: boolean) => void;
  onLogout: () => void;
  onOpenPublicPage: (slug: string) => void;
  onRenameCategory: (categoryId: string, newName: string) => Promise<boolean>;
  onSelectSection: (section: DashboardSection) => void;
  onSelectTemplate: (template: FaqTemplate) => Promise<boolean>;
  onUpdatePageDetails: (values: {
    title: string;
    slug: string;
  }) => Promise<boolean>;
  onUpdateQuestion: (
    questionId: string,
    updates: {
      question: string;
      answer: string;
      categoryId: string | null;
    }
  ) => Promise<boolean>;
  page: FaqPage | null;
  user: DashboardUser;
}

const SECTION_LABELS: Record<DashboardSection, string> = {
  overview: "نمای کلی",
  questions: "پرسش‌ها",
  categories: "دسته‌بندی‌ها",
  template: "قالب نمایش",
};

export function DashboardLayout({
  user,
  page,
  existingPages,
  activeSection,
  copiedUrl,
  isCreatePageOpen,
  isEditPageOpen,
  isAddQuestionOpen,
  isLoggingOut,
  onSelectSection,
  onCreatePageOpenChange,
  onEditPageOpenChange,
  onAddQuestionOpenChange,
  onCreatePage,
  onUpdatePageDetails,
  onSelectTemplate,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onCopyPublicUrl,
  onOpenPublicPage,
  onLogout,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar
        activeSection={activeSection}
        isLoggingOut={isLoggingOut}
        onLogout={onLogout}
        onOpenPublicPage={onOpenPublicPage}
        onSelectSection={onSelectSection}
        page={page}
        user={user}
      />

      <SidebarInset className="bg-background">
        <header className="border-border bg-card sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <SidebarTrigger
              aria-label="باز و بسته کردن منوی کناری"
              className="-ms-1"
            />
            <Separator className="h-4" orientation="vertical" />
            <div className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="text-muted-foreground hidden truncate sm:inline">
                {page ? page.title : "فضای کاری"}
              </span>
              <span
                aria-hidden="true"
                className="text-muted-foreground hidden sm:inline"
              >
                /
              </span>
              <span className="text-foreground truncate font-medium">
                {SECTION_LABELS[activeSection]}
              </span>
            </div>
          </div>

          {!!page && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                aria-label="کپی لینک عمومی"
                onClick={onCopyPublicUrl}
                size="sm"
                type="button"
                variant="outline"
              >
                {copiedUrl ? (
                  <>
                    <Check
                      aria-hidden="true"
                      className="size-3.5 text-emerald-400 sm:me-1.5"
                    />
                    <span className="hidden sm:inline">کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="size-3.5 sm:me-1.5" />
                    <span className="hidden sm:inline">کپی لینک</span>
                  </>
                )}
              </Button>

              <Button
                aria-label="مشاهده صفحه عمومی"
                onClick={() => onOpenPublicPage(page.slug)}
                size="sm"
                type="button"
              >
                <ExternalLink
                  aria-hidden="true"
                  className="size-3.5 sm:me-1.5"
                />
                <span className="hidden sm:inline">مشاهده صفحه</span>
              </Button>
            </div>
          )}
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeSection === "overview" && (
            <OverviewSection
              copiedUrl={copiedUrl}
              onAddQuestionClick={() => {
                onSelectSection("questions");
                onAddQuestionOpenChange(true);
              }}
              onCopyPublicUrl={onCopyPublicUrl}
              onCreatePageClick={() => onCreatePageOpenChange(true)}
              onEditPageDetailsClick={() => onEditPageOpenChange(true)}
              onNavigateSection={onSelectSection}
              onOpenPublicPage={onOpenPublicPage}
              page={page}
            />
          )}

          {activeSection === "questions" && page && (
            <QuestionsSection
              isAddDialogOpen={isAddQuestionOpen}
              onAddDialogOpenChange={onAddQuestionOpenChange}
              onAddQuestion={onAddQuestion}
              onDeleteQuestion={onDeleteQuestion}
              onUpdateQuestion={onUpdateQuestion}
              page={page}
            />
          )}

          {activeSection === "categories" && page && (
            <CategoriesSection
              onCreateCategory={onCreateCategory}
              onDeleteCategory={onDeleteCategory}
              onRenameCategory={onRenameCategory}
              page={page}
            />
          )}

          {activeSection === "template" && page && (
            <TemplateSection
              onSelectTemplate={onSelectTemplate}
              selectedTemplate={page.template}
            />
          )}
        </div>
      </SidebarInset>

      {/* Create Single FAQ Page Dialog */}
      <FaqPageFormDialog
        existingPages={existingPages}
        onOpenChange={onCreatePageOpenChange}
        onSubmit={onCreatePage}
        open={isCreatePageOpen}
      />

      {/* Edit Existing FAQ Page Title & Slug Dialog */}
      <FaqPageFormDialog
        editingPage={page}
        existingPages={existingPages}
        onOpenChange={onEditPageOpenChange}
        onSubmit={onUpdatePageDetails}
        open={isEditPageOpen}
      />
    </SidebarProvider>
  );
}
