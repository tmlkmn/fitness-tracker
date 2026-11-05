import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { normalizeLocale } from "@/lib/locale";
import {
  pickGateway,
  countryFromHeaders,
  type Gateway,
} from "@/lib/billing/gateway-router";

/**
 * Server-side gateway resolution for billing pages — combines the active
 * locale with the request's IP country.
 */
export async function resolveGateway(): Promise<Gateway> {
  const hdrs = await headers();
  return pickGateway({
    userLocale: normalizeLocale(await getLocale()),
    country: countryFromHeaders(hdrs),
  });
}
