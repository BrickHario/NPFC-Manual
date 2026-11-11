
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import SiteNavigation from "./SiteNavigation";
import "./globals.css";
import PageBackground from "./PageBackground";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "NPFC Manual",
  description: "NPFC Manual",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <PageBackground />
        </Suspense>

        <nav
          className="site-nav"
          aria-label="Main navigation"
        >
          <Link
            className="site-brand"
            href="/"
          >
            NPFC Manual
          </Link>

          <Suspense fallback={null}>
            <SiteNavigation />
          </Suspense>
        </nav>

        {children}

        <footer className="site-footer">
          <p>© BrickHario</p>

          <a
            href="https://youtu.be/nC17KBb68ns?si=Z_u-KDu1CzXaZWLb"
            target="_blank"
            rel="noopener noreferrer"
          >
            What is NPFC?
          </a>
        </footer>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
