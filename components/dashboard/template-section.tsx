"use client";

import { Check } from "lucide-react";
import type { FaqTemplate } from "@/types/faq";

interface TemplateSectionProps {
  onSelectTemplate: (template: FaqTemplate) => Promise<boolean>;
  selectedTemplate: FaqTemplate;
}

export function TemplateSection({
  selectedTemplate,
  onSelectTemplate,
}: TemplateSectionProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          قالب صفحه عمومی
        </h1>
        <p className="text-muted-foreground text-sm">
          انتخاب کنید پرسش‌ها و پاسخ‌ها با چه ساختاری برای بازدیدکنندگان صفحه
          عمومی نمایش داده شوند. تغییرات بلافاصله اعمال می‌شوند.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Template 1: Accordion */}
        <button
          aria-pressed={selectedTemplate === "accordion"}
          className={`group focus-visible:ring-ring rounded-lg border p-5 text-start transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            selectedTemplate === "accordion"
              ? "border-primary bg-card ring-primary ring-1"
              : "border-border bg-card hover:border-muted-foreground/60"
          }`}
          onClick={() => void onSelectTemplate("accordion")}
          type="button"
        >
          {/* Minimal Wireframe Preview Diagram */}
          <div
            aria-hidden="true"
            className="border-border bg-muted/50 mb-4 space-y-2 rounded-md border p-4"
          >
            <div className="border-border bg-card space-y-1.5 rounded border p-2.5">
              <div className="flex items-center justify-between">
                <div className="bg-foreground/85 h-2 w-32 rounded-xs" />
                <div className="bg-muted-foreground/70 h-2 w-2 rounded-xs" />
              </div>
              <div className="bg-muted-foreground/25 h-1.5 w-full rounded-xs" />
              <div className="bg-muted-foreground/25 h-1.5 w-4/5 rounded-xs" />
            </div>
            <div className="border-border bg-card flex items-center justify-between rounded border px-2.5 py-2">
              <div className="bg-muted-foreground/55 h-2 w-28 rounded-xs" />
              <div className="bg-muted-foreground/40 h-2 w-2 rounded-xs" />
            </div>
            <div className="border-border bg-card flex items-center justify-between rounded border px-2.5 py-2">
              <div className="bg-muted-foreground/55 h-2 w-36 rounded-xs" />
              <div className="bg-muted-foreground/40 h-2 w-2 rounded-xs" />
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-foreground text-sm font-semibold">
                آکاردئونی
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                پرسش‌ها در یک فهرست عمودی قرار می‌گیرند و با کلیک در همان صفحه باز
                می‌شوند. مناسب برای مرور سریع و پاسخ‌های کوتاه.
              </p>
            </div>
            <div
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                selectedTemplate === "accordion"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card"
              }`}
            >
              {selectedTemplate === "accordion" && (
                <Check aria-hidden="true" className="size-3" />
              )}
            </div>
          </div>
        </button>

        {/* Template 2: Dialog */}
        <button
          aria-pressed={selectedTemplate === "dialog"}
          className={`group focus-visible:ring-ring rounded-lg border p-5 text-start transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            selectedTemplate === "dialog"
              ? "border-primary bg-card ring-primary ring-1"
              : "border-border bg-card hover:border-muted-foreground/60"
          }`}
          onClick={() => void onSelectTemplate("dialog")}
          type="button"
        >
          {/* Minimal Wireframe Preview Diagram */}
          <div
            aria-hidden="true"
            className="border-border bg-muted/50 relative mb-4 space-y-2 overflow-hidden rounded-md border p-4"
          >
            <div className="border-border bg-card/70 rounded border px-2.5 py-2">
              <div className="bg-muted-foreground/35 h-2 w-28 rounded-xs" />
            </div>
            <div className="border-border bg-card/70 rounded border px-2.5 py-2">
              <div className="bg-muted-foreground/35 h-2 w-36 rounded-xs" />
            </div>
            <div className="border-border bg-card/70 rounded border px-2.5 py-2">
              <div className="bg-muted-foreground/35 h-2 w-24 rounded-xs" />
            </div>
            {/* Centered modal overlay wireframe */}
            <div className="bg-background/60 absolute inset-0 flex items-center justify-center p-3">
              <div className="border-border bg-popover w-4/5 space-y-2 rounded-md border p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="bg-foreground/85 h-2 w-24 rounded-xs" />
                  <div className="bg-muted-foreground/70 h-2 w-2 rounded-xs" />
                </div>
                <div className="bg-muted-foreground/25 h-1.5 w-full rounded-xs" />
                <div className="bg-muted-foreground/25 h-1.5 w-5/6 rounded-xs" />
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-foreground text-sm font-semibold">
                پنجره بازشو
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                هر پرسش به صورت ردیف‌های مجزا نمایش داده می‌شود و پاسخ آن در یک
                پنجره متمرکز در وسط صفحه باز می‌گردد. مناسب برای خواندن بی‌دغدغه.
              </p>
            </div>
            <div
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                selectedTemplate === "dialog"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card"
              }`}
            >
              {selectedTemplate === "dialog" && (
                <Check aria-hidden="true" className="size-3" />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
