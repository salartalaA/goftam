# گفتم (GoftaM)

سازنده صفحه پرسش‌های متداول (FAQ) — هر کاربر می‌تواند یک صفحه عمومی با قالب آکاردئون یا Dialog بسازد، آن را با دسته‌بندی و جستجو سازماندهی کند و از طریق نشانی `/<slug>` به اشتراک بگذارد.

ساخته‌شده با **Next.js 16 (App Router)**، **Prisma 7**، **Neon PostgreSQL**، **Better Auth**، **Zod**، **React Hook Form** و **Ultracite (Biome)**.

## پیش‌نیازها

- Node.js ≥ 22
- [pnpm](https://pnpm.io) (فقط pnpm — از npm/yarn/bun استفاده نکنید)
- یک دیتابیس [Neon PostgreSQL](https://neon.tech)

## راه‌اندازی

```bash
pnpm install
```

فایل `.env` را بر اساس `.env.example` بسازید:

```env
DATABASE_URL="postgresql://...pooler.../neondb?sslmode=require"   # اتصال pooling برای runtime
DIRECT_URL="postgresql://...direct.../neondb?sslmode=require"      # اتصال مستقیم برای migration های Prisma
BETTER_AUTH_SECRET="<یک رشته تصادفی ۶۴ کاراکتری>"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

سپس مایگریشن‌ها را روی دیتابیس اعمال کنید:

```bash
pnpm db:migrate   # توسعه: prisma migrate dev
pnpm db:deploy    # پروداکشن: prisma migrate deploy
```

اجرای محلی:

```bash
pnpm dev    # http://localhost:3000
```

## اسکریپت‌ها

| دستور | توضیح |
| --- | --- |
| `pnpm dev` | اجرای development server |
| `pnpm build` / `pnpm start` | بیلد و اجرای production |
| `pnpm lint` / `pnpm fix` | بررسی / اصلاح با Ultracite (Biome) |
| `pnpm typecheck` | بررسی TypeScript |
| `pnpm test` | تست‌های واحد (`lib/faq.test.ts`) |
| `pnpm db:generate` | تولید Prisma Client |
| `pnpm db:migrate` | ساخت و اعمال migration در محیط توسعه |
| `pnpm db:deploy` | اعمال migration ها در پروداکشن |
| `pnpm db:push` | همگام‌سازی مستقیم اسکیما بدون migration |
| `pnpm db:studio` | باز کردن Prisma Studio |

## معماری

- `app/` — روت‌های App Router: `/` (ورود/ثبت‌نام)، `/dashboard` (پنل مدیریت)، `/[slug]` (صفحه عمومی FAQ)، `/api/auth/[...all]` (Better Auth)
- `prisma/schema.prisma` — مدل‌های Better Auth + `FaqPage` / `FaqCategory` / `FaqQuestion`
- `lib/auth.ts` — پیکربندی Better Auth با Prisma adapter
- `lib/actions.ts` — Server Action های CRUD با بررسی session و مالکیت
- `lib/validations.ts` — اسکیمای Zod + React Hook Form
- `components/` — UI فارسی RTL (داشبورد، صفحات عمومی، کامپوننت‌های shadcn)

### قوانین دامنه

- هر کاربر فقط **یک** صفحه FAQ می‌تواند داشته باشد.
- اسلاگها به kebab-case نرمال می‌شوند و نام‌های رزروشده (`login`, `dashboard`, `api` و ...) ممنوع‌اند.
- حذف دسته‌بندی، پرسش‌های آن را حذف نمی‌کند — فقط بدون دسته می‌شوند.
- هیچ ورود دمو یا داده نمونه‌ای وجود ندارد؛ همه‌چیز واقعی و دیتابیسی است.

## هوک‌های Git (Lefthook)

- `pre-commit`: اجرای `ultracite fix` روی فایل‌های stage شده
- `pre-push`: `typecheck` + `lint` + `test`

## استقرار

متغیرهای محیطی production را تنظیم کنید (`DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL` با دامنه واقعی)، سپس:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm build
pnpm start
```
