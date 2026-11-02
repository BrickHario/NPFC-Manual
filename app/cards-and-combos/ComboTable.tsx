
import HorizontalScrollArea from "./HorizontalScrollArea";
import {
  ATTRIBUTES,
  attributeIcon,
  comboAttributeValues,
} from "./attributes";
import {
  requiredCards,
  type TrainingCard,
  type TrainingCombo,
} from "./types";
import {
  CATEGORIES,
  formatBonus,
  getCardGroup,
} from "./combo-config";
import type { CSSProperties } from "react";
import Link from "next/link";
import styles from "./cards-and-combos.module.css";

export type ResultRow =
  | {
      kind: "card";
      id: number;
      name: string;
      category: number;
      data: TrainingCard;
    }
  | {
      kind: "combo";
      id: number;
      name: string;
      category: number;
      data: TrainingCombo;
    };

type Props = {
  rows: ResultRow[];
  cardNames: Map<number, string>;
  cardImageUrls: Record<number, string>;
  comboImageUrls: Record<number, string>;
};

export default function ComboTable({
  rows,
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
            <th
              scope="col"
              className={styles.nameHead}
            >
              Name
            </th>

            <th
              scope="col"
              className={styles.comboHead}
            >
              Combo
            </th>

            <th
              scope="col"
              className={styles.typeHead}
            >
              Type
            </th>

            {ATTRIBUTES.map((attribute, index) => (
              <th
                key={attribute.key}
                scope="col"
                className={styles.statHead}
                title={attribute.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attributeIcon(
                    attribute.label,
                    index
                  )}
                  alt={attribute.label}
                  width={110}
                  height={110}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const values =
              comboAttributeValues(row.data);

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
                </td>

                <td className={styles.ingredients}>
                  <div
                    className={styles.ingredientList}
                  >
                    {recipeIds.map((cardId, index) => (
                      <span
                        key={`${row.kind}-${row.id}-${index}`}
                        className={styles.ingredientItem}
                      >
                        {index > 0 && (
                          <span className={styles.plus}>
                            +
                          </span>
                        )}

                        <span
                          className={`${
                            styles.ingredient
                          } ${
                            styles[getCardGroup(cardId)]
                          }`}
                        >
                          {cardNames.get(cardId) ??
                            `Card #${cardId}`}
                        </span>
                      </span>
                    ))}
                  </div>
                </td>

                <td
                  className={`${
                    styles.categoryCell
                  } ${
                    styles[
                      `category${row.category}`
                    ] ?? ""
                  }`}
                >
                  {CATEGORIES[row.category] ??
                    `Category ${row.category}`}
                </td>

                {ATTRIBUTES.map((attribute) => {
                  const value =
                    values[attribute.key];

                  const valueClass =
                    value > 0
                      ? styles.positive
                      : value < 0
                        ? styles.negative
                        : styles.zero;

                  return (
                    <td
                      key={attribute.key}
                      className={`${
                        styles.value
                      } ${valueClass}`}
                    >
                      {formatBonus(value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className={styles.empty}>
          No matching training results.
        </p>
      )}
    </HorizontalScrollArea>
  );
}
