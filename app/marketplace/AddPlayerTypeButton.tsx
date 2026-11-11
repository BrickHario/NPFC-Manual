
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  addSavedPlayerId,
  getSavedPlayerIds,
} from "@/app/training-planner/player-selection";
import styles from "./PlayerInfo.module.css";

type Props = {
  playerId: number;
};

export default function AddPlayerTypeButton({
  playerId,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsAdded(getSavedPlayerIds().includes(playerId));
      setLoaded(true);
    };

    update();

    window.addEventListener("pageshow", update);
    window.addEventListener("focus", update);

    return () => {
      window.removeEventListener("pageshow", update);
      window.removeEventListener("focus", update);
    };
  }, [playerId]);

  if (!loaded || isAdded) return null;

  return (
    <Link
      href={`/training-planner?playerId=${playerId}`}
      className={styles.addPlayerType}
      onClick={() => {
        addSavedPlayerId(playerId);
        setIsAdded(true);
      }}
    >
      Add to training planner
    </Link>
  );
}
