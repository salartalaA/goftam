import { z } from "zod";
import { validateSlug } from "@/lib/faq";

// Maximum lengths for user-provided strings. These are enforced on the
// server via the same schemas used by the client forms.
const LIMITS = {
  email: 320,
  password: 128,
  pageTitle: 120,
  pageSlug: 100,
  question: 300,
  answer: 5000,
  categoryName: 60,
  categoryId: 64,
} as const;

export const idSchema = z.string().min(1).max(LIMITS.categoryId);

export const credentialsSchema = (isRegistration: boolean) =>
  z.object({
    email: z
      .string("لطفاً یک نشانی ایمیل معتبر وارد کنید.")
      .trim()
      .min(1, "نشانی ایمیل الزامی است.")
      .max(LIMITS.email, "نشانی ایمیل بیش از حد طولانی است.")
      .email("لطفاً یک نشانی ایمیل معتبر وارد کنید."),
    password: isRegistration
      ? z
          .string()
          .min(1, "رمز عبور الزامی است.")
          .min(12, "رمز عبور باید حداقل ۱۲ کاراکتر باشد.")
          .max(LIMITS.password, "رمز عبور بیش از حد طولانی است.")
      : z
          .string()
          .min(1, "رمز عبور الزامی است.")
          .max(LIMITS.password, "رمز عبور بیش از حد طولانی است."),
  });

export type CredentialsFormValues = z.infer<
  ReturnType<typeof credentialsSchema>
>;

// Slug uniqueness is intentionally NOT checked here: the client never
// receives other users' slugs. The server action queries the database
// directly (and the unique constraint on FaqPage.slug is the final guard).
export const faqPageSchema = () =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, "عنوان صفحه پرسش‌های متداول الزامی است.")
        .max(LIMITS.pageTitle, "عنوان صفحه بیش از حد طولانی است."),
      slug: z
        .string()
        .trim()
        .min(1, "شناسه نشانی عمومی الزامی است.")
        .max(LIMITS.pageSlug, "شناسه نشانی بیش از حد طولانی است."),
    })
    .superRefine((values, ctx) => {
      const slugError = validateSlug(values.slug);
      if (slugError) {
        ctx.addIssue({
          code: "custom",
          path: ["slug"],
          message: slugError,
        });
      }
    });

export type FaqPageFormValues = z.infer<ReturnType<typeof faqPageSchema>>;

export const questionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "متن پرسش الزامی است.")
    .max(LIMITS.question, "متن پرسش بیش از حد طولانی است."),
  answer: z
    .string()
    .trim()
    .min(1, "متن پاسخ الزامی است.")
    .max(LIMITS.answer, "متن پاسخ بیش از حد طولانی است."),
  categoryId: z.string().max(LIMITS.categoryId).nullable(),
});

export type QuestionFormValues = z.infer<typeof questionSchema>;

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "نام دسته‌بندی الزامی است.")
    .max(LIMITS.categoryName, "نام دسته‌بندی بیش از حد طولانی است."),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const faqTemplateSchema = z.enum(["accordion", "dialog"]);
