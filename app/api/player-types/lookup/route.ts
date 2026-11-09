
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
      .select("id_player,name")
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

    const players = ids.map((id) => {
      const player = found.get(id)!;

      return {
        id,
        name: player.name,
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
