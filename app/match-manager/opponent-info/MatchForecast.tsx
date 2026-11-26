"use client";

import Image from "next/image";
import styles from "./MatchForecast.module.css";
import type { MatchPlayer } from "./match-forecast";
import { getResultsForecast, getTeamForecastStrength } from "./match-forecast";

type Props = {
  leftAbbr: string;
  rightAbbr: string;
  leftPlayers: MatchPlayer[];
  rightPlayers: MatchPlayer[];
  leftRankBase: number;
  rightRankBase: number;
  homeSide: 0 | 1 | null;
};

export default function MatchForecast({
  leftAbbr,
  rightAbbr,
  leftPlayers,
  rightPlayers,
  leftRankBase,
  rightRankBase,
  homeSide,
}: Props) {
  if (leftPlayers.length !== 18 || rightPlayers.length !== 18) {
    return null;
  }

  const leftStrength = getTeamForecastStrength(leftPlayers);
  const rightStrength = getTeamForecastStrength(rightPlayers);

  const forecast = getResultsForecast(
    leftStrength,
    rightStrength,
    leftRankBase,
    rightRankBase,
    homeSide,
  );

  if (forecast === null) {
    return null;
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>
          {leftAbbr} - {rightAbbr}
        </h2>

        <Image
          src="/switch.png"
          alt="Switch"
          width={48}
          height={48}
          unoptimized
          className={styles.switchIcon}
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.box}>
          <div className={styles.label}>Win</div>
          <div className={styles.value}>{forecast.team0Win}</div>
        </div>

        <div className={styles.box}>
          <div className={styles.label}>Draw</div>
          <div className={styles.value}>{forecast.draw}</div>
        </div>

        <div className={styles.box}>
          <div className={styles.label}>Win</div>
          <div className={styles.value}>{forecast.team1Win}</div>
        </div>
      </div>
    </section>
  );
}
