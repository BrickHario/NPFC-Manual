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

type TeamImportContextValue = {
  team: ImportedTeam | null;
  loaded: boolean;
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

export function TeamImportProvider({ children }: { children: ReactNode }) {
  const [team, setTeamState] = useState<ImportedTeam | null>(null);
  const [loaded, setLoaded] = useState(false);

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
    <TeamImportContext.Provider value={{ team, loaded, setTeam, removeTeam }}>
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

export function ImportedTeamPlayers({
  title,
  abbr,
  teamId,
}: {
  title: string;
  abbr: string;
  teamId: number;
}) {
  const { team, loaded } = useTeamImport();

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

  if (!loaded || !team) return null;

  const ownPlayers: AssignedPlayer[] = team.players.map((player) => ({
    id_player: player.id,
    name: player.name,
    id_position: player.position,
    shirtNumber: player.shirtNumber,
    typeIndex: player.savedTypeIndex,
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

  const current = metadata?.key === key ? metadata : null;

  const lookup = new Map(
    current?.players.map((player) => [player.id_player, player]) ?? [],
  );

  const opponents: AssignedPlayer[] = (roster ?? []).map((player) => ({
    id_player: player.id,
    name: lookup.get(player.id)?.name ?? `Player #${player.id}`,
    id_position: lookup.get(player.id)?.id_position ?? -1,
    shirtNumber: player.shirtNumber,
    typeIndex: player.typeIndex,
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
