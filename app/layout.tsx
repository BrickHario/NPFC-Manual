
import type { Metadata } from "next";
import Link from "next/link";
import SiteNavigation from "./SiteNavigation";
import "./globals.css";
import PageBackground from "./PageBackground";

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
        <PageBackground />
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

          <SiteNavigation />
        </nav>

        {children}

        <footer className="site-footer">
          <p>© Brickhario</p>

          <a
            href="https://youtu.be/nC17KBb68ns?si=Z_u-KDu1CzXaZWLb"
            target="_blank"
            rel="noopener noreferrer"
          >
            Was ist NPFC?
          </a>
        </footer>
      </body>
    </html>
  );
}
