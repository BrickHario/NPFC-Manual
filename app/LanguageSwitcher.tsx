
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./LanguageSwitcher.module.css";
import {
  getSavedLanguage,
  type Language,
} from "../lib/utils";

const LANGUAGES = [
  { code: "en", flag: "gb", name: "English" },
  { code: "de", flag: "de", name: "Deutsch" },
  { code: "es", flag: "es", name: "Español" },
  { code: "it", flag: "it", name: "Italiano" },
  { code: "fr", flag: "fr", name: "Français" },
] as const;

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState<Language>("en");
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLanguage(getSavedLanguage());
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function selectLanguage(next: Language) {
    document.cookie = `npfc-language=${next}; path=/; max-age=31536000; SameSite=Lax`;

    setLanguage(next);
    setOpen(false);
    window.location.reload();
  }

  const selected =
    LANGUAGES.find((item) => item.code === language) ??
    LANGUAGES[0];

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={`Language: ${selected.name}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <Image
          src={`https://flagcdn.com/w40/${selected.flag}.png`}
          alt={selected.name}
          width={28}
          height={19}
          unoptimized
          className={styles.flag}
        />
        <span className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.menu}>
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              title={item.name}
              aria-label={item.name}
              aria-pressed={item.code === language}
              className={`${styles.option} ${
                item.code === language ? styles.active : ""
              }`}
              onClick={() => selectLanguage(item.code)}
            >
              <Image
                src={`https://flagcdn.com/w40/${item.flag}.png`}
                alt=""
                width={28}
                height={19}
                unoptimized
                className={styles.flag}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
