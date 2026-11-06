"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { hasDataConsent } from "@fitmusc/shared/consent";
import { getMyConsents } from "@/actions/consent";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

// Pages an account without the data consent may still open (canonical paths):
// the consent page, auth/status pages and the public legal pages it links to.
const CONSENT_FREE = [
  "/acik-riza",
  "/giris",
  "/bekliyor",
  "/sifre-degistir",
  "/sifremi-unuttum",
  "/sifre-sifirla",
  "/dondurulmus",
  "/uyelik-doldu",
  "/deneme-bitti",
  "/gizlilik",
  "/kvkk",
  "/kullanim-sartlari",
  "/cerez-politikasi",
  "/feragatname",
  "/iletisim",
  "/tanitim",
  "/fiyatlandirma",
  "/iade-politikasi",
  "/kayit",
];

/**
 * Client-side backup of the proxy's consent redirect. The proxy reads the
 * session cookie cache and lets the request through when that cache has
 * expired; this catches those visits. The session copy is only a hint — the
 * redirect waits for the DB to confirm, so a just-given consent never loops.
 */
export function ConsentGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as
    | { role?: string | null; mustChangePassword?: boolean | null; dataConsentAt?: Date | string | null }
    | undefined;
  const exempt = CONSENT_FREE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const suspect =
    !!user && user.role !== "admin" && !user.mustChangePassword && !hasDataConsent(user.dataConsentAt);

  const consents = useQuery({
    queryKey: ["user.consents"],
    queryFn: () => getMyConsents(),
    enabled: suspect && !exempt,
    staleTime: 60_000,
    retry: false,
  });
  const missing = consents.isSuccess && !hasDataConsent(consents.data.dataConsentAt);

  useEffect(() => {
    if (missing && !exempt) router.replace("/acik-riza");
  }, [missing, exempt, router]);

  return null;
}
