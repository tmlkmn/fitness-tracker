// Root layout is minimal — html/body and providers live in src/app/[locale]/layout.tsx
// (next-intl localized routing pattern).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
