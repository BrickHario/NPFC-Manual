"use client";

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
import type { Language } from "@/lib/utils";
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
  loaded: boolean;
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
  const [team, setTeamState] = useState<ImportedTeam | null>(null);
  const [loaded, setLoaded] = useState(false);
  const opponentMetadata = useOpponentMetadata(team, teamId);

  useEffect(() => {
    function restoreTeam() {
      setTeamState(readImportedTeam());
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
  }

  function removeTeam() {
    removeImportedTeam();
    setTeamState(null);
  }

  return (
    <TeamImportContext.Provider
      value={{ team, loaded, setTeam, removeTeam, opponentMetadata }}
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
  const { team, loaded, setTeam, removeTeam } = useTeamImport();

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

export function ImportedTeamMatchup({ abbr }: { abbr?: string }) {
  const { team, loaded } = useTeamImport();

  if (!loaded || !team) return null;

  return (
    <div className={styles.matchup}>
      <h2 className={styles.matchupTitle}>
        {team.abbreviation} - {abbr}
      </h2>
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

export function ImportedTeamFormation({
  language = "en",
  abbr,
  slots,
  stadiumId,
  teamId,
  playerPreference,
  typeProfiles = [],
  typeProfileError = "",
}: {
  language?: Language;
  abbr: string;
  slots: TeamFormationSlot[];
  stadiumId: number | null;
  teamId: number;
  playerPreference: number;
  typeProfiles?: TeamPlayerTypeProfile[];
  typeProfileError?: string;
}) {
  const { team, opponentMetadata } = useTeamImport();
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
  const prediction =
    lineup && opponentMetadata && !opponentMetadata.error && hasPositions
      ? predictOpponentLineup(
          opponentRoster,
          lineup,
          positionsById,
          playerPreference,
        )
      : null;
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
    positionId: player.position,
    typeWeights: player.typeWeights,
    extraValues: player.extraValues ?? null,
  }));

  return (
    <TeamFormation
      language={language}
      slots={slots}
      stadiumId={stadiumId}
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
}: {
  language?: Language;
  title: string;
  abbr: string;
  teamId: number;
}) {
  const { team, loaded, opponentMetadata: current } = useTeamImport();

  const roster = team?.opponents[teamId];

  if (!loaded || !team) return null;

  const ownPlayers: AssignedPlayer[] = team.players.map((player) => ({
    id_player: player.id,
    name: player.name,
    id_position: player.position,
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
      <ImportedTeamMatchup abbr={abbr} />

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
