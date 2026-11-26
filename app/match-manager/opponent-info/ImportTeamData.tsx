"use client";

import Image from "next/image";
import matchStyles from "./match-manager-info.module.css";
import forecastStyles from "./MatchForecast.module.css";
import {
  getResultsForecast,
  getTeamForecastStrength,
  xpToForecastGrade,
  type MatchPlayer,
} from "./match-forecast";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode, ChangeEvent } from "react";
import {
  parseTeamSaveFiles,
  readImportedTeam,
  saveImportedTeam,
  removeImportedTeam,
  type ImportedTeam,
} from "./team-save-parser";
import styles from "./ImportTeamData.module.css";
import PlayersOnTeam, { type AssignedPlayer } from "./PlayersOnTeam";
import { LoadingSmall } from "@/app/Loading";
import { playerFootBits } from "./saved-player-metadata";
import TeamFormation from "./TeamFormation";
import { calculateAttributes, STADIUMS, type Language } from "@/lib/utils";
import {
  gradeScore,
  xpScore,
  type TeamExperienceGrades,
  type TeamStatsPlayer,
} from "./team-stats";
import { predictOpponentLineup } from "./predict-opponent-lineup";
import { isUnavailable } from "./player-availability";
import type { TeamFormationSlot } from "./team-formation";

const POT_KEYS = [
  "pot_01",
  "pot_02",
  "pot_03",
  "pot_04",
  "pot_05",
  "pot_06",
  "pot_07",
  "pot_08",
  "pot_09",
  "pot_10",
  "pot_11",
  "pot_12",
] as const;

export type TeamPlayerTypeProfile = {
  team_id: number;
  slot_id: number;
  extra_01: number | null;
  extra_02: number | null;
} & Record<typeof POT_KEYS[number], number | null>;

type TeamImportContextValue = {
  team: ImportedTeam | null;
  storedTeam: ImportedTeam | null;
  loaded: boolean;
  ownHome: boolean;
  toggleHome: () => void;
  opponentMetadata: OpponentMetadata | null;
  setTeam: (team: ImportedTeam) => void;
  removeTeam: () => void;
};

const TeamImportContext = createContext<TeamImportContextValue | null>(null);

function useTeamImport() {
  const context = useContext(TeamImportContext);

  if (!context) {
    throw new Error("Team import components require TeamImportProvider");
  }

  return context;
}

export function TeamImportProvider({
  children,
  teamId,
}: {
  children: ReactNode;
  teamId: number;
}) {
  const [storedTeam, setTeamState] = useState<ImportedTeam | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ownHome, setOwnHome] = useState(false);
  const roster = storedTeam?.opponents[teamId];
  const team =
    Array.isArray(roster) &&
    roster.length > 0 &&
    storedTeam?.opponentLineups[teamId]
      ? storedTeam
      : null;
  const opponentMetadata = useOpponentMetadata(team, teamId);

  useEffect(() => {
    function restoreTeam() {
      const restored = readImportedTeam();
      setTeamState(restored);
      if (!restored) setOwnHome(false);
      setLoaded(true);
    }

    restoreTeam();

    window.addEventListener("storage", restoreTeam);
    window.addEventListener("pageshow", restoreTeam);

    return () => {
      window.removeEventListener("storage", restoreTeam);
      window.removeEventListener("pageshow", restoreTeam);
    };
  }, []);

  function setTeam(imported: ImportedTeam) {
    saveImportedTeam(imported);
    setTeamState(imported);
    setOwnHome(false);
  }

  function removeTeam() {
    removeImportedTeam();
    setTeamState(null);
    setOwnHome(false);
  }

  return (
    <TeamImportContext.Provider
      value={{
        team,
        storedTeam,
        loaded,
        ownHome: !!team && ownHome,
        toggleHome: () => setOwnHome((previous) => !previous),
        setTeam,
        removeTeam,
        opponentMetadata,
      }}
    >
      {children}
    </TeamImportContext.Provider>
  );
}

