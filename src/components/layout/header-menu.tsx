"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

export function HeaderMenu() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as Record<string, unknown>)?.role === "admin";
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/giris");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label="Menü"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" />
            Geri Bildirim
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOnboardingOpen(true)}>
            <HelpCircle className="h-4 w-4" />
            Uygulama Rehberi
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="h-4 w-4" />
                Admin Paneli
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === "dark" ? "Açık Tema" : "Koyu Tema"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <OnboardingCarousel open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </>
  );
}
