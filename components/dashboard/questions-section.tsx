"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatShortDate } from "@/lib/clipboard";
import { filterQuestions } from "@/lib/faq";
import { type QuestionFormValues, questionSchema } from "@/lib/validations";
import type { FaqPage, FaqQuestion } from "@/types/faq";

interface QuestionsSectionProps {
  isAddDialogOpen: boolean;
  onAddDialogOpenChange: (open: boolean) => void;
  onAddQuestion: (input: {
    question: string;
    answer: string;
    categoryId: string | null;
  }) => Promise<boolean>;
  onDeleteQuestion: (questionId: string) => Promise<boolean>;
  onUpdateQuestion: (
    questionId: string,
    updates: {
      question: string;
      answer: string;
      categoryId: string | null;
    }
  ) => Promise<boolean>;
  page: FaqPage;
}

export function QuestionsSection({
  page,
  isAddDialogOpen,
  onAddDialogOpenChange,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
}: QuestionsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [editingQuestion, setEditingQuestion] = useState<FaqQuestion | null>(
    null
  );
  const [deletingQuestion, setDeletingQuestion] = useState<FaqQuestion | null>(
    null
  );

  const dialogOpen = isAddDialogOpen || editingQuestion !== null;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: { question: "", answer: "", categoryId: null },
  });

  useEffect(() => {
    if (editingQuestion) {
      reset({
        question: editingQuestion.question,
        answer: editingQuestion.answer,
        categoryId: editingQuestion.categoryId,
      });
    } else if (isAddDialogOpen) {
      reset({
        question: "",
        answer: "",
        categoryId:
          categoryFilter !== "all" && categoryFilter !== "uncategorized"
            ? categoryFilter
            : null,
      });
    }
  }, [editingQuestion, isAddDialogOpen, categoryFilter, reset]);

  const closeFormDialog = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditingQuestion(null);
      onAddDialogOpenChange(false);
    }
  };

  const categoryMap = useMemo(
    () => new Map(page.categories.map((c) => [c.id, c.name])),
    [page.categories]
  );

  const filteredQuestions = useMemo(
    () => filterQuestions(page.questions, searchQuery, categoryFilter),
    [page.questions, searchQuery, categoryFilter]
  );

  const onValidSubmit = async (values: QuestionFormValues) => {
    const payload = {
      question: values.question.trim(),
      answer: values.answer.trim(),
      categoryId: values.categoryId,
    };
    const ok = editingQuestion
      ? await onUpdateQuestion(editingQuestion.id, payload)
      : await onAddQuestion(payload);
    if (ok) {
      closeFormDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingQuestion) {
      return;
    }
    const ok = await onDeleteQuestion(deletingQuestion.id);
    if (ok) {
      setDeletingQuestion(null);
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || categoryFilter !== "all";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            پرسش‌ها
          </h1>
          <p className="text-muted-foreground text-sm">
            پرسش‌ها و پاسخ‌های صفحه عمومی خود را بسازید، ویرایش و دسته‌بندی کنید.
          </p>
        </div>
        <Button
          className="shrink-0 self-start sm:self-auto"
          onClick={() => onAddDialogOpenChange(true)}
          type="button"
        >
          <Plus aria-hidden="true" className="me-1.5 size-4" />
          افزودن پرسش
        </Button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            aria-label="جستجو در پرسش‌ها"
            className="bg-card ps-9 pe-8"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در پرسش‌ها و پاسخ‌ها..."
            type="text"
            value={searchQuery}
          />
          {!!searchQuery && (
            <button
              aria-label="پاک کردن جستجو"
              className="text-muted-foreground hover:text-foreground absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>

        <Select onValueChange={setCategoryFilter} value={categoryFilter}>
          <SelectTrigger
            aria-label="فیلتر بر اساس دسته‌بندی"
            className="bg-card w-full sm:w-[210px]"
          >
            <SelectValue placeholder="همه دسته‌بندی‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
            <SelectItem value="uncategorized">بدون دسته‌بندی</SelectItem>
            {page.categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Question List or Empty States */}
      <QuestionsContent
        categoryMap={categoryMap}
        filteredQuestions={filteredQuestions}
        hasActiveFilters={hasActiveFilters}
        onAddDialogOpenChange={onAddDialogOpenChange}
        onDeleteQuestion={setDeletingQuestion}
        onEditQuestion={setEditingQuestion}
        onResetFilters={() => {
          setSearchQuery("");
          setCategoryFilter("all");
        }}
        page={page}
      />

      {/* Create / Edit Question Dialog */}
      <Dialog onOpenChange={closeFormDialog} open={dialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "ویرایش پرسش" : "افزودن پرسش جدید"}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion
                ? "متن پرسش، پاسخ یا دسته‌بندی مرتبط با آن را ویرایش کنید."
                : "یک پرسش روشن و پاسخ دقیق برای بازدیدکنندگان بنویسید."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4 pt-1"
            noValidate
            onSubmit={handleSubmit(onValidSubmit)}
          >
            <div className="space-y-1.5">
              <Label htmlFor="question-input">پرسش</Label>
              <Input
                aria-invalid={Boolean(errors.question)}
                disabled={isSubmitting}
                id="question-input"
                placeholder="مثلاً: چگونه رمز عبور حساب خود را بازیابی کنم؟"
                {...register("question")}
              />
              {!!errors.question && (
                <p className="text-destructive text-xs">
                  {errors.question.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="question-category">دسته‌بندی</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    disabled={isSubmitting}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? null : value)
                    }
                    value={field.value ?? "none"}
                  >
                    <SelectTrigger id="question-category">
                      <SelectValue placeholder="انتخاب دسته‌بندی" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون دسته‌بندی</SelectItem>
                      {page.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="answer-textarea">پاسخ</Label>
              <Textarea
                aria-invalid={Boolean(errors.answer)}
                disabled={isSubmitting}
                id="answer-textarea"
                placeholder="پاسخ کامل و شفاف خود را بنویسید..."
                rows={5}
                {...register("answer")}
              />
              {!!errors.answer && (
                <p className="text-destructive text-xs">
                  {errors.answer.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                disabled={isSubmitting}
                onClick={() => closeFormDialog(false)}
                type="button"
                variant="outline"
              >
                انصراف
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {!!isSubmitting && (
                  <Loader2
                    aria-hidden="true"
                    className="me-2 size-4 animate-spin"
                  />
                )}
                {editingQuestion ? "ذخیره تغییرات" : "افزودن پرسش"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Question Confirmation */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingQuestion(null);
          }
        }}
        open={deletingQuestion !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>پرسش حذف شود؟</AlertDialogTitle>
            <AlertDialogDescription>
              با تایید این مورد، پرسش{" "}
              <span className="text-foreground font-medium">
                «{deletingQuestion?.question}»
              </span>{" "}
              برای همیشه از صفحه پرسش‌های متداول حذف می‌شود و قابل بازگردانی نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              variant="destructive"
            >
              حذف پرسش
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface QuestionsContentProps {
  categoryMap: Map<string, string>;
  filteredQuestions: FaqQuestion[];
  hasActiveFilters: boolean;
  onAddDialogOpenChange: (open: boolean) => void;
  onDeleteQuestion: (question: FaqQuestion) => void;
  onEditQuestion: (question: FaqQuestion) => void;
  onResetFilters: () => void;
  page: FaqPage;
}

function QuestionsContent({
  page,
  filteredQuestions,
  hasActiveFilters,
  categoryMap,
  onAddDialogOpenChange,
  onEditQuestion,
  onDeleteQuestion,
  onResetFilters,
}: QuestionsContentProps) {
  if (page.questions.length === 0) {
    return (
      <Empty className="bg-card border py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HelpCircle aria-hidden="true" className="size-4" />
          </EmptyMedia>
          <EmptyTitle>هنوز پرسشی ثبت نشده است</EmptyTitle>
          <EmptyDescription>
            با افزودن اولین پرسش و پاسخ، صفحه پرسش‌های متداول خود را بسازید.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => onAddDialogOpenChange(true)} size="sm">
            <Plus aria-hidden="true" className="me-1.5 size-3.5" />
            افزودن اولین پرسش
          </Button>
        </EmptyContent>
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
          <EmptyTitle>پرسشی یافت نشد</EmptyTitle>
          <EmptyDescription>
            هیچ پرسشی با عبارت جستجو یا دسته‌بندی انتخاب‌شده مطابقت نداشت.
          </EmptyDescription>
        </EmptyHeader>
        {!!hasActiveFilters && (
          <EmptyContent>
            <Button
              onClick={onResetFilters}
              size="sm"
              type="button"
              variant="outline"
            >
              پاک کردن فیلترها
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="divide-border border-border bg-card divide-y rounded-lg border">
      {filteredQuestions.map((item) => (
        <QuestionListItem
          categoryMap={categoryMap}
          item={item}
          key={item.id}
          onDelete={onDeleteQuestion}
          onEdit={onEditQuestion}
        />
      ))}
    </div>
  );
}

interface QuestionListItemProps {
  categoryMap: Map<string, string>;
  item: FaqQuestion;
  onDelete: (question: FaqQuestion) => void;
  onEdit: (question: FaqQuestion) => void;
}

function QuestionListItem({
  item,
  categoryMap,
  onEdit,
  onDelete,
}: QuestionListItemProps) {
  const categoryName = item.categoryId
    ? (categoryMap.get(item.categoryId) ?? "بدون دسته‌بندی")
    : "بدون دسته‌بندی";

  return (
    <div className="hover:bg-accent/35 flex items-start justify-between gap-4 px-4 py-4 transition-colors sm:px-5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-foreground text-sm leading-snug font-medium">
          {item.question}
        </p>
        <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
          {item.answer}
        </p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          <span>{categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            به‌روزرسانی {formatShortDate(item.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={`ویرایش «${item.question}»`}
              onClick={() => onEdit(item)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>ویرایش پرسش</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={`حذف «${item.question}»`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(item)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>حذف پرسش</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
