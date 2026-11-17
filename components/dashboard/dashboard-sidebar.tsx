"use client";

import {
  BookOpen,
  ChevronsUpDown,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import type { DashboardSection, FaqPage } from "@/types/faq";
import type { DashboardUser } from "./dashboard-layout";

interface DashboardSidebarProps {
  activeSection: DashboardSection;
  isLoggingOut?: boolean;
  onLogout: () => void;
  onOpenPublicPage: (slug: string) => void;
  onSelectSection: (section: DashboardSection) => void;
  page: FaqPage | null;
  user: DashboardUser;
}

export function DashboardSidebar({
  user,
  page,
  activeSection,
  isLoggingOut,
  onSelectSection,
  onLogout,
}: DashboardSidebarProps) {
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNavigate = (section: DashboardSection) => {
    onSelectSection(section);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navItems: Array<{
    id: DashboardSection;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
    disabled?: boolean;
  }> = [
    {
      id: "overview",
      label: "نمای کلی",
      icon: LayoutDashboard,
    },
    {
      id: "questions",
      label: "پرسش‌ها",
      icon: HelpCircle,
      count: page ? page.questions.length : undefined,
      disabled: !page,
    },
    {
      id: "categories",
      label: "دسته‌بندی‌ها",
      icon: FolderOpen,
      count: page ? page.categories.length : undefined,
      disabled: !page,
    },
    {
      id: "template",
      label: "قالب نمایش",
      icon: LayoutTemplate,
      disabled: !page,
    },
  ];

  return (
    <Sidebar collapsible="icon" dir="rtl" side="right">
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
            <BookOpen aria-hidden="true" className="size-3.5" />
          </div>
          <span className="font-heading text-sidebar-foreground truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            گفتم
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>فضای کاری</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem
                    className="not-first-of-type:mt-2"
                    key={item.id}
                  >
                    <SidebarMenuButton
                      disabled={item.disabled}
                      isActive={activeSection === item.id}
                      onClick={() => handleNavigate(item.id)}
                      tooltip={item.label}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.count !== undefined && (
                      <SidebarMenuBadge className="text-muted-foreground font-mono tabular-nums">
                        {item.count}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  size="lg"
                >
                  <div className="bg-secondary text-secondary-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-medium uppercase">
                    {user.email.slice(0, 2)}
                  </div>
                  <div className="grid flex-1 text-start text-xs leading-tight group-data-[collapsible=icon]:hidden">
                    <span
                      className="text-sidebar-foreground truncate text-start font-medium"
                      dir="ltr"
                    >
                      {user.email}
                    </span>
                    <span className="text-muted-foreground truncate text-[11px]">
                      {user.name ?? "فضای شخصی"}
                    </span>
                  </div>
                  <ChevronsUpDown
                    aria-hidden="true"
                    className="text-muted-foreground ms-auto size-4 group-data-[collapsible=icon]:hidden"
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56" side="top">
                <DropdownMenuItem disabled={isLoggingOut} onClick={onLogout}>
                  {isLoggingOut ? (
                    <Loader2
                      aria-hidden="true"
                      className="me-2 size-4 animate-spin"
                    />
                  ) : (
                    <LogOut aria-hidden="true" className="me-2 size-4" />
                  )}
                  <span>خروج از حساب</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
