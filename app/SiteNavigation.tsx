
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function SiteNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();

  // Menü bei Seitenwechsel schließen
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Escape und Klick außerhalb
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
    };
  }, []);

  return (
    <div className="site-menu" ref={menuRef}>
      {/* Desktop Navigation */}
      <div className="site-nav-links">
        <Link href="/training-planner">
          Training Planner
        </Link>

        <Link href="/cards-and-combos">
          Cards and Combos
        </Link>
        <Link href="/marketplace">
          Marketplace
        </Link>

      </div>

      {/* Mobile Burger */}
      <button
        type="button"
        className={`site-menu-toggle ${
          isOpen ? "is-open" : ""
        }`}
        onClick={() =>
          setIsOpen((prev) => !prev)
        }
        aria-label={
          isOpen ? "Close menu" : "Open menu"
        }
        aria-expanded={isOpen}
        aria-controls="site-menu-panel"
      >
        <span className="burger-line" />
        <span className="burger-line" />
        <span className="burger-line" />
      </button>

      {/* Mobile Dropdown */}
      <div
        id="site-menu-panel"
        className={`site-menu-panel ${
          isOpen ? "is-open" : ""
        }`}
        inert={!isOpen}
      >
        <Link
          href="/training-planner"
          onClick={() => setIsOpen(false)}
        >
          Training Planner
        </Link>
        <Link
          href="/cards-and-combos"
          onClick={() => setIsOpen(false)}
        >
          Cards and Combos
        </Link>
        <Link
          href="/marketplace"
          onClick={() => setIsOpen(false)}
        >
          Marketplace
        </Link>
      </div>
    </div>
  );
}
