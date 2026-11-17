import { z } from "zod";
import { validateSlug } from "@/lib/faq";
import type { FaqPage } from "@/types/faq";

export const credentialsSchema = (isRegistration: boolean) =>
  z.object({
    email: z
      .string("لطفاً یک نشانی ایمیل معتبر وارد کنید.")
      .trim()
      .min(1, "نشانی ایمیل الزامی است."),
    password: isRegistration
      ? z
          .string()
          .min(1, "رمز عبور الزامی است.")
          .min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد.")
      : z.string().min(1, "رمز عبور الزامی است."),
  });

export type CredentialsFormValues = z.infer<
  ReturnType<typeof credentialsSchema>
>;

export function faqPageSchema(
  existingPages: Pick<FaqPage, "id" | "slug">[],
  ignorePageId?: string
) {
  return z
    .object({
      title: z.string().trim().min(1, "عنوان صفحه پرسش‌های متداول الزامی است."),
      slug: z.string(),
    })
    .superRefine((values, ctx) => {
      const slugError = validateSlug(values.slug, existingPages, ignorePageId);
      if (slugError) {
        ctx.addIssue({
          code: "custom",
          path: ["slug"],
          message: slugError,
        });
      }
    });
}

export type FaqPageFormValues = z.infer<ReturnType<typeof faqPageSchema>>;

export const questionSchema = z.object({
  question: z.string().trim().min(1, "متن پرسش الزامی است."),
  answer: z.string().trim().min(1, "متن پاسخ الزامی است."),
  categoryId: z.string().nullable(),
});

export type QuestionFormValues = z.infer<typeof questionSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "نام دسته‌بندی الزامی است."),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const faqTemplateSchema = z.enum(["accordion", "dialog"]);
