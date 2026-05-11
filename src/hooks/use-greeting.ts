import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getDailyGreeting } from "@/actions/ai-greeting";

export function useDailyGreeting() {
  const locale = useLocale();
  return useQuery({
    queryKey: ["dashboard.greeting", locale],
    queryFn: () => getDailyGreeting(),
    staleTime: 1000 * 60 * 60 * 6,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
