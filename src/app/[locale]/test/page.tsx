import { redirect } from "next/navigation";
import { getAuthAdmin } from "@/lib/auth-utils";
import TestPageClient from "./test-page-client";

// Notification test surface. Admin-only — the page can fire arbitrary
// emails / push notifications to the logged-in user's own channels, which
// is useful for diagnosing delivery issues but should never be exposed to
// regular users in production.
export default async function TestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  try {
    await getAuthAdmin();
  } catch {
    redirect(`/${locale}`);
  }

  return <TestPageClient />;
}
