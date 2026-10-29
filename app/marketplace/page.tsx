import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PlayerImages from "./PlayerImages";
import {
  getPosition,
  getOverall,
  getTier,
  calculateAttributes,
  getFoot,
  getMarket,
  POTENTIAL_CURVE_ORDER,
} from "@/lib/utils";
import MarketplaceFilters from "./MarketplaceFilters";
import { LoadingBig } from "../Loading";
import PlayerInfo from "./PlayerInfo";

type MarketplaceParams = {
  id?: string;
  page?: string;
  q?: string;
  foot?: string;
  pos?: string | string[];
  market?: string | string[];
  tier?: string | string[];
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  potential?: string;
};

function toArray(value?: string | string[]) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function gradeToNumber(grade: unknown): number | null {
  if (typeof grade === "number") {
    return Number.isFinite(grade) ? grade : null;
  }

  if (typeof grade !== "string") return null;
  const value = grade.trim().toUpperCase().replace(",", ".");
  if (!value) return null;

  const numeric = value.match(/[+-]?\d+(?:\.\d+)?/);
  if (numeric) {
    const number = Number(numeric[0]);
    return Number.isFinite(number) ? number : null;
  }

  const letter = value.match(/^(S{1,3}|[A-F])([+-]?)$/);
  if (letter) {
    const scores: Record<string, number> = {
      SSS: 120, SS: 110, S: 100,
      A: 90, B: 80, C: 70, D: 60, E: 50, F: 40,
    };
    return scores[letter[1]] + (letter[2] === "+" ? 3 : letter[2] === "-" ? -3 : 0);
  }

  return null;
}

function normalizeTier(tier: string): string {
  const value = tier.toLowerCase().trim();
  if (value.includes("ultra")) return "Ultra";
  if (value.includes("gold")) return "Gold";
  if (value.includes("silver") || value.includes("silber")) return "Silber";
  if (value.includes("bronze")) return "Bronze";
  return tier;
}

