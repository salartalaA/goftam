import type { Metadata } from "next";
import { Geist_Mono, Vazirmatn } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "گفتم — سازنده صفحه پرسش‌های متداول",
  description:
    "ساخت، دسته‌بندی و اشتراک‌گذاری صفحه پرسش‌های متداول با نشانی اختصاصی.",
  openGraph: {
    title: "گفتم — سازنده صفحه پرسش‌های متداول",
    description:
      "ساخت، دسته‌بندی و اشتراک‌گذاری صفحه پرسش‌های متداول با نشانی اختصاصی.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`dark ${vazirmatn.variable} ${geistMono.variable}`}
      dir="rtl"
      lang="fa"
    >
      <body>
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        <Toaster dir="rtl" position="bottom-left" theme="dark" />
      </body>
    </html>
  );
}
