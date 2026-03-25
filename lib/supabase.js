import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/config";

let supabaseAdmin = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function getSupabaseSecret() {
  return process.env.SUPABASE_SECRET_KEY || "";
}

export function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const supabaseUrl = getSupabaseUrl() || requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseSecret = getSupabaseSecret() || requireEnv("SUPABASE_SECRET_KEY");

  supabaseAdmin = createClient(supabaseUrl, supabaseSecret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return supabaseAdmin;
}
