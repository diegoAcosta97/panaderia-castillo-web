import { getErrorMessage } from "@/lib/errors";

// Las Server Actions ("use server") no pueden confiar en throw/catch para cruzar el límite
// RPC cliente-servidor: en producción, Next.js 16 trata cualquier error tirado ahí como una
// excepción no controlada y reemplaza el mensaje real por uno genérico (React error #441) --
// la guía oficial (node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md)
// dice explícitamente "avoid throw errors, model expected errors as return values". En dev no
// se nota (ahí sí se ve el mensaje real), por eso pasó desapercibido hasta que apareció en un
// build de producción real.
//
// Patrón: la acción atrapa el error adentro (ejecutarAccion) y lo devuelve como dato; quien la
// llama lo vuelve a convertir en una excepción local con throwIfActionError, sin tener que
// tocar el resto del try/catch + getErrorMessage ya existente en cada pantalla.
export type ActionResult<T> = T | { error: string };

export async function ejecutarAccion<T>(
  fn: () => Promise<T>,
  fallback: string,
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    return { error: getErrorMessage(err, fallback) };
  }
}

export function throwIfActionError<T>(result: ActionResult<T>): T {
  if (typeof result === "object" && result !== null && "error" in result) {
    throw new Error((result as { error: string }).error);
  }
  return result as T;
}
