import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PlayerImages from "./PlayerImages";
import PotentialChart from "./PotentialChart";
import {
  attributeImages,
  calculateAttributes,
  formatPrice,
  getFoot,
  getMarket,
  getOverall,
  getPosition,
  MARKET_LABELS,
  rankImages,
} from "@/lib/utils";
import styles from "./PlayerInfo.module.css";

type PlayerInfoProps = {
  id: number;
  backHref: string;
};

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

export default async function PlayerInfo({ id, backHref }: PlayerInfoProps) {
  const supabase = await createClient();

  const { data: player, error } = await supabase
    .from("Player")
    .select("*, Player_Skills(*), Potential_Curves(*)")
    .eq("id_player", id)
    .maybeSingle();

  if (error) return <p>{error.message}</p>;
  if (!player) return <p>Player not found</p>;

  const skills = Array.isArray(player.Player_Skills)
    ? player.Player_Skills[0]
    : player.Player_Skills;

  const potential = Array.isArray(player.Potential_Curves)
    ? player.Potential_Curves[0]
    : player.Potential_Curves;

  const attributes = skills ? calculateAttributes(skills) : [];
  const position = String(getPosition(player.id_position) ?? "—");
  const foot = String(getFoot(player.id_foot) ?? "—").toUpperCase();
  const market = String(getMarket(player.id_market) ?? "—");

  const imageUrl = supabase.storage
    .from("player-images")
    .getPublicUrl(`${String(player.id_player).padStart(4, "0")}.png`)
    .data.publicUrl;

  return (
    <div className={styles.page}>
      <Link href={backHref} className={styles.backLink}>
        ◀ Back
      </Link>

      <article className={styles.panel}>
        <header className={styles.topBar}>
          <div className={styles.position} title="Position">
            {position}
          </div>

          <div className={styles.priceWrap} title={`Price: ${formatPrice(player.price)}`}>
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
                <div className={styles.scaledCard} style={{filter: "drop-shadow(0 0 5px rgba(0, 0, 0, 0.5))"}}>
                  <PlayerImages
                    key={player.id_player}
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
            <section className={styles.attributes} aria-label="Player attributes">
              <div className={styles.attributeLayout}>
                {attributes.length > 0 ? (
                <div className={styles.attributeGrid}>
                  {attributes.map((attribute, index) => {
                    const grade = String(attribute.grade ?? "—").trim().toUpperCase();
                    const rankImage = rankImages[grade];
                    const icon = getAttributeImage(String(attribute.name), index);

                    return (
                      <div className={styles.attributeItem} key={`${attribute.name}-${index}`} title={`${attribute.name}: ${grade}`}>
                        <Image
                          src={icon}
                          alt={String(attribute.name)}
                          width={74}
                          height={75}
                          unoptimized
                          className={styles.attributeIcon}
                        />
                        <div className={styles.gradeSlot}>
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
                            <span className={styles.gradeText}>{grade}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                ) : (
                  <p className={styles.empty}>No attributes available</p>
                )}

                <div className={styles.attributeBadges}>
                <div className={styles.footWrap} title="Preferred foot">
                  <span className={`${styles.footBadge} ${foot === "L" ? styles.leftFoot : styles.rightFoot}`}>
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
            </section>

            <section className={styles.potentialPanel} aria-label="Potential curve">
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
  );
}
