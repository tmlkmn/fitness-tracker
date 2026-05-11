"use client";

import { useState, useTransition } from "react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth-client";
import { useTheme } from "@/components/theme-provider";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";
import {
  MoreVertical,
  MessageSquarePlus,
  HelpCircle,
  Shield,
  Sun,
  Moon,
  LogOut,
  Search,
  Globe,
  Loader2,
} from "lucide-react";
import { useGlobalSearch } from "./global-search-provider";
import { updateUserLocale } from "@/actions/locale";
import type { Locale } from "@/lib/locale";

export function HeaderMenu() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as Record<string, unknown>)?.role === "admin";
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const currentLocale = useLocale() as Locale;

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [localePending, startLocaleTransition] = useTransition();
  const { open: openSearch } = useGlobalSearch();

  const handleSignOut = async () => {
    await signOut();
    router.push("/giris");
  };

  const handleLocaleChange = (next: Locale) => {
    if (next === currentLocale || localePending) return;
    startLocaleTransition(async () => {
      await updateUserLocale(next);
      router.replace(pathname, { locale: next });
      router.refresh();
    });
  };

  return (
    <>
      <button
        className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
        aria-label={t("search")}
        onClick={openSearch}
      >
        <Search className="h-5 w-5" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label={t("menu")}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" />
            {t("feedback")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOnboardingOpen(true)}>
            <HelpCircle className="h-4 w-4" />
            {t("appGuide")}
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="h-4 w-4" />
                {t("adminPanel")}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === "dark" ? t("lightTheme") : t("darkTheme")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleLocaleChange(currentLocale === "tr" ? "en" : "tr");
            }}
            disabled={localePending}
          >
            {localePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            {currentLocale === "tr" ? t("languageEnglish") : t("languageTurkish")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <OnboardingCarousel open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </>
  );
}
