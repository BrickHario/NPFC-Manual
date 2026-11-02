
"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./HorizontalScrollArea.module.css";

type Props = {
  children: ReactNode;
  label: string;
  className?: string;
};

export default function HorizontalScrollArea({
  children,
  label,
  className = "",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [scrollPosition, setScrollPosition] =
    useState(0);

  const [thumbWidth, setThumbWidth] =
    useState(100);

  const [canScroll, setCanScroll] =
    useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateScroll = () => {
      const visibleWidth = element.clientWidth;
      const totalWidth = element.scrollWidth;

      const maxScroll = totalWidth - visibleWidth;

      const visiblePercent =
        totalWidth > 0
          ? (visibleWidth / totalWidth) * 100
          : 100;

      const positionPercent =
        maxScroll > 0
          ? element.scrollLeft / maxScroll
          : 0;

      setCanScroll(maxScroll > 1);

      setThumbWidth(
        Math.min(100, Math.max(10, visiblePercent))
      );

      setScrollPosition(positionPercent);
    };

    const observer = new ResizeObserver(updateScroll);

    observer.observe(element);

    if (element.firstElementChild) {
      observer.observe(element.firstElementChild);
    }

    element.addEventListener("scroll", updateScroll, {
      passive: true,
    });

    window.addEventListener(
      "resize",
      updateScroll
    );

    updateScroll();

    return () => {
      observer.disconnect();

      element.removeEventListener(
        "scroll",
        updateScroll
      );

      window.removeEventListener(
        "resize",
        updateScroll
      );
    };
  }, []);

  const thumbTravel = 100 - thumbWidth;

  return (
    <div className={styles.wrapper}>
      <div
        ref={scrollRef}
        className={`${styles.scrollArea} ${className}`}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>

      {canScroll && (
        <div
          className={styles.scrollIndicator}
          aria-hidden="true"
        >
          <div
            className={styles.scrollThumb}
            style={{
              width: `${thumbWidth}%`,
              left: `${
                scrollPosition * thumbTravel
              }%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
