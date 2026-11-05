import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Global footer with legal links and the legal sender identity. The company
 * name + address satisfy the Lemon Squeezy store-approval requirement and are
 * read from env so they stay out of source control.
 */
export async function Footer() {
  const t = await getTranslations("footer");
  const td = await getTranslations("disclaimer");
  const company = process.env.COMPANY_LEGAL_NAME ?? "FitMusc";
  const address = process.env.COMPANY_ADDRESS;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-border px-4 py-6 text-xs text-muted-foreground">
      <nav
        aria-label="Legal"
        className="flex flex-wrap gap-x-4 gap-y-2 justify-center"
      >
        <Link href="/fiyatlandirma" className="hover:text-primary">
          {t("links.pricing")}
        </Link>
        <Link href="/kullanim-sartlari" className="hover:text-primary">
          {t("links.terms")}
        </Link>
        <Link href="/gizlilik" className="hover:text-primary">
          {t("links.privacy")}
        </Link>
        <Link href="/kvkk" className="hover:text-primary">
          {t("links.kvkk")}
        </Link>
        <Link href="/iade-politikasi" className="hover:text-primary">
          {t("links.refund")}
        </Link>
        <Link href="/cerez-politikasi" className="hover:text-primary">
          {t("links.cookie")}
        </Link>
        <Link href="/iletisim" className="hover:text-primary">
          {t("links.contact")}
        </Link>
        <Link href="/feragatname" className="hover:text-primary">
          {t("links.disclaimer")}
        </Link>
      </nav>
      <p className="mt-3 text-center">
        {td("short")}{" "}
        <Link href="/feragatname" className="underline hover:text-primary">
          {td("moreInfo")}
        </Link>
      </p>
      <p className="mt-2 text-center">
        © {year} {company} · {t("rights")}
        {address ? ` · ${address}` : ""}
      </p>
    </footer>
  );
}
