"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  HelpCircle,
  Pencil,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatShortDate } from "@/lib/clipboard";
import type { DashboardSection, FaqPage } from "@/types/faq";

interface OverviewSectionProps {
  copiedUrl: boolean;
  onAddQuestionClick: () => void;
  onCopyPublicUrl: () => void;
  onCreatePageClick: () => void;
  onEditPageDetailsClick: () => void;
  onNavigateSection: (section: DashboardSection) => void;
  onOpenPublicPage: (slug: string) => void;
  page: FaqPage | null;
}

export function OverviewSection({
  page,
  copiedUrl,
  onCreatePageClick,
  onEditPageDetailsClick,
  onCopyPublicUrl,
  onOpenPublicPage,
  onNavigateSection,
  onAddQuestionClick,
}: OverviewSectionProps) {
  if (!page) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Empty className="bg-card border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText aria-hidden="true" className="size-4" />
            </EmptyMedia>
            <EmptyTitle>صفحه پرسش‌های متداول خود را بسازید</EmptyTitle>
            <EmptyDescription>
              می‌توانید یک صفحه اختصاصی پرسش‌های متداول برای محصول، خدمت یا پروژه
              خود بسازید. این صفحه بلافاصله با نشانی یکتای شما در دسترس عموم
              قرار می‌گیرد.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onCreatePageClick}>
              <Plus aria-hidden="true" className="me-2 size-4" />
              ساخت صفحه پرسش‌ها
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${page.slug}`;

  const categoryMap = new Map(page.categories.map((c) => [c.id, c.name]));

  const recentQuestions = [...page.questions]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Page Title & Share Bar */}
      <div className="border-border bg-card space-y-5 rounded-lg border p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <span>صفحه عمومی پرسش‌ها</span>
              <span aria-hidden="true">·</span>
              <span>هم‌اکنون فعال</span>
            </div>
            <h1 className="text-foreground truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {page.title}
            </h1>
          </div>

          <Button
            className="shrink-0 self-start"
            onClick={onEditPageDetailsClick}
            size="sm"
            type="button"
            variant="outline"
          >
            <Pencil aria-hidden="true" className="me-1.5 size-3.5" />
            ویرایش عنوان و نشانی
          </Button>
        </div>

        <div className="border-border bg-muted/40 flex flex-col gap-2.5 rounded-md border px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground shrink-0 text-xs">
              نشانی عمومی
            </span>
            <a
              className="text-foreground truncate font-mono text-xs hover:underline sm:text-sm"
              dir="ltr"
              href={`/${page.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onOpenPublicPage(page.slug);
              }}
            >
              {publicUrl}
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={onCopyPublicUrl}
              size="sm"
              type="button"
              variant="outline"
            >
              {copiedUrl ? (
                <>
                  <Check
                    aria-hidden="true"
                    className="me-1.5 size-3.5 text-emerald-400"
                  />
                  کپی شد
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" className="me-1.5 size-3.5" />
                  کپی لینک
                </>
              )}
            </Button>
            <Button
              onClick={() => onOpenPublicPage(page.slug)}
              size="sm"
              type="button"
            >
              <ExternalLink aria-hidden="true" className="me-1.5 size-3.5" />
              باز کردن صفحه
            </Button>
          </div>
        </div>
      </div>

      {/* Single-elevation Summary Row */}
      <div className="divide-border border-border bg-card grid grid-cols-1 divide-y rounded-lg border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-muted-foreground text-xs">پرسش‌ها</p>
            <p className="text-foreground mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {page.questions.length}
            </p>
          </div>
          <Button
            onClick={() => onNavigateSection("questions")}
            size="sm"
            type="button"
            variant="ghost"
          >
            مدیریت
            <ArrowLeft aria-hidden="true" className="ms-1 size-3.5" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-muted-foreground text-xs">دسته‌بندی‌ها</p>
            <p className="text-foreground mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {page.categories.length}
            </p>
          </div>
          <Button
            onClick={() => onNavigateSection("categories")}
            size="sm"
            type="button"
            variant="ghost"
          >
            سازمان‌دهی
            <ArrowLeft aria-hidden="true" className="ms-1 size-3.5" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-muted-foreground text-xs">قالب عمومی</p>
            <p className="text-foreground mt-1 text-lg font-semibold tracking-tight">
              {page.template === "accordion" ? "آکاردئونی" : "پنجره بازشو"}
            </p>
          </div>
          <Button
            onClick={() => onNavigateSection("template")}
            size="sm"
            type="button"
            variant="ghost"
          >
            تغییر قالب
            <ArrowLeft aria-hidden="true" className="ms-1 size-3.5" />
          </Button>
        </div>
      </div>

      {/* Recent Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-foreground text-sm font-semibold">
            آخرین پرسش‌ها
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={onAddQuestionClick}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus aria-hidden="true" className="me-1.5 size-3.5" />
              افزودن پرسش
            </Button>
            {page.questions.length > 0 && (
              <Button
                onClick={() => onNavigateSection("questions")}
                size="sm"
                type="button"
                variant="ghost"
              >
                مشاهده همه
              </Button>
            )}
          </div>
        </div>

        {recentQuestions.length === 0 ? (
          <Empty className="bg-card border py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HelpCircle aria-hidden="true" className="size-4" />
              </EmptyMedia>
              <EmptyTitle>هنوز پرسشی ثبت نشده است</EmptyTitle>
              <EmptyDescription>
                اولین پرسش و پاسخ خود را اضافه کنید تا بازدیدکنندگان هنگام باز
                کردن لینک عمومی محتوای مفیدی ببینند.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onAddQuestionClick} size="sm">
                <Plus aria-hidden="true" className="me-1.5 size-3.5" />
                افزودن اولین پرسش
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="divide-border border-border bg-card divide-y rounded-lg border">
            {recentQuestions.map((item) => {
              const catName = item.categoryId
                ? (categoryMap.get(item.categoryId) ?? "بدون دسته‌بندی")
                : "بدون دسته‌بندی";
              return (
                <div
                  className="flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  key={item.id}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-foreground truncate text-sm font-medium">
                      {item.question}
                    </p>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>{catName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        به‌روزرسانی {formatShortDate(item.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="shrink-0 self-start sm:self-center"
                    onClick={() => onNavigateSection("questions")}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    مدیریت
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
