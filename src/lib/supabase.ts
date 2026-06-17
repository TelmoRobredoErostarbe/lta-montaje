import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  document.body.innerHTML = `<div style="font-family:sans-serif;padding:2rem;color:#dc2626">
    <h2>⚠️ Error de configuración</h2>
    <p>Faltan las variables de entorno de Supabase.</p>
    <code>VITE_SUPABASE_URL: ${url ? "✓" : "✗ falta"}</code><br/>
    <code>VITE_SUPABASE_ANON_KEY: ${key ? "✓" : "✗ falta"}</code>
    <p>Añádelas en <strong>Vercel → Settings → Environment Variables</strong> y redespliega.</p>
  </div>`;
  throw new Error("Missing Supabase env vars");
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
