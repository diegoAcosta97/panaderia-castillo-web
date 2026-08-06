import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// RF-10.2: no hay ninguna pantalla pública. Todo lo que no sea /login o el webhook de Mercado
// Pago (que MP llama server-to-server, sin sesión de usuario — se valida por firma en
// docs/backlog/08-mercadopago.md#E8-3) exige sesión.
function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/api/mercadopago/webhook");
}

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
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!isPublicPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANTE: hay que devolver el objeto supabaseResponse tal cual. Si se crea una respuesta
  // nueva con NextResponse.next() hay que copiar las cookies, si no el browser y el server
  // pueden desincronizarse y cortar la sesión del usuario antes de tiempo.
  return supabaseResponse;
}
