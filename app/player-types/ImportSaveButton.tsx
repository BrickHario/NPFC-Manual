
"use client";

import { useRef, useState } from "react";
import {
  parseSaveFiles,
  type ImportedSavePlayer,
} from "./save-parser";

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

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    if (files.length === 0) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const save = await parseSaveFiles(files);

      const response = await fetch(
        "/api/player-types/lookup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ids: save.players.map(
              (player) => player.id
            ),
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
          `Player lookup API unavailable (HTTP ${response.status}). Check app/api/player-types/lookup/route.ts.`
        );
      }

      let result: PlayerLookup;

      try {
        result =
          (await response.json()) as PlayerLookup;
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

      setOpen(false);
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
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
          setSuccess("");
        }}
        style={{
          padding: "8px 14px",
          border: "2px solid #222",
          borderRadius: 8,
          background: "#2041b0",
          color: "#fff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Import Files
      </button>

      {success && (
        <span
          role="status"
          style={{
            display: "block",
            marginTop: 6,
            fontSize: 12,
          }}
        >
          {success}
        </span>
      )}

      {open && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !busy
            ) {
              setOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "#0009",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Import NPFC save data"
            style={{
              width: "min(540px, 100%)",
              padding: 24,
              border: "2px solid #222",
              borderRadius: 12,
              background: "#fff",
              color: "#222",
              boxShadow: "4px 4px 0 #222",
            }}
          >
            <h2>Import NPFC Save Data</h2>
<p>
  <strong>Citra:</strong> Right-click NPFC and Open Save Data Location.
</p>

<p>
  <strong>Nintendo 3DS:</strong> Back up NPFC using
 Checkpoint, then find the files under
3ds/Checkpoint/saves/ on your SD card.
</p>

<p>
  Select your <strong>savedata*.bin</strong> files.
</p>
            <input
              ref={inputRef}
              type="file"
              accept=".bin"
              multiple
              disabled={busy}
              onChange={handleFiles}
              style={{ display: "none" }}
            />

            {error && (
              <p
                role="alert"
                style={{
                  color: "#b42318",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {error}
              </p>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  inputRef.current?.click()
                }
                style={{
                  padding: "10px 14px",
                  border: "2px solid #222",
                  borderRadius: 8,
                  background: "#2041b0",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: busy
                    ? "wait"
                    : "pointer",
                }}
              >
                {busy
                  ? "Importing..."
                  : "Select Save Files"}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                style={{
                  padding: "10px 14px",
                  border: "2px solid #222",
                  borderRadius: 8,
                  background: "#eee",
                  color: "#222",
                  cursor: busy
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
