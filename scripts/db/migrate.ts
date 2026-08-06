import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("Falta SUPABASE_DB_URL en .env.local");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  await client.query(`
    create table if not exists public._migrations (
      id serial primary key,
      name text unique not null,
      applied_at timestamptz not null default now()
    );
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows: applied } = await client.query<{ name: string }>(
    "select name from public._migrations;",
  );
  const appliedNames = new Set(applied.map((r) => r.name));

  const pending = files.filter((f) => !appliedNames.has(f));

  if (pending.length === 0) {
    console.log("No hay migraciones pendientes.");
  }

  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`Aplicando ${file}...`);
    try {
      await client.query("begin;");
      await client.query(sql);
      await client.query("insert into public._migrations (name) values ($1);", [file]);
      await client.query("commit;");
      console.log(`  OK`);
    } catch (err) {
      await client.query("rollback;");
      console.error(`  FALLÓ ${file}:`, (err as Error).message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("Listo.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
