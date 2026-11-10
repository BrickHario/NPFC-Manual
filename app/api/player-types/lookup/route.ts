
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LookupRequest = {
  ids?: unknown;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as LookupRequest;

    if (
      !body ||
      !Array.isArray(body.ids)
    ) {
      return NextResponse.json(
        {
          error: "Invalid player IDs",
        },
        {
          status: 400,
        }
      );
    }

    const rawIds: unknown[] = body.ids;

    if (
      rawIds.length === 0 ||
      rawIds.length > 25 ||
      !rawIds.every(
        (id) =>
          typeof id === "number" &&
          Number.isSafeInteger(id) &&
          id > 0 &&
          id !== 1016
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid roster",
        },
        {
          status: 400,
        }
      );
    }

    const ids = rawIds as number[];

    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        {
          error: "Duplicate player IDs",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("Player")
      .select("id_player,name,id_potential")
      .in("id_player", ids);

    if (error) {
      return NextResponse.json(
        {
          error: "Player lookup failed",
        },
        {
          status: 500,
        }
      );
    }

    const found = new Map(
      (data ?? []).map((player) => [
        Number(player.id_player),
        player,
      ])
    );

    const missing = ids.filter(
      (id) => !found.has(id)
    );

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown player IDs: ${missing.join(", ")}`,
        },
        {
          status: 422,
        }
      );
    }

    const potentialIds = [
  ...new Set(
    (data ?? [])
      .map((player) => player.id_potential)
      .filter((id): id is number => typeof id === "number")
  ),
];

const { data: curves, error: curvesError } = potentialIds.length
  ? await supabase
      .from("Potential_Curves")
      .select("*")
      .in("id_potential", potentialIds)
  : { data: [], error: null };

if (curvesError) {
  return NextResponse.json(
    { error: "Unable to load potential curves" },
    { status: 500 }
  );
}

const curveMap = new Map(
  (curves ?? []).map((curve) => [
    curve.id_potential,
    Array.from({ length: 33 }, (_, index) =>
      Number(
        curve[`point_${String(index).padStart(2, "0")}`]
      )
    ),
  ])
);

    const players = ids.map((id) => {
      const player = found.get(id)!;

      return {
        id,
        name: player.name,
        potentialCurve:
  curveMap.get(player.id_potential) ?? null,
        imageUrl: supabase.storage
          .from("player-images")
          .getPublicUrl(
            `${String(id).padStart(4, "0")}.png`
          ).data.publicUrl,
      };
    });

    return NextResponse.json({
      players,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to resolve players",
      },
      {
        status: 500,
      }
    );
  }
}
