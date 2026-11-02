
"use client";

import { useEffect, useState } from "react";
import styles from "./GoUpButton.module.css";

export default function GoUpButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      className={`${styles.goUpButton} ${
        visible ? styles.visible : ""
      }`}
      onClick={scrollToTop}
      aria-label="Go to top"
      title="Go to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 15L12 8L19 15"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </button>
  );
}
