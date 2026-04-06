const requiredPublicEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const missingPublicEnv = requiredPublicEnv.filter(
  (key) => !process.env[key],
);

export const envStatus = {
  ready: missingPublicEnv.length === 0,
  missing: missingPublicEnv,
};
