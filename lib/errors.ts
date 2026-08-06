// Los errores de supabase-js (PostgrestError, AuthError) no son instancias de `Error` -- son
// objetos planos con `message`. Un catch que solo chequea `err instanceof Error` pierde el
// mensaje específico y cae siempre al fallback genérico.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

// Código SQLSTATE de Postgres para violación de constraint `unique` (independiente del nombre
// de la constraint) — usado para reintentar la generación de codigo_barras interno en
// productosRepository si dos generaciones al azar colisionan (lib/barcode.ts).
export const POSTGRES_UNIQUE_VIOLATION = "23505";

export function isPostgresErrorCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === code
  );
}
