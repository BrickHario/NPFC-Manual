
"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { TrainingCard } from "./types";
import { CARD_GROUPS, getCardGroup } from "./combo-config";
import styles from "./cards-and-combos.module.css";

type Props = {
  cards: TrainingCard[];
  selectedCards: Set<number>;
  onToggleCard: (cardId: number) => void;
  imageUrls: Record<number, string>;
};

export default function CardButtons({
  cards,
  selectedCards,
  onToggleCard,
  imageUrls,
}: Props) {
  const groupedCards = useMemo(() => {
    const sorted = [...cards].sort(
      (a, b) => a.card_id - b.card_id
    );

    return CARD_GROUPS.map((group) => ({
      ...group,
      cards: sorted.filter(
        (card) => getCardGroup(card.card_id) === group.key
      ),
    }));
  }, [cards]);

  return (
    <section
      className={styles.cardsArea}
      aria-label="Training cards"
    >
      {groupedCards.map((group) => (
        <div className={styles.cardGroup} key={group.key}>
          <h2>{group.label}</h2>

          <div className={styles.cards}>
            {group.cards.map((card) => {
              const selected = selectedCards.has(card.card_id);

              const style = {
                "--hover-image": imageUrls[card.card_id]
                  ? `url("${imageUrls[card.card_id]}")`
                  : "none",
              } as CSSProperties;

              return (
                <button
                  key={card.card_id}
                  type="button"
                  aria-pressed={selected}
                  className={`${styles.cardButton} ${styles[group.key]}`}
                  style={style}
                  onClick={() => onToggleCard(card.card_id)}
                >
                  <span
                    className={styles.cardVisual}
                    aria-hidden="true"
                  />

                  <span className={styles.cardButtonText}>
                    {card.name}
                  </span>

                  {selected && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/check.png"
                      alt=""
                      aria-hidden="true"
                      className={styles.checkmark}
                      width={50}
                      height={50}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
