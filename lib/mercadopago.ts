import "server-only";

// Cliente mínimo sobre fetch, en vez del SDK oficial: la API de Orders/QR es muy reciente
// (2025) y preferimos controlar el payload exacto contra la referencia oficial en vez de
// depender de una versión del SDK que podría no reflejarla todavía (docs/backlog/08-mercadopago.md#E8-1).
const MERCADOPAGO_API_URL = "https://api.mercadopago.com";

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN.");
  return token;
}

export class MercadoPagoError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Mercado Pago API error (${status}): ${JSON.stringify(body)}`);
  }
}

export async function mercadoPagoFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${MERCADOPAGO_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new MercadoPagoError(res.status, data);
  }
  return data as T;
}
