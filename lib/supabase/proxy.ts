import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Solo refresca la sesión por ahora. La lógica de "sin sesión, redirigir a /login" (el sistema
 * entero requiere login salvo /login y /api/mercadopago/webhook) se agrega en
 * docs/backlog/01-autenticacion.md#E1-4.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Con Fluid compute, no poner este cliente en una variable global. Crear uno nuevo en cada
  // request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No correr código entre createServerClient y getClaims(). Un error acá puede hacer que
  // usuarios pierdan sesión sin explicación (ver nota de @supabase/ssr).
  await supabase.auth.getClaims();

  // IMPORTANTE: hay que devolver el objeto supabaseResponse tal cual. Si se crea una respuesta
  // nueva con NextResponse.next() hay que copiar las cookies, si no el browser y el server
  // pueden desincronizarse y cortar la sesión del usuario antes de tiempo.
  return supabaseResponse;
}
