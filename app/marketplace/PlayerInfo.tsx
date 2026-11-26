import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PlayerImages from "./PlayerImages";
import PotentialChart from "./PotentialChart";
import {
  attributeImages,
  calculateAttributes,
  calculateWeeklyRecovery,
  formatPrice,
  getFoot,
  getMarket,
  getOverall,
  getPosition,
  MARKET_LABELS,
  rankImages,
  GRADES,
  getPlayerMatchActionButtons,
  getPlayerMatchActionLabels,
  type MatchActionLabel,
} from "@/lib/utils";
import styles from "./PlayerInfo.module.css";
import AddPlayerTypeButton from "./AddPlayerTypeButton";
import LanguageSwitcher from "../LanguageSwitcher";

type PlayerInfoProps = {
  id: number;
  backHref: string;
  matchActionLookup?: ReadonlyMap<number, MatchActionLabel>;
};

const INDIVIDUAL_SKILL_ROWS = [
  [
    { key: "skill_01", name: "Shooting Power", icon: "/shooting-power.png" },
    {
      key: "skill_02",
      name: "Shooting Accuracy",
      icon: "/shooting-accuracy.png",
    },
  ],
  [
    { key: "skill_05", name: "Tackling", icon: "/tackling.png" },
    { key: "skill_06", name: "Ball Control", icon: "/ballcontrole.png" },
    { key: "skill_07", name: "Dribbling", icon: "/dribbling.png" },
  ],
] as const;

const MATCH_ACTION_NAME_COLUMNS = {
  en: "english_name",
  de: "german_name",
  es: "spanish_name",
  it: "italian_name",
  fr: "french_name",
} as const;

const LEVEL_THRESHOLDS = [0, 50, 150, 350, 600, 1000] as const;

