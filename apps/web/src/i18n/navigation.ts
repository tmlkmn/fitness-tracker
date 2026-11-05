import { createNavigation } from "next-intl/navigation";
import type { ComponentProps } from "react";
import { routing } from "./routing";

const intl = createNavigation(routing);

export const { redirect, usePathname, getPathname } = intl;

// More permissive Router type that accepts arbitrary string paths.
// This relaxes next-intl's strict pathname typing so dynamic href strings
// (e.g. `/gun/${id}`, `/sifremi-unuttum?email=${email}`) keep compiling.
type LooseHref =
  | string
  | { pathname: string; params?: Record<string, string | number>; query?: Record<string, string | number | undefined> };

type LooseRouter = {
  push: (href: LooseHref, options?: { locale?: string; scroll?: boolean }) => void;
  replace: (href: LooseHref, options?: { locale?: string; scroll?: boolean }) => void;
  prefetch: (href: LooseHref, options?: { locale?: string }) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
};

export const useRouter: () => LooseRouter = intl.useRouter as unknown as () => LooseRouter;

type NextIntlLinkProps = ComponentProps<typeof intl.Link>;
type LooseLinkProps = Omit<NextIntlLinkProps, "href"> & { href: LooseHref };

export const Link = intl.Link as unknown as (props: LooseLinkProps) => ReturnType<typeof intl.Link>;
