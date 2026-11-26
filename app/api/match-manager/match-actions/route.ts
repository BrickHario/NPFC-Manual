import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ids = (body as { ids?: unknown } | null)?.ids;

  if (
    !Array.isArray(ids) ||
    ids.length > 25 ||
    !ids.every(
      (id) =>
        typeof id === "number" && Number.isInteger(id) && id >= 0 && id < 1016,
    )
  ) {
    return NextResponse.json({ error: "Invalid player IDs" }, { status: 400 });
  }

  if (ids.length === 0) return NextResponse.json({ players: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Player")
    .select("id_player, match_actions")
    .in("id_player", [...new Set(ids)]);

  if (error) {
    return NextResponse.json(
      { error: "Unable to load Match Actions" },
      { status: 500 },
    );
  }

  return NextResponse.json({ players: data ?? [] });
}
