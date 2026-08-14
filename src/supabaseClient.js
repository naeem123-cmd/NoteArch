import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file (see .env.example)."
  );
}

export const supabase = createClient(url || "", key || "");
