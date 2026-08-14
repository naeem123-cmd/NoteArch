import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

if (!supabaseConfigured) {
  console.warn(
    "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file (see .env.example)."
  );
}

// Fall back to a syntactically valid placeholder URL so createClient never
// throws at import time (which would blank the whole page before React
// even mounts). Real calls will just fail gracefully and the app shows
// an in-app "couldn't reach the database" message instead.
export const supabase = createClient(
  supabaseConfigured ? url : "https://placeholder.supabase.co",
  supabaseConfigured ? key : "placeholder-anon-key"
);
