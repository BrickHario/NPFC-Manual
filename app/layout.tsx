import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NPFC Manual",
  description: "NPFC Manual",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <nav className="site-nav" aria-label="Hauptnavigation">
          <Link className="site-brand" href="/">NPFC Manual</Link>
          <div className="site-nav-links">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/combo-maker">Cards and Combos</Link>
          </div>
        </nav>

        {children}

        <footer className="site-footer">
          <p>© Brickhario</p>
          <a href="https://youtu.be/nC17KBb68ns?si=Z_u-KDu1CzXaZWLb" target="_blank">Was ist NPFC?</a>
        </footer>
      </body>
    </html>
  );
}
