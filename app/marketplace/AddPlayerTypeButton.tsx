"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./PlayerInfo.module.css";

type Props = {
  playerId: number;
};

export default function AddPlayerTypeButton({
  playerId,
}: Props) {
  const [selectedPlayerId, setSelectedPlayerId] =
    useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const syncSelection = () => {
      const savedId = localStorage.getItem(
        "npfc-player-type-id"
      );

      setSelectedPlayerId(
        savedId === null ? null : Number(savedId)
      );

      setLoaded(true);
    };

    syncSelection();

    window.addEventListener("pageshow", syncSelection);
    window.addEventListener("storage", syncSelection);

    return () => {
      window.removeEventListener("pageshow", syncSelection);
      window.removeEventListener("storage", syncSelection);
    };
  }, []);

  if (!loaded || selectedPlayerId === playerId) {
    return null;
  }

  return (
    <Link
      href={`/player-types?playerId=${playerId}`}
      className={styles.addPlayerType}
      onClick={() => {
        localStorage.setItem(
          "npfc-player-type-id",
          String(playerId)
        );
      }}
    >
      Add to player types
    </Link>
  );
}