function getLevelProgress(value: number, level: number): number {
  if (level >= LEVEL_THRESHOLDS.length - 1) return 100;
  if (level < 0 || !Number.isFinite(value)) return 0;

  const min = LEVEL_THRESHOLDS[level];
  const max = LEVEL_THRESHOLDS[level + 1];
  if (min === undefined || max === undefined) return 0;

  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function getAttributeImage(name: string, index: number): string {
  const value = name.toLowerCase().trim();
  if (/shoot|shot|schuss/.test(value)) return "/shoot-icon.png";
  if (/speed|tempo|pace/.test(value)) return "/run-icon.png";
  if (/stamina|ausdauer|endurance/.test(value)) return "/stamina-icon.png";
  if (/technic|techni|technik|skill/.test(value)) return "/technic-icon.png";
  if (/strength|kraft|power/.test(value)) return "/strenght-icon.png";
  if (/jump|sprung/.test(value)) return "/jump-icon.png";
  if (/will|wille|mental/.test(value)) return "/will-icon.png";
  return attributeImages[index] ?? "/will-icon.png";
}

function getMarketLabel(value: string): string {
  const key = value.replace(/\s+/g, "");
  return MARKET_LABELS[key] ?? value;
}

function getMarketColor(market: string): string {
  const colors: Record<string, string> = {
    "100%": "var(--color-physical)",
    "25%": "#ffb23e",
    "20%": "var(--color-highlight)",
  };
  return colors[market.replace(/\s+/g, "")] ?? "var(--button_grey)";
}

function getGrade(value: number | null | undefined): string | null {
  if (value == null || !Number.isInteger(value)) return null;
  return GRADES[value] ?? null;
}

export default async function PlayerInfo({
  id,
  backHref,
  matchActionLookup = new Map<number, MatchActionLabel>(),
}: PlayerInfoProps) {
  const supabase = await createClient();

  const { data: player, error } = await supabase
    .from("Player")
    .select("*, Player_Skills(*), Potential_Curves(*)")
    .eq("id_player", id)
    .maybeSingle();

  if (error) return <p>{error.message}</p>;

  if (!player) {
    return (
      <div className="notFound">
        <Image
          src="/unhappy.png"
          alt="Unhappy"
          width={220}
          height={220}
          className="notFoundImage"
        />
        <h2 className="notFoundText">Player not found.</h2>
      </div>
    );
  }

  const skills = Array.isArray(player.Player_Skills)
    ? player.Player_Skills[0]
    : player.Player_Skills;

  const potential = Array.isArray(player.Potential_Curves)
    ? player.Potential_Curves[0]
    : player.Potential_Curves;

  const attributes = skills ? calculateAttributes(skills) : [];
  const weeklyRecovery = skills
    ? calculateWeeklyRecovery(
        Array.from({ length: 10 }, (_, index) => {
          const level = Number(
            skills[`skill_${String(index + 1).padStart(2, "0")}`] ?? 0,
          );
          return LEVEL_THRESHOLDS[level] ?? 0;
        }),
      )
    : null;
  const position = String(getPosition(player.id_position) ?? "—");
  const foot = String(getFoot(player.id_foot) ?? "—").toUpperCase();
  const marketValue = getMarket(player.id_market);
  const market = marketValue === "NULL" ? "Unavailable" : marketValue;
  const additionalGrades = [
    { label: "Consistency", value: player.consistency },
    { label: "Action Learning", value: player.action_learning },
  ];

  const matchActionComboIds = getPlayerMatchActionLabels(
    player.match_actions,
    matchActionLookup,
  ).map((action) => action.comboId);

  const matchActionNames = new Map<number, string>();

  if (matchActionComboIds.length > 0) {
    const cookieStore = await cookies();
    const language = cookieStore.get("npfc-language")?.value;
    const nameColumn =
      language === "de" ||
      language === "es" ||
      language === "it" ||
      language === "fr"
        ? MATCH_ACTION_NAME_COLUMNS[language]
        : MATCH_ACTION_NAME_COLUMNS.en;

    const { data: comboNames, error: comboNamesError } = await supabase
      .from("ComboNames")
      .select(
        "combo_id, english_name, german_name, spanish_name, italian_name, french_name",
      )
      .in("combo_id", matchActionComboIds);

    if (comboNamesError) {
      console.error(
        "Could not load match action names:",
        comboNamesError.message,
      );
    }

    for (const row of comboNames ?? []) {
      const name = row[nameColumn]?.trim() || row.english_name?.trim();
      if (name) matchActionNames.set(row.combo_id, name);
    }
  }

  const matchActionButtons = getPlayerMatchActionButtons(
    player.match_actions,
    matchActionLookup,
    matchActionNames,
  );

  const teamId = player.team_id;

  const imageUrl = `/player-images/${String(player.id_player).padStart(
    4,
    "0",
  )}.png`;

  return (
    <div className={styles.pageLayout}>
      <div className={styles.languageDock}>
        <LanguageSwitcher />
      </div>
      <div className={styles.page}>
        <div className={styles.navigationRow}>
          <Link href={backHref} className={styles.backLink}>
            ◀ Back
          </Link>

          <div className={styles.navigationActions}>
            {skills && <AddPlayerTypeButton playerId={player.id_player} />}
          </div>
        </div>

        <article className={styles.panel}>
          <header
            className={styles.topBar}
            style={{
              backgroundColor:
                (
                  {
                    GK: "#9955dd",
                    DF: "#dd555c",
                    MF: "#be9c10",
                    FW: "#5581dd",
                  } as Record<string, string>
                )[position] ?? "var(--color-physical)",
            }}
          >
            <div className={styles.position} title="Position">
              {position}
            </div>
            {teamId != null && (
              <Image
                src={`/team-images/${String(teamId).padStart(4, "0")}.png`}
                alt={"Core Team"}
                title={"Core Team"}
                width={70}
                height={70}
                unoptimized
                className={styles.teamLogo}
              />
            )}
            <div>
              {weeklyRecovery !== null && (
                <span
                  title="Weekly fatigue recovery"
                  className={styles.recovery}
                >
                  Recovery -{weeklyRecovery}/w
                </span>
              )}
            </div>

            <div
              className={styles.priceWrap}
              title={`Price: ${formatPrice(player.price)}`}
            >
              <span className={styles.price}>{formatPrice(player.price)}</span>
              <Image
                src="/coins-icon.png"
                alt=""
                width={43}
                height={54}
                unoptimized
                className={styles.coins}
              />
            </div>
          </header>

          <div className={styles.content}>
            <div className={styles.portraitPanel}>
              {skills ? (
                <div className={styles.cardStage}>
                  <div
                    className={styles.scaledCard}
                    style={{
                      filter: "drop-shadow(0 0 5px rgba(0, 0, 0, 0.5))",
                    }}
                  >
                    <PlayerImages
                      key={player.id_player}
                      playerId={player.id_player}
                      teamId={teamId}
                      imageUrl={imageUrl}
                      name={player.name}
                      topText={getOverall(skills)}
                      bottomText={player.name}
                      position={position}
                      isAlien={!player.price}
                    />
                  </div>
                </div>
              ) : (
                <p className={styles.empty}>No player rating available</p>
              )}
            </div>

            <div className={styles.rightColumn}>
              <section
                className={styles.attributes}
                aria-label="Player attributes"
              >
                <div className={styles.attributeLayout}>
                  {attributes.length > 0 ? (
                    <div className={styles.skillGroups}>
                      <div className={styles.attributeGrid}>
                        {attributes.map((attribute, index) => {
                          const grade = String(attribute.grade ?? "—")
                            .trim()
                            .toUpperCase();
                          const rankImage = rankImages[grade];
                          const icon = getAttributeImage(
                            String(attribute.name),
                            index,
                          );
                          const progress = getLevelProgress(
                            attribute.value,
                            attribute.level,
                          );
                          const maxLevel =
                            attribute.level === LEVEL_THRESHOLDS.length - 1;
                          const progressLabel = maxLevel
                            ? `${attribute.name}: Max grade (S)`
                            : `${attribute.name}: ${Math.round(
                                progress,
                              )}% to next grade`;

                          return (
                            <div
                              className={styles.attributeItem}
                              key={`${attribute.name}-${index}`}
                              title={`${attribute.name}: ${grade}`}
                            >
                              <Image
                                src={icon}
                                alt={String(attribute.name)}
                                width={74}
                                height={75}
                                unoptimized
                                className={styles.attributeIcon}
                              />

                              <div className={styles.gradeSlot}>
                                <div className={styles.gradeValue}>
                                  {rankImage ? (
                                    <Image
                                      src={rankImage}
                                      alt={`Rating ${grade}`}
                                      width={74}
                                      height={72}
                                      unoptimized
                                      className={styles.gradeImage}
                                    />
                                  ) : (
                                    <span className={styles.gradeText}>
                                      {grade}
                                    </span>
                                  )}
                                </div>

                                <div
                                  className={styles.levelTrack}
                                  role="progressbar"
                                  aria-label={progressLabel}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={Math.round(progress)}
                                  title={progressLabel}
                                >
                                  <span
                                    className={styles.levelDot}
                                    style={{ bottom: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {skills && (
                        <div
                          className={styles.individualSkills}
                          aria-label="Individual skills"
                        >
                          {INDIVIDUAL_SKILL_ROWS.map((row, index) => (
                            <div
                              className={styles.individualSkillRow}
                              key={index}
                            >
                              {row.map(({ key, name, icon }) => {
                                const level = skills[key];
                                const grade = getGrade(level);
                                const image = grade ? rankImages[grade] : null;

                                const progress = level === 5 ? 100 : 0;

                                const progressLabel =
                                  level === 5
                                    ? `${name}: Max grade (S)`
                                    : `${name}: Exact XP progress unavailable`;

                                return (
                                  <div
                                    className={styles.individualSkill}
                                    key={key}
                                    title={`${name}: ${grade ?? "Unavailable"}`}
                                  >
                                    <Image
                                      src={icon}
                                      alt={name}
                                      width={32}
                                      height={32}
                                      unoptimized
                                      className={styles.individualSkillIcon}
                                    />

                                    <div className={styles.individualGradeSlot}>
                                      {image ? (
                                        <Image
                                          src={image}
                                          alt={`${name}: ${grade}`}
                                          width={28}
                                          height={28}
                                          unoptimized
                                          className={
                                            styles.individualSkillGrade
                                          }
                                        />
                                      ) : (
                                        <span
                                          className={
                                            styles.individualSkillMissing
                                          }
                                        >
                                          —
                                        </span>
                                      )}

                                      {grade && (
                                        <div
                                          className={
                                            styles.individualLevelTrack
                                          }
                                          title={progressLabel}
                                          aria-label={progressLabel}
                                        >
                                          <span
                                            className={
                                              styles.individualLevelDot
                                            }
                                            style={{ bottom: `${progress}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={styles.empty}>No attributes available</p>
                  )}

                  <div className={styles.attributeBadges}>
                    <div className={styles.footWrap} title="Preferred foot">
                      <span
                        className={`${styles.footBadge} ${
                          foot === "L" ? styles.leftFoot : styles.rightFoot
                        }`}
                      >
                        {foot}
                      </span>
                    </div>

                    <div className={styles.marketWrap}>
                      <span
                        className={styles.marketBadge}
                        title={`Market: ${market}`}
                        style={{ backgroundColor: getMarketColor(market) }}
                      >
                        {getMarketLabel(market)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.additionalGrades}${
                    matchActionButtons.length
                      ? ` ${styles.withMatchActions}`
                      : ""
                  }`}
                >
                  <div className={styles.gradeColumn}>
                    {additionalGrades.map(({ label, value }) => {
                      const grade = getGrade(value);
                      const image = grade ? rankImages[grade] : null;

                      return (
                        <div
                          className={styles.additionalGrade}
                          key={label}
                          title={`${label}: ${grade ?? "Unavailable"}`}
                        >
                          <span className={styles.additionalGradeLabel}>
                            {label}:
                          </span>
                          {image ? (
                            <Image
                              src={image}
                              alt={`${label}: ${grade}`}
                              width={42}
                              height={42}
                              unoptimized
                              className={styles.additionalGradeImage}
                            />
                          ) : (
                            <span className={styles.additionalGradeMissing}>
                              —
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {matchActionButtons.length > 0 && (
                    <div
                      className={styles.matchActionButtons}
                      aria-label="Enemy Match Actions"
                    >
                      <span className={styles.matchActionTitle}>
                        Enemy Match Actions
                      </span>
                      {matchActionButtons.map((action) => (
                        <Link
                          key={action.id}
                          href={action.href}
                          title={action.text}
                          className={styles.matchActionButton}
                          style={action.style}
                        >
                          {action.text}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section
                className={styles.potentialPanel}
                aria-label="Potential curve"
              >
                {potential ? (
                  <PotentialChart potential={potential} />
                ) : (
                  <p className={styles.empty}>No potential available</p>
                )}
              </section>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
