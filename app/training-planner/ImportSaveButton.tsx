
"use client";

import { useRef, useState } from "react";
import {
  parseSaveFiles,
  type ImportedSavePlayer,
} from "./save-parser";
import styles from "./ImportSaveButton.module.css";

type Props = {
  onImport: (players: ImportedSavePlayer[]) => void;
};

type PlayerLookup = {
  players?: {
    id: number;
    name: string;
    imageUrl: string;
    potentialCurve: number[] | null;
  }[];
  error?: string;
};

export default function ImportSaveButton({
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const save = await parseSaveFiles(files);

      const response = await fetch(
        "/api/training-planner/lookup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ids: save.players.map((player) => player.id),
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") ?? "";

      if (
        !contentType
          .toLowerCase()
          .includes("application/json")
      ) {
        throw new Error(
          `Player lookup API unavailable (HTTP ${response.status}). Check app/api/training-planner/lookup/route.ts.`
        );
      }

      let result: PlayerLookup;

      try {
        result = (await response.json()) as PlayerLookup;
      } catch {
        throw new Error(
          "Player lookup API returned invalid JSON"
        );
      }

      if (!response.ok || !result.players) {
        throw new Error(
          result.error ||
            `Player lookup failed (HTTP ${response.status})`
        );
      }

      const lookup = new Map(
        result.players.map((player) => [
          player.id,
          player,
        ])
      );

      const imported = save.players.map((player) => {
        const record = lookup.get(player.id);

        if (!record) {
          throw new Error(
            `Unknown player ID ${player.id}`
          );
        }

        return {
          ...player,
          name: record.name,
          imageUrl: record.imageUrl,
          potentialCurve: record.potentialCurve,
        };
      });

      onImport(imported);

      setSuccess(
        `${imported.length} players imported from ${save.fileName}`
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Import failed"
      );
    } finally {
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className={styles.container}>
      <p className={styles.instructions}>
        Open Save Data Location and select{" "}
        <span>savedata*.bin</span>
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".bin"
        multiple
        disabled={busy}
        onChange={handleFiles}
        className={styles.fileInput}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setError("");
          setSuccess("");
          inputRef.current?.click();
        }}
        className={styles.importButton}
      >
        {busy ? "Importing..." : "Import Files"}
      </button>

      {success && (
        <span role="status" className={styles.success}>
          {success}
        </span>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
