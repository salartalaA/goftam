"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import {
  type CredentialsFormValues,
  credentialsSchema,
} from "@/lib/validations";

export function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => credentialsSchema(mode === "register"), [mode]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const handleModeChange = (nextMode: string) => {
    if (nextMode === "login" || nextMode === "register") {
      setMode(nextMode);
      setFormError(null);
      reset({ email: "", password: "" });
    }
  };

  const onValidSubmit = async (values: CredentialsFormValues) => {
    setFormError(null);
    const email = values.email.trim();
    const { password } = values;

    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: email.split("@")[0] || email,
          });

    if (result.error) {
      setFormError(
        result.error.message ??
          "امکان ادامه عملیات وجود ندارد. لطفاً دوباره تلاش کنید."
      );
      return;
    }

    toast.success(
      mode === "login"
        ? `با ایمیل ${email} وارد شدید`
        : "حساب کاربری با موفقیت ساخته شد"
    );
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col justify-between px-4 py-8 sm:px-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link className="flex items-center gap-2.5" href="/">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <BookOpen aria-hidden="true" className="size-4" />
          </div>
          <span className="font-heading text-foreground text-base font-semibold tracking-tight whitespace-nowrap">
            گفتم
          </span>
        </Link>
      </header>

      <main className="mx-auto my-auto w-full max-w-[420px] py-10">
        <div className="mb-6 text-center">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {mode === "login" ? "ورود به صفحه پرسش‌ها" : "ساخت حساب کاربری"}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            یک صفحه متمرکز پرسش‌های متداول بسازید، دسته‌بندی کنید و با دیگران به
            اشتراک بگذارید.
          </p>
        </div>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <Tabs
              className="w-full"
              defaultValue="login"
              dir="rtl"
              onValueChange={handleModeChange}
              value={mode}
            >
              <TabsList className="grid w-full grid-cols-2 gap-2">
                <TabsTrigger
                  className={mode === "login" ? "bg-primary/10" : ""}
                  value="login"
                >
                  ورود
                </TabsTrigger>
                <TabsTrigger
                  className={mode === "register" ? "bg-primary/10" : ""}
                  value="register"
                >
                  ثبت‌نام
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-4">
            <form
              className="space-y-4"
              noValidate
              onSubmit={handleSubmit(onValidSubmit)}
            >
              {!!formError && (
                <div
                  className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="auth-email">ایمیل</Label>
                <Input
                  aria-invalid={Boolean(errors.email)}
                  autoComplete="email"
                  dir="ltr"
                  disabled={isSubmitting}
                  id="auth-email"
                  placeholder="you@company.ir"
                  type="email"
                  {...register("email")}
                />
                {!!errors.email && (
                  <p className="text-destructive text-xs">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-password">رمز عبور</Label>
                <Input
                  aria-invalid={Boolean(errors.password)}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  disabled={isSubmitting}
                  id="auth-password"
                  placeholder={
                    mode === "register"
                      ? "حداقل ۱۲ کاراکتر"
                      : "رمز عبور خود را وارد کنید"
                  }
                  type="password"
                  {...register("password")}
                />
                {!!errors.password && (
                  <p className="text-destructive text-xs">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <>
                    <Loader2
                      aria-hidden="true"
                      className="me-2 size-4 animate-spin"
                    />
                    {mode === "login"
                      ? "در حال ورود..."
                      : "در حال ساخت حساب..."}
                  </>
                ) : (
                  <>
                    {mode === "login" ? "ورود به حساب" : "ایجاد حساب کاربری"}
                    <ArrowLeft aria-hidden="true" className="ms-2 size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-5 text-center text-xs">
          اطلاعات شما به صورت امن در پایگاه داده ذخیره می‌شود.
        </p>
      </main>

      <footer className="text-muted-foreground mx-auto w-full max-w-5xl text-center text-xs">
        گفتم — پایگاه دانش متمرکز برای تیم‌ها و سازندگان.
      </footer>
    </div>
  );
}
