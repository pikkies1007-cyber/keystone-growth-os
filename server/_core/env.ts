export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Supabase project settings (Settings → API in the Supabase dashboard)
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromAddress: process.env.RESEND_FROM_ADDRESS ?? "Keystone Growth OS <onboarding@resend.dev>",
  resendOwnerEmail: process.env.RESEND_OWNER_EMAIL ?? "",
};
