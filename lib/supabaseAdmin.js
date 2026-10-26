import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  }

  // Este cliente solo se usa en rutas del servidor. Nunca exponer esta clave al navegador.
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
