import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, PackageX, Trophy } from "lucide-react";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { sumaVentasEfectivoPorTurno, resumenVentasPorRango, topProductosVendidos } from "@/repositories/ventasRepository";
import { sumaGastosPorTurno } from "@/repositories/gastosRepository";
import { sumaPagosEmpleadosPorTurno } from "@/repositories/pagosEmpleadosRepository";
import { sumaSenasPorTurno } from "@/repositories/pedidosEncargoRepository";
import { listProductosBajoStock } from "@/repositories/productosRepository";
import { formatearMoneda } from "@/lib/format";

function fechaISO(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

export default async function AdminHome() {
  const session = await getServerSession();
  const supabase = await createClient();
  const hoy = fechaISO(0);
  const ayer = fechaISO(-1);
  const hace7Dias = fechaISO(-7);

  const [turnoAbierto, resumenHoy, resumenAyer, productosBajoStock, topProductos] =
    await Promise.all([
      getTurnoAbierto(supabase),
      resumenVentasPorRango(supabase, { desde: hoy, hasta: hoy }),
      resumenVentasPorRango(supabase, { desde: ayer, hasta: ayer }),
      listProductosBajoStock(supabase),
      topProductosVendidos(supabase, { desde: hace7Dias, hasta: hoy, limit: 5 }),
    ]);

  let efectivoEsperado: number | null = null;
  if (turnoAbierto) {
    const [ventasEfectivo, gastosEfectivo, pagosEmpleados, senasEfectivo] = await Promise.all([
      sumaVentasEfectivoPorTurno(supabase, turnoAbierto.id),
      sumaGastosPorTurno(supabase, turnoAbierto.id),
      sumaPagosEmpleadosPorTurno(supabase, turnoAbierto.id),
      sumaSenasPorTurno(supabase, turnoAbierto.id),
    ]);
    efectivoEsperado =
      turnoAbierto.monto_apertura + ventasEfectivo + senasEfectivo - gastosEfectivo - pagosEmpleados;
  }

  const deltaVentas = resumenHoy.totalVentas - resumenAyer.totalVentas;
  const deltaVentasPct =
    resumenAyer.totalVentas > 0 ? (deltaVentas / resumenAyer.totalVentas) * 100 : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-lg font-medium">
          Hola, {session?.perfil.nombre_completo || session?.perfil.email}
        </p>
        <p className="text-sm text-muted-foreground">Así viene el local hoy.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              Ventas de hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatearMoneda(resumenHoy.totalVentas)}</p>
            <p className="text-sm text-muted-foreground">
              {resumenHoy.cantidadVentas} {resumenHoy.cantidadVentas === 1 ? "venta" : "ventas"}
            </p>
            <p
              className={`mt-1 flex items-center gap-1 text-xs ${
                deltaVentas >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {deltaVentas >= 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {deltaVentas >= 0 ? "+" : ""}
              {formatearMoneda(deltaVentas)} vs. ayer
              {deltaVentasPct !== null && ` (${deltaVentasPct >= 0 ? "+" : ""}${deltaVentasPct.toFixed(0)}%)`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              Efectivo esperado ahora
            </CardTitle>
          </CardHeader>
          <CardContent>
            {turnoAbierto ? (
              <>
                <p className="text-2xl font-semibold">{formatearMoneda(efectivoEsperado ?? 0)}</p>
                <p className="text-sm text-muted-foreground">
                  Turno abierto desde {new Date(turnoAbierto.fecha_apertura).toLocaleTimeString("es-AR")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay un turno de caja abierto.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageX className="size-4 text-muted-foreground" />
              Productos a reponer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{productosBajoStock.length}</p>
            {productosBajoStock.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
                {productosBajoStock.slice(0, 5).map((p) => (
                  <li key={p.id} className="truncate">
                    {p.nombre} ({p.stock_actual}/{p.stock_minimo})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Todo por encima del mínimo.</p>
            )}
            {productosBajoStock.length > 0 && (
              <Link
                href="/admin/productos/reposicion"
                className="mt-2 inline-block text-sm underline"
              >
                Ver listado completo
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-muted-foreground" />
              Margen bruto de hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resumenHoy.renglonesConCosto > 0 ? (
              <>
                <p className="text-2xl font-semibold">{formatearMoneda(resumenHoy.margenBruto)}</p>
                {resumenHoy.renglonesSinCosto > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Cobertura parcial: {resumenHoy.renglonesSinCosto} renglón(es) sin costo cargado.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin costo cargado en los productos vendidos hoy.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 productos vendidos (últimos 7 días)</CardTitle>
        </CardHeader>
        <CardContent>
          {topProductos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ventas en este rango.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm">
              {topProductos.map((p, i) => (
                <li key={p.producto_id} className="flex items-center justify-between gap-4">
                  <span className="truncate">
                    {i + 1}. {p.nombre}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {p.cantidad} un. — {formatearMoneda(p.monto)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
