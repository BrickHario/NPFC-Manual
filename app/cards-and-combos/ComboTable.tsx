import HorizontalScrollArea from "./HorizontalScrollArea";
import { getTypeVector, formatTypeVector } from "./combo-type-vector";
import vectorStyles from "./combo-type-vector.module.css";
import { ATTRIBUTES, attributeIcon, comboAttributeValues } from "./attributes";
import { requiredCards, type TrainingCard, type TrainingCombo } from "./types";
import { CATEGORIES, formatBonus, getCardGroup } from "./combo-config";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./cards-and-combos.module.css";
import { getMatchActionLabel, getSubSkills } from "@/lib/utils";

export type ResultRow =
  | {
      kind: "card";
      id: number;
      name: string;
      category: number;
      fatigue: number;
      data: TrainingCard;
    }
  | {
      kind: "combo";
      id: number;
      name: string;
      category: number;
      fatigue: number;
      data: TrainingCombo;
    };

type Props = {
  rows: ResultRow[];
  matchActionLabels: ReadonlyMap<number, string>;
  cardNames: Map<number, string>;
  cardImageUrls: Record<number, string>;
  comboImageUrls: Record<number, string>;
};

export default function ComboTable({
  rows,
  matchActionLabels,
  cardNames,
  cardImageUrls,
  comboImageUrls,
}: Props) {
  return (
    <HorizontalScrollArea
      className={styles.tableScroll}
      label="Training results table"
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.nameHead}>
              Name
            </th>

            <th scope="col" className={styles.comboHead}>
              Combo
            </th>

            <th scope="col" className={styles.statHead}>
              Fatigue
            </th>

            <th scope="col" className={vectorStyles.header}>
              Type Vector
            </th>

            <th scope="col" className={styles.typeHead}>
              Group
            </th>

            {ATTRIBUTES.map((attribute, index) => {
              const subSkills = getSubSkills(attribute.key);
              const mainIcon = attributeIcon(attribute.label, index);

              return (
                <th
                  key={attribute.key}
                  scope="col"
                  className={`${styles.statHead} ${
                    subSkills.length ? styles.groupedStatHead : ""
                  }`}
                  title={attribute.label}
                >
                  {subSkills.length ? (
                    <div className={styles.statHeadLayout}>
                      <Image
                        src={mainIcon}
                        alt={attribute.label}
                        width={110}
                        height={110}
                        unoptimized
                        className={styles.mainStatIcon}
                      />
                      <div
                        className={styles.subSkillIcons}
                        style={{
                          gridTemplateColumns: `repeat(${subSkills.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {subSkills.map((skill) => (
                          <Image
                            key={skill.key}
                            src={skill.icon}
                            alt={skill.label}
                            title={skill.label}
                            width={40}
                            height={40}
                            unoptimized
                            className={styles.subSkillIcon}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={mainIcon}
                      alt={attribute.label}
                      width={110}
                      height={110}
                      unoptimized
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const values = comboAttributeValues(row.data);
            const typeVector = getTypeVector(row.data);
            const matchActionLabel =
              row.kind === "combo"
                ? getMatchActionLabel(row.data, matchActionLabels)
                : null;

            const recipeIds =
              row.kind === "card"
                ? [row.data.card_id]
                : requiredCards(row.data);

            return (
              <tr key={`${row.kind}-${row.id}`}>
                <td
                  className={styles.comboName}
                  style={
                    {
                      "--hover-image": `url("${
                        row.kind === "card"
                          ? cardImageUrls[row.id]
                          : comboImageUrls[row.id]
                      }")`,
                    } as CSSProperties
                  }
                >
                  <Link
                    href={`/cards-and-combos?id=${row.id}`}
                    className={styles.trainingLink}
                  >
                    {row.name}
                  </Link>
                  {matchActionLabel && (
                    <span
                      className={styles.matchActionLabel}
                      style={matchActionLabel.style}
                      title={matchActionLabel.title}
                      aria-label={matchActionLabel.title}
                    >
                      {matchActionLabel.label}
                    </span>
                  )}
                </td>

                <td className={styles.ingredients}>
                  <div className={styles.ingredientList}>
                    {recipeIds.map((cardId, index) => (
                      <span
                        key={`${row.kind}-${row.id}-${index}`}
                        className={styles.ingredientItem}
                      >
                        {index > 0 && <span className={styles.plus}>+</span>}

                        <span
                          className={`${styles.ingredient} ${
                            styles[getCardGroup(cardId)]
                          }`}
                        >
                          {cardNames.get(cardId) ?? `Card #${cardId}`}
                        </span>
                      </span>
                    ))}
                  </div>
                </td>

                <td className={`${styles.value} ${styles.zero}`}>
                  {row.fatigue > 0 ? `+${row.fatigue}` : "0"}
                </td>

                <td className={vectorStyles.cell}>
                  <div
                    className={vectorStyles.vector}
                    title={formatTypeVector(typeVector.dx, typeVector.dy)}
                  >
                    {typeVector.dx === 0 && typeVector.dy === 0 ? (
                      <span className={vectorStyles.zero}>•</span>
                    ) : (
                      <svg
                        className={vectorStyles.arrow}
                        viewBox="0 0 32 32"
                        aria-hidden="true"
                        style={{
                          transform: `rotate(${
                            (Math.atan2(typeVector.dx, typeVector.dy) * 180) /
                            Math.PI
                          }deg)`,
                        }}
                      >
                        <path d="M16 28V5M7 14l9-9 9 9" />
                      </svg>
                    )}
                    <span className={vectorStyles.label}>
                      {formatTypeVector(typeVector.dx, typeVector.dy)}
                    </span>
                  </div>
                </td>

                <td
                  className={`${styles.categoryCell} ${
                    styles[`category${row.category}`] ?? ""
                  }`}
                >
                  {CATEGORIES[row.category] ?? `Category ${row.category}`}
                </td>

                {ATTRIBUTES.map((attribute, index) => {
                  const value = values[attribute.key];
                  const subSkills = getSubSkills(attribute.key);

                  const random_01 =
                    row.kind === "card" ? Number(row.data.random_01 ?? 0) : 0;

                  const hasRandomBonus = random_01 !== 0 && index < 6;

                  const valueClass = hasRandomBonus
                    ? styles.zero
                    : value > 0
                    ? styles.positive
                    : value < 0
                    ? styles.negative
                    : styles.zero;

                  return (
                    <td
                      key={attribute.key}
                      className={`${styles.value} ${valueClass} ${
                        subSkills.length ? styles.groupedStatCell : ""
                      }`}
                    >
                      {subSkills.length ? (
                        <>
                          <span className={styles.mainStatValue}>
                            {formatBonus(value, hasRandomBonus ? random_01 : 0)}
                          </span>
                          <div
                            className={styles.subSkillValues}
                            style={{
                              gridTemplateColumns: `repeat(${subSkills.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {subSkills.map((skill) => {
                              const skillValue = Number(row.data[skill.key]);
                              const skillClass =
                                skillValue > 0
                                  ? styles.subSkillPositive
                                  : skillValue < 0
                                  ? styles.subSkillNegative
                                  : styles.subSkillZero;
                              const displayValue = Number.isFinite(skillValue)
                                ? formatBonus(skillValue)
                                : "—";

                              return (
                                <span
                                  key={skill.key}
                                  className={skillClass}
                                  title={`${skill.label}: ${displayValue}`}
                                  aria-label={`${skill.label}: ${displayValue}`}
                                >
                                  {displayValue}
                                </span>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        formatBonus(value, hasRandomBonus ? random_01 : 0)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className={styles.empty}>No matching training results.</p>
      )}
    </HorizontalScrollArea>
  );
}