export function ImportTeamHeader({
  title,
  abbr,
}: {
  title: string;
  abbr: string;
}) {
  const { storedTeam: team, loaded, setTeam, removeTeam } = useTeamImport();

  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const imported = await parseTeamSaveFiles(files);

      setTeam(imported);
      setSuccess(`${imported.name} imported`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed");
    } finally {
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleButtonClick() {
    if (busy || !loaded) return;

    setError("");
    setSuccess("");

    if (!team) {
      inputRef.current?.click();
      return;
    }

    setBusy(true);

    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      removeTeam();
    } catch {
      setError("Unable to remove imported data");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>
        {title} ({abbr})
      </h1>

      <div className={styles.actions}>
        <input
          ref={inputRef}
          type="file"
          accept=".bin"
          multiple
          disabled={busy || !loaded}
          onChange={handleFiles}
          className={styles.fileInput}
          aria-label="Select NPFC save files"
        />

        {success && (
          <div role="status" className={`${styles.message} ${styles.success}`}>
            {success}
          </div>
        )}

        {error && (
          <div role="alert" className={`${styles.message} ${styles.error}`}>
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={busy || !loaded}
          onClick={handleButtonClick}
          title={
            team
              ? "Remove imported team data"
              : "Select savedata0.bin, savedata1.bin or savedata2.bin"
          }
          className={styles.importButton}
          aria-busy={busy || !loaded}
        >
          {busy || !loaded ? (
            <LoadingSmall />
          ) : team ? (
            "Remove imported data"
          ) : (
            "Import Team"
          )}
        </button>
      </div>
    </div>
  );
}

export function ImportedTeamMatchup({
  abbr,
  teamId,
  playerPreference,
}: {
  abbr?: string;
  teamId?: number;
  playerPreference?: number;
}) {
  const { team, loaded, ownHome, toggleHome, opponentMetadata } =
    useTeamImport();
  const [switchRotation, setSwitchRotation] = useState(0);

  if (!loaded || !team) return null;

  const opponentAbbr = abbr ?? "—";
  const home = ownHome ? team.abbreviation : opponentAbbr;
  const away = ownHome ? opponentAbbr : team.abbreviation;
  const result: ImportedForecastResult =
    teamId === undefined || playerPreference === undefined
      ? { forecast: null, message: "Match forecast data unavailable." }
      : getImportedMatchForecast(
          team,
          teamId,
          opponentMetadata,
          playerPreference,
          ownHome,
        );
  const forecast = result.forecast;

  return (
    <div className={styles.matchup}>
      <div className={forecastStyles.heading}>
        <h2
          className={styles.matchupTitle}
          title={`${home} (Home) - ${away} (Away)${
            result.details ? `\n${result.details}` : ""
          }`}
        >
          {home} - {away}
        </h2>
        <button
          type="button"
          className={forecastStyles.switchButton}
          onClick={() => {
            toggleHome();
            setSwitchRotation((rotation) => rotation + 180);
          }}
          title={`Switch home team to ${away}`}
          aria-label={`Switch home team to ${away}`}
        >
          <Image
            src="/switch.png"
            alt=""
            width={42}
            height={42}
            unoptimized
            style={{ transform: `rotate(${switchRotation}deg)` }}
          />
        </button>
      </div>
      <div
        className={forecastStyles.panel}
        aria-label="Match forecast"
        aria-live="polite"
      >
        {[
          { label: "Win", team: home, value: forecast?.team0Win },
          { label: "Draw", team: "Draw", value: forecast?.draw },
          { label: "Win", team: away, value: forecast?.team1Win },
        ].map((entry, index) => (
          <div
            className={forecastStyles.column}
            key={index}
            title={`${entry.team}: ${
              entry.value === undefined ? "Unavailable" : `${entry.value}%`
            }`}
          >
            <div className={forecastStyles.label}>{entry.label}</div>
            <div
              className={forecastStyles.value}
              aria-label={`${entry.team}: ${
                entry.value === undefined
                  ? "Unavailable"
                  : `${entry.value} percent`
              }`}
            >
              {entry.value ?? "—"}
            </div>
          </div>
        ))}
      </div>
      {result.message && (
        <p className={forecastStyles.message}>{result.message}</p>
      )}
    </div>
  );
}

export function ImportedMatchStadium({
  opponentStadiumId,
  opponentStadiumName,
  opponentCrowdLevel,
  opponentPressureFactor,
}: {
  opponentStadiumId: number | null;
  opponentStadiumName: string;
  opponentCrowdLevel: number;
  opponentPressureFactor: number;
}) {
  const { team, ownHome } = useTeamImport();
  const home = ownHome ? team?.homeStadium : undefined;
  const stadiumId = home?.stadiumId ?? opponentStadiumId;
  const stadium = stadiumId === null ? null : STADIUMS[stadiumId] ?? null;
  const stadiumName = home
    ? stadium?.name ?? `${team?.name ?? "Home"} Stadium`
    : stadium?.name ?? opponentStadiumName;
  const crowdLevel = home?.crowdLevel ?? opponentCrowdLevel;
  const pressureFactor = home?.crowdPressure ?? opponentPressureFactor;
  const maxCrowdLevel = 7;
  const crowdLabel = ["None", "Low", "Medium", "High"][pressureFactor];
  const crowdTone = [
    matchStyles.crowdNone,
    matchStyles.crowdLow,
    matchStyles.crowdMedium,
    matchStyles.crowdHigh,
  ][pressureFactor];

  return (
    <div className={matchStyles.stadium}>
      <div className={matchStyles.stadiumTitle}>
        {stadium ? stadiumName : "Stadium not available"}
      </div>

      {stadium && (
        <Image
          src={`/stadion-images/${stadium.model}.png`}
          alt={stadiumName}
          title={stadium.model}
          width={300}
          height={230}
          unoptimized
          className={matchStyles.stadiumImage}
        />
      )}

      <div className={matchStyles.crowdPressure}>
        <div className={matchStyles.crowdRow}>
          <span>Crowd Pressure:</span>

          <strong
            className={`${matchStyles.crowdValue} ${crowdTone}`}
            title={`Pressure Factor ${pressureFactor}`}
          >
            {crowdLabel}
          </strong>
        </div>

        <div className={matchStyles.crowdRow}>
          <span>Crowd Level:</span>

          <div
            className={matchStyles.crowdLevelIcons}
            title={`${crowdLevel}/${maxCrowdLevel}`}
            aria-label={`Crowd Level ${crowdLevel} of ${maxCrowdLevel}`}
          >
            {Array.from({ length: crowdLevel }).map((_, index) => (
              <Image
                key={index}
                src="/crowd.png"
                alt=""
                width={20}
                height={20}
                unoptimized
                aria-hidden="true"
                className={matchStyles.crowdLevelIcon}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImportedTeamSkillBoost({ children }: { children: ReactNode }) {
  const { team, loaded } = useTeamImport();

  if (!loaded || team) return null;

  return <>{children}</>;
}

type OpponentMetadata = {
  key: string;
  players: AssignedPlayer[];
  error: string;
};

function useOpponentMetadata(team: ImportedTeam | null, teamId: number) {
  const roster = team?.opponents[teamId];

  const [metadata, setMetadata] = useState<OpponentMetadata | null>(null);

  const key = roster
    ? `${teamId}:${roster.map((player) => player.id).join(",")}`
    : "";

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();

    const ids = key.split(":")[1].split(",").filter(Boolean).map(Number);

    const cacheKey = `npfc-opponent-metadata-v1:${key}`;

    async function loadMetadata() {
      if (ids.length === 0) {
        setMetadata({
          key,
          players: [],
          error: "",
        });
        return;
      }

      try {
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const players: unknown = JSON.parse(cached);

          if (Array.isArray(players)) {
            if (!controller.signal.aborted) {
              setMetadata({
                key,
                players: players as AssignedPlayer[],
                error: "",
              });
            }

            return;
          }
        }
      } catch {}

      try {
        const response = await fetch("/api/match-manager/players", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Player lookup failed");
        }

        if (!Array.isArray(result.players)) {
          throw new Error("Invalid player lookup response");
        }

        if (controller.signal.aborted) return;

        const players: AssignedPlayer[] = result.players;

        setMetadata({
          key,
          players,
          error: "",
        });

        try {
          localStorage.setItem(cacheKey, JSON.stringify(players));
        } catch {}
      } catch (error) {
        if (controller.signal.aborted) return;

        setMetadata({
          key,
          players: [],
          error:
            error instanceof Error ? error.message : "Player lookup failed",
        });
      }
    }

    void loadMetadata();

    return () => controller.abort();
  }, [key]);

  return metadata?.key === key ? metadata : null;
}

function getOpponentPrediction(
  team: ImportedTeam | null,
  teamId: number,
  opponentMetadata: OpponentMetadata | null,
  playerPreference: number,
) {
  const lineup = team?.opponentLineups[teamId];
  const opponentRoster = team?.opponents[teamId] ?? [];
  const positionsById = new Map(
    opponentMetadata?.players.map((player) => [
      player.id_player,
      player.id_position,
    ]) ?? [],
  );
  const hasPositions = opponentRoster.every((player) => {
    if (isUnavailable(player.availability)) return true;
    const position = positionsById.get(player.id);
    return (
      position !== undefined &&
      Number.isInteger(position) &&
      position >= 0 &&
      position <= 3
    );
  });
  return lineup && opponentMetadata && !opponentMetadata.error && hasPositions
    ? predictOpponentLineup(
        opponentRoster,
        lineup,
        positionsById,
        playerPreference,
      )
    : null;
}

type ImportedForecastResult = {
  forecast: ReturnType<typeof getResultsForecast>;
  message: string;
  details?: string;
};

function getImportedMatchForecast(
  team: ImportedTeam,
  teamId: number,
  opponentMetadata: OpponentMetadata | null,
  playerPreference: number,
  ownHome: boolean,
): ImportedForecastResult {
  const unavailable = (message: string): ImportedForecastResult => ({
    forecast: null,
    message,
  });
  if (!opponentMetadata) return unavailable("Loading opponent players…");
  if (opponentMetadata.error)
    return unavailable("Opponent player data unavailable.");
  const ownRankBase = team.ownRankBase;
  const opponentRankBase = team.opponentRankBases?.[teamId];
  if (ownRankBase == null || opponentRankBase == null)
    return unavailable("League ranking unavailable. Import the latest save.");
  const prediction = getOpponentPrediction(
    team,
    teamId,
    opponentMetadata,
    playerPreference,
  );
  if (!prediction) return unavailable("Opponent lineup unavailable.");
  const opponentById = new Map(
    (team.opponents[teamId] ?? []).map((player) => [player.id, player]),
  );
  const opponentSlots: (MatchPlayer | null)[] = Array.from(
    { length: 18 },
    () => null,
  );
  for (const entry of [...prediction.starters, ...prediction.bench]) {
    const player = opponentById.get(entry.playerId);
    if (
      player &&
      !isUnavailable(player.availability) &&
      entry.lineupSlot >= 0 &&
      entry.lineupSlot < 18
    ) {
      opponentSlots[entry.lineupSlot] = { skills: player.skills };
    }
  }
  const ownSlots: (MatchPlayer | null)[] = Array.from(
    { length: 18 },
    () => null,
  );
  const comparisonSlots: (MatchPlayer | null)[] = Array.from(
    { length: 18 },
    () => null,
  );
  const excludedBench: string[] = [];
  for (const player of team.players) {
    const rank = player.lineupRank;
    if (rank == null || !Number.isInteger(rank) || rank < 0 || rank >= 18)
      continue;
    if (isUnavailable(player.availability) && rank < 11) continue;
    if (
      player.skillPoints.length !== 10 ||
      player.skillPoints.some((xp) => !Number.isFinite(xp) || xp < 0)
    )
      return unavailable("Invalid saved skill data.");
    const matchPlayer = { skills: player.skillPoints.map(xpToForecastGrade) };
    comparisonSlots[rank] = matchPlayer;
    if (isUnavailable(player.availability)) {
      excludedBench.push(`${player.name} (ID ${player.id}, slot ${rank + 1})`);
      continue;
    }
    ownSlots[rank] = matchPlayer;
  }
  if (ownSlots.slice(0, 11).some((player) => !player))
    return unavailable("Your saved lineup needs 11 available starters.");
  if (opponentSlots.slice(0, 11).some((player) => !player))
    return unavailable("Opponent lineup needs 11 available starters.");
  try {
    const ownStrength = getTeamForecastStrength(ownSlots);
    const opponentStrength = getTeamForecastStrength(opponentSlots);
    const homeSide = 0;
    const forecast = ownHome
      ? getResultsForecast(
          ownStrength,
          opponentStrength,
          ownRankBase,
          opponentRankBase,
          homeSide,
        )
      : getResultsForecast(
          opponentStrength,
          ownStrength,
          opponentRankBase,
          ownRankBase,
          homeSide,
        );
    const comparisonStrength = getTeamForecastStrength(comparisonSlots);
    const comparison = ownHome
      ? getResultsForecast(
          comparisonStrength,
          opponentStrength,
          ownRankBase,
          opponentRankBase,
          homeSide,
        )
      : getResultsForecast(
          opponentStrength,
          comparisonStrength,
          opponentRankBase,
          ownRankBase,
          homeSide,
        );
    const format = (result: ReturnType<typeof getResultsForecast>) =>
      result
        ? `${result.team0Win} / ${result.draw} / ${result.team1Win}`
        : "Unavailable";
    const details = [
      `Opponent: DEF ${opponentStrength.defense}, OFF ${opponentStrength.offense}, Rank Base ${opponentRankBase}`,
      `${team.abbreviation}: DEF ${ownStrength.defense}, OFF ${ownStrength.offense}, Rank Base ${ownRankBase}`,
      `Home advantage: ${ownHome ? team.abbreviation : "Opponent"}`,
      `Forecast: ${format(forecast)}`,
      `Excluded own substitutes: ${excludedBench.join(", ") || "None"}`,
      `Including excluded own substitutes (diagnostic only): DEF ${comparisonStrength.defense}, OFF ${comparisonStrength.offense}`,
      `Comparison: ${format(comparison)}`,
    ].join("\n");
    return {
      forecast,
      message: forecast ? "" : "Match forecast unavailable.",
      details,
    };
  } catch {
    return unavailable("Invalid match skill data.");
  }
}

const OWN_POSITION_GROUPS = [0, 1, 1, 2, 2, 2, 3] as const;

function getOwnPositionId(position: number): number | null {
  return Number.isInteger(position) &&
    position >= 0 &&
    position < OWN_POSITION_GROUPS.length
    ? OWN_POSITION_GROUPS[position]
    : null;
}

export function ImportedTeamFormation({
  language = "en",
  abbr,
  slots,
  stadiumId,
  teamId,
  playerPreference,
  typeProfiles = [],
  typeProfileError = "",
  experienceGrades,
}: {
  language?: Language;
  abbr: string;
  slots: TeamFormationSlot[];
  stadiumId: number | null;
  teamId: number;
  playerPreference: number;
  typeProfiles?: TeamPlayerTypeProfile[];
  typeProfileError?: string;
  experienceGrades?: TeamExperienceGrades;
}) {
  const { team, opponentMetadata, ownHome } = useTeamImport();
  const lineup = team?.opponentLineups[teamId];
  const opponentRoster = team?.opponents[teamId] ?? [];
  const roster = new Map(opponentRoster.map((player) => [player.id, player]));
  const profilesBySlot = new Map(
    typeProfiles
      .filter((profile) => profile.team_id === teamId)
      .map((profile) => [profile.slot_id, profile]),
  );
  const getTypeProfile = (rosterSlot: number): TeamPlayerTypeProfile | null => {
    if (!lineup) return null;
    const primaryRank = lineup.primaryOrder.slice(0, 24).indexOf(rosterSlot);
    const templateSlot = primaryRank === -1 ? 24 : primaryRank;
    return profilesBySlot.get(templateSlot) ?? null;
  };
  const getTypeWeights = (rosterSlot: number): number[] | null => {
    const profile = getTypeProfile(rosterSlot);
    if (!profile) return null;
    const weights = POT_KEYS.map((key) => profile[key]);
    return weights.every(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 255,
    )
      ? weights
      : null;
  };
  const getExtraValues = (rosterSlot: number): [number, number] | null => {
    const profile = getTypeProfile(rosterSlot);
    if (!profile) return null;
    const x = profile.extra_01;
    const y = profile.extra_02;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 100 ||
      y < 0 ||
      y > 100
    )
      return null;
    return [x, y];
  };
  const names = new Map(
    opponentMetadata?.players.map((player) => [
      player.id_player,
      player.name,
    ]) ?? [],
  );
  const positionsById = new Map(
    opponentMetadata?.players.map((player) => [
      player.id_player,
      player.id_position,
    ]) ?? [],
  );
  const prediction = getOpponentPrediction(
    team,
    teamId,
    opponentMetadata,
    playerPreference,
  );
  const starters = prediction
    ? prediction.starters
    : lineup?.starters.filter(
        (starter) => !isUnavailable(roster.get(starter.playerId)?.availability),
      );
  const players = starters?.map((starter) => {
    const player = roster.get(starter.playerId);
    return {
      slotId: starter.lineupSlot,
      playerId: starter.playerId,
      name: names.get(starter.playerId) ?? `Player #${starter.playerId}`,
      shirtNumber: player?.shirtNumber ?? null,
      typeIndex: player?.typeIndex ?? null,
      availability: player?.availability ?? null,
      typeWeights: player ? getTypeWeights(player.rosterSlot) : null,
      extraValues: player ? getExtraValues(player.rosterSlot) : null,
    };
  });

  const starterIds = new Set(
    starters?.map((starter) => starter.playerId) ?? [],
  );
  const benchOrder = new Map(
    (prediction?.bench ?? []).map((player, index) => [player.playerId, index]),
  );
  const primaryOrder = new Map<number, number>();
  lineup?.primaryOrder.forEach((slot, index) => {
    if (!primaryOrder.has(slot)) primaryOrder.set(slot, index);
  });
  const benchPlayers = starters
    ? opponentRoster
        .filter((player) => !starterIds.has(player.id))
        .sort(
          (a, b) =>
            Number(isUnavailable(a.availability)) -
              Number(isUnavailable(b.availability)) ||
            (benchOrder.get(a.id) ?? Infinity) -
              (benchOrder.get(b.id) ?? Infinity) ||
            (primaryOrder.get(a.rosterSlot) ?? Infinity) -
              (primaryOrder.get(b.rosterSlot) ?? Infinity) ||
            a.rosterSlot - b.rosterSlot,
        )
        .map((player, index) => ({
          slotId: index,
          playerId: player.id,
          name: names.get(player.id) ?? `Player #${player.id}`,
          shirtNumber: player.shirtNumber,
          typeIndex: player.typeIndex,
          availability: player.availability,
          typeWeights: getTypeWeights(player.rosterSlot),
          extraValues: getExtraValues(player.rosterSlot),
          positionId: positionsById.get(player.id) ?? null,
        }))
    : undefined;

  const ownPlayers = team?.players.map((player, index) => ({
    slotId: index,
    playerId: player.id,
    name: player.name,
    shirtNumber: player.shirtNumber,
    typeIndex: player.savedTypeIndex,
    availability: player.availability,
    positionId: getOwnPositionId(player.position),
    typeWeights: player.typeWeights,
    extraValues: player.extraValues ?? null,
  }));

  const subIds = new Set(
    (prediction?.bench ?? lineup?.bench ?? [])
      .filter(
        (starter) => !isUnavailable(roster.get(starter.playerId)?.availability),
      )
      .map((starter) => starter.playerId),
  );
  const effectiveExperience = lineup?.experienceOverride ?? experienceGrades;
  const skillScores = (
    values: number[],
    points: boolean,
  ): (number | null)[] => {
    if (
      values.length !== 10 ||
      !values.every(
        (value) =>
          Number.isInteger(value) && value >= 0 && (points || value <= 5),
      )
    ) {
      return Array<number | null>(7).fill(null);
    }
    const row = Object.fromEntries(
      values.map((value, index) => [
        `skill_${String(index + 1).padStart(2, "0")}`,
        value,
      ]),
    );
    const attributes = points
      ? calculateAttributes(row, "points")
      : calculateAttributes(row);
    return attributes
      .slice(0, 7)
      .map((attribute) =>
        points ? xpScore(attribute.value) : gradeScore(attribute.level),
      );
  };
  const opponentStats: TeamStatsPlayer[] = opponentRoster
    .filter((player) => !isUnavailable(player.availability))
    .map((player) => {
      const positionId = positionsById.get(player.id) ?? null;
      return {
        id: player.id,
        positionId,
        selection: !lineup
          ? null
          : starterIds.has(player.id)
          ? "lineup"
          : subIds.has(player.id)
          ? "sub"
          : "reserve",
        skillScores: skillScores(player.skills, false),
        positionScores: Array.from({ length: 4 }, (_, index) =>
          lineup?.positionExperienceDisabled
            ? 0
            : positionId === null
            ? null
            : index === positionId
            ? gradeScore(effectiveExperience?.position)
            : 0,
        ),
        actionScores: Array.from({ length: 5 }, (_, index) =>
          gradeScore(effectiveExperience?.actions[index]),
        ),
        movement: getExtraValues(player.rosterSlot),
      };
    });
  const ownStats: TeamStatsPlayer[] = (team?.players ?? [])
    .filter((player) => !isUnavailable(player.availability))
    .map((player) => {
      const rank = player.lineupRank;
      const xp = player.experience;
      return {
        id: player.id,
        positionId: getOwnPositionId(player.position),
        selection:
          rank == null || rank < 0
            ? null
            : rank < 11
            ? "lineup"
            : rank < 18
            ? "sub"
            : "reserve",
        skillScores: skillScores(player.skillPoints, true),
        positionScores: [
          xp?.positionXP.gk,
          xp?.positionXP.df,
          xp?.positionXP.mf,
          xp?.positionXP.fw,
        ].map(xpScore),
        actionScores: [
          xp?.actionXP.shooting,
          xp?.actionXP.longPassing,
          xp?.actionXP.throughPassing,
          xp?.actionXP.dribbling,
          xp?.actionXP.directPassing,
        ].map(xpScore),
        movement: player.extraValues ?? null,
      };
    });

  return (
    <TeamFormation
      key={team ? "imported" : "default"}
      opponentStats={opponentStats}
      ownStats={ownStats}
      language={language}
      slots={slots}
      stadiumId={ownHome ? team?.homeStadium.stadiumId ?? stadiumId : stadiumId}
      players={players}
      benchPlayers={benchPlayers}
      ownPlayers={ownPlayers}
      opponentAbbr={abbr}
      ownAbbr={team?.abbreviation}
      loadingNames={!!lineup && !opponentMetadata}
      typeProfileError={typeProfileError}
    />
  );
}

export function ImportedTeamPlayers({
  language = "en",
  title,
  abbr,
  teamId,
  playerPreference,
}: {
  language?: Language;
  title: string;
  abbr: string;
  teamId: number;
  playerPreference: number;
}) {
  const { team, loaded, opponentMetadata: current } = useTeamImport();

  const roster = team?.opponents[teamId];

  if (!loaded || !team) return null;

  const ownPlayers: AssignedPlayer[] = team.players.map((player) => ({
    id_player: player.id,
    name: player.name,
    id_position: getOwnPositionId(player.position) ?? -1,
    fatigue: player.fatigue,
    shirtNumber: player.shirtNumber,
    typeIndex: player.savedTypeIndex,
    availability: player.availability,
    foot:
      playerFootBits[player.id] === "1"
        ? "L"
        : playerFootBits[player.id] === "0"
        ? "R"
        : null,
    experience: player.experience,
    price: null,
    team_id: null,
    Player_Skills: Object.fromEntries(
      player.skillPoints.map((value, index) => [
        `skill_${String(index + 1).padStart(2, "0")}`,
        value,
      ]),
    ),
  }));

  const lookup = new Map(
    current?.players.map((player) => [player.id_player, player]) ?? [],
  );

  const opponents: AssignedPlayer[] = (roster ?? []).map((player) => ({
    id_player: player.id,
    name: lookup.get(player.id)?.name ?? `Player #${player.id}`,
    id_position: lookup.get(player.id)?.id_position ?? -1,
    fatigue: player.fatigue,
    shirtNumber: player.shirtNumber,
    typeIndex: player.typeIndex,
    availability: player.availability,
    foot: player.foot,
    price: lookup.get(player.id)?.price ?? null,
    team_id: teamId,
    Player_Skills: Object.fromEntries(
      player.skills.map((value, index) => [
        `skill_${String(index + 1).padStart(2, "0")}`,
        value,
      ]),
    ),
  }));

  return (
    <>
      <ImportedTeamMatchup
        abbr={abbr}
        teamId={teamId}
        playerPreference={playerPreference}
      />

      <PlayersOnTeam
        language={language}
        title={team.name}
        players={ownPlayers}
        teamBonuses={[]}
        imported
      />

      {!roster ? (
        <p>No saved roster for this team</p>
      ) : !current ? (
        <LoadingSmall />
      ) : (
        <>
          {current.error && <p role="alert">{current.error}</p>}

          <PlayersOnTeam
            language={language}
            title={title}
            players={opponents}
            teamBonuses={[]}
            savedLevels
            emptyMessage="No players in saved roster"
          />
        </>
      )}
    </>
  );
}
