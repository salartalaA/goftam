export type FaqTemplate = "accordion" | "dialog";

export interface FaqCategory {
  createdAt: string;
  id: string;
  name: string;
}

export interface FaqQuestion {
  answer: string;
  categoryId: string | null;
  createdAt: string;
  id: string;
  question: string;
  updatedAt: string;
}

export interface FaqPage {
  categories: FaqCategory[];
  createdAt: string;
  id: string;
  questions: FaqQuestion[];
  slug: string;
  template: FaqTemplate;
  title: string;
  updatedAt: string;
  userId: string;
}

// Page payload sent to the public /[slug] route — excludes the owner id.
export type PublicFaqPageData = Omit<FaqPage, "userId">;

export type DashboardSection =
  | "overview"
  | "questions"
  | "categories"
  | "template";
