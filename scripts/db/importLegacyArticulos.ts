import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

// Import de una sola vez desde el SQL Server legado (panaderiaCastillo) hacia
// categorias/productos. Idempotente (upsert), se puede volver a correr sin duplicar.
const SQL_SERVER = process.env.LEGACY_SQL_SERVER ?? "localhost\\SQLEXPRESS";
const SQL_DATABASE = process.env.LEGACY_SQL_DATABASE ?? "panaderiaCastillo";

// RUBRO.NOMBRE en la base vieja no lleva tildes -- son solo estos 2 valores, mapeo fijo a como
// se nombran en docs/data-model.md ("Almacén", "Panadería").
const NOMBRE_RUBRO_NORMALIZADO: Record<string, string> = {
  Almacen: "Almacén",
  Panaderia: "Panadería",
};

interface RubroRow {
  RUBRO: number;
  NOMBRE: string;
}

interface ArticuloRow {
  CODART: number;
  DESCRIPCION: string;
  RUBRO: string;
  UNIDAD: string;
  STOCK: number;
  PRECIO: number;
  ACTIVO: boolean;
  CODIGOBARRAS: string;
}

// sqlcmd con -u escribe la salida en UTF-16LE -- evita el mojibake que aparece con la salida por
// consola (confirmado con "AZUL AVENDAÑO", que en consola se ve "AZUL AVENDA?O"). SQL Server
// parte el JSON de FOR JSON en filas de ~2033 caracteres; sqlcmd las junta con salto de línea,
// hay que quitarlos antes de parsear (un salto de línea real nunca es válido sin escapar dentro
// de un string JSON, así que quitarlos es seguro).
function runJsonQuery<T>(query: string, outDir: string, fileName: string): T[] {
  const outFile = join(outDir, fileName);
  execFileSync("sqlcmd", [
    "-S",
    SQL_SERVER,
    "-E",
    "-C",
    "-d",
    SQL_DATABASE,
    "-u",
    "-y",
    "0",
    "-Q",
    `SET NOCOUNT ON; ${query}`,
    "-o",
    outFile,
  ]);

  const text = readFileSync(outFile)
    .toString("utf16le")
    .replace(/^﻿/, "")
    .replace(/\r?\n/g, "");

  if (!text.trim()) return [];
  return JSON.parse(text) as T[];
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY en .env.local");
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const outDir = mkdtempSync(join(tmpdir(), "import-legacy-"));
  let rubros: RubroRow[];
  let articulos: ArticuloRow[];
  try {
    rubros = runJsonQuery<RubroRow>("SELECT RUBRO, NOMBRE FROM RUBRO FOR JSON PATH", outDir, "rubro.json");
    articulos = runJsonQuery<ArticuloRow>(
      "SELECT CODART, DESCRIPCION, RUBRO, UNIDAD, STOCK, PRECIO, ACTIVO, CODIGOBARRAS FROM ARTICULO FOR JSON PATH",
      outDir,
      "articulo.json",
    );
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }

  console.log(`Leídos ${rubros.length} rubros y ${articulos.length} artículos de ${SQL_SERVER}/${SQL_DATABASE}.`);

  // 1) Categorías
  const nombresCategoria = rubros.map((r) => NOMBRE_RUBRO_NORMALIZADO[r.NOMBRE.trim()] ?? r.NOMBRE.trim());
  const { data: categoriasUpsertadas, error: catError } = await supabase
    .from("categorias")
    .upsert(
      nombresCategoria.map((nombre) => ({ nombre })),
      { onConflict: "nombre" },
    )
    .select("id, nombre");
  if (catError) throw catError;

  const categoriaIdPorNombreRubro = new Map<string, string>();
  for (const rubro of rubros) {
    const nombreNormalizado = NOMBRE_RUBRO_NORMALIZADO[rubro.NOMBRE.trim()] ?? rubro.NOMBRE.trim();
    const categoria = categoriasUpsertadas!.find((c) => c.nombre === nombreNormalizado);
    if (!categoria) throw new Error(`No se pudo resolver la categoría para rubro "${rubro.NOMBRE}"`);
    categoriaIdPorNombreRubro.set(rubro.NOMBRE.trim(), categoria.id);
  }
  console.log(`Categorías OK: ${categoriasUpsertadas!.length}`);

  // 2) Productos
  const stockRedondeado: { descripcion: string; original: number; redondeado: number }[] = [];

  const productos = articulos.map((a) => {
    const rubroNombre = a.RUBRO.trim();
    const esPanaderia = rubroNombre === "Panaderia";
    const categoriaId = categoriaIdPorNombreRubro.get(rubroNombre);
    if (!categoriaId) throw new Error(`Artículo ${a.CODART} referencia un rubro desconocido: "${a.RUBRO}"`);

    const tipoVenta: "unidad" | "peso" = a.UNIDAD.trim() === "kgrs" ? "peso" : "unidad";

    let stockActual: number | null;
    if (esPanaderia) {
      stockActual = null;
    } else if (tipoVenta === "unidad") {
      stockActual = Math.floor(a.STOCK);
      if (stockActual !== a.STOCK) {
        stockRedondeado.push({ descripcion: a.DESCRIPCION.trim(), original: a.STOCK, redondeado: stockActual });
      }
    } else {
      stockActual = Number(a.STOCK.toFixed(3));
    }

    return {
      categoria_id: categoriaId,
      nombre: a.DESCRIPCION.trim(),
      codigo_barras: a.CODIGOBARRAS.trim(),
      tipo_venta: tipoVenta,
      precio: a.PRECIO,
      controla_stock: !esPanaderia,
      stock_actual: stockActual,
      activo: a.ACTIVO,
    };
  });

  const { data: productosUpsertados, error: prodError } = await supabase
    .from("productos")
    .upsert(productos, { onConflict: "codigo_barras" })
    .select("id");
  if (prodError) throw prodError;

  console.log(`Productos OK: ${productosUpsertados!.length} filas upserted.`);
  if (stockRedondeado.length > 0) {
    console.log("Stock redondeado a entero (producto 'por unidad' con stock no entero en origen):");
    for (const s of stockRedondeado) {
      console.log(`  - ${s.descripcion}: ${s.original} -> ${s.redondeado}`);
    }
  }

  console.log("Listo.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
