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
            {/* <Link href="/combo-maker">Combo Maker</Link> */}
          </div>
        </nav>

        {children}

        <footer className="site-footer"><p>© Brickhario</p></footer>
      </body>
    </html>
  );
}
