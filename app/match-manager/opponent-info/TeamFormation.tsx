import { getFormationName, type TeamFormationSlot } from "./team-formation";
import {
  getFieldImage,
  PLAYER_TYPE_COLORS,
  PLAYER_TYPE_NAMES,
} from "@/lib/utils";
import styles from "./match-manager-info.module.css";
import labels from "./FormationPlayers.module.css";

export type FormationPlayer = {
  slotId: number;
  playerId: number;
  name: string;
  shirtNumber: number | null;
  typeIndex: number | null;
};

type Props = {
  slots: TeamFormationSlot[];
  stadiumId: number | null;
  players?: FormationPlayer[];
  loadingNames?: boolean;
};

type Position = "goalkeeper" | "defender" | "midfielder" | "forward";

function getPosition(slot: TeamFormationSlot): Position {
  if (slot.slot_id === 0) return "goalkeeper";
  if (slot.fieldY < 6) return "defender";
  if (slot.fieldY < 10) return "midfielder";
  return "forward";
}

const POSITION_CLASSES: Record<Position, string> = {
  goalkeeper: styles.formationGoalkeeper,
  defender: styles.formationDefender,
  midfielder: styles.formationMidfielder,
  forward: styles.formationForward,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getColumn(fieldX: number) {
  return clamp(Math.round(fieldX), 1, 15);
}

function getOutfieldRow(fieldY: number) {
  return clamp(13 - Math.round(fieldY), 1, 10);
}

function getSlotStyle(slot: TeamFormationSlot) {
  const column = getColumn(slot.fieldX);
  const left = `${((column - 0.5) / 15) * 100}%`;

  if (slot.slot_id === 0) {
    return { left, top: "87.5%" };
  }

  const row = getOutfieldRow(slot.fieldY);

  return {
    left,
    top: `${4 + ((row - 0.5) / 10) * 74}%`,
  };
}

export default function TeamFormation({
  slots,
  stadiumId,
  players,
  loadingNames = false,
}: Props) {
  const fieldImage = getFieldImage(stadiumId);
  const bySlot = new Map(
    players?.map((player) => [player.slotId, player]) ?? [],
  );

  return (
    <section className={styles.formationSection} aria-label="Team Formation">
      <h2 className={styles.formationHeading}>
        {players !== undefined && "Probable "}
        Formation
        {slots.length > 0 && ` (${getFormationName(slots)})`}
      </h2>

      {slots.length === 0 ? (
        <p className={styles.formationMissing}>Formation not available.</p>
      ) : (
        <>
          <div
            className={styles.formationPitch}
            style={{
              backgroundImage: `url("/field-images/${fieldImage}.png")`,
            }}
          >
            <div className={styles.formationGrid} />

            <div className={styles.formationField}>
              {slots.map((slot) => {
                const position = getPosition(slot);
                const player = bySlot.get(slot.slot_id);
                const typeIndex = player?.typeIndex;
                const typeName =
                  typeIndex != null && typeIndex >= 0 && typeIndex < 12
                    ? PLAYER_TYPE_NAMES.en[typeIndex]
                    : undefined;
                const name = loadingNames ? "…" : player?.name;

                return (
                  <div
                    key={slot.slot_id}
                    className={styles.formationSlot}
                    style={getSlotStyle(slot)}
                  >
                    {player ? (
                      <div
                        className={labels.marker}
                        title={`${player.name} · #${
                          player.shirtNumber ?? "—"
                        } · ${typeName ?? "Unknown type"}`}
                      >
                        <span className={labels.name}>{name}</span>
                        <span
                          className={`${styles.formationCircle} ${POSITION_CLASSES[position]} ${labels.number}`}
                        >
                          {player.shirtNumber ?? "—"}
                        </span>
                        <span
                          className={labels.type}
                          style={{
                            color:
                              typeIndex != null
                                ? PLAYER_TYPE_COLORS[typeIndex] ?? "#ffffff"
                                : "#ffffff",
                          }}
                        >
                          {typeName ?? "—"}
                        </span>
                      </div>
                    ) : (
                      <span
                        className={`${styles.formationCircle} ${POSITION_CLASSES[position]}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
