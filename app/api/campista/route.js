import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const TABLE_NAME = "campistas";
const CIRSE_COLUMN = "cirse";
const DEITY_COLUMN = "deidad";
const CABIN_COLUMN = "cabana";
const GODS = [
  "Zeus", "Hera", "Poseidón", "Demeter", "Ares", "Atenea", "Apolo", "Artemisa",
  "Hefesto", "Afrodita", "Hermes", "Dionisio", "Hades", "Iris", "Hypnos", "Némesis",
  "Hestia", "Heracles", "Hebe", "Hécate", "Perséfone", "Asclepio", "Nike", "Tique",
  "Jano", "Eros", "Eolo", "Tánatos", "Fobos", "Deimos", "Higía", "Harmonía", "Eris", "Hemera", "Nix"
];
const CABIN_BY_GOD = {
  Zeus: 1, Eolo: 1, Hera: 2, Poseidón: 3, Demeter: 4, Deméter: 4, Perséfone: 4,
  Ares: 5, Deimos: 5, Fobos: 5, Atenea: 6, Apolo: 7, Asclepio: 7, Higía: 7,
  Artemisa: 8, Hefesto: 9, Afrodita: 10, Hermes: 11, Hebe: 11, Jano: 11,
  Harmonía: 11, Dionisio: 12, Hades: 13, Iris: 14, Hypnos: 15, Tánatos: 15,
  Nix: 15, Némesis: 16, Hécate: 20
};

export async function GET(request) {
  const cirse = new URL(request.url).searchParams.get("cirse")?.trim() ?? "";
  if (!cirse) return NextResponse.json({ error: "Ingresá tu número de Circe." }, { status: 400 });
  if (!/^\d+$/.test(cirse)) return NextResponse.json({ error: "El número de Circe debe contener solo números." }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`${CIRSE_COLUMN},${DEITY_COLUMN},${CABIN_COLUMN}`)
      .eq(CIRSE_COLUMN, cirse)
      .limit(2);

    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return NextResponse.json({ status: "missing" });
    if (rows.length > 1) return NextResponse.json({ error: "Hay más de una fila con ese Circe. Contactá al equipo." }, { status: 409 });

    const row = rows[0];
    if (row[DEITY_COLUMN] !== null || row[CABIN_COLUMN] !== null) {
      return NextResponse.json({ status: "occupied" });
    }
    return NextResponse.json({ status: "available", cirse });
  } catch (error) {
    console.error("Error consultando Supabase:", error);
    return NextResponse.json({ error: "No pudimos consultar la base de datos. Revisá la configuración o intentá más tarde." }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }

  const cirse = String(body?.cirse ?? "").trim();
  const god = String(body?.god ?? "").trim();
  const cabin = Number(body?.cabin);

  if (!/^\d+$/.test(cirse) || !god || !Number.isInteger(cabin)) {
    return NextResponse.json({ error: "Faltan datos válidos para guardar el resultado." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    // Actualiza solo deidad y cabana, y solo si ambas columnas siguen vacías.
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ [DEITY_COLUMN]: god, [CABIN_COLUMN]: cabin })
      .eq(CIRSE_COLUMN, cirse)
      .is(DEITY_COLUMN, null)
      .is(CABIN_COLUMN, null)
      .select(CIRSE_COLUMN);

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Circe no disponible. La fila ya no está vacía o fue asignada por otra persona. Contactá al equipo si creés que es un error." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error guardando en Supabase:", error);
    return NextResponse.json({ error: "No pudimos guardar el resultado. Intentá de nuevo más tarde o contactá al equipo." }, { status: 500 });
  }
}
