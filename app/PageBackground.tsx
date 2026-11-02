
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PageBackground() {
  const pathname = usePathname();

  useEffect(() => {
    let background = "/bg_pattern.png";

    if (pathname.startsWith("/marketplace")) {
      background = "/bg_pattern.png";
    } else if (
      pathname.startsWith("/combo-maker") ||
      pathname.startsWith("/cards-and-combos")
    ) {
      background = "/bg_pattern2.png";
    }

    document.body.style.backgroundImage = `url("${background}")`;

    return () => {
      document.body.style.removeProperty("background-image");
    };
  }, [pathname]);

  return null;
}
