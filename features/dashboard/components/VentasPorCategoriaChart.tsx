"use client";

import { useState } from "react";
import { formatearMoneda } from "@/lib/format";
import type { VentasPorDiaCategoria } from "@/repositories/ventasRepository";

// Paleta categórica validada (skill dataviz, references/palette.md) -- orden fijo, nunca
// reordenada por valor. La app no tiene modo oscuro (sin toggle, sin uso de "dark:" fuera del
// boilerplate de shadcn en globals.css), así que solo se usan los hex de modo claro.
const PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

// Más de 8 categorías no entra en la paleta validada -- en vez de generar un color nuevo, se
// pliegan al fondo de la lista bajo "Otras" (docs de la skill: "fold to Other or facet").
const MAX_SLOTS = 8;

const BAR_W = 12;
const BAR_GAP = 3;
const GROUP_PADDING = 12;
const PLOT_HEIGHT = 220;
const X_LABELS_HEIGHT = 24;
const Y_AXIS_WIDTH = 60;

function foldCategorias(datos: VentasPorDiaCategoria): VentasPorDiaCategoria {
  if (datos.categorias.length <= MAX_SLOTS) return datos;
  const categorias = [
    ...datos.categorias.slice(0, MAX_SLOTS - 1),
    { id: "__otras__", nombre: "Otras" },
  ];
  const principales = datos.matriz.slice(0, MAX_SLOTS - 1);
  const resto = datos.matriz.slice(MAX_SLOTS - 1);
  const otras = datos.dias.map((_, di) => resto.reduce((acc, fila) => acc + fila[di], 0));
  return { dias: datos.dias, categorias, matriz: [...principales, otras] };
}

function niceTicks(max: number, cantidad = 4): number[] {
  if (max <= 0) return [0];
  const rawStep = max / cantidad;
  const magnitud = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residuo = rawStep / magnitud;
  const residuoLindo = residuo > 5 ? 10 : residuo > 2 ? 5 : residuo > 1 ? 2 : 1;
  const step = residuoLindo * magnitud;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v));
  return ticks;
}

function formatCompacto(monto: number): string {
  if (monto >= 1_000_000) return `$${(monto / 1_000_000).toFixed(1)}M`;
  if (monto >= 1_000) return `$${Math.round(monto / 1000)}K`;
  return `$${Math.round(monto)}`;
}

function pathBarraRedondeada(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  const radius = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

function diaCorto(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function diaLargo(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "long" });
}

export function VentasPorCategoriaChart(props: VentasPorDiaCategoria) {
  const { dias, categorias, matriz } = foldCategorias(props);
  const [hover, setHover] = useState<{ ci: number; di: number } | null>(null);

  const maxValor = Math.max(0, ...matriz.flat());
  if (maxValor === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay ventas registradas en los últimos 30 días.
      </p>
    );
  }

  const ticks = niceTicks(maxValor);
  const niceMax = ticks[ticks.length - 1];
  const scaleY = (v: number) => (v / niceMax) * PLOT_HEIGHT;

  const groupInnerWidth = categorias.length * BAR_W + (categorias.length - 1) * BAR_GAP;
  const groupWidth = groupInnerWidth + GROUP_PADDING;
  const totalWidth = dias.length * groupWidth + GROUP_PADDING;
  const svgHeight = PLOT_HEIGHT + X_LABELS_HEIGHT;

  const hoveredValor = hover ? matriz[hover.ci][hover.di] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {categorias.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 shrink-0 rounded-[2px]"
              style={{ background: PALETTE[i % PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="text-foreground">{c.nombre}</span>
          </span>
        ))}
      </div>

      <div className="flex">
        <svg width={Y_AXIS_WIDTH} height={svgHeight} className="shrink-0" aria-hidden="true">
          {ticks.map((t) => {
            const y = PLOT_HEIGHT - scaleY(t);
            return (
              <text
                key={t}
                x={Y_AXIS_WIDTH - 8}
                y={y}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill="var(--muted-foreground)"
              >
                {formatCompacto(t)}
              </text>
            );
          })}
        </svg>

        <div className="overflow-x-auto">
          <svg width={totalWidth} height={svgHeight} role="img" aria-label="Ventas por día y categoría, últimos 30 días">
            {ticks.map((t) => {
              const y = PLOT_HEIGHT - scaleY(t);
              return (
                <line
                  key={t}
                  x1={0}
                  x2={totalWidth}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
              );
            })}

            {dias.map((dia, di) => {
              const groupX = GROUP_PADDING / 2 + di * groupWidth;
              return (
                <g key={dia}>
                  {categorias.map((cat, ci) => {
                    const valor = matriz[ci][di];
                    const x = groupX + ci * (BAR_W + BAR_GAP);
                    const h = Math.max(scaleY(valor), valor > 0 ? 2 : 0);
                    const y = PLOT_HEIGHT - h;
                    const isHover = hover?.ci === ci && hover?.di === di;
                    const label = `${cat.nombre}, ${diaLargo(dia)}: ${formatearMoneda(valor)}`;
                    return (
                      <g key={cat.id}>
                        {h > 0 && (
                          <path
                            d={pathBarraRedondeada(x, y, BAR_W, h, 4)}
                            fill={PALETTE[ci % PALETTE.length]}
                            opacity={isHover ? 0.75 : 1}
                          />
                        )}
                        <rect
                          x={x}
                          y={0}
                          width={BAR_W}
                          height={PLOT_HEIGHT}
                          fill="transparent"
                          tabIndex={0}
                          role="img"
                          aria-label={label}
                          onMouseEnter={() => setHover({ ci, di })}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover({ ci, di })}
                          onBlur={() => setHover(null)}
                        >
                          <title>{label}</title>
                        </rect>
                      </g>
                    );
                  })}
                  <text
                    x={groupX + groupInnerWidth / 2}
                    y={PLOT_HEIGHT + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--muted-foreground)"
                  >
                    {diaCorto(dia)}
                  </text>
                </g>
              );
            })}

            <line
              x1={0}
              x2={totalWidth}
              y1={PLOT_HEIGHT}
              y2={PLOT_HEIGHT}
              stroke="var(--border)"
              strokeWidth={1}
            />
          </svg>
        </div>
      </div>

      <div className="min-h-5 text-sm">
        {hover && hoveredValor !== null ? (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 shrink-0 rounded-[2px]"
              style={{ background: PALETTE[hover.ci % PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="font-medium">{formatearMoneda(hoveredValor)}</span>
            <span className="text-muted-foreground">
              · {categorias[hover.ci].nombre} · {diaLargo(dias[hover.di])}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Pasá el mouse (o navegá con tab) sobre una barra para ver el detalle.
          </span>
        )}
      </div>
    </div>
  );
}
