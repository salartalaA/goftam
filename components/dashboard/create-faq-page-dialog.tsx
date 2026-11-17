"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeSlug } from "@/lib/faq";
import { type FaqPageFormValues, faqPageSchema } from "@/lib/validations";
import type { FaqPage } from "@/types/faq";

interface FaqPageFormDialogProps {
  editingPage?: FaqPage | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { title: string; slug: string }) => Promise<boolean>;
  open: boolean;
}

export function FaqPageFormDialog({
  open,
  onOpenChange,
  editingPage,
  onSubmit,
}: FaqPageFormDialogProps) {
  const schema = faqPageSchema();
  const slugTouchedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FaqPageFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", slug: "" },
  });

  const titleValue = watch("title");

  useEffect(() => {
    if (open) {
      reset({
        title: editingPage?.title ?? "",
        slug: editingPage?.slug ?? "",
      });
      slugTouchedRef.current = Boolean(editingPage);
    }
  }, [open, editingPage, reset]);

  useEffect(() => {
    if (open && !slugTouchedRef.current) {
      setValue("slug", normalizeSlug(titleValue), {
        shouldValidate: false,
      });
    }
  }, [titleValue, open, setValue]);

  const onValidSubmit = async (values: FaqPageFormValues) => {
    const ok = await onSubmit({
      title: values.title.trim(),
      slug: normalizeSlug(values.slug),
    });
    if (ok) {
      onOpenChange(false);
    }
  };

  const originHost =
    typeof window === "undefined" ? "example.com" : window.location.host;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {editingPage ? "ویرایش مشخصات صفحه" : "ساخت صفحه پرسش‌های متداول"}
          </DialogTitle>
          <DialogDescription>
            {editingPage
              ? "عنوان صفحه یا شناسه نشانی عمومی خود را ویرایش کنید."
              : "صفحه پرسش‌های متداول شما بلافاصله پس از ایجاد با این نشانی یکتا در دسترس عموم قرار می‌گیرد."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 pt-1"
          noValidate
          onSubmit={handleSubmit(onValidSubmit)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="faq-page-title">عنوان صفحه</Label>
            <Input
              aria-invalid={Boolean(errors.title)}
              disabled={isSubmitting}
              id="faq-page-title"
              placeholder="مثلاً: مرکز راهنمای ابر پارس"
              {...register("title")}
            />
            {!!errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="faq-page-slug">شناسه نشانی عمومی</Label>
            <div
              className="border-input bg-muted/40 focus-within:ring-ring/30 flex items-center rounded-md border focus-within:ring-2"
              dir="ltr"
            >
              <span className="text-muted-foreground max-w-[145px] truncate pr-1 pl-3 font-mono text-xs whitespace-nowrap select-none">
                {originHost}/
              </span>
              <Input
                aria-invalid={Boolean(errors.slug)}
                className="border-0 bg-transparent pl-0 font-mono text-sm shadow-none focus-visible:ring-0"
                dir="ltr"
                disabled={isSubmitting}
                id="faq-page-slug"
                placeholder="parscloud-help"
                {...register("slug", {
                  onChange: (e) => {
                    slugTouchedRef.current = true;
                    setValue("slug", normalizeSlug(e.target.value), {
                      shouldValidate: Boolean(errors.slug),
                    });
                  },
                })}
              />
            </div>
            {errors.slug ? (
              <p className="text-destructive text-xs">{errors.slug.message}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                فقط حروف کوچک انگلیسی، اعداد و خط تیره (-) مجاز است.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
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
              {editingPage ? "ذخیره تغییرات" : "ایجاد صفحه پرسش‌ها"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
