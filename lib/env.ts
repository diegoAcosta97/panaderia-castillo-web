import { z } from "zod";

// Falla rápido en el arranque (import-time) si falta alguna variable, en vez de dejar que el
// error aparezca recién cuando se use el cliente de Supabase/Mercado Pago que la necesita.
//
// E13-2: no hay MERCADOPAGO_WEBHOOK_SECRET -- las notificaciones de Código QR de Mercado Pago no
// soportan validación por firma (confirmado contra la documentación oficial durante EPIC 8, ver
// docs/backlog/08-mercadopago.md#E8-3). El modelo de seguridad real de
// app/api/mercadopago/webhook/route.ts es tratar el payload como un disparador no confiable y
// reconsultar el estado real contra la propia API de MP con el access token del servidor antes
// de tocar la base -- nunca se confía en el body del webhook. Una variable de entorno sin uso
// real (auditada en EPIC 13) daría una falsa sensación de que existe validación por firma en
// algún lado.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
