import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, PackageX, Trophy, ClipboardCheck, CalendarClock } from "lucide-react";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import {
  sumaVentasEfectivoPorTurno,
  resumenVentasPorRango,
  topProductosVendidos,
  ventasPorDiaYCategoria,
} from "@/repositories/ventasRepository";
import { VentasPorCategoriaChart } from "@/features/dashboard/components/VentasPorCategoriaChart";
import { sumaGastosPorTurno } from "@/repositories/gastosRepository";
import { sumaPagosEmpleadosPorTurno } from "@/repositories/pagosEmpleadosRepository";
import { sumaSenasPorTurno, listPedidosEncargoPaginated } from "@/repositories/pedidosEncargoRepository";
import { listProductosBajoStock } from "@/repositories/productosRepository";
import { listControlesStock } from "@/repositories/controlStockRepository";
import { listIngresosMercaderia } from "@/repositories/ingresoMercaderiaRepository";
import { formatearMoneda } from "@/lib/format";

const PROXIMOS_PEDIDOS_LIMIT = 5;

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
  const hace29Dias = fechaISO(-29);

  const [
    turnoAbierto,
    resumenHoy,
    resumenAyer,
    productosBajoStock,
    topProductos,
    ventasPorCategoria,
    controlesStock,
    ingresosMercaderia,
    proximosPedidos,
  ] = await Promise.all([
    getTurnoAbierto(supabase),
    resumenVentasPorRango(supabase, { desde: hoy, hasta: hoy }),
    resumenVentasPorRango(supabase, { desde: ayer, hasta: ayer }),
    listProductosBajoStock(supabase),
    topProductosVendidos(supabase, { desde: hace7Dias, hasta: hoy, limit: 5 }),
    ventasPorDiaYCategoria(supabase, { desde: hace29Dias, hasta: hoy }),
    listControlesStock(supabase),
    listIngresosMercaderia(supabase),
    listPedidosEncargoPaginated(supabase, {
      page: 0,
      pageSize: PROXIMOS_PEDIDOS_LIMIT,
      estado: "pendiente",
    }),
  ]);

  const controlesPendientes = controlesStock.filter((c) => c.estado === "pendiente_aprobacion");
  const ingresosPendientes = ingresosMercaderia.filter((i) => i.estado === "pendiente_aprobacion");
  const totalPendientes = controlesPendientes.length + ingresosPendientes.length;

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

      {totalPendientes > 0 && (
        <Card className="border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-accent" />
              Pendientes de aprobación ({totalPendientes})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {controlesPendientes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">
                  Controles de stock ({controlesPendientes.length})
                </p>
                <ul className="flex flex-col gap-1">
                  {controlesPendientes.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Iniciado el {new Date(c.fecha_inicio).toLocaleString("es-AR")}
                      </span>
                      <Link
                        href={`/admin/control-stock/${c.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Revisar
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ingresosPendientes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">
                  Ingresos de mercadería ({ingresosPendientes.length})
                </p>
                <ul className="flex flex-col gap-1">
                  {ingresosPendientes.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Cargado el {new Date(i.fecha).toLocaleString("es-AR")}
                      </span>
                      <Link
                        href={`/admin/ingresos-mercaderia/${i.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Revisar
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {proximosPedidos.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <CalendarClock className="size-4 text-muted-foreground" />
                Próximos pedidos a entregar
              </span>
              <Link href="/admin/pedidos" className="text-sm font-normal underline">
                Ver todos
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm">
              {proximosPedidos.data.map((p) => {
                const vencido = p.fecha_entrega < hoy;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-4">
                    <span className="truncate">
                      {p.cliente_nombre} — {p.items.length} producto{p.items.length === 1 ? "" : "s"}
                      {p.sena_total > 0 && ` · seña ${formatearMoneda(p.sena_total)}`}
                    </span>
                    <span
                      className={`shrink-0 ${vencido ? "font-medium text-destructive" : "text-muted-foreground"}`}
                    >
                      {new Date(`${p.fecha_entrega}T00:00:00`).toLocaleDateString("es-AR")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

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
          <CardTitle>Ventas por categoría (últimos 30 días)</CardTitle>
        </CardHeader>
        <CardContent>
          <VentasPorCategoriaChart {...ventasPorCategoria} />
        </CardContent>
      </Card>

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
