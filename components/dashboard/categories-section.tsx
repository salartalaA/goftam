"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FolderOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type CategoryFormValues, categorySchema } from "@/lib/validations";
import type { FaqCategory, FaqPage } from "@/types/faq";

interface CategoriesSectionProps {
  onCreateCategory: (name: string) => Promise<boolean>;
  onDeleteCategory: (categoryId: string) => Promise<boolean>;
  onRenameCategory: (categoryId: string, newName: string) => Promise<boolean>;
  page: FaqPage;
}

export function CategoriesSection({
  page,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoriesSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FaqCategory | null>(
    null
  );
  const [deletingCategory, setDeletingCategory] = useState<FaqCategory | null>(
    null
  );

  const formDialogOpen = isCreateOpen || editingCategory !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (editingCategory) {
      reset({ name: editingCategory.name });
    } else if (isCreateOpen) {
      reset({ name: "" });
    }
  }, [editingCategory, isCreateOpen, reset]);

  const closeFormDialog = (open: boolean) => {
    if (!open) {
      setIsCreateOpen(false);
      setEditingCategory(null);
    }
  };

  const onValidSubmit = async (values: CategoryFormValues) => {
    const trimmed = values.name.trim();
    const ok = editingCategory
      ? await onRenameCategory(editingCategory.id, trimmed)
      : await onCreateCategory(trimmed);
    if (ok) {
      closeFormDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) {
      return;
    }
    const ok = await onDeleteCategory(deletingCategory.id);
    if (ok) {
      setDeletingCategory(null);
    }
  };

  const countQuestionsInCategory = (categoryId: string) =>
    page.questions.filter((q) => q.categoryId === categoryId).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            دسته‌بندی‌ها
          </h1>
          <p className="text-muted-foreground text-sm">
            پرسش‌های خود را در بخش‌های مجزا گروه‌بندی کنید تا یافتن پاسخ ساده‌تر
            شود.
          </p>
        </div>
        <Button
          className="shrink-0 self-start sm:self-auto"
          onClick={() => setIsCreateOpen(true)}
          type="button"
        >
          <Plus aria-hidden="true" className="me-1.5 size-4" />
          دسته‌بندی جدید
        </Button>
      </div>

      {page.categories.length === 0 ? (
        <Empty className="bg-card border py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen aria-hidden="true" className="size-4" />
            </EmptyMedia>
            <EmptyTitle>هنوز دسته‌بندی ندارید</EmptyTitle>
            <EmptyDescription>
              دسته‌بندی‌های ساده‌ای مانند شروع کار، صورتحساب یا امنیت بسازید تا
              پرسش‌های شما منظم‌تر نمایش داده شوند.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <Plus aria-hidden="true" className="me-1.5 size-3.5" />
              ساخت دسته‌بندی
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="divide-border border-border bg-card divide-y rounded-lg border">
          {page.categories.map((cat) => {
            const count = countQuestionsInCategory(cat.id);
            return (
              <div
                className="hover:bg-accent/35 flex items-center justify-between gap-4 px-4 py-3.5 transition-colors sm:px-5"
                key={cat.id}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-foreground truncate text-sm font-medium">
                    {cat.name}
                  </p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {count} پرسش
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label={`تغییر نام «${cat.name}»`}
                        onClick={() => setEditingCategory(cat)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>تغییر نام دسته‌بندی</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label={`حذف «${cat.name}»`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingCategory(cat)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>حذف دسته‌بندی</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Rename Category Dialog */}
      <Dialog onOpenChange={closeFormDialog} open={formDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "تغییر نام دسته‌بندی" : "دسته‌بندی جدید"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "نام جدیدی برای این دسته‌بندی انتخاب کنید."
                : "یک دسته‌بندی برای گروه‌بندی پرسش‌های مرتبط اضافه کنید."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4 pt-1"
            noValidate
            onSubmit={handleSubmit(onValidSubmit)}
          >
            <div className="space-y-1.5">
              <Label htmlFor="category-name-input">نام دسته‌بندی</Label>
              <Input
                aria-invalid={Boolean(errors.name)}
                disabled={isSubmitting}
                id="category-name-input"
                placeholder="مثلاً: شروع کار"
                {...register("name")}
              />
              {!!errors.name && (
                <p className="text-destructive text-xs">
                  {errors.name.message}
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
                {editingCategory ? "ذخیره نام" : "ساخت دسته‌بندی"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategory(null);
          }
        }}
        open={deletingCategory !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>دسته‌بندی حذف شود؟</AlertDialogTitle>
            <AlertDialogDescription>
              با حذف دسته‌بندی{" "}
              <span className="text-foreground font-medium">
                «{deletingCategory?.name}»
              </span>{" "}
              خود دسته‌بندی پاک می‌شود، اما پرسش‌های متصل به آن حذف نخواهند شد و به
              حالت «بدون دسته‌بندی» منتقل می‌شوند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              variant="destructive"
            >
              حذف دسته‌بندی
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