function parsePrice(value?: string): number | null {
  if (value === undefined || value.trim() === "") return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

type PotentialMode = keyof typeof POTENTIAL_CURVE_ORDER;

const CURVE_NUMBER_FIELDS = [
  "curve_number", "curve_no", "curve_code", "curveNumber", "curve_id",
  "id_curve", "id_potential_curve", "potential_curve_id", "potential_curve",
  "potential_curve_number", "curve", "potential", "id_potential",
] as const;

function getCurveNumber(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;

  for (const field of CURVE_NUMBER_FIELDS) {
    const value = record[field];
    if (typeof value !== "number" && typeof value !== "string") continue;
    const code = String(value).trim();
    if (/^\d{1,2}$/.test(code)) return code.padStart(2, "0");
  }
  return null;
}

async function Players({
  filters,
}: {
  filters: MarketplaceParams;
}) {
  const supabase = await createClient();
  const { id, page } = filters;

  const load = (start: number) =>
    supabase
      .from("Player")
      .select("*, Player_Skills(*), Potential_Curves(*)")
      .order("id_player")
      .range(start, start + 999);

  const [a, b] = await Promise.all([
    load(0),
    load(1000),
  ]);

  if (a.error || b.error) {
    return <p>{a.error?.message || b.error?.message}</p>;
  }

  const players = [...(a.data ?? []), ...(b.data ?? [])];

  const all = players.map((p) => {
    const skills = Array.isArray(p.Player_Skills)
      ? p.Player_Skills[0]
      : p.Player_Skills;

    const overall = skills ? Number(getOverall(skills)) : 0;

    const attributes = skills
      ? calculateAttributes(skills)
      : [];

    const potential = Array.isArray(p.Potential_Curves)
      ? p.Potential_Curves[0]
      : p.Potential_Curves;

    const curveNumber = getCurveNumber(potential) ?? getCurveNumber(p);

    const abilities = Object.fromEntries(
      attributes.map((attribute) => [
        attribute.name,
        gradeToNumber(attribute.grade),
      ])
    ) as Record<string, number | null>;

    return {
      id_player: p.id_player,
      name: p.name,
      id_position: p.id_position,
      price: p.price == null ? null : Number(p.price),
      overall,
      position: String(getPosition(p.id_position) ?? ""),
      foot: String(getFoot(p.id_foot) ?? ""),
      market: String(getMarket(p.id_market) ?? ""),
      tier: !p.price ? "Alien" : normalizeTier(String(getTier(overall))),
      curveNumber,
      abilities,
    };
  });

  const unique = (values: string[]) =>
    [...new Set(values.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "de")
    );

  const positions = unique(all.map((p) => p.position));
  const feet = unique(all.map((p) => p.foot));
  const markets = unique(
    all.map((p) => p.market).filter(
      (market) => market.trim().toLowerCase() !== "null" &&
                  market.trim().toLowerCase() !== "undefined"
    )
  );
  const skillNames = unique(
    all.flatMap((p) => Object.keys(p.abilities))
  );

  const selectedPositions = toArray(filters.pos);
  const selectedMarkets = toArray(filters.market);
  const selectedTiers = toArray(filters.tier);
  const selectedFoot = filters.foot ?? "";
  const search = (filters.q ?? "").trim().toLocaleLowerCase("de");
  const sort = filters.sort ?? "overall_desc";
  const minPrice = parsePrice(filters.minPrice);
  const maxPrice = parsePrice(filters.maxPrice);
  const selectedPotential = filters.potential ?? "";
  const potentialOrder = Object.prototype.hasOwnProperty.call(
    POTENTIAL_CURVE_ORDER,
    selectedPotential
  )
    ? POTENTIAL_CURVE_ORDER[selectedPotential as PotentialMode]
    : null;
  const potentialRanks = potentialOrder
    ? new Map<string, number>(potentialOrder.map((curve, index) => [curve, index]))
    : null;

  const playerNames = unique(
    all.filter((p) =>
      p.tier !== "Alien" || selectedTiers.includes("Alien")
    ).map((p) => p.name)
  );

  const filtered = all.filter((p) => {
    if (
      search &&
      !p.name.toLocaleLowerCase("de").includes(search)
    ) return false;

    if (
      selectedPositions.length &&
      !selectedPositions.includes(p.position)
    ) return false;

    if (selectedFoot && p.foot !== selectedFoot) {
      return false;
    }

    if (
      selectedMarkets.length &&
      !selectedMarkets.includes(p.market)
    ) return false;

    if (p.tier === "Alien" && !selectedTiers.includes("Alien")) {
      return false;
    }
    if (selectedTiers.length && !selectedTiers.includes(p.tier)) {
      return false;
    }

    if (minPrice !== null && (p.price === null || p.price < minPrice)) {
      return false;
    }
    if (maxPrice !== null && (p.price === null || p.price > maxPrice)) {
      return false;
    }

    if (potentialRanks && !potentialRanks.has(p.curveNumber ?? "")) {
      return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (sort === "price_asc" || sort === "price_desc") {
      if (a.price === null && b.price !== null) return 1;
      if (b.price === null && a.price !== null) return -1;

      const difference = sort === "price_asc"
        ? (a.price ?? 0) - (b.price ?? 0)
        : (b.price ?? 0) - (a.price ?? 0);

      return difference || a.name.localeCompare(b.name, "de");
    }

    if (potentialRanks) {
      const aRank = potentialRanks.get(a.curveNumber ?? "") ?? Infinity;
      const bRank = potentialRanks.get(b.curveNumber ?? "") ?? Infinity;
      if (aRank !== bRank) return aRank - bRank;
    }

    let result = 0;

    switch (sort) {
      case "overall_asc":
        result = a.overall - b.overall;
        break;

      case "overall_desc":
        result = b.overall - a.overall;
        break;

      case "name_asc":
        result = a.name.localeCompare(b.name, "de");
        break;

      case "name_desc":
        result = b.name.localeCompare(a.name, "de");
        break;

      default: {
        const match = sort.match(/^skill:(\d+):(asc|desc)$/);
        if (match) {
          const skill = skillNames[Number(match[1])];
          if (skill !== undefined) {
            const aValue = a.abilities[skill];
            const bValue = b.abilities[skill];

            if (aValue == null && bValue != null) return 1;
            if (bValue == null && aValue != null) return -1;
            if (aValue != null && bValue != null) {
              result = match[2] === "asc"
                ? aValue - bValue
                : bValue - aValue;
            }
          }
        }
      }
    }

    return result || a.name.localeCompare(b.name, "de");
  });

  const pageSize = 100;
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const requestedPage = Number(page ?? 1);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.max(
        1,
        Math.min(totalPages, Math.floor(requestedPage))
      )
    : 1;

  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const baseParams = new URLSearchParams();

  if (filters.q) baseParams.set("q", filters.q);
  if (selectedFoot) baseParams.set("foot", selectedFoot);
  if (filters.minPrice?.trim()) baseParams.set("minPrice", filters.minPrice);
  if (filters.maxPrice?.trim()) baseParams.set("maxPrice", filters.maxPrice);
  if (potentialOrder) baseParams.set("potential", selectedPotential);

  selectedPositions.forEach((value) =>
    baseParams.append("pos", value)
  );
  selectedMarkets.forEach((value) =>
    baseParams.append("market", value)
  );
  selectedTiers.forEach((value) =>
    baseParams.append("tier", value)
  );

  baseParams.set("sort", sort);

  const pageHref = (pageNumber: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("page", String(pageNumber));
    return `/marketplace?${params.toString()}`;
  };

  const playerHref = (playerId: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("page", String(currentPage));
    params.set("id", String(playerId));
    return `/marketplace?${params.toString()}`;
  };

  if (!id) {
    return (
      <>
        <MarketplaceFilters
          positions={positions}
          feet={feet}
          markets={markets}
          skillNames={skillNames}
          selectedPositions={selectedPositions}
          selectedMarkets={selectedMarkets}
          selectedTiers={selectedTiers}
          selectedFoot={selectedFoot}
          search={filters.q ?? ""}
          sort={sort}
          playerNames={playerNames}
          minPrice={filters.minPrice ?? ""}
          maxPrice={filters.maxPrice ?? ""}
          selectedPotential={potentialOrder ? selectedPotential : ""}
        />

        <p style={{ textAlign: "center", opacity: 0.7 }}>
          {filtered.length} players found
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 15,
            justifyContent: "center",
            marginTop: 30,
          }}
        >
          {paginated.map((p) => {
            const imageUrl = supabase.storage
              .from("player-images")
              .getPublicUrl(
                `${String(p.id_player).padStart(4, "0")}.png`
              ).data.publicUrl;

            const card = (
              <PlayerImages
                imageUrl={imageUrl}
                name={p.name}
                topText={p.overall}
                bottomText={p.name}
                position={getPosition(p.id_position)}
                isAlien={!p.price}
                price={p.price}
                market={p.market}
                showPriceChip={!(!p.price)}
                showMarketChip={!(!p.price)}
                enableHover={true}
              />
            );

            return p.price ? (
              <Link
                key={p.id_player}
                href={playerHref(p.id_player)}
                title={`${p.name} - ${p.overall}`}
              >
                {card}
              </Link>
            ) : (
              <div key={p.id_player}>{card}</div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 40 }}>
            Keine Spieler mit diesen Filtern gefunden.
          </p>
        )}

        <nav
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            margin: "30px 0",
          }}
        >
          {currentPage > 1 && (
            <Link
              href={pageHref(currentPage - 1)}
              style={{ color: "black", textDecoration: "none" }}
            >
              ◀
            </Link>
          )}

          <span>
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages && (
            <Link
              href={pageHref(currentPage + 1)}
              style={{ color: "black", textDecoration: "none" }}
            >
              ▶
            </Link>
          )}
        </nav>
      </>
    );
  }


  return (
    <PlayerInfo
      id={Number(id)}
      backHref={pageHref(currentPage)}
    />
  );
}

async function PlayersWrapper({
  searchParams,
}: {
  searchParams: Promise<MarketplaceParams>;
}) {
  const filters = await searchParams;
  return <Players filters={filters} />;
}

async function MarketplaceHeading({
  searchParams,
}: {
  searchParams: Promise<MarketplaceParams>;
}) {
  const filters = await searchParams;

  if (!filters.id || !Number.isInteger(Number(filters.id))) {
    return <h1>Marketplace</h1>;
  }

}

export default function Home({
  searchParams,
}: {
  searchParams: Promise<MarketplaceParams>;
}) {
  return (
    <main>
      <Suspense fallback={<h1>Marketplace</h1>}>
        <MarketplaceHeading searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<LoadingBig />}>
        <PlayersWrapper searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
