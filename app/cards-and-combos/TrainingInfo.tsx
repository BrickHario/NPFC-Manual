"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LoadingSmall } from "../Loading";
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
  isEnabled,
} from "./combo-config";
import styles from "./TrainingInfo.module.css";
import { formatTypeVector, getTypeVector } from "./combo-type-vector";

type TrainingSelection =
  | { kind: "card"; data: TrainingCard }
  | { kind: "combo"; data: TrainingCombo };

type Props = {
  training: TrainingSelection;
  cards: TrainingCard[];
  cardImageUrls: Record<number, string>;
  comboImageUrls: Record<number, string>;
  comboPreviewUrl?: string;
};

const randomColumns = [0, 0, 1, 2, 3, 3, 3, 4, 5];

export default function TrainingInfo({
  training,
  cards,
  cardImageUrls,
  comboImageUrls,
  comboPreviewUrl,
}: Props) {
  const [failedPreviewUrl, setFailedPreviewUrl] =
    useState<string | null>(null);
  const [randomIndex, setRandomIndex] = useState(0);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [loadedPreviewUrl, setLoadedPreviewUrl] = useState<string | null>(null);

  const hasPreview =
    Boolean(comboPreviewUrl) &&
    failedPreviewUrl !== comboPreviewUrl;

  const { data } = training;

  const isCombo = training.kind === "combo";

  const id = isCombo
    ? training.data.combo_id
    : training.data.card_id;

  const categoryId = isCombo
    ? training.data.category_id
    : 1;

  const categoryName =
    CATEGORIES[categoryId] ?? `Category ${categoryId}`;

  const imageUrl = isCombo
    ? comboImageUrls[id]
    : cardImageUrls[id];

  const recipeIds = isCombo
    ? requiredCards(training.data)
    : [];

  const cardMap = new Map(
    cards.map((card) => [card.card_id, card])
  );

  const fatigueCards = isCombo
    ? recipeIds.map((cardId) => cardMap.get(cardId))
    : [training.data];

  const fatigueSum = fatigueCards.reduce(
    (total, card) =>
      total + Array.from({ length: 9 }, (_, index) =>
        Number(card?.[`skill_${String(index + 1).padStart(2, "0")}` as keyof TrainingCard] ?? 0)
      ).reduce((sum, value) => sum + value, 0),
    0
  );

  const fatigue = fatigueCards.length === 1
    ? Math.max(0, fatigueSum * 10)
    : fatigueCards.length === 2
      ? Math.max(0, Math.trunc(fatigueSum * 20 / 3))
      : fatigueCards.length === 3
        ? Math.max(0, Math.trunc(fatigueSum * 5))
        : 0;

  const values = comboAttributeValues(data);
  const typeVector = getTypeVector(data);
  const randomBonus = !isCombo && "random_01" in data
    ? Number(data.random_01 ?? 0)
    : 0;

  useEffect(() => {
    if (!randomBonus) return;
    setRandomIndex(Math.floor(Math.random() * 9));
    const timer = setInterval(() => {
      setRandomIndex(Math.floor(Math.random() * 9));
    }, 1000);
    return () => clearInterval(timer);
  }, [id, randomBonus]);

  const gkOnly =
    isCombo && isEnabled(training.data.gk_only);

  const hasMatchActions =
    isCombo &&
    isEnabled(training.data.has_match_actions);

  return (
    <article className={styles.page}>
<div className={styles.navigationRow}>
  <Link
    href="/cards-and-combos"
    className={styles.backButton}
    aria-label="Back to Cards and Combos"
  >
    <span
      className={styles.backTriangle}
      aria-hidden="true"
    />
    <span>Back</span>
  </Link>

  <h1 className={styles.title}>
    {data.name}
  </h1>

  <Link
    href={`/training-planner?trainingKind=${training.kind}&trainingId=${id}`}
    className={styles.addToTypesButton}
  >
    Add to player types
  </Link>
</div>
<div className={styles.categoryRow}>
  <div className={styles.fatigueBox}>
    Fatigue: {fatigue > 0 ? `+${fatigue}` : fatigue}
  </div>
  <div
    className={`${styles.categoryBadge} ${
      styles[`category${categoryId}`] ?? ""
    }`}
  >
    {categoryName}
  </div>

  <div className={styles.typeVectorBox}>
    <div
  className={styles.vector}
  style={{
    display: "grid",
    gridTemplateColumns: "1fr",
    justifyItems: "center",
    alignContent: "center",
    gap: "3px",
    width: "100%",
  }}
  title={formatTypeVector(typeVector.dx, typeVector.dy)}
>
      {typeVector.dx === 0 && typeVector.dy === 0 ? (
        <span className={styles.zero}>•</span>
      ) : (
       <svg
  viewBox="0 0 32 32"
  width="27"
  height="27"
  aria-hidden="true"
  fill="none"
  stroke="currentColor"
  strokeWidth="3"
  strokeLinecap="round"
  strokeLinejoin="round"
  style={{
    transform: `rotate(${
      (Math.atan2(typeVector.dx, typeVector.dy) * 180) /
      Math.PI
    }deg)`,
  }}
>
  <path
    d="M16 28V5M7 14L16 5L25 14"
    fill="none"
    stroke="currentColor"
  />
</svg>
      )}

      <span className={styles.label}>
        {formatTypeVector(typeVector.dx, typeVector.dy)}
      </span>
    </div>
  </div>
</div>
      <div className={styles.content}>
        <section
          className={styles.hero}
          aria-label={data.name}
        >
          <div
            className={`${styles.heroMedia} ${
              hasPreview ? styles.withPreview : ""
            }`}
          >
            <div className={styles.imageArea}>
              <div className={styles.imageFrame}>
                {imageUrl && loadedImageUrl !== imageUrl && failedImageUrl !== imageUrl && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    <LoadingSmall />
                  </div>
                )}
                {imageUrl && (
                  <Image
                    key={imageUrl}
                    src={imageUrl}
                    alt={data.name}
                    width={600}
                    height={400}
                    priority
                    className={styles.mainImage}
                    style={{ opacity: loadedImageUrl === imageUrl || failedImageUrl === imageUrl ? 1 : 0 }}
                    onLoad={() => setLoadedImageUrl(imageUrl)}
                    onError={() => setFailedImageUrl(imageUrl)}
                  />
                )}
              </div>

              {gkOnly && (
                <span className={styles.gkBadge}>
                  GK only
                </span>
              )}

              {hasMatchActions && !hasPreview && (
                <span className={styles.matchBadge}>
                  Has match actions
                </span>
              )}
            </div>

            {hasPreview && (
              <div className={styles.previewFrame}>
                {loadedPreviewUrl !== comboPreviewUrl && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    <LoadingSmall />
                  </div>
                )}
                <video
                  key={comboPreviewUrl}
                  className={styles.previewVideo}
                  src={comboPreviewUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  style={{ opacity: loadedPreviewUrl === comboPreviewUrl ? 1 : 0 }}
                  onLoadedData={() => setLoadedPreviewUrl(comboPreviewUrl ?? null)}
                  onCanPlay={() => setLoadedPreviewUrl(comboPreviewUrl ?? null)}
                  onError={() => {
                    console.warn(
                      "Combo preview could not be loaded:",
                      comboPreviewUrl
                    );

                    setFailedPreviewUrl(
                      comboPreviewUrl ?? null
                    );
                  }}
                  aria-label={`${data.name} preview`}
                />

                {hasMatchActions && (
                  <span className={styles.matchBadge}>
                    Has match actions
                  </span>
                )}
              </div>
            )}
          </div>

          {isCombo && recipeIds.length > 0 && (
            <div
              className={styles.recipe}
              data-count={recipeIds.length}
            >
              {recipeIds.map((cardId, index) => {
                const card = cardMap.get(cardId);
                const cardImage = cardImageUrls[cardId];

                return (
                  <div
                    className={styles.recipePart}
                    key={`${cardId}-${index}`}
                  >
                    {index > 0 && (
                      <span
                        className={styles.plus}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    )}

                    <div className={styles.recipeCard}>
                      <div
                        className={styles.recipeImageFrame}
                      >
                        {cardImage && (
                          <Image
                            src={cardImage}
                            alt={
                              card?.name ??
                              `Card #${cardId}`
                            }
                            width={250}
                            height={135}
                            className={styles.recipeImage}
                          />
                        )}
                      </div>

                      <span className={styles.recipeName}>
                        {card?.name ??
                          `Card #${cardId}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

       <div className={styles.attributeScrollOuter}>
  <HorizontalScrollArea label="Training effects">
          <section
            className={styles.attributeTable}
            aria-label="Training effects"
          >
            {ATTRIBUTES.map((attribute, index) => {
              const bonus = randomBonus && randomColumns[randomIndex] === index
                ? index === 0
                  ? Math.ceil(randomBonus / 2)
                  : index === 3
                    ? Math.ceil(randomBonus / 3)
                    : randomBonus
                : 0;
              const value = values[attribute.key] + bonus;

              return (
                <div
                  className={styles.attributeColumn}
                  key={attribute.key}
                >
                  <div
                    className={styles.attributeHeader}
                    title={attribute.label}
                  >
                    <Image
                      src={attributeIcon(
                        attribute.label,
                        index
                      )}
                      alt={attribute.label}
                      width={100}
                      height={100}
                      unoptimized
                      className={styles.attributeIcon}
                    />
                  </div>

                  <div
                    className={`${
                      styles.attributeValue
                    } ${
                      value > 0
                        ? styles.positive
                        : value < 0
                          ? styles.negative
                          : styles.zero
                    }`}
                  >
                    {value === 0
                      ? ""
                      : formatBonus(value)}
                  </div>
                </div>
              );
            })}
          </section>
        </HorizontalScrollArea></div>
      </div>
    </article>
  );
}
