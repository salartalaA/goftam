"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  HelpCircle,
  Search,
  Share2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { copyTextToClipboard } from "@/lib/clipboard";
import { filterQuestions } from "@/lib/faq";
import type { FaqPage, FaqQuestion } from "@/types/faq";

interface PublicFaqPageProps {
  isLoggedIn: boolean;
  isOwner: boolean;
  page: FaqPage | null;
  slug: string;
}

export function PublicFaqPage({
  page,
  slug,
  isOwner,
  isLoggedIn,
}: PublicFaqPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeDialogQuestion, setActiveDialogQuestion] =
    useState<FaqQuestion | null>(null);
  const [copied, setCopied] = useState(false);

  const categoryMap = useMemo(
    () => new Map((page?.categories ?? []).map((c) => [c.id, c.name])),
    [page?.categories]
  );

  const hasUncategorized = useMemo(
    () => (page?.questions ?? []).some((q) => q.categoryId === null),
    [page?.questions]
  );

  const filteredQuestions = useMemo(() => {
    if (!page) {
      return [];
    }
    return filterQuestions(page.questions, searchQuery, selectedCategory);
  }, [page, searchQuery, selectedCategory]);

  const goBackToApp = () => {
    router.push("/");
  };

  const handleCopyShare = async () => {
    if (!page) {
      return;
    }
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/${page.slug}`;
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success("نشانی عمومی در حافظه کپی شد");
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("کپی خودکار نشانی انجام نشد");
    }
  };

  if (!page) {
    return (
      <PublicPageNotFound
        isLoggedIn={isLoggedIn}
        onBack={goBackToApp}
        slug={slug}
      />
    );
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      {/* Clean Knowledge-Base Header */}
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
              <BookOpen aria-hidden="true" className="size-3.5" />
            </div>
            <span className="font-heading text-foreground truncate text-sm font-semibold">
              {page.title}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={() => void handleCopyShare()}
              size="sm"
              type="button"
              variant="outline"
            >
              {copied ? (
                <>
                  <Check
                    aria-hidden="true"
                    className="me-1.5 size-3.5 text-emerald-400"
                  />
                  کپی شد
                </>
              ) : (
                <>
                  <Share2 aria-hidden="true" className="me-1.5 size-3.5" />
                  اشتراک‌گذاری
                </>
              )}
            </Button>
            {isOwner ? (
              <Button onClick={goBackToApp} size="sm" type="button">
                <ArrowRight aria-hidden="true" className="me-1.5 size-3.5" />
                پنل مدیریت
              </Button>
            ) : (
              <Button
                onClick={goBackToApp}
                size="sm"
                type="button"
                variant="ghost"
              >
                {isLoggedIn ? "فضای کاری من" : "ورود"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Knowledge-Base Reading Surface */}
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        {/* Title & Search */}
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
              {page.title}
            </h1>
            <p className="text-muted-foreground text-sm tabular-nums">
              {page.questions.length} پرسش
              {page.categories.length > 0 && (
                <>
                  {" · "}
                  {page.categories.length} دسته‌بندی
                </>
              )}
            </p>
          </div>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2"
            />
            <Input
              aria-label="جستجو در پرسش‌های متداول"
              className="bg-card h-11 ps-10 pe-9 text-sm shadow-2xs"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در پرسش‌ها و پاسخ‌ها..."
              type="text"
              value={searchQuery}
            />
            {!!searchQuery && (
              <button
                aria-label="پاک کردن جستجو"
                className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2 rounded p-1"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category Interactive Filter Controls */}
          {page.categories.length > 0 && (
            <CategoryFilterBar
              categories={page.categories}
              hasUncategorized={hasUncategorized}
              onSelect={setSelectedCategory}
              selectedCategory={selectedCategory}
            />
          )}
        </div>

        {/* Questions Content */}
        <QuestionsContent
          categoryMap={categoryMap}
          filteredQuestions={filteredQuestions}
          onOpenDialog={setActiveDialogQuestion}
          onResetFilters={() => {
            setSearchQuery("");
            setSelectedCategory("all");
          }}
          page={page}
        />
      </main>

      <footer className="border-border bg-card/50 text-muted-foreground border-t px-4 py-5 text-center text-xs">
        ساخته‌شده با گفتم
      </footer>

      {/* Dialog Template Modal */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialogQuestion(null);
          }
        }}
        open={activeDialogQuestion !== null}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader className="space-y-2 text-start">
            {activeDialogQuestion?.categoryId &&
              categoryMap.get(activeDialogQuestion.categoryId) && (
                <span className="text-muted-foreground text-xs font-medium">
                  {categoryMap.get(activeDialogQuestion.categoryId)}
                </span>
              )}
            <DialogTitle className="text-foreground pe-6 text-lg leading-snug font-semibold">
              {activeDialogQuestion?.question}
            </DialogTitle>
            <DialogDescription className="sr-only">
              متن کامل پاسخ پرسش انتخاب‌شده
            </DialogDescription>
          </DialogHeader>

          <div className="text-muted-foreground py-2 text-sm leading-relaxed whitespace-pre-line">
            {activeDialogQuestion?.answer}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                بستن
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PublicPageNotFoundProps {
  isLoggedIn: boolean;
  onBack: () => void;
  slug: string;
}

function PublicPageNotFound({
  slug,
  isLoggedIn,
  onBack,
}: PublicPageNotFoundProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border bg-card border-b px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button
            className="text-foreground flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
            onClick={onBack}
            type="button"
          >
            <BookOpen aria-hidden="true" className="size-4" />
            <span>گفتم</span>
          </button>
          <Button onClick={onBack} size="sm" type="button" variant="outline">
            <ArrowRight aria-hidden="true" className="me-1.5 size-3.5" />
            {isLoggedIn ? "پنل مدیریت" : "ورود"}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-4 py-16">
        <Empty className="bg-card border py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HelpCircle aria-hidden="true" className="size-4" />
            </EmptyMedia>
            <EmptyTitle>صفحه پرسش‌ها پیدا نشد</EmptyTitle>
            <EmptyDescription>
              هیچ صفحه عمومی با نشانی{" "}
              <span
                className="text-foreground inline-block font-mono"
                dir="ltr"
              >
                /{slug}
              </span>{" "}
              ثبت نشده است. نشانی را بررسی کنید یا به صفحه اصلی گفتم بازگردید.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onBack} size="sm">
              {isLoggedIn ? "بازگشت به پنل مدیریت" : "بازگشت به خانه"}
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  );
}

interface CategoryFilterBarProps {
  categories: FaqPage["categories"];
  hasUncategorized: boolean;
  onSelect: (category: string) => void;
  selectedCategory: string;
}

function CategoryFilterBar({
  categories,
  hasUncategorized,
  selectedCategory,
  onSelect,
}: CategoryFilterBarProps) {
  const chipClass = (active: boolean) =>
    `shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 border"
    }`;

  return (
    <div
      aria-label="فیلتر پرسش‌ها بر اساس دسته‌بندی"
      className="flex flex-wrap items-center gap-1.5"
      role="tablist"
    >
      <button
        aria-selected={selectedCategory === "all"}
        className={chipClass(selectedCategory === "all")}
        onClick={() => onSelect("all")}
        role="tab"
        type="button"
      >
        همه
      </button>
      {categories.map((cat) => (
        <button
          aria-selected={selectedCategory === cat.id}
          className={chipClass(selectedCategory === cat.id)}
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          role="tab"
          type="button"
        >
          {cat.name}
        </button>
      ))}
      {!!hasUncategorized && (
        <button
          aria-selected={selectedCategory === "uncategorized"}
          className={chipClass(selectedCategory === "uncategorized")}
          onClick={() => onSelect("uncategorized")}
          role="tab"
          type="button"
        >
          عمومی
        </button>
      )}
    </div>
  );
}

interface QuestionsContentProps {
  categoryMap: Map<string, string>;
  filteredQuestions: FaqQuestion[];
  onOpenDialog: (question: FaqQuestion) => void;
  onResetFilters: () => void;
  page: FaqPage;
}

function QuestionsContent({
  page,
  filteredQuestions,
  categoryMap,
  onOpenDialog,
  onResetFilters,
}: QuestionsContentProps) {
  if (page.questions.length === 0) {
    return (
      <Empty className="bg-card border py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HelpCircle aria-hidden="true" className="size-4" />
          </EmptyMedia>
          <EmptyTitle>هنوز پرسشی منتشر نشده است</EmptyTitle>
          <EmptyDescription>
            این صفحه پرسش‌های متداول هنوز پرسشی ندارد.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (filteredQuestions.length === 0) {
    return (
      <Empty className="bg-card border py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search aria-hidden="true" className="size-4" />
          </EmptyMedia>
          <EmptyTitle>پرسشی پیدا نشد</EmptyTitle>
          <EmptyDescription>
            عبارت جستجو را تغییر دهید یا دسته‌بندی دیگری را انتخاب کنید.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            onClick={onResetFilters}
            size="sm"
            type="button"
            variant="outline"
          >
            بازنشانی فیلترها
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (page.template === "accordion") {
    return (
      <AccordionQuestions
        categoryMap={categoryMap}
        questions={filteredQuestions}
      />
    );
  }

  return (
    <DialogQuestionsList
      categoryMap={categoryMap}
      onOpen={onOpenDialog}
      questions={filteredQuestions}
    />
  );
}

interface AccordionQuestionsProps {
  categoryMap: Map<string, string>;
  questions: FaqQuestion[];
}

function AccordionQuestions({
  questions,
  categoryMap,
}: AccordionQuestionsProps) {
  return (
    <div className="border-border bg-card rounded-lg border px-4 sm:px-6">
      <Accordion className="w-full" collapsible type="single">
        {questions.map((item) => {
          const catName = item.categoryId
            ? categoryMap.get(item.categoryId)
            : null;

          return (
            <AccordionItem
              className="border-border"
              key={item.id}
              value={item.id}
            >
              <AccordionTrigger className="text-foreground hover:text-foreground/80 gap-4 py-4 text-[15px] font-medium hover:no-underline">
                <div className="space-y-1 text-start">
                  {!!catName && (
                    <span className="text-muted-foreground block text-xs font-normal">
                      {catName}
                    </span>
                  )}
                  <span className="block leading-snug">{item.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-0.5 pb-5 text-sm leading-relaxed whitespace-pre-line">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

interface DialogQuestionsListProps {
  categoryMap: Map<string, string>;
  onOpen: (question: FaqQuestion) => void;
  questions: FaqQuestion[];
}

function DialogQuestionsList({
  questions,
  categoryMap,
  onOpen,
}: DialogQuestionsListProps) {
  return (
    <div className="divide-border border-border bg-card divide-y rounded-lg border">
      {questions.map((item) => {
        const catName = item.categoryId
          ? categoryMap.get(item.categoryId)
          : null;

        return (
          <button
            className="hover:bg-accent/35 focus-visible:ring-ring flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition-colors first:rounded-t-lg last:rounded-b-lg focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:px-6"
            key={item.id}
            onClick={() => onOpen(item)}
            type="button"
          >
            <div className="min-w-0 space-y-1">
              {!!catName && (
                <span className="text-muted-foreground block text-xs">
                  {catName}
                </span>
              )}
              <span className="text-foreground block text-[15px] leading-snug font-medium">
                {item.question}
              </span>
            </div>
            <ChevronLeft
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
          </button>
        );
      })}
    </div>
  );
}
