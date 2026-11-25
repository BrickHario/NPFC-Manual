import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.ids) || body.ids.length > 25 || !body.ids.every((id: unknown) => typeof id === "number" && Number.isInteger(id) && id >= 0 && id < 1016)) {
    return NextResponse.json({ error: "Invalid player IDs" }, { status: 400 });
  }
  if (body.ids.length === 0) return NextResponse.json({ players: [] });
  const supabase = await createClient();
  const { data, error } = await supabase.from("Player").select("id_player,name,id_position,price").in("id_player", body.ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ players: data ?? [] });
}
