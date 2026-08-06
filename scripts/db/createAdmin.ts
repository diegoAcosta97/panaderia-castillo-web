import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Uso: tsx scripts/db/createAdmin.ts <email> <password>");
  process.exit(1);
}

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;

  // El trigger on_auth_user_created (E0-4) ya insertó la fila en perfiles con rol 'cajero' por
  // default — acá la subimos a 'administrador'.
  const { error: updateError } = await admin
    .from("perfiles")
    .update({ rol: "administrador" })
    .eq("id", data.user!.id);

  if (updateError) throw updateError;

  console.log(`Administrador creado: ${email} (id ${data.user!.id})`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
