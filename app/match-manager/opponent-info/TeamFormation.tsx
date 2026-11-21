import { getFormationName, type TeamFormationSlot } from "./team-formation";
import styles from "./match-manager-info.module.css";

type Props = {
  slots: TeamFormationSlot[];
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

export default function TeamFormation({ slots }: Props) {
  return (
    <section className={styles.formationSection} aria-label="Team Formation">
      <h2 className={styles.formationHeading}>Team Formation</h2>

      {slots.length === 0 ? (
        <p className={styles.formationMissing}>Formation not available.</p>
      ) : (
        <>
          <div className={styles.formationPitch}>
            <div className={styles.formationGrid} />

            <div className={styles.formationField}>
              {slots.map((slot) => {
                const position = getPosition(slot);

                return (
                  <div
                    key={slot.slot_id}
                    className={styles.formationSlot}
                    style={getSlotStyle(slot)}
                  >
                    <span
                      className={`${styles.formationCircle} ${POSITION_CLASSES[position]}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.formationName}>{getFormationName(slots)}</div>
        </>
      )}
    </section>
  );
}
