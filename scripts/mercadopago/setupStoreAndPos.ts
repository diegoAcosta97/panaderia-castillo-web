// Alta única de sucursal (store) y caja (POS) en Mercado Pago, requisito previo para poder
// generar órdenes de QR dinámico (docs/backlog/08-mercadopago.md#E8-1). Se corre una sola vez;
// guarda los IDs resultantes en configuracion_negocio para que qrService los use después.
// Idempotente: si la sucursal ya existe (por external_id) la reutiliza en vez de duplicarla.
//
// Uso: npx tsx scripts/mercadopago/setupStoreAndPos.ts
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const MERCADOPAGO_API_URL = "https://api.mercadopago.com";
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

// Mercado Pago exige external_id alfanumérico puro (sin guiones bajos/medios) tanto para
// stores como para POS.
const EXTERNAL_STORE_ID = "PANADERIACASTILLO";
const EXTERNAL_POS_ID = "PANADERIACASTILLOCAJA1";

async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MERCADOPAGO_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Mercado Pago API error (${res.status}): ${JSON.stringify(data)}`);
  return data as T;
}

async function main() {
  if (!accessToken) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en .env.local");

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: negocio } = await supabase.from("configuracion_negocio").select("*").single();
  if (!negocio) {
    throw new Error("No existe la fila de configuracion_negocio (ver 00-fundamentos.md#E0-6).");
  }

  if (negocio.mercadopago_store_id && negocio.mercadopago_external_pos_id) {
    console.log("Ya hay sucursal y caja configuradas:", {
      store_id: negocio.mercadopago_store_id,
      external_pos_id: negocio.mercadopago_external_pos_id,
    });
    return;
  }

  const me = await mpFetch<{ id: number }>("/users/me");
  console.log("Usuario de Mercado Pago:", me.id);

  // Reutiliza la sucursal si ya existe (evita duplicar en caso de reintento tras un fallo
  // parcial, como pasó la primera vez: la sucursal se creó pero la caja falló).
  const busqueda = await mpFetch<{ results: { id: number; external_id: string }[] }>(
    `/users/${me.id}/stores/search?external_id=${EXTERNAL_STORE_ID}`,
  );
  let storeId = busqueda.results[0]?.id;

  if (storeId) {
    console.log("Sucursal ya existía, reutilizando id:", storeId);
  } else {
    // Ubicación placeholder (cuenta de prueba/sandbox) -- actualizar cuando exista la
    // dirección real en configuracion_negocio (docs/backlog/12-configuracion.md).
    const store = await mpFetch<{ id: number }>(`/users/${me.id}/stores`, {
      method: "POST",
      body: JSON.stringify({
        name: negocio.nombre_comercial,
        external_id: EXTERNAL_STORE_ID,
        location: {
          street_name: "Av. Corrientes",
          street_number: "1000",
          city_name: "La Plata",
          state_name: "Buenos Aires",
          latitude: -34.6037,
          longitude: -58.3816,
          reference: "Dirección de prueba -- actualizar con la real",
        },
      }),
    });
    storeId = store.id;
    console.log("Sucursal creada, id:", storeId);
  }

  const pos = await mpFetch<{ id: number }>("/pos", {
    method: "POST",
    body: JSON.stringify({
      name: "Caja 1",
      fixed_amount: false,
      store_id: storeId,
      external_store_id: EXTERNAL_STORE_ID,
      external_id: EXTERNAL_POS_ID,
    }),
  });
  console.log("Caja creada, id:", pos.id);

  const { error } = await supabase
    .from("configuracion_negocio")
    .update({
      mercadopago_store_id: String(storeId),
      mercadopago_external_pos_id: EXTERNAL_POS_ID,
    })
    .eq("id", negocio.id);
  if (error) throw error;

  console.log("configuracion_negocio actualizada. Listo.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
