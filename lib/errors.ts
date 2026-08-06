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
