// Reads and checks the environment once at startup (see backend/.env.example).
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name} (copy backend/.env.example to backend/.env)`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  supabaseUrl: required('SUPABASE_URL'),
  supabasePublishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
  supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
}
